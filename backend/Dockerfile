# ==================== 后端 FastAPI ====================
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖（PyMySQL 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端源码
COPY . .

EXPOSE 8080

# 启动脚本：先初始化数据库和种子数据，再启动服务
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
