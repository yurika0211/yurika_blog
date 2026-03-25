# 前端优化开发报告

> 日期：2026-03-25

## 一、概述

本次开发围绕博客前端进行了多项优化，主要涵盖**移动端响应式适配**、**页面布局调整**、**导航增强**和**视频嵌入支持**四个方面。

---

## 二、变更明细

### 1. Header 移动端响应式适配

**文件**：`frontend/src/components/Header.tsx`

**问题**：在手机端，Header 的 Logo 图标、文字和导航项未缩放，导致内容溢出屏幕、布局错乱。

**方案**：
- Logo 图标和文字在手机端缩小（`text-base` / `h-5 w-5`），桌面端保持原始大小（`sm:text-xl` / `sm:h-6 sm:w-6`）
- 桌面端导航栏使用 `hidden md:flex` 控制显示
- 移动端新增汉堡菜单按钮（`Menu` / `X` 图标），点击展开下拉导航
- Header 高度响应式：手机端 `h-14`，桌面端 `sm:h-16`
- 路由切换时自动关闭移动端菜单（`useEffect` 监听 `location.pathname`）

### 2. 文章列表页移除右侧 Sidebar

**文件**：`frontend/src/App.tsx`

**问题**：`/posts` 和 `/tag/:tag` 页面右侧显示了重复的搜索框和作者信息卡片（Sidebar），占用空间且内容冗余。

**方案**：
- 将 `showSidebar` 条件从包含 `/posts`、`/about`、`/tag/:tag` 缩减为仅 `/about`
- 文章列表页和标签页现在使用全宽布局，内容区域更充裕

### 3. 文章卡片移动端优化

**文件**：`frontend/src/pages/Home.tsx`

**问题**：文章卡片底部的元数据行（日期、标签、"阅读全文"）在手机端换行溢出，布局混乱。

**方案**：
- 底部元数据行添加 `min-w-0`、`shrink-0`、`whitespace-nowrap`、`overflow-hidden` 防止换行
- 手机端标签最多显示 2 个，单个标签加 `truncate max-w-[5rem]` 限制宽度
- 文字、间距、图标尺寸分层响应式缩放（`text-base`/`text-xs`/`p-4` vs `sm:text-xl`/`sm:text-sm`/`sm:p-5`）

### 4. Header 新增 Posts 导航链接

**文件**：`frontend/src/components/Header.tsx`

**变更**：在 Home 和 Tags 之间新增 `Posts` 导航项，指向 `/posts`，桌面端和移动端菜单同步添加。

### 5. 文章页视频嵌入支持

**文件**：`frontend/src/pages/Post.tsx`、`frontend/package.json`

**问题**：ReactMarkdown 默认不渲染 HTML 标签，文章中的 `<video>`、`<iframe>` 被忽略，无法插入视频。

**方案**：

#### 5.1 安装 rehype-raw 插件
- 新增依赖 `rehype-raw`，使 ReactMarkdown 支持渲染内联 HTML 标签

#### 5.2 自定义渲染组件
- `video`：自动带 `controls` 属性，圆角全宽样式
- `iframe`：16:9 自适应比例容器（`aspect-video`），支持全屏

#### 5.3 链接自动嵌入预处理
新增 `autoEmbedVideos()` 函数，对文章内容进行预处理，将独占一行的视频链接自动转换为嵌入标签：

| Markdown 写法 | 自动转换为 |
|---|---|
| `https://www.youtube.com/watch?v=xxx` | YouTube 嵌入播放器 |
| `https://www.bilibili.com/video/BVxxx` | Bilibili 嵌入播放器 |
| `https://example.com/video.mp4` | 原生 `<video>` 播放器 |

行内链接不受影响，仅独占一行的裸链接会被转换。

---

## 三、涉及文件汇总

| 文件 | 变更类型 |
|---|---|
| `frontend/src/components/Header.tsx` | 重构（响应式 + Posts 链接） |
| `frontend/src/App.tsx` | 修改（移除 Sidebar 条件） |
| `frontend/src/pages/Home.tsx` | 优化（卡片移动端适配） |
| `frontend/src/pages/Post.tsx` | 新增（视频嵌入支持） |
| `frontend/package.json` | 新增依赖 `rehype-raw` |

---

## 四、测试建议

1. **移动端 Header**：在 375px / 768px 宽度下验证汉堡菜单展开/收起、路由切换关闭菜单
2. **文章列表页**：确认 `/posts` 和 `/tag/:tag` 页面无右侧 Sidebar
3. **卡片布局**：在移动端验证日期、标签、阅读全文不换行
4. **视频嵌入**：在文章中分别测试 YouTube 链接、Bilibili 链接、.mp4 链接的自动转换和播放
