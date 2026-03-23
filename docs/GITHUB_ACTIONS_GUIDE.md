# GitHub Actions CI/CD 部署指南

## 创建的文件

### 1. `.github/workflows/deploy.yml` — GitHub Actions 工作流

**流程：**
- **PR 到 master** → 只构建镜像（验证能否编译），不推送、不部署
- **Push 到 master** → 构建 3 个镜像 → 推送到 GitHub Container Registry → SSH 到服务器拉取并重启

三个服务（frontend、backend、chat-ai）通过 matrix 策略**并行构建**，且使用 GitHub Actions 缓存加速后续构建。

### 2. `docker-compose.prod.yml` — 服务器生产部署文件

与开发用的 `docker-compose.yml` 不同，这个版本通过环境变量指定镜像地址，不在服务器上构建。

---

## 需要在 GitHub 仓库配置的 Secrets

进入仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加以下 Secret：

| Secret 名称 | 说明 | 示例 |
|---|---|---|
| `SERVER_HOST` | 服务器 IP 或域名 | `192.168.1.100` |
| `SERVER_USER` | SSH 登录用户名 | `deploy` |
| `SERVER_SSH_KEY` | SSH 私钥（全部内容） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_PORT` | SSH 端口（默认22可不填） | `22` |
| `GHCR_PAT` | GitHub Personal Access Token（需要 `read:packages` 权限），用于服务器拉取镜像 | `ghp_xxxx` |
| `POSTGRES_PASSWORD` | 生产数据库密码 | `your_secure_password` |

**可选 Secret（前端构建时用到）：**

| Secret 名称 | 说明 |
|---|---|
| `VITE_API_BASE_URL` | 后端 API 地址，如 `https://api.yourdomain.com` |
| `VITE_CHAT_API_BASE_URL` | Chat AI API 地址，如 `https://chat.yourdomain.com` |

---

## 生成 GHCR_PAT 的方法

1. 去 GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. 点 **Generate new token (classic)**
3. 勾选 `read:packages` 和 `write:packages`
4. 生成后复制，添加到仓库 Secrets 的 `GHCR_PAT`

---

## 服务器上需要准备的

```bash
# 创建部署目录
mkdir -p /opt/blog/init-sql

# 把 docker-compose.prod.yml 放到 /opt/blog/
# 把数据库初始化 SQL 放到 /opt/blog/init-sql/

# 创建 .env 文件（数据库密码等）
cat > /opt/blog/.env << 'EOF'
POSTGRES_PASSWORD=your_secure_password
EOF
```
