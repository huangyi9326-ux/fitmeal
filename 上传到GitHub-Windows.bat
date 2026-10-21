@echo off
chcp 65001 >nul
title 轻盈食光 · 上传到 GitHub

cd /d "%~dp0"

echo ==========================================
echo   轻盈食光 · 一键上传到 GitHub
echo ==========================================
echo.

REM 检查 git 是否安装
where git >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 git。请先安装 Git：https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo 请输入你的 GitHub 仓库地址（格式：https://github.com/用户名/仓库名.git）
set /p REPO=仓库地址：

if "%REPO%"=="" (
  echo 未输入地址，退出。
  pause
  exit /b 1
)

echo.
echo [1/4] 初始化本地 git 仓库...
if not exist .git (
  git init
) else (
  echo 已存在 .git，跳过初始化
)

echo.
echo [2/4] 添加文件到暂存区（排除 node_modules 等）...
git add -A

echo.
echo [3/4] 提交代码...
git -c user.name="fitmeal" -c user.email="fitmeal@local" commit -m "init: 轻盈食光减脂餐H5完整项目" 2>nul
if errorlevel 1 (
  echo 没有需要提交的改动，继续推送...
)

echo.
echo [4/4] 推送到 GitHub...
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO%
git push -u origin main --force

if errorlevel 1 (
  echo.
  echo [错误] 推送失败！常见原因：
  echo   1. 仓库地址不对，请检查是否是 .git 结尾
  echo   2. 认证失败，请确认你已在本电脑用 git 登录过 GitHub
  echo   3. 网络问题，请重试
  echo.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo   上传成功！
echo ==========================================
echo.
echo 接下来去 https://render.com 部署：
echo   1. New -^> Web Service -^> 选择你的仓库
echo   2. Build Command: npm install ^&^& npm run build
echo   3. Start Command: npm start
echo   4. Deploy，等待 3-5 分钟
echo.
pause
