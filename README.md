# 幕幕货运后台管理系统

基于 **React 19 + TypeScript 6 + Vite 8** 前端 + **Python FastAPI** 后端的企业级货运后台管理系统。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript 6 | 最新 React + TS 版本 |
| 构建工具 | Vite 8 | 极速开发与构建 |
| UI 组件库 | Ant Design 5 | 企业级 UI 组件 |
| 状态管理 | Zustand 5 | 轻量级状态管理 |
| 路由 | React Router 6 | SPA 路由方案 |
| 图表 | ECharts 6 | 数据可视化 |
| 3D | Three.js + react-globe.gl | 3D 地球可视化 |
| 国际化 | i18next | 中英文切换 |
| 离线支持 | Vite PWA Plugin | PWA 离线安装 |
| 后端框架 | FastAPI 0.115 | 高性能异步 API |
| ORM | SQLAlchemy 2.0 | 数据库 ORM |
| 数据库 | MySQL 8.0 | 关系型数据库 |
| 实时通信 | WebSocket | 订单/司机实时推送 |
| 容器化 | Docker + Docker Compose | 一键部署 |
| CI/CD | GitHub Actions | 自动化构建与部署 |

## 功能模块

- **数据概览** — Dashboard 仪表盘，核心指标可视化
- **订单管理** — 订单 CRUD、看板、聚合、追踪、预测
- **路线规划** — 基于腾讯地图的智能路线规划
- **司机管理** — 司机信息管理与状态监控
- **用户管理** — 系统用户、角色、权限管理
- **部门管理** — 组织架构树形管理
- **菜单管理** — 动态菜单配置
- **课程管理** — 在线培训课程管理
- **报表中心** — 数据报表导出（Excel/PDF）
- **数据大屏** — 全屏数据展示
- **审计日志** — 操作日志记录与追溯
- **3D 地球** — 全球货运可视化
- **AI 助手** — 基于通义千问的智能助手
- **PWA 支持** — 可安装为桌面应用

---

## 本地开发

### 环境要求

- **Node.js** >= 22
- **Python** >= 3.13
- **MySQL** >= 8.0

### 1. 启动数据库

确保 MySQL 已运行并创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS mumu_freight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 初始化数据库和种子数据
python seed.py

# 启动后端服务 (端口 8080)
python main.py
```

### 3. 启动前端

```bash
# 在项目根目录

# 安装依赖
npm install

# 启动开发服务器 (端口 3000)
npm run dev
```

### 4. 访问系统

打开浏览器访问 **http://localhost:3000**

默认登录凭据：`admin` / `admin123`

---

## Docker 部署（推荐）

Docker Compose 一键部署，包含 MySQL + 后端 + Nginx 三个服务。

### 1. 配置环境变量

```bash
cp .env.example .env
# 按需修改 .env 中的数据库密码等配置
```

### 2. 启动所有服务

```bash
docker compose up -d
```

### 3. 访问系统

打开浏览器访问 **http://localhost**

服务组成：

| 服务 | 端口 | 说明 |
|------|------|------|
| nginx | 80 | 前端静态服务 + API 反向代理 |
| backend | 8080 | FastAPI 后端 |
| mysql | 3307 | MySQL 数据库（映射到宿主机 3307 避免冲突） |

### 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f

# 重新构建
docker compose build --no-cache

# 停止服务
docker compose down

# 停止并清除数据卷（⚠️ 会删除数据库数据）
docker compose down -v
```

---

## CI/CD 自动化

项目已配置 GitHub Actions 自动化流水线。

### CI 流水线 (`.github/workflows/ci.yml`)

**触发条件：** push / PR 到 `main` 或 `master` 分支

**执行步骤：**
1. 前端 TypeScript 类型检查 + ESLint + Vite 构建
2. 后端 Python 语法检查 + 模块导入验证
3. Docker 镜像构建（仅 push 触发）

### 部署流水线 (`.github/workflows/deploy.yml`)

**触发条件：** 手动触发（`workflow_dispatch`）

**使用前需要在 GitHub 仓库设置 Secrets：**

| Secret | 说明 | 必填 |
|--------|------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 | ✅ |
| `DEPLOY_USER` | SSH 用户名（如 root） | ✅ |
| `DEPLOY_KEY` | SSH 私钥 | ✅ |
| `DEPLOY_PORT` | SSH 端口（默认 22） | ❌ |
| `DASHSCOPE_API_KEY` | 通义千问 API Key | ❌ |

**设置方法：** GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

---

## 项目结构

```
├── src/                        # 前端源码
│   ├── api/                    # API 请求层
│   ├── components/             # 通用组件（AI助手、地图、水印等）
│   ├── hooks/                  # 自定义 Hooks
│   ├── i18n/                   # 国际化语言包
│   ├── layouts/                # 布局组件
│   ├── mock/                   # Mock 数据
│   ├── pages/                  # 页面组件（19个模块）
│   ├── router/                 # 路由配置
│   ├── services/               # 服务层（API、WebSocket）
│   ├── stores/                 # Zustand 状态管理
│   ├── types/                  # TypeScript 类型定义
│   └── utils/                  # 工具函数
│
├── backend/                    # 后端源码
│   ├── main.py                 # FastAPI 应用入口
│   ├── database.py             # 数据库配置
│   ├── models.py               # ORM 数据模型
│   ├── schemas.py              # Pydantic 模型
│   ├── seed.py                 # 种子数据脚本
│   ├── crud/                   # CRUD 操作层
│   ├── Dockerfile              # 后端 Docker 镜像
│   └── docker-entrypoint.sh    # Docker 启动脚本
│
├── Dockerfile                  # 前端 Docker 镜像（多阶段构建）
├── docker-compose.yml          # Docker Compose 编排
├── nginx.conf                  # Nginx 配置
├── .github/workflows/          # GitHub Actions CI/CD
│   ├── ci.yml                  # CI 流水线
│   └── deploy.yml              # 部署流水线
├── .env.example                # 环境变量模板
└── vite.config.ts              # Vite 构建配置
```

---

## 登录凭据

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
