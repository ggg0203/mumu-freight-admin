#!/bin/bash
# ============================================
#  幕幕货运管理系统 - 服务器初始化脚本
#  在阿里云 ECS Ubuntu 上运行：
#    ssh root@47.86.41.149 'bash -s' < setup-server.sh
# ============================================
set -e

echo "========================================"
echo "  幕幕货运管理系统 - 服务器初始化"
echo "========================================"

# 1. 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "[1/4] 安装 Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
else
    echo "[1/4] Docker 已安装，跳过"
fi

# 2. 克隆项目
if [ ! -d /opt/mumu-freight ]; then
    echo "[2/4] 克隆项目..."
    git clone https://github.com/ggg0203/mumu-freight-admin.git /opt/mumu-freight
else
    echo "[2/4] 项目目录已存在，拉取最新代码..."
    cd /opt/mumu-freight && git pull origin main
fi

cd /opt/mumu-freight

# 3. 配置 .env
if [ ! -f .env ]; then
    echo "[3/4] 创建 .env 配置..."
    cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=mumu2026!Secure
MYSQL_DATABASE=mumu_freight
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASS=mumu2026!Secure
DB_NAME=mumu_freight
NGINX_PORT=8000
TZ=Asia/Shanghai
EOF
    echo "   .env 已创建，密码: mumu2026!Secure"
else
    echo "[3/4] .env 已存在，跳过"
fi

# 4. 启动 Docker Compose
echo "[4/4] 启动服务..."
docker compose down 2>/dev/null
docker compose build --no-cache
docker compose up -d

echo ""
echo "========================================"
echo "  ✅ 初始化完成！"
echo "  访问地址: http://47.86.41.149:8000"
echo "  登录凭据: admin / admin123"
echo ""
echo "  常用命令:"
echo "    docker compose ps          # 查看运行状态"
echo "    docker compose logs -f     # 查看日志"
echo "    docker compose down        # 停止服务"
echo "    docker compose up -d       # 启动服务"
echo "========================================"
