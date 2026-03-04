#!/bin/bash

# Start Everything: Backend, Frontend, and Cloudflare Tunnel

TUNNEL_NAME="solar-plant"

echo "🌟 Starting Solar Plant Multi-Service Environment..."

# Function to kill child processes on exit
cleanup() {
    echo "👋 Shutting down..."
    kill $(jobs -p)
    exit
}
trap cleanup SIGINT SIGTERM

# 1. Start Backend
echo "🚀 Starting Backend (Node.js)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 2. Wait for backend to be ready (optional but good)
sleep 2

# 3. Start Frontend
echo "🚀 Starting Frontend (Vite)..."
npm run dev &
FRONTEND_PID=$!

# 4. Start Cloudflare Tunnel
echo "🚀 Starting Cloudflare Tunnel ($TUNNEL_NAME)..."
if command -v cloudflared &> /dev/null; then
    cloudflared tunnel run "$TUNNEL_NAME" &
    TUNNEL_PID=$!
else
    echo "⚠️ cloudflared not found! Public URL will not be accessible."
fi

echo "✅ All services are running!"
echo "- Local UI: http://localhost:8081"
echo "- Public UI: https://solar.oniisama.cloud"
echo "Press Ctrl+C to stop all services."

# Wait for all background processes to finish
wait
