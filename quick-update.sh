#!/bin/bash

echo "========================================"
echo "  积分绩效管理系统 - 快速更新脚本"
echo "  (代码已在服务器上时使用)"
echo "========================================"
echo ""

PROJECT_DIR="/home/ubuntu/score-manage-systerm"
cd "$PROJECT_DIR"

echo "[1/4] 构建后端..."
cd "$PROJECT_DIR/backend"
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 后端构建失败"
  exit 1
fi

echo "[2/4] 构建前端..."
cd "$PROJECT_DIR/frontend"
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 前端构建失败"
  exit 1
fi

echo "[3/4] 重启服务..."
pm2 restart score-backend
pm2 restart score-frontend
pm2 save

echo "[4/4] 验证..."
sleep 3

BACKEND_OK=false
FRONTEND_OK=false

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|401\|404"; then
  BACKEND_OK=true
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
  FRONTEND_OK=true
fi

echo ""
echo "========================================"
echo "  更新完成！"
echo "  后端: $([ "$BACKEND_OK" = true ] && echo '✅ 正常' || echo '❌ 异常')"
echo "  前端: $([ "$FRONTEND_OK" = true ] && echo '✅ 正常' || echo '❌ 异常')"
echo "========================================"
