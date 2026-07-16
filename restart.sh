#!/bin/bash

echo "========================================"
echo "  积分绩效管理系统 - 重启脚本"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/2] 停止现有服务..."
"$SCRIPT_DIR/stop.sh"
sleep 2

echo "[2/2] 启动服务..."
"$SCRIPT_DIR/start.sh"
