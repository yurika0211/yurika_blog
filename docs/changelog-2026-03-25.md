# 开发日报 — 2026-03-25

## 1. 新增：Archive 归档侧边栏

**新建文件**: `frontend/src/components/ArchiveWidget.tsx`

- 在 `/posts` 和 `/tag/:tag` 页面左侧新增独立的 Archive 归档栏
- 采用类似浏览器侧边栏的布局：固定宽度 `w-48`，通高 `h-screen`，sticky 定位，内容可滚动
- 从后端 API (`blog.getPosts()`) 异步获取全部文章，按年/月分组并统计数量
- 每个年份可独立折叠/展开
- 点击月份链接导航至 `/posts?archive=YYYY-MM`，触发按年月过滤

**修改文件**: `frontend/src/App.tsx`
- 引入 `ArchiveWidget` 组件
- 重构页面布局：`/posts` 和 `/tag/:tag` 页面为三栏布局（左 Archive + 中 文章列表 + 右 Sidebar）
- 新增 `showSidebar` 和 `showArchive` 变量，精确控制各页面的侧边栏可见性

**修改文件**: `frontend/src/components/Sidebar.tsx`
- 移除 Sidebar 内嵌的 ArchiveWidget（改为 App 布局层独立渲染）

## 2. 新增：归档过滤功能

**修改文件**: `frontend/src/pages/Home.tsx`

- 读取 URL 参数 `archive`（格式：`YYYY-MM`）
- 归档模式下通过 `blog.getPosts()` 获取全部文章，前端按年月过滤后分页（解决了仅对当前页数据过滤导致查不全的 bug）
- 标题区显示归档筛选信息，如 "2026年03月 的文章"
- 引入 `Archive` 图标用于归档标题显示

## 3. 修复：翻页后返回保持页码

**修改文件**: `frontend/src/pages/Home.tsx`

- 页码持久化到 URL 的 `page` 参数（如 `/posts?page=3`）
- `handlePageChange` 改用 `navigate()` 更新 URL，翻页产生浏览器历史记录
- 浏览器后退时从 URL 恢复页码，不再重置到第 1 页
- 使用 `useRef` 跳过首次挂载，避免组件重新挂载时误将页码重置

## 4. 修复：文章目录跳转失效

**修改文件**: `frontend/src/pages/Post.tsx`

- **根本原因**: TOC（目录）和实际渲染的 heading 各自独立生成 id，由于文本处理逻辑的微妙差异（`stripMarkdownText` 双重处理 vs `getTextContent` 单次处理），导致 id 不匹配（如 TOC 生成 `21-知识库knowledge-base`，DOM 上的 id 不同）
- **解决方案**: 移除 `resolveHeadingId` 独立生成逻辑，改为渲染 heading 时按顺序引用 `tocHeadings` 数组中预计算好的 id，保证 TOC 链接和 DOM 元素 id 完全一致
- `jumpToHeading` 改用 `window.scrollTo` 手动计算偏移量，替代 `scrollIntoView`（后者在嵌套布局下可能找错滚动容器）

## 5. 修复：Landing 页面内容遮盖 Header

**修改文件**: `frontend/src/components/Header.tsx`

- **根本原因**: Header `z-index` 为 `z-10`，而 Entry 页面内容层为 `z-20`，导致 Landing 页内容覆盖 Header
- **解决方案**: Header 的 `z-index` 从 `z-10` 提升至 `z-50`

## 6. 修复：`/posts` 页面缺少 Sidebar、`/about` 页面错误显示 Sidebar

**修改文件**: `frontend/src/App.tsx`

- 修正 `showSidebar` 逻辑，确保：
  - `/posts` 和 `/tag/:tag` — 显示左侧 Archive + 右侧 Sidebar
  - `/about` — 仅显示右侧 Sidebar
  - 其他页面（`/`、`/post/:id`、`/editor` 等）— 无 Sidebar，全宽布局

## 7. 样式统一：组件背景透明度调整为 0.3

**涉及文件**:
- `Sidebar.tsx` — `bg-white/40` → `bg-white/30`
- `Home.tsx` — `bg-white/40`、`bg-white/45` → `bg-white/30`
- `SearchWidget.tsx` — `bg-white/60` → `bg-white/30`
- `Footer.tsx` — `bg-white/50` → `bg-white/30`
- `PostCard.tsx` — `bg-white/50` → `bg-white/30`
- `Editor.tsx` — `bg-white/60` → `bg-white/30`
- `Login.tsx` — `bg-white/80` → `bg-white/30`
- `Tags.tsx` — `bg-white/50` → `bg-white/30`
- `Entry.tsx` — `bg-white/75`、`bg-white/85` → `bg-white/30`
- 对应的 dark 模式 `bg-gray-900/xx` 也全部统一为 `bg-gray-900/30`

---

## 涉及的全部文件清单

| 文件 | 操作 |
|------|------|
| `frontend/src/components/ArchiveWidget.tsx` | 新建 |
| `frontend/src/App.tsx` | 修改（布局重构、引入 Archive） |
| `frontend/src/pages/Home.tsx` | 修改（归档过滤、页码持久化） |
| `frontend/src/pages/Post.tsx` | 修改（目录跳转修复） |
| `frontend/src/components/Header.tsx` | 修改（z-index 提升） |
| `frontend/src/components/Sidebar.tsx` | 修改（移除 Archive、透明度） |
| `frontend/src/components/SearchWidget.tsx` | 修改（透明度） |
| `frontend/src/components/Footer.tsx` | 修改（透明度） |
| `frontend/src/components/PostCard.tsx` | 修改（透明度） |
| `frontend/src/components/Editor.tsx` | 修改（透明度） |
| `frontend/src/pages/Login.tsx` | 修改（透明度） |
| `frontend/src/pages/Tags.tsx` | 修改（透明度） |
| `frontend/src/pages/Entry.tsx` | 修改（透明度） |
