#!/bin/bash
# Test script for Phase 1.2: Dockerize the Resume API service with texlive

set -e

echo "=========================================="
echo "Phase 1.2 Docker Build Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[FAIL]${NC} Docker is not installed"
    exit 1
fi
echo -e "${GREEN}[PASS]${NC} Docker is installed"

# Check if we're in the resume-api directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}[FAIL]${NC} Dockerfile not found in current directory"
    exit 1
fi
echo -e "${GREEN}[PASS]${NC} Dockerfile found"

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}[FAIL]${NC} requirements.txt not found"
    exit 1
fi
echo -e "${GREEN}[PASS]${NC} requirements.txt found"

echo ""
echo "=========================================="
echo "Building Docker Image..."
echo "=========================================="
echo ""

# Build the Docker image
echo "Running: docker build -t resume-api:test ."
if docker build -t resume-api:test .; then
    echo -e "${GREEN}[PASS]${NC} Docker build completed successfully"
else
    echo -e "${RED}[FAIL]${NC} Docker build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "Verifying texlive Installation..."
echo "=========================================="
echo ""

# Run a command in the container to verify texlive
echo "Checking for xelatex in container..."
if docker run --rm resume-api:test which xelatex > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} xelatex is installed"
    docker run --rm resume-api:test xelatex --version | head -n 1
else
    echo -e "${RED}[FAIL]${NC} xelatex is not installed"
    exit 1
fi

echo ""
echo "=========================================="
echo "Verifying Application Entry Point..."
echo "=========================================="
echo ""

# Check if main.py exists in container
echo "Checking for main.py in container..."
if docker run --rm resume-api:test test -f /app/main.py; then
    echo -e "${GREEN}[PASS]${NC} main.py found in container"
else
    echo -e "${RED}[FAIL]${NC} main.py not found in container"
    exit 1
fi

# Check if templates directory exists
echo "Checking for templates directory in container..."
if docker run --rm resume-api:test test -d /app/templates; then
    echo -e "${GREEN}[PASS]${NC} templates directory found in container"
else
    echo -e "${RED}[FAIL]${NC} templates directory not found in container"
    exit 1
fi

# Check if uvicorn is installed
echo "Checking for uvicorn..."
if docker run --rm resume-api.test python -c "import uvicorn; print(uvicorn.__version__)" > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} uvicorn is installed"
else
    echo -e "${RED}[FAIL]${NC} uvicorn is not installed"
    exit 1
fi

echo ""
echo "=========================================="
echo "Testing Application Startup..."
echo "=========================================="
echo ""

# Start the container in the background
echo "Starting container in background..."
CONTAINER_ID=$(docker run -d -p 8001:8000 --name resume-api-test resume-api:test)

# Wait for the container to start
echo "Waiting 5 seconds for application to start..."
sleep 5

# Check if the container is running
if docker ps | grep -q $CONTAINER_ID; then
    echo -e "${GREEN}[PASS]${NC} Container is running"
else
    echo -e "${RED}[FAIL]${NC} Container failed to start"
    docker logs $CONTAINER_ID
    docker rm -f $CONTAINER_ID 2>/dev/null || true
    exit 1
fi

# Check if the application responds on port 8000
echo "Checking health endpoint..."
sleep 2
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Health endpoint responds"
else
    echo -e "${RED}[FAIL]${NC} Health endpoint not responding"
    docker logs $CONTAINER_ID
    docker rm -f $CONTAINER_ID 2>/dev/null || true
    exit 1
fi

# Check if root endpoint responds
echo "Checking root endpoint..."
if curl -f http://localhost:8001/ > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} Root endpoint responds"
else
    echo -e "${RED}[FAIL]${NC} Root endpoint not responding"
    docker logs $CONTAINER_ID
    docker rm -f $CONTAINER_ID 2>/dev/null || true
    exit 1
fi

# Cleanup
echo ""
echo "Cleaning up test container..."
docker stop $CONTAINER_ID > /dev/null 2>&1
docker rm $CONTAINER_ID > /dev/null 2>&1

echo ""
echo "=========================================="
echo -e "${GREEN}ALL TESTS PASSED!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Dockerfile builds successfully"
echo "  - texlive (xelatex) is installed"
echo "  - Application starts and serves on port 8000"
echo "  - Health endpoint responds correctly"
echo ""
