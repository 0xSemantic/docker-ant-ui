package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gorilla/websocket"
)

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
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
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()
	log.Printf("New WebSocket client connected. Total clients: %d", len(clients))

	// Send initial container list
	sendContainerList(conn)

	// Keep connection alive
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			break
		}
		
		// Echo message back (for testing)
		if err := conn.WriteMessage(messageType, p); err != nil {
			break
		}
	}

	// Unregister client
	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	log.Printf("WebSocket client disconnected. Total clients: %d", len(clients))
}

// BroadcastToAll sends message to all connected clients
func BroadcastToAll(message []byte) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

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
func SendContainerEvent(containerID, action, status string) {
	event := map[string]interface{}{
		"type":        "container_event",
		"containerId": containerID,
		"action":      action,
		"status":      status,
		"timestamp":   time.Now().Unix(),
	}

	jsonEvent, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling event: %v", err)
		return
	}

	BroadcastToAll(jsonEvent)
}

// Fast operations with immediate response
func fastStopContainer(cli *client.Client, containerID string) error {
	// Use minimal timeout for quick response
	timeout := 2
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
	defer cancel()

	return cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

func fastStartContainer(cli *client.Client, containerID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
	defer cancel()

	return cli.ContainerStart(ctx, containerID, container.StartOptions{})
}