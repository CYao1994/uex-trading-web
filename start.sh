#!/bin/bash
# UEX Trade Navigator - 启动脚本
# 使用方法:
#   bash start.sh          — 开发模式（前端 :5173 + 后端 :8000）
#   bash start.sh prod     — 生产模式（单端口 :8000，前后端一体）
#   bash start.sh build    — 先构建前端，再以生产模式启动

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/c/Users/GUNDA/.workbuddy/binaries/python/envs/default/Scripts/python.exe"
MODE="${1:-dev}"

echo "========================================"
echo "  UEX Trade Navigator"
echo "========================================"
echo ""

if [ "$MODE" = "build" ]; then
  echo "[0/2] 构建前端..."
  cd "$PROJECT_DIR/frontend"
  npm install --legacy-peer-deps 2>/dev/null
  npx vite build
  echo "  前端构建完成: frontend/dist/"
  echo ""
  MODE="prod"
fi

if [ "$MODE" = "prod" ]; then
  # 检查前端是否已构建
  if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
    echo "❌ 前端未构建！请先运行: bash start.sh build"
    exit 1
  fi

  echo "[生产模式] 单端口启动 (:8000)..."
  cd "$PROJECT_DIR/backend"
  PYTHONPATH="$PROJECT_DIR/backend" $PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000

elif [ "$MODE" = "dev" ]; then
  # 启动后端
  echo "[1/2] 启动后端 API (port 8000)..."
  cd "$PROJECT_DIR/backend"
  $PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  echo "  后端 PID: $BACKEND_PID"

  # 等待后端就绪
  sleep 3

  # 启动前端
  echo "[2/2] 启动前端开发服务器 (port 5173)..."
  cd "$PROJECT_DIR/frontend"
  npx vite --host 0.0.0.0 --port 5173 &
  FRONTEND_PID=$!
  echo "  前端 PID: $FRONTEND_PID"

  echo ""
  echo "========================================"
  echo "  启动完成！"
  echo "  前端: http://localhost:5173"
  echo "  后端: http://localhost:8000"
  echo "  API文档: http://localhost:8000/docs"
  echo "========================================"
  echo ""
  echo "按 Ctrl+C 停止所有服务"

  # 等待子进程
  wait
else
  echo "用法: bash start.sh [dev|prod|build]"
  echo "  dev   — 开发模式（默认）"
  echo "  prod  — 生产模式（单端口）"
  echo "  build — 构建前端 + 生产模式"
fi
