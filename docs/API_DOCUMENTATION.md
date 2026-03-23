# Blog Application API Documentation

> Base URL: `http://localhost:3001`
>
> Chat Service: `http://localhost:8080/api/v1`

---

## Table of Contents

- [Authentication](#authentication)
- [Health Check](#health-check)
- [Articles](#articles)
- [Comments](#comments)
- [Chat AI](#chat-ai)
- [Data Models](#data-models)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Deployment Configuration](#deployment-configuration)

---

## Authentication

认证方式为 JWT（JSON Web Token），使用 HS256 算法签名，Token 有效期为 **2 小时**。

密码采用 **Argon2** 算法进行哈希存储。

### POST `/login`

用户登录，获取 JWT Token。

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**

```
"Invalid credentials"
```

**Token Claims:**

| Field | Type   | Description      |
|-------|--------|------------------|
| `sub` | string | 用户 ID          |
| `exp` | number | 过期时间戳（Unix） |

### 需要认证的接口

以下接口需要用户登录后才能操作（当前为客户端校验）：

- `POST /posts/` — 创建文章
- `PUT /posts/{id}` — 更新文章
- `DELETE /posts/{id}` — 删除文章
- `POST /comments/` — 创建评论
- `DELETE /comments/{id}` — 删除评论

---

## Health Check

### GET `/health`

服务健康检查。

**Response (200):**

```
"I'm OK.{visit_count} times"
```

---

## Articles

### GET `/posts/`

获取所有文章列表。

**Response (200):**

```json
[
  {
    "id": 1,
    "title": "文章标题",
    "date": "2026-03-23T12:00:00",
    "summary": "文章摘要",
    "tags": ["tag1", "tag2"],
    "content": "文章正文内容"
  }
]
```

---

### GET `/posts/{id}`

根据 ID 获取单篇文章。

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | i32  | 文章 ID     |

**Response (200):**

```json
{
  "id": 1,
  "title": "文章标题",
  "date": "2026-03-23T12:00:00",
  "summary": "文章摘要",
  "tags": ["tag1", "tag2"],
  "content": "文章正文内容"
}
```

**Error Response (404):**

```json
"Article not found"
```

---

### POST `/posts/` 🔒

创建新文章（需要认证）。

**Request Body:**

```json
{
  "title": "文章标题",
  "date": "2026-03-23T12:00:00",
  "summary": "文章摘要",
  "tags": ["tag1", "tag2"],
  "content": "文章正文内容"
}
```

所有字段均为可选。

**Response (200):**

```json
{
  "id": 2,
  "title": "文章标题",
  "date": "2026-03-23T12:00:00",
  "summary": "文章摘要",
  "tags": ["tag1", "tag2"],
  "content": "文章正文内容"
}
```

---

### PUT `/posts/{id}` 🔒

更新指定文章（需要认证）。

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | i32  | 文章 ID     |

**Request Body:**

```json
{
  "title": "更新后的标题",
  "date": "2026-03-23T12:00:00",
  "summary": "更新后的摘要",
  "tags": ["newtag"],
  "content": "更新后的内容"
}
```

所有字段均为可选，仅传入需要更新的字段即可。

**Response (200):**

```json
{
  "id": 1,
  "title": "更新后的标题",
  "date": "2026-03-23T12:00:00",
  "summary": "更新后的摘要",
  "tags": ["newtag"],
  "content": "更新后的内容"
}
```

---

### DELETE `/posts/{id}` 🔒

删除指定文章（需要认证）。

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | i32  | 文章 ID     |

**Response (200):**

```json
"Article deleted successfully"
```

---

## Comments

### GET `/comments/{id}`

根据文章 ID 获取该文章下的所有评论。

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | i32  | 文章 ID     |

**Response (200):**

```json
[
  {
    "id": 1,
    "article_id": 1,
    "author": "评论者名称",
    "content": "评论内容",
    "date": "2026-03-23T12:00:00"
  }
]
```

---

### POST `/comments/` 🔒

创建新评论（需要认证）。

**Request Body:**

```json
{
  "article_id": 1,
  "author": "评论者名称",
  "content": "评论内容",
  "date": "2026-03-23T12:00:00"
}
```

所有字段均为可选。

**Response (200):**

```json
{
  "id": 3,
  "article_id": 1,
  "author": "评论者名称",
  "content": "评论内容",
  "date": "2026-03-23T12:00:00"
}
```

---

### DELETE `/comments/{id}` 🔒

删除指定评论（需要认证）。

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id`      | i32  | 评论 ID     |

**Response (200):**

```json
"Comment deleted successfully"
```

---

## Chat AI

Chat AI 为独立的 Go 微服务，基础路径为 `http://localhost:8080/api/v1`。

### POST `/api/v1/chat`

发送聊天消息并获取 AI 回复。

**Request Body:**

```json
{
  "content": "你好，请介绍一下这个博客"
}
```

**Response (200):**

```json
{
  "role": "assistant",
  "content": "AI 回复内容"
}
```

---

### GET `/api/v1/history`

获取聊天历史记录。

**Response (200):**

```json
[
  {
    "role": "user",
    "content": "用户消息"
  },
  {
    "role": "assistant",
    "content": "AI 回复"
  }
]
```

---

## Data Models

### Article

| Field     | Type              | Required | Description |
|-----------|-------------------|----------|-------------|
| `id`      | i32               | auto     | 自增主键    |
| `title`   | string            | yes      | 文章标题    |
| `date`    | NaiveDateTime?    | no       | 发布日期    |
| `summary` | string?           | no       | 文章摘要    |
| `tags`    | string[]?         | no       | 标签列表    |
| `content` | string?           | no       | 正文内容    |

### Comment

| Field        | Type           | Required | Description |
|--------------|----------------|----------|-------------|
| `id`         | i32            | auto     | 自增主键    |
| `article_id` | i32?           | no       | 关联文章 ID |
| `author`     | string         | yes      | 评论者名称  |
| `content`    | string         | yes      | 评论内容    |
| `date`       | NaiveDateTime? | no       | 评论日期    |

### User

| Field           | Type   | Required | Description   |
|-----------------|--------|----------|---------------|
| `id`            | i32    | auto     | 自增主键       |
| `username`      | string | yes      | 用户名（唯一） |
| `password_hash` | string | yes      | 密码哈希值     |

---

## Database Schema

数据库：**PostgreSQL 15+**

```sql
CREATE TABLE public.articles (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title varchar(255) NOT NULL,
    summary text,
    content text NOT NULL,
    tags text[],
    date timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.comments (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    article_id integer,
    author varchar(255) NOT NULL,
    content text NOT NULL,
    date timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username varchar(255) NOT NULL UNIQUE,
    password_hash text NOT NULL
);
```

---

## Error Handling

所有接口统一使用以下错误格式：

| HTTP Status | Error Type  | Description          |
|-------------|-------------|----------------------|
| 400         | Bad Request | 请求参数错误          |
| 404         | NotFound    | 资源未找到            |
| 500         | DBError     | 数据库操作错误        |
| 500         | ActixError  | 服务器内部错误        |

---

## Deployment Configuration

### Environment Variables

**Backend:**

| Variable       | Required | Description              |
|----------------|----------|--------------------------|
| `DATABASE_URL` | yes      | PostgreSQL 连接字符串     |

**Frontend:**

| Variable                 | Required | Default                    | Description        |
|--------------------------|----------|----------------------------|--------------------|
| `VITE_API_BASE_URL`      | no       | `http://{hostname}:3001`   | 后端 API 地址       |
| `VITE_CHAT_API_BASE_URL` | no       | `/api/v1`                  | Chat 服务地址       |

### Service Ports

| Service        | Port |
|----------------|------|
| Frontend       | 3000 |
| Backend        | 3001 |
| Chat AI        | 8080 |
| PostgreSQL     | 5433 |

### CORS

后端允许所有来源（`allow_any_origin`）、所有方法、所有请求头，预检缓存时间为 3600 秒。

---

## API Overview

| Method   | Endpoint          | Auth | Description  |
|----------|-------------------|------|--------------|
| GET      | `/health`         | No   | 健康检查      |
| POST     | `/login`          | No   | 用户登录      |
| GET      | `/posts/`         | No   | 获取所有文章  |
| GET      | `/posts/{id}`     | No   | 获取单篇文章  |
| POST     | `/posts/`         | Yes  | 创建文章      |
| PUT      | `/posts/{id}`     | Yes  | 更新文章      |
| DELETE   | `/posts/{id}`     | Yes  | 删除文章      |
| GET      | `/comments/{id}`  | No   | 获取文章评论  |
| POST     | `/comments/`      | Yes  | 创建评论      |
| DELETE   | `/comments/{id}`  | Yes  | 删除评论      |
| POST     | `/api/v1/chat`    | No   | 发送聊天消息  |
| GET      | `/api/v1/history` | No   | 获取聊天记录  |
