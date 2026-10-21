#!/bin/bash
# 轻盈食光 · 一键上传到 GitHub（macOS）
cd "$(dirname "$0")" || exit 1

echo "=========================================="
echo "  轻盈食光 · 一键上传到 GitHub"
echo "=========================================="
echo ""

# 检查 git
if ! command -v git >/dev/null 2>&1; then
  echo "[错误] 未检测到 git。请先安装：brew install git 或 https://git-scm.com"
  exit 1
fi

echo "请输入你的 GitHub 仓库地址（格式：https://github.com/用户名/仓库名.git）"
read -p "仓库地址：" REPO

if [ -z "$REPO" ]; then
  echo "未输入地址，退出。"
  exit 1
fi

echo ""
echo "[1/4] 初始化本地 git 仓库..."
if [ ! -d .git ]; then
  git init
fi

echo ""
echo "[2/4] 添加文件到暂存区..."
git add -A

echo ""
echo "[3/4] 提交代码..."
git -c user.name="fitmeal" -c user.email="fitmeal@local" commit -m "init: 轻盈食光减脂餐H5完整项目" 2>/dev/null || echo "没有需要提交的改动，继续推送..."

echo ""
echo "[4/4] 推送到 GitHub..."
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin "$REPO"
git push -u origin main --force

if [ $? -ne 0 ]; then
  echo ""
  echo "[错误] 推送失败！请检查仓库地址和 Git 登录状态。"
  exit 1
fi

echo ""
echo "=========================================="
echo "  上传成功！去 https://render.com 部署吧"
echo "  Build: npm install && npm run build"
echo "  Start: npm start"
echo "=========================================="
