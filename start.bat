@echo off
chcp 65001 >nul
echo ========================================
echo   积分绩效管理系统 - 启动脚本
echo ========================================
echo.

echo [1/2] 启动后端服务...
start "后端服务 (NestJS)" cmd /k "cd /d %~dp0backend && npm run start:dev"
timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务...
start "前端服务 (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo   后端: http://localhost:3001
echo   前端: http://localhost:3000
echo   API文档: http://localhost:3001/api/docs
echo ========================================
echo.
echo 关闭此窗口不会影响已启动的服务
echo 如需停止服务，请关闭对应的命令行窗口
pause
