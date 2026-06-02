#!/bin/bash
echo "Starting Backend..."
cd backend
../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..
sleep 2

echo "Starting Frontend..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend available at http://172.24.104.24:3000 or http://172.24.104.24:3002"
echo "Backend available at http://172.24.104.24:8000"

# Keep script alive
wait
