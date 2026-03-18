# 镜像离线部署指南

本文档用于把本地打包好的镜像文件传到服务器并完成部署。

## 0. 本次打包产物

- 文件：`images/blog-stack-images_20260310_055320.tar`
- 校验：`images/blog-stack-images_20260310_055320.tar.sha256`
- SHA256：`f044184d0bb9886bc64a51081405cb78ed64c9e9bc08e475ea19e1271c90504c`

说明：本次环境访问 Docker Hub 出现 DNS 超时，未能在线重建镜像，已使用当前本机现有镜像导出离线包。

## 1. 本机上传到服务器

在项目根目录执行（按需替换服务器账号和地址）：

```bash
cd /media/shiokou/DevRepo7/DevHub/Projects/2026-myapp/typescript/blog

scp images/blog-stack-images_20260310_055320.tar \
    images/blog-stack-images_20260310_055320.tar.sha256 \
    user@YOUR_SERVER_IP:/opt/blog/images/
```

## 2. 服务器校验文件完整性

```bash
cd /opt/blog
sha256sum -c images/blog-stack-images_20260310_055320.tar.sha256
```

预期输出包含 `OK`。

## 3. 服务器导入镜像

```bash
docker load -i images/blog-stack-images_20260310_055320.tar
```

可选检查：

```bash
docker images | grep -E 'blog-frontend|blog-backend|blog-chat-ai|postgres'
```

## 4. 启动服务

确保服务器目录存在项目的 `docker-compose.yml`，然后执行：

```bash
cd /opt/blog
docker compose up -d
docker compose ps
```

## 5. 验证服务

```bash
curl -i http://localhost:3000
curl -i http://localhost:3001/health
curl -i http://localhost:8080/api/v1/message/
```

预期：

- 前端：`200`
- 后端健康检查：`200`
- chat-ai：`400 {"error":"id is required"}`（表示服务在线，参数缺失是预期行为）

## 6. 常用维护

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose up -d
```

## 7. 回滚（使用旧 tar）

如果你保留了旧版本 tar，可按同样流程：

1. `docker load -i <old>.tar`
2. `docker compose up -d`

如需强制重建容器：

```bash
docker compose up -d --force-recreate
```

