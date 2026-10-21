@echo off
chcp 65001 >nul
title 轻盈食光 · 启动器
cd /d "%~dp0"

echo ==========================================
echo   轻盈食光 · 减脂餐 H5 一键启动
echo ==========================================
echo.

echo [1/4] 检查后端依赖...
cd server
if not exist node_modules (
  call npm install
)

echo [2/4] 启动后端（端口 3000）...
start "轻盈食光-后端" cmd /k "npm start"
cd ..

echo [3/4] 检查前端依赖...
cd client
if not exist node_modules (
  call npm install
)

echo [4/4] 启动前端（端口 5173）...
start "轻盈食光-前端" cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo   启动完成！
echo   电脑访问：http://localhost:5173
echo   手机访问：http://本机局域网IP:5173
echo.
echo   本机局域网 IP：
ipconfig | findstr /C:"IPv4"
echo ==========================================
echo.
echo 提示：手机和电脑需要连接同一个 WiFi。
echo 按任意键关闭本窗口（服务会继续在另外两个窗口运行）。
pause >nul
