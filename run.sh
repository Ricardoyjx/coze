#!/bin/bash
set -e

echo "🚀 招聘JD自动生成与简历初筛Agent - 启动脚本"
echo "================================================"

# 启动后端
echo "📦 启动后端服务 (FastAPI)..."
cd backend
../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 启动前端
echo "🎨 启动前端服务 (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 服务已启动！"
echo "   前端: http://localhost:3010"
echo "   后端: http://localhost:8000"
echo "   API文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
