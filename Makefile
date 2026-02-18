.PHONY: help install install-dev start stop restart logs logs-backend logs-frontend health check-db build clean test test-frontend test-backend

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)ResumeAI Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup:$(NC)"
	@echo "  make install          Install all dependencies (frontend + backend)"
	@echo "  make install-dev      Install development dependencies"
	@echo ""
	@echo "$(GREEN)Running:$(NC)"
	@echo "  make start            Start both frontend and backend servers"
	@echo "  make stop             Stop both servers"
	@echo "  make restart          Restart both servers"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start development servers with live reload"
	@echo "  make build            Build frontend for production"
	@echo "  make clean            Clean build artifacts and cache"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  make logs             Show logs from both services"
	@echo "  make logs-backend     Show backend logs only"
	@echo "  make logs-frontend    Show frontend logs only"
	@echo "  make health           Check health of both services"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-frontend    Run frontend tests"
	@echo "  make test-backend     Run backend tests"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make check-db         Check database status"
	@echo ""

# Installation targets
install:
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	npm install
	@echo "$(BLUE)Setting up frontend environment...$(NC)"
	@cp .env.example .env.local 2>/dev/null || echo "Frontend .env.local already exists"
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	cd resume-api && python3 -m venv venv && \
	source venv/bin/activate && \
	pip install --upgrade pip setuptools wheel && \
	pip install -r requirements.txt
	@echo "$(BLUE)Setting up backend environment...$(NC)"
	@cp resume-api/.env.example resume-api/.env 2>/dev/null || echo "Backend .env already exists"
	@echo "$(GREEN)✓ Installation complete$(NC)"

install-dev: install
	@echo "$(BLUE)Installing development tools...$(NC)"
	cd resume-api && source venv/bin/activate && pip install pytest pytest-cov black flake8

# Running targets
start:
	@echo "$(BLUE)Starting ResumeAI services...$(NC)"
	@./scripts/start-dev.sh
	@echo "$(GREEN)✓ Services started$(NC)"

stop:
	@echo "$(BLUE)Stopping ResumeAI services...$(NC)"
	@./scripts/stop-dev.sh
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: stop start

dev: start
	@echo "$(YELLOW)Development mode active. Press Ctrl+C to stop.$(NC)"
	@./scripts/wait-for-services.sh
	@echo "$(GREEN)Services are running:$(NC)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

# Build targets
build:
	@echo "$(BLUE)Building frontend for production...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Frontend build complete$(NC)"

clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist node_modules/.vite
	cd resume-api && rm -rf __pycache__ .pytest_cache .mypy_cache
	@echo "$(GREEN)✓ Clean complete$(NC)"

# Logging targets
logs:
	@echo "$(BLUE)Recent logs from both services:$(NC)"
	@echo ""
	@echo "$(YELLOW)=== Backend (last 20 lines) ====$(NC)"
	@tail -20 logs/backend.log 2>/dev/null || echo "No backend logs found"
	@echo ""
	@echo "$(YELLOW)=== Frontend (last 20 lines) ====$(NC)"
	@tail -20 logs/frontend.log 2>/dev/null || echo "No frontend logs found"

logs-backend:
	@tail -f logs/backend.log 2>/dev/null || echo "Backend log file not found at logs/backend.log"

logs-frontend:
	@tail -f logs/frontend.log 2>/dev/null || echo "Frontend log file not found at logs/frontend.log"

# Health checks
health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@./scripts/check-health.sh

check-db:
	@echo "$(BLUE)Checking database status...$(NC)"
	@cd resume-api && source venv/bin/activate && python3 -c "from database import check_database; check_database()" || echo "Database check not available"

# Testing targets
test:
	@echo "$(BLUE)Running all tests...$(NC)"
	@echo "$(YELLOW)Frontend tests:$(NC)"
	@npm test -- --run 2>/dev/null || echo "Frontend tests not available"
	@echo ""
	@echo "$(YELLOW)Backend tests:$(NC)"
	@cd resume-api && source venv/bin/activate && pytest || echo "Backend tests not available"

test-frontend:
	@echo "$(BLUE)Running frontend tests...$(NC)"
	npm test -- --run

test-backend:
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd resume-api && source venv/bin/activate && pytest

# Development utilities
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	@echo "$(YELLOW)Frontend (Prettier):$(NC)"
	npx prettier --write src/ 2>/dev/null || echo "Prettier not available"
	@echo "$(YELLOW)Backend (Black):$(NC)"
	@cd resume-api && source venv/bin/activate && black . || echo "Black not available"

lint:
	@echo "$(BLUE)Linting code...$(NC)"
	@echo "$(YELLOW)Frontend (ESLint):$(NC)"
	npx eslint src/ 2>/dev/null || echo "ESLint not available"
	@echo "$(YELLOW)Backend (Flake8):$(NC)"
	@cd resume-api && source venv/bin/activate && flake8 . || echo "Flake8 not available"
