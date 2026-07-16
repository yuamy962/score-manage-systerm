#!/bin/bash

echo "========================================"
echo "  积分绩效管理系统 - 停止脚本"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v pm2 &> /dev/null && pm2 describe score-backend > /dev/null 2>&1; then
  echo "检测到 PM2 服务，停止 PM2 应用..."
  pm2 stop score-backend
  pm2 stop score-frontend
  echo "PM2 应用已停止"
else
  if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$SCRIPT_DIR/.backend.pid")
    echo "停止后端服务 (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null && echo "后端服务已停止" || echo "后端进程不存在"
    rm -f "$SCRIPT_DIR/.backend.pid"
  else
    echo "未找到后端 PID 文件，尝试按端口停止..."
    lsof -ti:3001 | xargs kill 2>/dev/null && echo "后端服务已停止" || echo "后端端口无进程"
  fi

  if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$SCRIPT_DIR/.frontend.pid")
    echo "停止前端服务 (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null && echo "前端服务已停止" || echo "前端进程不存在"
    rm -f "$SCRIPT_DIR/.frontend.pid"
  else
    echo "未找到前端 PID 文件，尝试按端口停止..."
    lsof -ti:3000 | xargs kill 2>/dev/null && echo "前端服务已停止" || echo "前端端口无进程"
  fi
fi

echo ""
echo "所有服务已停止"
