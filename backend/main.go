package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

// Container represents a simplified container for the frontend
type Container struct {
	ID      string   `json:"id"`
	Names   []string `json:"names"`
	Image   string   `json:"image"`
	State   string   `json:"state"`
	Status  string   `json:"status"`
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
	log.Println("✅ Connected to Docker daemon")

	// Initialize activity logs
	activityLogs = make([]ActivityLog, 0)
	
	// Add initial log
	addActivityLog("system", "Docker Ant UI backend started", "")

	// Start WebSocket broadcaster in background
	go startContainerBroadcaster()

	// Set up HTTP router
	router := mux.NewRouter()

	// WebSocket endpoint
	router.HandleFunc("/ws", WebSocketHandler)

	// API endpoints
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

	log.Println("🚀 Backend server starting on :8080")
	log.Println("🌐 API: http://localhost:8080/api/containers")
	log.Println("📡 WebSocket: ws://localhost:8080/ws")
	log.Fatal(server.ListenAndServe())
}

// WebSocketHandler handles WebSocket connections
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Register client
	wsMutex.Lock()
	clients[conn] = true
	wsMutex.Unlock()
	
	log.Printf("New WebSocket client connected")

	// Send initial container list
	sendContainerList(conn)

	// Set up ping/pong to keep connection alive
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	// Keep connection alive
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("WebSocket ping failed: %v", err)
				
				// Unregister client
				wsMutex.Lock()
				delete(clients, conn)
				wsMutex.Unlock()
				return
			}
		default:
			messageType, _, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				
				// Unregister client
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

// BroadcastToAll sends message to all connected clients
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

// sendContainerList sends current container list to a client
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

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling container list: %v", err)
		return
	}

	conn.WriteMessage(websocket.TextMessage, jsonMessage)
}

// SendContainerEvent sends container status change to all clients
func SendContainerEvent(containerID, action, status, message string) {
	event := map[string]interface{}{
		"type":        "container_event",
		"containerId": containerID,
		"action":      action,
		"status":      status,
		"message":     message,
		"timestamp":   time.Now().Unix(),
	}

	jsonEvent, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling event: %v", err)
		return
	}

	BroadcastToAll(jsonEvent)
}

// SendActivityLog sends activity log to all clients
func SendActivityLog(logType, message, containerID string) {
	logEntry := ActivityLog{
		ID:        fmt.Sprintf("log-%d", time.Now().UnixNano()),
		Type:      logType,
		Message:   message,
		Container: containerID,
		Timestamp: time.Now(),
	}

	// Store log
	logMutex.Lock()
	activityLogs = append(activityLogs, logEntry)
	// Keep only last 100 logs
	if len(activityLogs) > 100 {
		activityLogs = activityLogs[len(activityLogs)-100:]
	}
	logMutex.Unlock()

	// Send to WebSocket clients
	event := map[string]interface{}{
		"type":      "activity_log",
		"log":       logEntry,
		"timestamp": time.Now().Unix(),
	}

	jsonEvent, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling activity log: %v", err)
		return
	}

	BroadcastToAll(jsonEvent)
}

func addActivityLog(logType, message, containerID string) {
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
}

// Synchronous operations with better error handling
func startContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	log.Printf("Starting container: %s", containerID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := dockerClient.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		errorMsg := fmt.Sprintf("Failed to start container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s started successfully", containerID)
	
	// Send WebSocket event
	SendContainerEvent(containerID, "start", "running", successMsg)
	SendActivityLog("success", successMsg, containerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"action":  "started",
		"message": successMsg,
	})
}

func stopContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	log.Printf("Stopping container: %s", containerID)

	// Use a longer timeout for stop (some containers need time to gracefully shutdown)
	timeout := 30 // seconds
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()

	if err := dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		errorMsg := fmt.Sprintf("Failed to stop container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s stopped successfully", containerID)
	
	// Send WebSocket event
	SendContainerEvent(containerID, "stop", "stopped", successMsg)
	SendActivityLog("success", successMsg, containerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"action":  "stopped",
		"message": successMsg,
	})
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	log.Printf("Restarting container: %s", containerID)

	// Stop first
	timeout := 30
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()

	if err := dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		errorMsg := fmt.Sprintf("Failed to stop container for restart: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	// Small delay before starting
	time.Sleep(2 * time.Second)

	// Then start
	ctx2, cancel2 := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel2()

	if err := dockerClient.ContainerStart(ctx2, containerID, container.StartOptions{}); err != nil {
		errorMsg := fmt.Sprintf("Failed to start container after restart: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s restarted successfully", containerID)
	
	// Send WebSocket event
	SendContainerEvent(containerID, "restart", "running", successMsg)
	SendActivityLog("success", successMsg, containerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"action":  "restarted",
		"message": successMsg,
	})
}

func deleteContainer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	log.Printf("Deleting container: %s", containerID)

	// First, stop the container if it's running
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check container status
	info, err := dockerClient.ContainerInspect(ctx, containerID)
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to inspect container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	// Stop if running
	if info.State.Running {
		timeout := 10
		stopCtx, stopCancel := context.WithTimeout(context.Background(), 15*time.Second)
		if err := dockerClient.ContainerStop(stopCtx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
			stopCancel()
			errorMsg := fmt.Sprintf("Failed to stop container before deletion: %v", err)
			http.Error(w, errorMsg, http.StatusInternalServerError)
			SendActivityLog("error", errorMsg, containerID)
			return
		}
		stopCancel()
		time.Sleep(2 * time.Second)
	}

	// Now remove the container
	removeCtx, removeCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer removeCancel()

	removeOptions := container.RemoveOptions{
		Force:         true, // Force remove if needed
		RemoveVolumes: false,
		RemoveLinks:   false,
	}

	if err := dockerClient.ContainerRemove(removeCtx, containerID, removeOptions); err != nil {
		errorMsg := fmt.Sprintf("Failed to delete container: %v", err)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		SendActivityLog("error", errorMsg, containerID)
		return
	}

	successMsg := fmt.Sprintf("Container %s deleted successfully", containerID)
	
	// Send WebSocket events
	SendContainerEvent(containerID, "delete", "deleted", successMsg)
	SendActivityLog("success", successMsg, containerID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"action":  "deleted",
		"message": successMsg,
	})
}

// Get containers
func getContainers(w http.ResponseWriter, r *http.Request) {
	containers, err := getContainersList()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get containers: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containers)
}

// Get activity logs
func getActivityLogs(w http.ResponseWriter, r *http.Request) {
	logMutex.RLock()
	defer logMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activityLogs)
}

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
			ID:      id,
			Names:   c.Names,
			Image:   c.Image,
			State:   c.State,
			Status:  c.Status,
		})
	}

	return result, nil
}

// Broadcast container updates every 5 seconds
func startContainerBroadcaster() {
	for {
		time.Sleep(5 * time.Second)
		
		containers, err := getContainersList()
		if err != nil {
			log.Printf("Error getting container list for broadcast: %v", err)
			continue
		}

		message := map[string]interface{}{
			"type":       "container_update",
			"containers": containers,
			"timestamp":  time.Now().Unix(),
		}

		jsonMessage, err := json.Marshal(message)
		if err != nil {
			log.Printf("Error marshaling broadcast message: %v", err)
			continue
		}

		BroadcastToAll(jsonMessage)
	}
}