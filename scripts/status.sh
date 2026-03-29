#!/bin/bash
# =============================================================
# 脚本名称: status.sh
# 功能描述: 查看 MONSTER TIDE 游戏服务器运行状态
# 使用方式: bash scripts/status.sh [端口号]
# 依赖环境: 无
# 默认端口: 8000
# =============================================================

# 默认端口
PORT="${1:-8000}"

echo "🔍 检查服务器状态 (端口: $PORT)..."
echo "========================================"

# 查找占用端口的进程
PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
    echo "❌ 服务器未运行"
    exit 1
fi

# 获取进程详细信息
PROCESS_INFO=$(ps -p $PID -o pid,command | tail -n 1)

echo "✅ 服务器正在运行"
echo ""
echo "进程信息:"
echo "  PID: $PID"
echo "  命令: $PROCESS_INFO"
echo ""
echo "🌐 访问地址: http://localhost:$PORT"
