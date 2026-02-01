#!/bin/bash

# DFW Property Search Platform - Clean Start Script
# Optimized log output with minimal noise

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo ""
echo "🏠 DFW Property Search Platform"
echo "================================"
echo ""

# Find available port
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
}

# Cleanup on exit
cleanup() {
    echo ""
    log_info "Stopping services..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    log_success "Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Find ports
log_info "Finding available ports..."
BACKEND_PORT=$(find_available_port 8000)
FRONTEND_PORT=$(find_available_port 5173)
echo "  Backend:  $BACKEND_PORT"
echo "  Frontend: $FRONTEND_PORT"
echo ""

# Backend
echo "[1/2] Backend"
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv venv > /dev/null 2>&1
fi

source venv/bin/activate
pip install -r requirements.txt -q > /dev/null 2>&1

if [ ! -f ".env" ]; then
    log_warning "Creating .env from template"
    cp env.example .env
fi

# Update CORS quietly
if grep -q "^ALLOWED_ORIGINS=" .env; then
    CURRENT_ORIGINS=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2-)
    NEW_ORIGINS=$(echo "$CURRENT_ORIGINS" | sed -E 's|http://localhost:[0-9]+||g' | sed 's/,,*/,/g' | sed 's/^,//;s/,$//')
    if [ -n "$NEW_ORIGINS" ]; then
        sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT,http://localhost:3000,http://localhost:5173,$NEW_ORIGINS|" .env
    else
        sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT,http://localhost:3000,http://localhost:5173|" .env
    fi
fi

log_info "Starting backend on port $BACKEND_PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait for backend
sleep 2
if curl -s --max-time 3 http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    log_success "Backend started (PID: $BACKEND_PID)"
else
    log_error "Backend failed to start"
    exit 1
fi
echo ""

# Frontend
echo "[2/2] Frontend"
cd "$PROJECT_ROOT/frontend"

if [ ! -f ".env.local" ]; then
    log_warning "Creating .env.local from template"
    cp env.example .env.local
fi

# Update API URL
sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://localhost:$BACKEND_PORT|" .env.local

log_info "Starting frontend on port $FRONTEND_PORT..."
npm run dev -- --port $FRONTEND_PORT > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait for frontend
sleep 3
if curl -s --max-time 3 http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    log_success "Frontend started (PID: $FRONTEND_PID)"
else
    log_error "Frontend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "================================"
echo "🎉 All services running!"
echo "================================"
echo ""
echo "  📱 Frontend: http://localhost:$FRONTEND_PORT"
echo "  🔧 Backend:  http://localhost:$BACKEND_PORT"
echo "  📚 API Docs: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "================================"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Keep script running
wait
