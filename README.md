# Blog 项目操作记录与运行说明

本文档记录本目录本次已完成的全部关键操作，并给出可复用命令。

## 目录结构

```text
blog/
├── docker-compose.yml
├── frontend/              # 前端
├── backend/               # Rust 后端
├── chat-ai/               # AI 微服务
├── DB/                    # 数据库 SQL 文件
├── images/                # 导出的镜像 tar
└── RUNBOOK.md             # 运行手册
```

## 本次已完成操作（按顺序）

1. 识别项目服务并统一编排  
   - 识别出 `frontend`（前端）、`backend`（后端）、`db`（Postgres）、`chat-ai`（微服务）。  
   - 在根目录创建并完善 [`docker-compose.yml`](./docker-compose.yml)。

2. 接入 `chat-ai` 到统一编排  
   - 新增 [`chat-ai/Dockerfile`](./chat-ai/Dockerfile)。  
   - 在 `chat-ai` 中把数据库连接改为优先读取 `DATABASE_URL`，便于容器内连 `db`。

3. 修复前端 TypeScript 构建错误  
   - 修复 [`frontend/src/components/Editor.tsx`](./frontend/src/components/Editor.tsx)  
   - 修复 [`frontend/src/pages/Post.tsx`](./frontend/src/pages/Post.tsx)

4. 修复前端容器 Node 版本不兼容  
   - `frontend/Dockerfile` 的基础镜像从 `node:20.11.1-alpine` 升级到 `node:20.19.0-alpine`。

5. 修复后端 Rust 版本不兼容  
   - `backend/Dockerfile` 的基础镜像从 `rust:1.85-bookworm` 升级到 `rust:1.88-bookworm`。

6. 修复后端 SQLx 编译期依赖数据库问题  
   - 将 `sqlx::query! / query_as!` 改为运行时 `query / query_as + bind`：  
     - [`backend/webservice/src/dbaccess/blog.rs`](./backend/webservice/src/dbaccess/blog.rs)  
     - [`backend/webservice/src/dbaccess/comment.rs`](./backend/webservice/src/dbaccess/comment.rs)  
     - [`backend/webservice/src/dbaccess/user.rs`](./backend/webservice/src/dbaccess/user.rs)

7. 解决宿主机数据库端口冲突  
   - 发现宿主机 `5432` 被其他容器占用。  
   - 将 compose 中 `db` 端口映射调整为 `5433:5432`（容器内仍是 5432）。

8. 启动并验证 4 个服务  
   - `frontend`：`http://localhost:3000`  
   - `backend`：`http://localhost:3001`  
   - `chat-ai`：`http://localhost:8080`  
   - `db`：`localhost:5433`

9. 导入数据库备份 `DB/my_database_backup.sql`  
   - 先备份当前库到：`DB/pre_import_backup_20260307_011132.sql`  
   - 重建 `public` schema 后导入 `DB/my_database_backup.sql`。  
   - 导入后关键表计数：`articles=3, comments=4, course=12, messages=56, teacher=5, users=3`。

10. 修复前端图片资源路径导致的显示失败  
   - 将 `./public/profile.png` 统一改成 `/profile.png`：  
     - [`frontend/src/pages/Entry.tsx`](./frontend/src/pages/Entry.tsx)  
     - [`frontend/src/components/Sidebar.tsx`](./frontend/src/components/Sidebar.tsx)  
     - [`frontend/src/pages/About.tsx`](./frontend/src/pages/About.tsx)

11. 修复 `chat-ai` 前端调用失败（CORS 预检 404）  
   - 在 [`chat-ai/cmd/chat/main.go`](./chat-ai/cmd/chat/main.go) 增加 CORS/OPTIONS 中间件。  
   - 修复后：`OPTIONS /api/v1/message/` 返回 `204`，前端跨域调用恢复。

12. 导出当前整套镜像到 `images/`  
   - 已导出文件：  
     - `images/blog-stack-images_20260307_013502.tar`  
     - `images/blog-stack-images_20260307_013502.tar.sha256`

## 开发指令

以下命令以当前仓库目录结构为准。根目录 `.env` 现在是整个仓库的统一配置入口，`docker compose`、`backend` 本地启动、`chat-ai` 本地启动都会优先读取它。

### 环境要求

- Node.js >= 20
- Rust >= 1.88
- Go >= 1.24
- Docker / Docker Compose

### 1. 初始化环境变量

```bash
test -f .env || cp .env.example .env
```

说明：
- 根目录 `.env` 是唯一主配置源，至少需要补齐 `POSTGRES_PASSWORD`、`DATABASE_URL`、`OPENAI_*`、`SYSTEM_CONTENT`
- `frontend/.env.*` 和 `chat-ai/.env` 仅作为局部覆盖/兼容回退，不建议再作为主配置维护
- 前端本地开发默认通过 `Vite proxy` 转发 `/api` 和 `/api/v1`

### 2. 启动数据库

```bash
cd backend
docker compose up -d db
docker compose ps
```

数据库默认监听：`localhost:${DB_PORT:-5432}`

### 3. 启动 Rust 后端

```bash
cd backend
cargo run -p webservice --bin blog_service
```

后端地址：
- API：`http://localhost:3001`
- 健康检查：`http://localhost:3001/health`

说明：
- 程序会先尝试读取根目录 `../.env`，再回退到 `backend/.env`

### 4. 启动 chat-ai

```bash
cd chat-ai
go run ./cmd/chat
```

服务地址：`http://localhost:8080`

说明：
- 程序会先尝试读取根目录 `../.env`，再回退到 `chat-ai/.env`

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

前端地址：`http://localhost:5173`

开发代理规则：
- `/api/*` -> `http://127.0.0.1:3001/*`
- `/api/v1/*` -> `http://127.0.0.1:8080/api/v1/*`
- `/chat/*` -> `http://127.0.0.1:8080/*`

### 6. 后端双容器开发（可选）

如果只需要启动 `db + Rust backend`，可以直接使用后端目录里的 compose：

```bash
cd backend
docker compose up -d --build
docker compose logs -f webservice
```

### 常用维护命令

```bash
# 查看数据库日志
cd backend
docker compose logs -f db

# 停止后端目录下的容器
docker compose down

# 备份数据库
docker compose exec -T db pg_dump -U admin -d postgres > ../DB/pre_import_backup_$(date +%Y%m%d_%H%M%S).sql

# 导入数据库备份
docker compose exec -T db psql -U admin -d postgres -v ON_ERROR_STOP=1 < ../DB/my_database_backup.sql
```
