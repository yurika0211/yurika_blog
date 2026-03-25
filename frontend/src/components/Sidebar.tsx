import { Link } from 'react-router-dom';
import { Tag, Github, Twitter, Link as LinkIcon, LogIn, LogOut, PenLine } from 'lucide-react';
import { getPosts } from '../data/posts'; // 改这里
import SearchWidget from './SearchWidget';
import { formatDate } from '../utils/date';
import { useAuth } from '../hooks/useAuth';


export default function Sidebar() {
  const { isLoggedIn, logout } = useAuth();
  const posts = getPosts(); // 获取数据
  // 1. 提取所有标签并统计数量
  const tagCounts = posts.reduce<Record<string, number>>((acc, post) => {
    for (const t of post.tags) {
      acc[t] = (acc[t] || 0) + 1;
    }
    return acc;
  }, {});
  const allTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // 2. 获取最新 3 篇文章
  const recentPosts = posts.slice(0, 3);

  return (
    <aside className="lg:col-span-30 space-y-8 lg:pl-10">
      {/* 模块 1: 个人简介卡片 */}
      <SearchWidget />
      <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex flex-col items-center text-center">
          {/* 头像 - 这里暂时用个占位图，你可以换成自己的照片 */}
          <img
            src="/profile.webp"
            alt="Profile"
            className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-md mb-4 bg-gray-100"
          />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ユリカ
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Full Stack Developer (Rust & Golang & TypeScript)
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm font-serif leading-relaxed mb-6">
          立ち止まり、諦めた場所。そこがいつでも「最果て」になる。  この足が動く限り、最果ては常に、もっと先にあるのだから。
          </p>

          {/* 社交链接 */}
          <div className="flex gap-4 justify-center">
            <a href="https://github.com/yurika0211" target="_blank" className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" target="_blank" className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-400 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>

          {isLoggedIn ? (
            <div className="mt-5 flex gap-2">
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <PenLine className="h-4 w-4" />
                写作
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              登录后管理文章
            </Link>
          )}
        </div>
      </div>

      {/* 模块 2: 标签云 */}
      <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-500" />
          Booming Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map(([tag, count]) => (
            <Link
              key={tag}
              to={`/tag/${tag}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            >
              #{tag}
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {count}
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/tags"
          className="mt-3 inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看全部标签 →
        </Link>
      </div>

      {/* 模块 3: 最新文章 */}
      <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-green-500" />
          New Articles
        </h3>
        <div className="space-y-4">
          {recentPosts.map(post => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="block group"
            >
              <h4 className="text-gray-800 dark:text-gray-200 font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {post.title}
              </h4>
              <time className="text-xs text-gray-400 mt-1 block" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
