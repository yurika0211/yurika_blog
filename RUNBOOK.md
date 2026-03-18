# Blog 项目运行操作指南

本指南用于在当前目录一键跑通这 4 个服务：
- `frontend`：博客前端（Vite + Nginx）
- `backend`：博客后端（Rust/Actix）
- `chat-ai`：AI 微服务（Go/Gin）
- `db`：PostgreSQL

## 1. 目录说明

当前根目录结构：

```text
blog/
├── docker-compose.yml
├── my-blog/            # 前端
├── my-blog-backend/    # Rust 后端
└── chat-ai/            # AI 微服务
```

## 2. 前置要求

确保本机已安装并启动：
- Docker
- Docker Compose（Docker Desktop 内置即可）

## 3. 启动步骤（推荐）

在项目根目录执行：

```bash
docker compose up -d --build
```

查看服务状态：

```bash
docker compose ps
```

看到 `backend / frontend / chat-ai / db` 都是 `Up`（`db` 为 `healthy`）即表示启动成功。

## 4. 访问地址

- 前端首页：`http://localhost:3000`
- 博客后端：`http://localhost:3001`
- AI 微服务：`http://localhost:8080`
- PostgreSQL（宿主机）：`localhost:5433`

说明：数据库在容器内部仍是 `5432`，只是为了避免你机器上已有服务冲突，映射成了宿主机 `5433`。

## 5. 快速自检（可直接复制）

```bash
# 前端
curl -i http://localhost:3000

# 后端健康检查
curl -i http://localhost:3001/health

# chat-ai 路由探活（未传 id 返回 400 属于正常）
curl -i http://localhost:8080/api/v1/message/
```

预期：
- 前端返回 `200`
- `/health` 返回 `200`
- `chat-ai` 返回 `400 {"error":"id is required"}`（说明服务在正常工作）

## 6. 常用维护命令

```bash
# 仅启动（不重建）
docker compose up -d

# 查看日志
docker compose logs -f

# 查看单个服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f chat-ai
docker compose logs -f db

# 停止并删除容器（保留数据库卷）
docker compose down

# 停止并删除容器 + 删除数据库卷（会清空数据）
docker compose down -v
```

## 7. 常见问题

1. 端口被占用
- 报错类似 `Bind for 0.0.0.0:xxxx failed: port is already allocated`
- 处理：修改 `docker-compose.yml` 的对应端口映射，或停掉占用端口的进程/容器

2. 修改了初始化 SQL 但没生效
- `docker-entrypoint-initdb.d` 只在数据库首次初始化时执行
- 处理：
  - 开发环境可直接 `docker compose down -v` 后重启
  - 或手动把 SQL 导入已有数据库

3. 某个服务启动失败
- 先看日志：`docker compose logs -f <service>`
- 常见是配置、端口或依赖服务未就绪（例如 `db` 还没 healthy）

## 8. 一句话重置并重建

```bash
docker compose down -v && docker compose up -d --build
```

