#!/bin/bash

echo "========================================"
echo "  积分绩效管理系统 - 一键部署脚本"
echo "========================================"
echo ""

PROJECT_DIR="/home/ubuntu/score-manage-systerm"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ 项目目录不存在: $PROJECT_DIR"
  echo "请先将项目上传到服务器"
  exit 1
fi

cd "$PROJECT_DIR"

echo "[1/7] 安装后端依赖..."
cd "$PROJECT_DIR/backend"
npm install --production=false
if [ $? -ne 0 ]; then
  echo "❌ 后端依赖安装失败"
  exit 1
fi

echo "[2/7] 生成 Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
  echo "❌ Prisma Client 生成失败"
  exit 1
fi

echo "[3/7] 同步数据库表结构..."
npx prisma db push
if [ $? -ne 0 ]; then
  echo "❌ 数据库同步失败，请检查 .env 中的 DATABASE_URL"
  exit 1
fi

echo "[4/7] 构建后端..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 后端构建失败"
  exit 1
fi

echo "[5/7] 安装前端依赖 & 构建..."
cd "$PROJECT_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
  echo "❌ 前端依赖安装失败"
  exit 1
fi
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 前端构建失败"
  exit 1
fi

echo "[6/7] 启动/重启 PM2 服务..."
cd "$PROJECT_DIR"
if pm2 describe score-backend > /dev/null 2>&1; then
  pm2 restart score-backend
  pm2 restart score-frontend
  echo "✅ PM2 服务已重启"
else
  pm2 start ecosystem.config.js
  echo "✅ PM2 服务已启动"
fi
pm2 save

echo "[7/7] 验证服务..."
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
echo "  部署完成！"
echo "========================================"
echo ""
echo "  后端 (3001): $([ "$BACKEND_OK" = true ] && echo '✅ 正常' || echo '❌ 异常')"
echo "  前端 (3000): $([ "$FRONTEND_OK" = true ] && echo '✅ 正常' || echo '❌ 异常')"
echo ""
echo "  访问地址: http://$(hostname -I | awk '{print $1}')"
echo "  查看状态: pm2 list"
echo "  查看日志: pm2 logs"
echo "  后端日志: pm2 logs score-backend"
echo "  前端日志: pm2 logs score-frontend"
echo ""
echo "  管理员账号: sadmin / QH_hezuo_2026"
echo "========================================"
