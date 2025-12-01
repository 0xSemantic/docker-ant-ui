#!/bin/bash

echo "Testing Docker Ant UI Image Management System..."

# Test 1: List images
echo "1. Listing images..."
curl -s http://localhost:8080/api/images | jq '. | length'

# Test 2: Pull an image
echo "2. Pulling nginx:alpine..."
curl -X POST http://localhost:8080/api/images/pull \
  -H "Content-Type: application/json" \
  -d '{"imageName": "nginx", "tag": "alpine"}'

# Wait for pull to complete
echo "Waiting 30 seconds for pull to complete..."
sleep 30

# Test 3: List images again
echo "3. Listing images after pull..."
curl -s http://localhost:8080/api/images | jq '.[] | select(.repoTags[0] | contains("nginx"))'

# Test 4: Inspect image
echo "4. Inspecting nginx image..."
curl -s http://localhost:8080/api/images/nginx:alpine/inspect | jq '.repoTags'

# Test 5: Prune unused images
echo "5. Pruning unused images..."
curl -X POST http://localhost:8080/api/images/prune

echo "✅ Image management tests completed!"