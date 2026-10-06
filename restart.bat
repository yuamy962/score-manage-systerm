@echo off
chcp 936 >nul
echo ========================================
echo   积分绩效管理系统 - 重启脚本
echo ========================================
echo.

echo [1/4] 停止现有服务...
taskkill /fi "WINDOWTITLE eq 后端服务 (NestJS)*" >nul 2>&1
taskkill /fi "WINDOWTITLE eq 前端服务 (Next.js)*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /pid %%a /f >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [2/4] 清理前端 .next 缓存（防止 build 产物与 dev 冲突）...
if exist "%~dp0frontend\.next" rd /s /q "%~dp0frontend\.next"
timeout /t 1 /nobreak >nul

echo [3/4] 启动后端服务...
start "后端服务 (NestJS)" cmd /k "cd /d %~dp0backend && npm run start:dev"
timeout /t 3 /nobreak >nul

echo [4/4] 启动前端服务...
start "前端服务 (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   重启完成！
echo   后端: http://localhost:3001
echo   前端: http://localhost:3000
echo   API文档: http://localhost:3001/api/docs
echo ========================================
pause