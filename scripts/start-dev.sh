#!/bin/bash

# Start Development Services Script
# Starts both frontend and backend development servers with proper logging

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
LOGS_DIR="$PROJECT_ROOT/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting ResumeAI Development Services${NC}\n"

# Check if services are already running
check_port() {
    netstat -tlnp 2>/dev/null | grep -q ":$1 " && return 0 || return 1
}

# Backend startup
echo -e "${BLUE}Starting Backend (FastAPI)...${NC}"
if check_port 8000; then
    echo -e "${YELLOW}⚠ Port 8000 is already in use. Skipping backend startup.${NC}"
else
    cd "$PROJECT_ROOT/resume-api"
    
    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate venv and start backend
    source venv/bin/activate
    
    # Start backend in background with logging
    python main.py > "$LOGS_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOGS_DIR/backend.pid"
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "  Logs: $LOGS_DIR/backend.log"
    
    # Wait for backend to be ready
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ Backend failed to start${NC}"
            echo -e "Check logs: tail -f $LOGS_DIR/backend.log"
            exit 1
        fi
        sleep 1
    done
fi

echo ""

# Frontend startup
echo -e "${BLUE}Starting Frontend (Vite + React)...${NC}"
if check_port 3000; then
    echo -e "${YELLOW}⚠ Port 3000 is already in use. Skipping frontend startup.${NC}"
else
    cd "$PROJECT_ROOT"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing Node dependencies...${NC}"
        npm install
    fi
    
    # Start frontend in background with logging
    npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$LOGS_DIR/frontend.pid"
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "  Logs: $LOGS_DIR/frontend.log"
    
    # Wait for frontend to be ready
    echo -e "${YELLOW}Waiting for frontend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}⚠ Frontend is taking longer than expected${NC}"
            echo -e "Check logs: tail -f $LOGS_DIR/frontend.log"
        fi
        sleep 1
    done
fi

echo ""
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo ""
echo -e "${BLUE}Available endpoints:${NC}"
echo -e "  ${GREEN}Frontend:   http://localhost:3000${NC}"
echo -e "  ${GREEN}Backend:    http://localhost:8000${NC}"
echo -e "  ${GREEN}API Docs:   http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:     ${YELLOW}make logs${NC}"
echo -e "  Stop services: ${YELLOW}make stop${NC}"
echo -e "  Check health:  ${YELLOW}make health${NC}"
echo ""
