#!/bin/bash
# =============================================================
# 脚本名称: restart.sh
# 功能描述: 重启 MONSTER TIDE 游戏本地服务器
# 使用方式: bash scripts/restart.sh [端口号]
# 依赖环境: Python 3.x
# 默认端口: 8000
# =============================================================

# 切换到项目根目录
cd "$(dirname "$0")/.." || exit 1

# 默认端口
PORT="${1:-8000}"

echo "🔄 重启游戏服务器..."

# 停止现有服务
bash scripts/stop.sh $PORT

# 等待端口释放
sleep 2

# 启动新服务
bash scripts/start.sh $PORT
