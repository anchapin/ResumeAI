#!/bin/bash

# Stop Development Services Script
# Stops both frontend and backend development servers gracefully

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
LOGS_DIR="$PROJECT_ROOT/logs"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping ResumeAI Development Services${NC}\n"

stop_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping $service_name (PID: $pid)...${NC}"
            kill $pid
            rm -f "$pid_file"
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠ $service_name process not running (removing stale PID file)${NC}"
            rm -f "$pid_file"
        fi
    elif netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${YELLOW}$service_name found on port $port but no PID file. Killing by port...${NC}"
        lsof -i :$port 2>/dev/null | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}⚠ $service_name not running${NC}"
    fi
}

# Stop backend
stop_service "Backend" "$LOGS_DIR/backend.pid" 8000

# Stop frontend
stop_service "Frontend" "$LOGS_DIR/frontend.pid" 3000

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
