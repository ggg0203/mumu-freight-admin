#!/bin/bash
set -e

echo "========================================"
echo "  幕幕货运管理系统 - 后端启动"
echo "========================================"
echo "数据库主机: ${DB_HOST:-localhost}"
echo "数据库端口: ${DB_PORT:-3306}"
echo "数据库名称: ${DB_NAME:-mumu_freight}"

# 等待 MySQL 就绪
echo "[Entrypoint] 等待 MySQL 就绪..."
python -c "
import pymysql, os, time
host = os.getenv('DB_HOST', 'localhost')
port = int(os.getenv('DB_PORT', '3306'))
user = os.getenv('DB_USER', 'root')
password = os.getenv('DB_PASS', 'root')
for i in range(30):
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, charset='utf8mb4')
        conn.close()
        print('[Entrypoint] MySQL 连接成功')
        break
    except Exception as e:
        print(f'[Entrypoint] 等待 MySQL... ({i+1}/30)')
        time.sleep(2)
else:
    print('[Entrypoint] MySQL 连接超时，继续启动')
"

# 初始化数据库表和种子数据
echo "[Entrypoint] 初始化数据库..."
python seed.py

# 启动 FastAPI
echo "[Entrypoint] 启动 FastAPI 服务..."
exec uvicorn main:app --host 0.0.0.0 --port 8080
