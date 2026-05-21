# ==================== 前端多阶段构建 ====================
# Stage 1: 构建前端
FROM node:22-alpine AS build

WORKDIR /app

# 安装依赖（利用 Docker 缓存层）
COPY package*.json ./
RUN npm ci

# 复制源码并构建
COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_TITLE=幕幕货运管理系统
ARG DASHSCOPE_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV DASHSCOPE_API_KEY=$DASHSCOPE_API_KEY
RUN npm run build

# Stage 2: Nginx 服务
FROM nginx:alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
