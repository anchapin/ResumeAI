#!/bin/bash

# Wait for Services to be Ready
# Polls health endpoints until services are responsive

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Waiting for services to be ready...${NC}\n"

# Wait for backend
echo -e "${YELLOW}Waiting for backend...${NC}"
max_attempts=60
attempt=0
while ! curl -s http://localhost:8000/health > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo -e "${GREEN}✓ Backend ready${NC}"

# Wait for frontend
echo -e "${YELLOW}Waiting for frontend...${NC}"
attempt=0
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${YELLOW}⚠ Frontend taking longer than expected${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo -e "${GREEN}✓ Frontend ready${NC}"

echo ""
echo -e "${GREEN}All services are ready!${NC}"
