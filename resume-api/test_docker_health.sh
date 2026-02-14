#!/bin/bash
# Script to build and test the Docker health check functionality

set -e  # Exit on any error

echo "Building the Resume API Docker image..."
cd /home/alexc/Projects/ResumeAI/resume-api

# Build the Docker image
docker build -t resume-api:test .

# Run the container in detached mode
echo "Starting container with health check..."
docker run -d --name test-resume-api -p 8000:8000 resume-api:test

# Wait a moment for the container to start
sleep 5

echo "Checking container health status..."
# Continuously check the health status
for i in {1..10}; do
    status=$(docker inspect --format='{{json .State.Health}}' test-resume-api | jq -r '.Status')
    echo "Health status at $(date): $status"
    
    if [ "$status" = "healthy" ]; then
        echo "✓ Container is healthy!"
        break
    elif [ "$status" = "unhealthy" ]; then
        echo "✗ Container is unhealthy!"
        break
    fi
    
    sleep 5
done

# Clean up
echo "Stopping and removing test container..."
docker stop test-resume-api
docker rm test-resume-api

echo "Test completed."