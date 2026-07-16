#!/bin/bash

echo "========================================"
echo "  积分绩效管理系统 - 启动脚本"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v pm2 &> /dev/null && [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
  echo "检测到 PM2，使用生产模式启动..."
  cd "$SCRIPT_DIR"
  pm2 start ecosystem.config.js
  pm2 save
  echo ""
  echo "========================================"
  echo "  启动完成！(PM2 生产模式)"
  echo "  查看状态: pm2 list"
  echo "  查看日志: pm2 logs"
  echo "========================================"
else
  echo "未检测到 PM2，使用开发模式启动..."
  echo "[1/2] 启动后端服务..."
  cd "$SCRIPT_DIR/backend"
  nohup npm run start:dev > "$SCRIPT_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  echo "后端 PID: $BACKEND_PID"
  sleep 3

  echo "[2/2] 启动前端服务..."
  cd "$SCRIPT_DIR/frontend"
  nohup npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "前端 PID: $FRONTEND_PID"
  sleep 2

  echo "$BACKEND_PID" > "$SCRIPT_DIR/.backend.pid"
  echo "$FRONTEND_PID" > "$SCRIPT_DIR/.frontend.pid"

  echo ""
  echo "========================================"
  echo "  启动完成！(开发模式)"
  echo "  后端: http://localhost:3001"
  echo "  前端: http://localhost:3000"
  echo "========================================"
  echo "日志文件："
  echo "  后端: $SCRIPT_DIR/backend.log"
  echo "  前端: $SCRIPT_DIR/frontend.log"
fi
