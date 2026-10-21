#!/bin/bash
# 轻盈食光 · 一键启动（macOS）
cd "$(dirname "$0")" || exit 1

echo "=========================================="
echo "  轻盈食光 · 减脂餐 H5 一键启动"
echo "=========================================="

echo "[1/4] 检查后端依赖..."
cd server
if [ ! -d node_modules ]; then
  npm install
fi

echo "[2/4] 启动后端（端口 3000）..."
osascript -e "tell application \"Terminal\" to do script \"cd '$(pwd)' && npm start\""

cd ..
echo "[3/4] 检查前端依赖..."
cd client
if [ ! -d node_modules ]; then
  npm install
fi

echo "[4/4] 启动前端（端口 5173）..."
osascript -e "tell application \"Terminal\" to do script \"cd '$(pwd)' && npm run dev\""

cd ..

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

echo ""
echo "=========================================="
echo "  启动完成！"
echo "  电脑访问：http://localhost:5173"
if [ -n "$IP" ]; then
  echo "  手机访问：http://$IP:5173"
else
  echo "  手机访问：http://本机局域网IP:5173"
fi
echo "=========================================="
echo "提示：手机和电脑需要连接同一个 WiFi。"
