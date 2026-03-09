---
name: docker-build
description: "Build and run Docker containers for the ResumeAI application."
---

# Docker Build Skill

This skill provides commands for building and running Docker containers for the ResumeAI application.

## Capabilities

- **Build Images**: Build frontend and backend Docker images
- **Run Containers**: Run application containers
- **Docker Compose**: Use docker-compose for full stack
- **Local Development**: Run development environment with hot reload
- **Container Management**: Start, stop, and manage containers

## Prerequisites

- Docker is installed
- Docker Compose is installed
- Ports 3000, 5432, 8000 are available (or configured differently)

## Usage

### Build Docker Images

```bash
# Build frontend image
docker build -t resumeai-frontend:latest .

# Build backend image
docker build -t resumeai-backend:latest -f Dockerfile.backend .

# Build all images
docker-compose build
```

### Run Containers

```bash
# Run frontend
docker run -p 3000:3000 resumeai-frontend:latest

# Run backend
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///resumeai.db resumeai-backend:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Local Development with Docker

```bash
# Use local development compose file
docker-compose -f docker-compose.local.yml up

# Or with override
docker-compose -f docker-compose.yml -f docker-compose.local.yml up
```

### Useful Docker Commands

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container logs
docker logs <container_id>

# Execute command in container
docker exec -it <container_id> bash

# Remove unused images
docker image prune

# Remove stopped containers
docker container prune
```

## Docker Compose Services

The project typically defines:
- `frontend` - React frontend application
- `backend` - FastAPI backend
- `postgres` - PostgreSQL database (production)
- `redis` - Redis cache (production)

## Environment Variables

Create `.env.docker` or `.env.local` with:
```
DATABASE_URL=postgresql://user:pass@postgres:5432/resumeai
REDIS_URL=redis://redis:6379
API_URL=http://localhost:8000
```

## Building for Production

```bash
# Build production images
docker build -t resumeai-frontend:latest --target production .

# Or use multi-stage build
docker build -t resumeai-backend:latest .
```

## Tips

- Use `docker-compose up --build` to rebuild after code changes
- Use volumes for development to enable hot reload
- Check `.dockerignore` to exclude unnecessary files
- Use `docker system prune` to clean up disk space
- Use specific tags for images in production (not `latest`)
