import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Github, Link as LinkIcon, LogIn, LogOut, PenLine } from 'lucide-react';
import SearchWidget from './SearchWidget';
import { formatDate } from '../utils/date';
import { useAuth } from '../hooks/useAuth';
import { APP_AVATAR_SRC } from '../constants/avatar';
import { blog } from '../services/api';
import type { BlogPost } from '../types';


export default function Sidebar() {
 const { isLoggedIn, logout } = useAuth();
 const [posts, setPosts] = useState<BlogPost[]>([]);

 useEffect(() => {
 let mounted = true;

 const fetchPosts = async () => {
 try {
 const latestPosts = await blog.getPosts();
 if (mounted) {
 setPosts(latestPosts);
        }
      } catch (error) {
 console.error('Failed to load sidebar posts:', error);
      }
    };

 void fetchPosts();

 return () => {
 mounted = false;
    };
  }, []);

  // 1. 提取所有标签并统计数量
 const tagCounts = posts.reduce<Record<string, number>>((acc, post) => {
 for (const t of post.tags) {
 acc[t] = (acc[t] || 0) + 1;
    }
 return acc;
  }, {});
 const allTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
 const visibleTags = allTags.slice(0, 5);

  // 2. 获取最新 3 篇文章
 const recentPosts = posts.slice(0, 3);

 return (
    <aside className="lg:col-span-30 space-y-8 lg:pl-10">
      {/* 模块 1: 个人简介卡片 */}
      <SearchWidget />
      <div className="bg-[color:var(--paper)] p-6 rounded-[0.16rem] border border-[color:var(--hair)] dark:border-[color:var(--hair)] transition-colors">
        <div className="flex flex-col items-center text-center">
          {/* 头像 - 这里暂时用个占位图，你可以换成自己的照片 */}
          <img
 src={APP_AVATAR_SRC}
 alt="Profile"
 className="w-24 h-24 rounded-full border-4 border-[color:var(--hair)] dark:border-[color:var(--hair)] mb-4 bg-[color:var(--paper)]"
          />
          <h2 className="text-xl font-bold text-[color:var(--ink)] ">
            ユリカ
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)] mt-1 mb-4">
            Full Stack Developer (Rust & Golang & TypeScript)
          </p>
          <p className="text-[color:var(--ink)] text-sm font-serif leading-relaxed mb-6">
          立ち止まり、諦めた場所。そこがいつでも「最果て」になる。  この足が動く限り、最果ては常に、もっと先にあるのだから。
          </p>

          {/* 社交链接 */}
          <div className="flex gap-4 justify-center">
            <a href="https://github.com/yurika0211" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[color:var(--paper)] text-[color:var(--ink)] hover:bg-[color:var(--seal)] hover:text-[color:var(--seal)] transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>

          {isLoggedIn ? (
            <div className="mt-5 flex gap-2">
              <Link
 to="/editor"
 className="inline-flex items-center gap-2 rounded-[0.14rem] bg-[color:var(--seal)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--seal)]"
              >
                <PenLine className="h-4 w-4" />
                Write
              </Link>
              <button
 type="button"
 onClick={logout}
 className="inline-flex items-center gap-2 rounded-[0.14rem] bg-red-50 px-3 py-2 text-sm font-medium text-[color:var(--seal)] transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-[color:var(--seal)] dark:hover:bg-red-900/30"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
 to="/login"
 className="mt-5 inline-flex items-center gap-2 rounded-[0.14rem] bg-[color:var(--seal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--seal)]"
            >
              <LogIn className="h-4 w-4" />
              Log in to manage posts
            </Link>
          )}
        </div>
      </div>

      {/* 模块 2: 标签云 */}
      <div className="bg-[color:var(--paper)] p-6 rounded-[0.16rem] border border-[color:var(--hair)] dark:border-[color:var(--hair)] transition-colors">
        <h3 className="text-lg font-bold text-[color:var(--ink)] mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-[color:var(--seal)]" />
          Booming Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {visibleTags.map(([tag, count]) => (
            <Link
 key={tag}
 to={`/posts?tag=${encodeURIComponent(tag)}`}
 className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[0.14rem] text-sm bg-[color:var(--paper)] text-[color:var(--ink)] hover:bg-[color:var(--seal)] dark:hover:bg-[color:var(--seal)] hover:text-[color:var(--seal)] dark:hover:text-[color:var(--seal)] transition-colors"
            >
              #{tag}
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">
                {count}
              </span>
            </Link>
          ))}
        </div>
        <Link
 to="/posts"
 className="mt-3 inline-block text-xs text-[color:var(--seal)] dark:text-[color:var(--seal)] hover:underline"
        >
          Browse tags in posts →
        </Link>
      </div>

      {/* 模块 3: 最新文章 */}
      <div className="bg-[color:var(--paper)] p-6 rounded-[0.16rem] border border-[color:var(--hair)] dark:border-[color:var(--hair)] transition-colors">
        <h3 className="text-lg font-bold text-[color:var(--ink)] mb-4 flex items-center gap-2">
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
              <h4 className="text-[color:var(--ink)] font-medium text-sm group-hover:text-[color:var(--seal)] dark:group-hover:text-[color:var(--seal)] transition-colors line-clamp-2">
                {post.title}
              </h4>
              <time className="text-xs text-[color:var(--ink-soft)] mt-1 block" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
