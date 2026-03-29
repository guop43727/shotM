#!/bin/bash
# =============================================================
# 脚本名称: start.sh
# 功能描述: 启动 MONSTER TIDE 游戏本地服务器
# 使用方式: bash scripts/start.sh [端口号]
# 依赖环境: Python 3.x
# 默认端口: 8000
# =============================================================

# 切换到项目根目录
cd "$(dirname "$0")/.." || exit 1

# 默认端口
PORT="${1:-8000}"

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python 3"
    echo "请先安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告: 端口 $PORT 已被占用"
    echo "请尝试使用其他端口: bash scripts/start.sh <端口号>"
    exit 1
fi

# 启动 HTTP 服务器（后台运行）
echo "🚀 启动游戏服务器..."
echo "📡 端口: $PORT"
echo "🌐 访问地址: http://localhost:$PORT"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "========================================"

# 启动服务器
python3 -m http.server $PORT
