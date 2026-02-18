#!/bin/bash

# Health Check Script
# Verifies that all services are running and responsive

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}ResumeAI Health Check${NC}\n"

# Track overall health
HEALTHY=true

# Check Backend
echo -e "${BLUE}Backend Service:${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
    echo -e "  ${GREEN}✓ Running${NC}"
    echo -e "    Response: $HEALTH_RESPONSE"
    
    # Check API Docs
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ API Documentation available at http://localhost:8000/docs${NC}"
    else
        echo -e "  ${YELLOW}⚠ API Documentation not accessible${NC}"
    fi
else
    echo -e "  ${RED}✗ Not running on port 8000${NC}"
    HEALTHY=false
fi

echo ""

# Check Frontend
echo -e "${BLUE}Frontend Service:${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Running${NC}"
    echo -e "    URL: http://localhost:3000"
else
    echo -e "  ${RED}✗ Not running on port 3000${NC}"
    HEALTHY=false
fi

echo ""

# Check Port Availability
echo -e "${BLUE}Port Status:${NC}"
netstat -tlnp 2>/dev/null | grep -E ":(8000|3000)" | while read line; do
    echo -e "  ${GREEN}✓${NC} $line"
done || echo -e "  ${YELLOW}⚠ No services running on expected ports${NC}"

echo ""

# Check File System
echo -e "${BLUE}File System:${NC}"

if [ -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "  ${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "  ${RED}✗ Frontend dependencies missing (run: npm install)${NC}"
    HEALTHY=false
fi

if [ -d "$PROJECT_ROOT/resume-api/venv" ]; then
    echo -e "  ${GREEN}✓ Backend virtual environment exists${NC}"
else
    echo -e "  ${RED}✗ Backend virtual environment missing (run: make install)${NC}"
    HEALTHY=false
fi

if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "  ${GREEN}✓ Frontend .env.local exists${NC}"
else
    echo -e "  ${YELLOW}⚠ Frontend .env.local missing${NC}"
fi

if [ -f "$PROJECT_ROOT/resume-api/.env" ]; then
    echo -e "  ${GREEN}✓ Backend .env exists${NC}"
else
    echo -e "  ${YELLOW}⚠ Backend .env missing${NC}"
fi

echo ""

# Summary
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All systems operational!${NC}"
    echo ""
    echo -e "${BLUE}Quick Links:${NC}"
    echo -e "  ${GREEN}Frontend:   http://localhost:3000${NC}"
    echo -e "  ${GREEN}Backend:    http://localhost:8000${NC}"
    echo -e "  ${GREEN}API Docs:   http://localhost:8000/docs${NC}"
    exit 0
else
    echo -e "${RED}✗ Some services are not running or not properly configured${NC}"
    echo ""
    echo -e "${YELLOW}To start services, run:${NC}"
    echo -e "  ${YELLOW}make start${NC}"
    exit 1
fi
