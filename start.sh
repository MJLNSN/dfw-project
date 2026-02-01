#!/bin/bash

# DFW Property Search Platform - Quick Start Script
# Automatically finds available ports and starts all services

set -e

echo "🏠 DFW Property Search Platform"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    while [ $port -lt $((start_port + 100)) ]; do
        if ! lsof -i:$port > /dev/null 2>&1 && ! ss -tuln | grep -q ":$port "; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    echo $start_port
    return 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Find available ports
echo -e "${BLUE}Finding available ports...${NC}"
BACKEND_PORT=$(find_available_port 8000)
FRONTEND_PORT=$(find_available_port 5173)

echo "  Backend port:  $BACKEND_PORT"
echo "  Frontend port: $FRONTEND_PORT"
echo ""

# Check if docker-compose should be used
USE_DOCKER=false
if [ "$1" == "--docker" ] && command_exists docker-compose; then
    USE_DOCKER=true
fi

if [ "$USE_DOCKER" = true ]; then
    echo -e "${BLUE}Starting with Docker Compose...${NC}"
    docker-compose up --build -d
    echo -e "${GREEN}✓ Services started with Docker!${NC}"
    echo ""
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo ""
    echo "To stop: docker-compose down"
    exit 0
fi

echo -e "${BLUE}Starting services manually...${NC}"
echo ""

# =========================================
# Backend Setup
# =========================================
echo -e "${BLUE}[1/2] Setting up Backend...${NC}"
cd "$PROJECT_ROOT/backend"

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "  Installing dependencies..."
pip install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo -e "  ${YELLOW}Creating .env from env.example...${NC}"
    cp env.example .env
    echo -e "  ${YELLOW}⚠️  Please edit backend/.env with your database and AWS credentials${NC}"
fi

# Check if .env has required values
if grep -q "YOUR_PASSWORD" .env 2>/dev/null || grep -q "XXXXXXXXX" .env 2>/dev/null; then
    echo -e "  ${RED}⚠️  WARNING: backend/.env contains placeholder values!${NC}"
    echo -e "  ${RED}   Please update DATABASE_URL and COGNITO settings${NC}"
fi

# Update ALLOWED_ORIGINS to include frontend port
echo "  Updating ALLOWED_ORIGINS for CORS..."
if grep -q "^ALLOWED_ORIGINS=" .env; then
    # Remove old localhost:517x entries and add new one
    CURRENT_ORIGINS=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2-)
    # Remove any localhost:517x or localhost:3000 entries
    NEW_ORIGINS=$(echo "$CURRENT_ORIGINS" | sed -E 's|http://localhost:[0-9]+||g' | sed 's/,,*/,/g' | sed 's/^,//;s/,$//')
    # Add current frontend port and common defaults
    if [ -n "$NEW_ORIGINS" ]; then
        sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT,http://localhost:3000,http://localhost:5173,$NEW_ORIGINS|" .env
    else
        sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT,http://localhost:3000,http://localhost:5173|" .env
    fi
    echo -e "  ${GREEN}✓ Updated CORS to allow http://localhost:$FRONTEND_PORT${NC}"
fi

# Start backend
echo "  Starting uvicorn on port $BACKEND_PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!
sleep 2

# Verify backend is running
if curl -s --max-time 5 "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend started successfully (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check backend/.env configuration.${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd "$PROJECT_ROOT"

# =========================================
# Frontend Setup
# =========================================
echo ""
echo -e "${BLUE}[2/2] Setting up Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
fi

# Create .env.local if not exists
if [ ! -f ".env.local" ]; then
    echo -e "  ${YELLOW}Creating .env.local from env.example...${NC}"
    cp env.example .env.local
    echo -e "  ${YELLOW}⚠️  Please edit frontend/.env.local with your Mapbox token${NC}"
fi

# Update VITE_API_URL to use the correct backend port
if [ -f ".env.local" ]; then
    # Update or add VITE_API_URL
    if grep -q "VITE_API_URL" .env.local; then
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://localhost:$BACKEND_PORT|" .env.local
    else
        echo "VITE_API_URL=http://localhost:$BACKEND_PORT" >> .env.local
    fi
    echo "  Updated VITE_API_URL to http://localhost:$BACKEND_PORT"
fi

# Check if .env.local has required values
if grep -q "your_mapbox_token_here" .env.local 2>/dev/null; then
    echo -e "  ${RED}⚠️  WARNING: frontend/.env.local needs Mapbox token!${NC}"
    echo -e "  ${RED}   Get one from: https://account.mapbox.com/access-tokens/${NC}"
fi

# Start frontend
echo "  Starting Vite dev server on port $FRONTEND_PORT..."
npm run dev -- --port $FRONTEND_PORT &
FRONTEND_PID=$!
sleep 3

# Verify frontend is running
if curl -s --max-time 5 "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting...${NC}"
fi

cd "$PROJECT_ROOT"

# =========================================
# Success!
# =========================================
echo ""
echo "================================"
echo -e "${GREEN}🎉 Services started successfully!${NC}"
echo "================================"
echo ""
echo "  📱 Frontend: http://localhost:$FRONTEND_PORT"
echo "  🔧 Backend:  http://localhost:$BACKEND_PORT"
echo "  📚 API Docs: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "================================"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# Wait for services
wait
