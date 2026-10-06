@echo off
chcp 936 >nul
echo ========================================
echo   积分绩效管理系统 - 停止脚本
echo ========================================
echo.

echo 正在停止后端服务 (NestJS)...
taskkill /fi "WINDOWTITLE eq 后端服务 (NestJS)*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /pid %%a /f >nul 2>&1
)

echo 正在停止前端服务 (Next.js)...
taskkill /fi "WINDOWTITLE eq 前端服务 (Next.js)*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /pid %%a /f >nul 2>&1
)

echo.
echo 所有服务已停止
pause