#!/bin/bash

# DFW Property Search Platform - Quick Start Script

set -e

echo "🏠 DFW Property Search Platform"
echo "================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}Starting with Docker Compose...${NC}"
    docker-compose up --build -d
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo ""
    echo "To stop: docker-compose down"
else
    echo "Docker Compose not found. Starting services manually..."
    echo ""
    
    # Backend
    echo -e "${BLUE}Starting Backend...${NC}"
    cd backend
    
    # Create virtual environment if not exists
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt -q
    
    # Create .env if not exists
    if [ ! -f ".env" ]; then
        cp env.example .env
    fi
    
    # Start backend in background
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    
    cd ..
    
    # Frontend
    echo -e "${BLUE}Starting Frontend...${NC}"
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Create .env.local if not exists
    if [ ! -f ".env.local" ]; then
        echo "⚠️  Creating .env.local from env.example..."
        cp env.example .env.local
        echo "⚠️  Please edit frontend/.env.local with your Mapbox token and AWS Cognito credentials"
    fi
    
    # Start frontend
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    
    cd ..
    
    echo ""
    echo "================================"
    echo -e "${GREEN}Services started successfully!${NC}"
    echo ""
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
    wait
fi

