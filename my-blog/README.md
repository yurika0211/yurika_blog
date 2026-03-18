# ユリカのブログ

一个基于 React + TypeScript + Vite 构建的个人博客前端项目，支持 Markdown 渲染、LaTeX 公式、代码高亮、标签分类、文章搜索与在线编辑等功能。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite (rolldown-vite)
- **样式**: Tailwind CSS 4
- **路由**: React Router v7
- **Markdown**: react-markdown + remark-math + rehype-katex + react-syntax-highlighter
- **HTTP 请求**: Axios
- **部署**: Docker (多阶段构建) + Nginx

## 功能特性

- 文章列表浏览与详情查看
- 标签分类筛选
- 文章搜索
- Markdown 编辑器 (支持数学公式和代码高亮)
- 用户登录与权限控制
- 深色模式支持
- 响应式布局

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

### 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 环境变量

在项目根目录创建 `.env` 或 `.env.local` 文件:

```env
VITE_API_BASE_URL=http://your-api-server/api
VITE_CHAT_API_BASE_URL=http://your-chat-api-server
```

## Docker 部署

本项目使用多阶段 Docker 构建，第一阶段编译 React 应用，第二阶段使用 Nginx 提供静态文件服务。

### 1. 构建镜像

```bash
docker build -t my-blog:latest \
  --build-arg VITE_API_BASE_URL=http://your-api-server/api \
  --build-arg VITE_CHAT_API_BASE_URL=http://your-chat-api-server \
  .
```

如果出现了build过程的问题，可以把出问题的镜像拉取单独操作

比如
```
docker pull node:20.19.0-alpine
```

在下载镜像的时候可能会出现token验证错误，需要先退出帐号
```
docker logout
```


> `--build-arg` 用于在构建时注入 Vite 环境变量，这些变量会在编译阶段被写入前端代码中。

### 2. 运行容器

```bash
docker run -d -p 80:80 --name my-blog my-blog:latest
```

访问 `http://localhost` 即可查看博客。

### 3. 推送镜像到 Docker Hub

```bash
# 登录 Docker Hub
docker login

# 为镜像打标签 (替换 <your-dockerhub-username> 为你的用户名)
docker tag my-blog:latest <your-dockerhub-username>/my-blog:latest

# 推送镜像
docker push <your-dockerhub-username>/my-blog:latest
```

### 4. 推送镜像到私有仓库

```bash
# 为镜像打标签 (替换为你的私有仓库地址)
docker tag my-blog:latest your-registry.com/my-blog:latest

# 登录私有仓库
docker login your-registry.com

# 推送镜像
docker push your-registry.com/my-blog:latest
```

### 5. 从远程仓库拉取并运行

```bash
# 从 Docker Hub 拉取
docker pull <your-dockerhub-username>/my-blog:latest

# 运行
docker run -d -p 80:80 --name my-blog <your-dockerhub-username>/my-blog:latest
```

## 项目结构

```
my-blog/
├── src/
│   ├── components/    # 通用组件 (Header, Footer, Sidebar, Editor)
│   ├── pages/         # 页面组件 (Home, Post, About, Entry, Login)
│   ├── hooks/         # 自定义 Hooks
│   ├── services/      # API 服务层
│   └── App.tsx        # 根组件与路由配置
├── public/            # 静态资源
├── nginx.conf         # Nginx 配置
├── Dockerfile         # Docker 多阶段构建配置
└── package.json
```

## License

Private
