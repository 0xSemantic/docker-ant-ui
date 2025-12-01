.PHONY: build run dev test clean deps lint

BINARY_NAME=docker-ui-backend

build:
	@echo "Building backend..."
	go build -o $(BINARY_NAME) main.go

run: build
	@echo "Starting backend server..."
	./$(BINARY_NAME)

dev:
	@echo "Starting development server with hot reload..."
	air -c .air.toml

test:
	@echo "Running tests..."
	go test -v ./...

clean:
	@echo "Cleaning up..."
	go clean
	rm -f $(BINARY_NAME)
	rm -rf tmp/

deps:
	@echo "Installing dependencies..."
	go mod download
	go install github.com/cosmtrek/air@latest

lint:
	@echo "Running linter..."
	golangci-lint run

docker-build:
	@echo "Building Docker image..."
	docker build -t docker-ant-ui-backend .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock docker-ant-ui-backend

install-tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/cosmtrek/air@latest

help:
	@echo "Available commands:"
	@echo "  build        - Build the backend binary"
	@echo "  run          - Build and run the backend"
	@echo "  dev          - Start development server with hot reload"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  deps         - Install dependencies"
	@echo "  lint         - Run linter"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  install-tools - Install development tools"