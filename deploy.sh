#!/bin/bash

set -e

echo "🚀 Deploying Docker Ant UI..."

# Create necessary directories
mkdir -p data/postgres data/redis

# Pull latest images
docker-compose -f docker-compose.yml -f docker-compose.db.yml pull

# Stop existing containers
docker-compose -f docker-compose.yml -f docker-compose.db.yml down

# Start new containers
docker-compose -f docker-compose.yml -f docker-compose.db.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
if docker-compose -f docker-compose.yml -f docker-compose.db.yml ps | grep -q "healthy"; then
    echo "✅ All services are healthy!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8080/api/containers"
else
    echo "⚠️ Some services may not be healthy. Check with: docker-compose ps"
fi

echo "🎉 Deployment complete!"