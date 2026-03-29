#!/bin/bash
# =============================================================
# 脚本名称: stop.sh
# 功能描述: 停止 MONSTER TIDE 游戏本地服务器
# 使用方式: bash scripts/stop.sh [端口号]
# 依赖环境: 无
# 默认端口: 8000
# =============================================================

# 默认端口
PORT="${1:-8000}"

# 查找占用端口的进程
PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
    echo "ℹ️  端口 $PORT 上没有运行的服务"
    exit 0
fi

# 停止进程
echo "🛑 正在停止服务器 (PID: $PID)..."
kill $PID

# 等待进程结束
sleep 1

# 验证是否成功停止
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  进程未能正常停止，尝试强制终止..."
    kill -9 $PID
fi

echo "✅ 服务器已停止"
