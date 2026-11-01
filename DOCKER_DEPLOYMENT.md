# Docker Deployment Guide - Business Hub Backend

This guide details how to build, run, and manage the **Business Hub Backend** in Docker on host port **3004**.

---

## 🔒 Security & Environment Variables

- **Zero hardcoded secrets**: No credentials, database URIs, or API keys are baked into the `Dockerfile` or `docker-compose.yml`.
- **Dynamic injection**: All variables (`MONGODB_URI`, `JWT_SECRET`, `SMTP_*`, etc.) are read dynamically from your local `.env` file at container runtime.
- **`.dockerignore`**: Ensures `.env`, `node_modules`, and local build artifacts are never copied into Docker image layers.

---

## 1. Prerequisites (If Docker is not yet installed)

If Docker is not currently installed on your Ubuntu machine, run:

```bash
# 1. Install Docker & Docker Compose plugin
sudo apt update
sudo apt install -y docker.io docker-compose-v2

# 2. Add your user to the docker group (to run without sudo)
sudo usermod -aG docker $USER

# 3. Apply group changes (or log out and back in)
newgrp docker
```

Verify installation:
```bash
docker --version
docker compose version
```

---

## 2. Configuration (`.env`)

Ensure your `business-hub-backend/.env` file contains your configuration:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=business-hub
MONGODB_DB_NAME=business_hub
JWT_SECRET=supersecret_jwt_key_business_hub

# Brevo SMTP Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_brevo_user
SMTP_PASS=your_brevo_key
SMTP_FROM="Business Hub" <contact@business-hub.mjbsoft.tech>
```

> **Note:** The backend container internally listens on port `3000`, which is forwarded to host port **`3004`**.

---

## 3. Quick Deployment

### Option A: Using the Automated Deploy Script (Recommended)
```bash
cd business-hub-backend
./deploy.sh
```

### Option B: Using Docker Compose
```bash
cd business-hub-backend
docker compose up -d --build
```

### Option C: Using Standalone Docker CLI
```bash
cd business-hub-backend

# Build image
docker build -t business-hub-backend .

# Run container mapping host port 3004 -> container port 3000
docker run -d \
  --name business-hub-backend \
  --restart unless-stopped \
  -p 3004:3000 \
  --env-file .env \
  business-hub-backend
```

---

## 4. Verification & Testing

Once running, test the endpoints on port **3004**:

```bash
# Health check
curl http://localhost:3004/health
# Expected: {"status":"ok","uptime":...,"timestamp":"..."}

# API check (Hello)
curl http://localhost:3004/
# Expected: Hello World!
```

---

## 5. Management Commands

```bash
# View container logs in real time
docker logs -f business-hub-backend

# Check container status & resource usage
docker ps -f name=business-hub-backend
docker stats business-hub-backend

# Restart container
docker restart business-hub-backend

# Stop and remove container
docker compose down
# OR: docker stop business-hub-backend && docker rm business-hub-backend
```
