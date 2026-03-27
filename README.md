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

## 常用命令

### 启动/停止

```bash
cd /media/shiokou/DevRepo24/DevHub/Projects/2026-myapp/typescript/blog

# 首次或代码改动后
docker compose up -d --build

# 日常启动
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

### 数据库导入（按本次操作方式）

```bash
# 1) 备份当前数据库
docker compose exec -T db pg_dump -U admin -d postgres > DB/pre_import_backup_$(date +%Y%m%d_%H%M%S).sql

# 2) 清空并重建 public schema
docker compose exec -T db psql -U admin -d postgres -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; ALTER SCHEMA public OWNER TO admin; GRANT ALL ON SCHEMA public TO admin; GRANT ALL ON SCHEMA public TO public;"

# 3) 导入备份 SQL
docker compose exec -T db psql -U admin -d postgres -v ON_ERROR_STOP=1 < DB/my_database_backup.sql
```

### 镜像导入/导出

```bash
# 导出（本次已执行）
docker save -o images/blog-stack-images_YYYYmmdd_HHMMSS.tar \
  blog-frontend:latest blog-backend:latest blog-chat-ai:latest postgres:16-alpine

# 导入
docker load -i images/blog-stack-images_20260307_013502.tar
```

