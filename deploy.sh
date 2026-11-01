#!/usr/bin/env bash
# ==========================================================
# Automated Docker Deployment Script for Business Hub Backend
# Runs container on Port 3004 (Host) -> 3000 (Container)
# All environment variables are loaded dynamically from .env
# ==========================================================

set -e

# Change to backend directory
cd "$(dirname "$0")"

echo "=========================================================="
echo " Starting Business Hub Backend Docker Deployment (Port 3004)..."
echo "=========================================================="

# 1. Check for .env file
if [ ! -f .env ]; then
  echo "⚠️  .env file not found!"
  if [ -f .env.example ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please populate .env with your credentials, then re-run ./deploy.sh"
    exit 1
  else
    echo "❌ No .env or .env.example found. Aborting."
    exit 1
  fi
fi

# 2. Check Docker availability
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed on this machine."
  echo "To install Docker on Ubuntu, run:"
  echo "  sudo apt update && sudo apt install -y docker.io docker-compose-v2"
  echo "  sudo usermod -aG docker \$USER"
  echo "Then log out and back in to apply group changes."
  exit 1
fi

# 3. Determine docker compose command (v2 plugin or v1 standalone)
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "❌ Error: Docker Compose is not available."
  exit 1
fi

echo " Using: $DOCKER_COMPOSE"

# 4. Build fresh Docker image
echo " Building Docker image..."
$DOCKER_COMPOSE build --no-cache

# 5. Start / Restart container in background
echo " Starting container in background on port 3004..."
$DOCKER_COMPOSE up -d --remove-orphans

# 6. Wait for container healthcheck
echo " Waiting for application to initialize on http://localhost:3004..."
ATTEMPTS=0
MAX_ATTEMPTS=25
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  sleep 2
  ATTEMPTS=$((ATTEMPTS+1))
  
  CONTAINER_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' business-hub-backend 2>/dev/null || echo "\"unknown\"")
  
  if [ "$CONTAINER_STATUS" = "\"healthy\"" ]; then
    HEALTHY=true
    break
  elif [ "$CONTAINER_STATUS" = "\"unhealthy\"" ]; then
    echo "❌ Container reported unhealthy status."
    break
  fi
  echo -n "."
done

echo ""

if [ "$HEALTHY" = true ]; then
  echo "=========================================================="
  echo " Deployment Successful!"
  echo " Backend running at: http://localhost:3004"
  echo " Health check:       http://localhost:3004/health"
  echo "=========================================================="
  $DOCKER_COMPOSE ps
else
  echo "⚠️  Container is taking longer to respond. Showing recent logs:"
  $DOCKER_COMPOSE logs --tail 30
fi
