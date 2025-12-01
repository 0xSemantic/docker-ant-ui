package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	// "github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"     // ← NEW: for ListOptions, RemoveOptions
	// "github.com/docker/docker/api/types/registry" // ← NEW: for PullOptions (auth, etc.)
	"github.com/docker/docker/client"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

// Container represents a simplified container for the frontend
type Container struct {
	ID     string   `json:"id"`
	Names  []string `json:"names"`
	Image  string   `json:"image"`
	State  string   `json:"state"`
	Status string   `json:"status"`
}

// Image represents a Docker image
type Image struct {
	ID          string   `json:"id"`
	RepoDigests []string `json:"repoDigests"`
	RepoTags    []string `json:"repoTags"`
	Created     int64    `json:"created"`
	Size        int64    `json:"size"`
	VirtualSize int64    `json:"virtualSize"`
	Containers  int      `json:"containers"`
}

// ActivityLog represents an activity log entry
type ActivityLog struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Container string    `json:"container"`
	Timestamp time.Time `json:"timestamp"`
}

var (
	dockerClient *client.Client
	clients      = make(map[*websocket.Conn]bool)
	clientsMu    sync.Mutex
	wsMutex      sync.RWMutex
	activityLogs []ActivityLog
	logMutex     sync.RWMutex
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func initDockerClient() error {
	var err error
	dockerClient, err = client.NewClientWithOpts(
		client.WithHost("unix:///var/run/docker.sock"),
		client.WithAPIVersionNegotiation(),
	)
	return err
}

func main() {
	// Initialize Docker client
	if err := initDockerClient(); err != nil {
		log.Fatal("Cannot connect to Docker:", err)
	}
	defer dockerClient.Close()

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := dockerClient.Ping(ctx)
	if err != nil {
		log.Fatal("Docker daemon not reachable:", err)
	}
	log.Println("Connected to Docker daemon")

	// Initialize activity logs
	activityLogs = make([]ActivityLog, 0)
	addActivityLog("system", "Docker Ant UI backend started", "")

	// Start WebSocket broadcaster in background
	go startContainerBroadcaster()

	// Set up HTTP router
	router := mux.NewRouter()

	// WebSocket endpoint
	router.HandleFunc("/ws", WebSocketHandler)

	// Container API endpoints
	router.HandleFunc("/api/containers", func(w http.ResponseWriter, r *http.Request) {
		getContainers(w, r)
	}).Methods("GET")
	router.HandleFunc("/api/containers/{id}/start", func(w http.ResponseWriter, r *http.Request) {
		startContainer(w, r)
	}).Methods("POST")
	router.HandleFunc("/api/containers/{id}/stop", func(w http.ResponseWriter, r *http.Request) {
		stopContainer(w, r)
	}).Methods("POST")
	router.HandleFunc("/api/containers/{id}/restart", func(w http.ResponseWriter, r *http.Request) {
		restartContainer(w, r)
	}).Methods("POST")
	router.HandleFunc("/api/containers/{id}", func(w http.ResponseWriter, r *http.Request) {
		deleteContainer(w, r)
	}).Methods("DELETE")

	// Image API endpoints
	router.HandleFunc("/api/images", func(w http.ResponseWriter, r *http.Request) {
		getImages(w, r)
	}).Methods("GET")
	router.HandleFunc("/api/images/pull", func(w http.ResponseWriter, r *http.Request) {
		pullImage(w, r)
	}).Methods("POST")
	router.HandleFunc("/api/images/{id}", func(w http.ResponseWriter, r *http.Request) {
		deleteImage(w, r)
	}).Methods("DELETE")
	router.HandleFunc("/api/images/prune", func(w http.ResponseWriter, r *http.Request) {
		pruneImages(w, r)
	}).Methods("POST")

	// Activity logs endpoint
	router.HandleFunc("/api/activity", func(w http.ResponseWriter, r *http.Request) {
		getActivityLogs(w, r)
	}).Methods("GET")

	// Enable CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	})

	server := &http.Server{
		Handler:      corsHandler.Handler(router),
		Addr:         ":8080",
		WriteTimeout: 30 * time.Second,
		ReadTimeout:  30 * time.Second,
	}

	log.Println("Backend server starting on :8080")
	log.Println("API: http://localhost:8080/api/containers")
	log.Println("WebSocket: ws://localhost:8080/ws")
	log.Fatal(server.ListenAndServe())
}

// ==================== WebSocket & Broadcasting ====================

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	wsMutex.Lock()
	clients[conn] = true
	wsMutex.Unlock()
	log.Printf("New WebSocket client connected")

	sendContainerList(conn)

	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				wsMutex.Lock()
				delete(clients, conn)
				wsMutex.Unlock()
				return
			}
		default:
			messageType, _, err := conn.ReadMessage()
			if err != nil {
				wsMutex.Lock()
				delete(clients, conn)
				wsMutex.Unlock()
				return
			}
			if messageType == websocket.CloseMessage {
				wsMutex.Lock()
				delete(clients, conn)
				wsMutex.Unlock()
				return
			}
		}
	}
}

func BroadcastToAll(message []byte) {
	wsMutex.RLock()
	defer wsMutex.RUnlock()
	for client := range clients {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("Error broadcasting to client: %v", err)
			client.Close()
			delete(clients, client)
		}
	}
}

func sendContainerList(conn *websocket.Conn) {
	containers, err := getContainersList()
	if err != nil {
		log.Printf("Error getting container list: %v", err)
		return
	}
	message := map[string]interface{}{
		"type":       "containers",
		"containers": containers,
		"timestamp":  time.Now().Unix(),
	}
	jsonMessage, _ := json.Marshal(message)
	conn.WriteMessage(websocket.TextMessage, jsonMessage)
}

func SendContainerEvent(containerID, action, status, message string) {
	event := map[string]interface{}{
		"type":        "container_event",
		"containerId": containerID,
		"action":      action,
		"status":      status,
		"message":     message,
		"timestamp":   time.Now().Unix(),
	}
	jsonEvent, _ := json.Marshal(event)
	BroadcastToAll(jsonEvent)
}

func SendImageEvent(imageID, action, status, message string) {
	event := map[string]interface{}{
		"type":     "image_event",
		"imageId":  imageID,
		"action":   action,
		"status":   status,
		"message":  message,
		"timestamp": time.Now().Unix(),
	}
	jsonEvent, _ := json.Marshal(event)
	BroadcastToAll(jsonEvent)
}

func SendActivityLog(logType, message, containerID string) {
	logEntry := ActivityLog{
		ID:        fmt.Sprintf("log-%d", time.Now().UnixNano()),
		Type:      logType,
		Message:   message,
		Container: containerID,
		Timestamp: time.Now(),
	}

	logMutex.Lock()
	activityLogs = append(activityLogs, logEntry)
	if len(activityLogs) > 100 {
		activityLogs = activityLogs[len(activityLogs)-100:]
	}
	logMutex.Unlock()

	event := map[string]interface{}{
		"type":      "activity_log",
		"log":       logEntry,
		"timestamp": time.Now().Unix(),
	}
	jsonEvent, _ := json.Marshal(event)
	BroadcastToAll(jsonEvent)
}

func addActivityLog(logType, message, containerID string) {
	SendActivityLog(logType, message, containerID)
}

// ==================== Container Operations ====================

func startContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := dockerClient.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		errorMsg := fmt.Sprintf("Failed to start container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s started successfully", containerID)
	SendContainerEvent(containerID, "start", "running", successMsg)
	SendActivityLog("success", successMsg, containerID)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "action": "started", "message": successMsg})
}

func stopContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]
	timeout := 30
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()

	if err := dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		errorMsg := fmt.Sprintf("Failed to stop container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s stopped successfully", containerID)
	SendContainerEvent(containerID, "stop", "stopped", successMsg)
	SendActivityLog("success", successMsg, containerID)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "action": "stopped", "message": successMsg})
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]
	timeout := 30
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()

	dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
	time.Sleep(2 * time.Second)

	ctx2, cancel2 := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel2()
	dockerClient.ContainerStart(ctx2, containerID, container.StartOptions{})

	successMsg := fmt.Sprintf("Container %s restarted successfully", containerID)
	SendContainerEvent(containerID, "restart", "running", successMsg)
	SendActivityLog("success", successMsg, containerID)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "action": "restarted", "message": successMsg})
}

func deleteContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	info, err := dockerClient.ContainerInspect(ctx, containerID)
	if err != nil {
		http.Error(w, "Failed to inspect container", http.StatusInternalServerError)
		return
	}

	if info.State.Running {
		timeout := 10
		stopCtx, stopCancel := context.WithTimeout(context.Background(), 15*time.Second)
		dockerClient.ContainerStop(stopCtx, containerID, container.StopOptions{Timeout: &timeout})
		stopCancel()
		time.Sleep(2 * time.Second)
	}

	removeCtx, removeCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer removeCancel()
	dockerClient.ContainerRemove(removeCtx, containerID, container.RemoveOptions{Force: true})

	successMsg := fmt.Sprintf("Container %s deleted successfully", containerID)
	SendContainerEvent(containerID, "delete", "deleted", successMsg)
	SendActivityLog("success", successMsg, containerID)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "action": "deleted", "message": successMsg})
}

func getContainers(w http.ResponseWriter, r *http.Request) {
	containers, err := getContainersList()
	if err != nil {
		http.Error(w, "Failed to get containers", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(containers)
}

// ==================== Image Operations ====================

func getImages(w http.ResponseWriter, r *http.Request) {
	images, err := getImagesList()
	if err != nil {
		http.Error(w, "Failed to get images", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(images)
}

func pullImage(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ImageName string `json:"imageName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if request.ImageName == "" {
		http.Error(w, "Image name is required", http.StatusBadRequest)
		return
	}

	SendImageEvent(request.ImageName, "pull", "started", "Starting image pull...")
	SendActivityLog("info", fmt.Sprintf("Pulling image: %s", request.ImageName), "")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// FIXED: use image.PullOptions instead of types.ImagePullOptions
	out, err := dockerClient.ImagePull(ctx, request.ImageName, image.PullOptions{})
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to pull image: %v", err)
		SendImageEvent(request.ImageName, "pull", "failed", errorMsg)
		SendActivityLog("error", errorMsg, "")
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}
	defer out.Close()

	buf := make([]byte, 1024)
	var lastUpdate time.Time
	for {
		n, err := out.Read(buf)
		if n > 0 && time.Since(lastUpdate) > 500*time.Millisecond {
			SendImageEvent(request.ImageName, "pull", "downloading", "Downloading layers...")
			lastUpdate = time.Now()
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			errorMsg := fmt.Sprintf("Error reading pull output: %v", err)
			SendImageEvent(request.ImageName, "pull", "failed", errorMsg)
			SendActivityLog("error", errorMsg, "")
			http.Error(w, errorMsg, http.StatusInternalServerError)
			return
		}
	}

	successMsg := fmt.Sprintf("Image %s pulled successfully", request.ImageName)
	SendImageEvent(request.ImageName, "pull", "completed", successMsg)
	SendActivityLog("success", successMsg, "")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": successMsg})
}

func deleteImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	imageID := vars["id"]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All:     true,
		Filters: filters.NewArgs(filters.Arg("ancestor", imageID)),
	})
	if err != nil || len(containers) > 0 {
		errorMsg := fmt.Sprintf("Cannot delete image %s: used by container(s)", imageID)
		http.Error(w, errorMsg, http.StatusConflict)
		SendActivityLog("warning", errorMsg, "")
		return
	}

	// FIXED: use image.RemoveOptions instead of types.ImageRemoveOptions
	_, err = dockerClient.ImageRemove(ctx, imageID, image.RemoveOptions{
		Force:         false,
		PruneChildren: true,
	})
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to delete image: %v", err)
		SendImageEvent(imageID, "delete", "failed", errorMsg)
		SendActivityLog("error", errorMsg, "")
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	successMsg := fmt.Sprintf("Image %s deleted successfully", imageID)
	SendImageEvent(imageID, "delete", "completed", successMsg)
	SendActivityLog("success", successMsg, "")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": successMsg})
}

func pruneImages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	report, err := dockerClient.ImagesPrune(ctx, filters.NewArgs())
	if err != nil {
		http.Error(w, "Failed to prune images", http.StatusInternalServerError)
		SendActivityLog("error", "Failed to prune images", "")
		return
	}

	successMsg := fmt.Sprintf("Pruned %d unused image(s)", len(report.ImagesDeleted))
	SendActivityLog("success", successMsg, "")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       successMsg,
		"deleted":       report.ImagesDeleted,
		"spaceReclaimed": report.SpaceReclaimed,
	})
}

func getActivityLogs(w http.ResponseWriter, r *http.Request) {
	logMutex.RLock()
	defer logMutex.RUnlock()
	json.NewEncoder(w).Encode(activityLogs)
}

// ==================== Helpers ====================

func getContainersList() ([]Container, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []Container
	for _, c := range containers {
		id := c.ID
		if len(id) > 12 {
			id = id[:12]
		}
		result = append(result, Container{
			ID:     id,
			Names:  c.Names,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
		})
	}
	return result, nil
}

func getImagesList() ([]Image, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// FIXED: use image.ListOptions instead of types.ImageListOptions
	images, err := dockerClient.ImageList(ctx, image.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []Image
	for _, img := range images {
		id := img.ID
		if len(id) > 20 {
			id = id[7:19]
		} else if len(id) > 12 {
			id = id[:12]
		}

		containers, _ := dockerClient.ContainerList(ctx, container.ListOptions{
			All:     true,
			Filters: filters.NewArgs(filters.Arg("ancestor", img.ID)),
		})

		result = append(result, Image{
			ID:          id,
			RepoDigests: img.RepoDigests,
			RepoTags:    img.RepoTags,
			Created:     img.Created,
			Size:        img.Size,
			VirtualSize: img.VirtualSize,
			Containers:  len(containers),
		})
	}
	return result, nil
}

func startContainerBroadcaster() {
	for {
		time.Sleep(5 * time.Second)
		containers, err := getContainersList()
		if err != nil {
			continue
		}
		message := map[string]interface{}{
			"type":       "container_update",
			"containers": containers,
			"timestamp":  time.Now().Unix(),
		}
		jsonMessage, _ := json.Marshal(message)
		BroadcastToAll(jsonMessage)
	}
}