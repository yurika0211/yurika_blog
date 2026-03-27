import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BookOpen,
  Clock3,
  ExternalLink,
  Github,
  Loader,
  Newspaper,
  Pin,
  Sparkles,
  Star,
  Workflow,
} from 'lucide-react';
import { blog } from '../services/api';
import { API_BASE_URL } from '../services/apiConfig';
import type { BlogPost } from '../types';
import { formatDate } from '../utils/date';

const COVER_BACKGROUNDS = [
  'from-sky-200 to-cyan-100 dark:from-sky-900/70 dark:to-cyan-900/60',
  'from-emerald-200 to-lime-100 dark:from-emerald-900/70 dark:to-lime-900/60',
  'from-amber-200 to-orange-100 dark:from-amber-900/70 dark:to-orange-900/60',
  'from-rose-200 to-pink-100 dark:from-rose-900/70 dark:to-pink-900/60',
  'from-indigo-200 to-violet-100 dark:from-indigo-900/70 dark:to-violet-900/60',
];

const getFirstCoverImage = (markdown: string): string | null => {
  const markdownImgMatch = markdown.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (markdownImgMatch?.[1]) {
    return markdownImgMatch[1].trim();
  }

  const htmlImgMatch = markdown.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (htmlImgMatch?.[1]) {
    return htmlImgMatch[1].trim();
  }

  return null;
};

const getCoverBackground = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return COVER_BACKGROUNDS[Math.abs(hash) % COVER_BACKGROUNDS.length];
};

const getPostTimestamp = (dateInput: string): number => {
  const timestamp = new Date(dateInput).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

type GitHubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
  fork: boolean;
};

const isGitHubRepo = (value: unknown): value is GitHubRepo => {
  if (typeof value !== 'object' || value === null) return false;
  const repo = value as Partial<GitHubRepo>;
  return (
    typeof repo.name === 'string'
    && (typeof repo.description === 'string' || repo.description === null || repo.description === undefined)
    && (typeof repo.language === 'string' || repo.language === null || repo.language === undefined)
    && typeof repo.html_url === 'string'
    && typeof repo.stargazers_count === 'number'
    && typeof repo.fork === 'boolean'
  );
};

// 打字机 hook
function useTyping(text: string, speed = 120, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timerId = setTimeout(() => {
      setDisplayed('');
      intervalId = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length && intervalId) {
          clearInterval(intervalId);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done: displayed.length >= text.length };
}

export default function Entry() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const particleRef = useRef<HTMLDivElement>(null);
  const { displayed: typedTitle, done: typingDone } = useTyping('ユリカのブログ', 150, 400);

  // 浮动粒子
  useEffect(() => {
    const container = particleRef.current;
    if (!container) return;
    const spawn = () => {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 2 + Math.random() * 4;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.bottom = '0';
      p.style.animation = `float-particle ${6 + Math.random() * 6}s linear forwards`;
      p.style.background = `hsl(${170 + Math.random() * 30}, 70%, ${70 + Math.random() * 20}%)`;
      container.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    };
    const id = setInterval(spawn, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await blog.getPosts();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载文章失败';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, []);

  // 拉取 GitHub 仓库（localStorage 缓存 30 分钟）
  useEffect(() => {
    const CACHE_KEY = 'gh_repos';
    const CACHE_TTL = 30 * 60 * 1000;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
          setGhRepos(data);
          return;
        }
      }
    } catch {
      // ignore malformed local cache
    }
    fetch(`${API_BASE_URL}/github/repos`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const repos = data.filter(isGitHubRepo).filter((r) => !r.fork);
          setGhRepos(repos);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: repos, ts: Date.now() }));
        }
      })
      .catch(() => {});
  }, []);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => getPostTimestamp(b.date) - getPostTimestamp(a.date),
      ),
    [posts],
  );

  const postCards = useMemo(
    () =>
      sortedPosts.map((post) => ({
        ...post,
        cover: getFirstCoverImage(post.content || ''),
        coverBg: getCoverBackground(post.id),
      })),
    [sortedPosts],
  );

  const recentPosts = useMemo(() => postCards.filter((p) => p.is_pinned), [postCards]);
  const recentUpdates = useMemo(() => postCards.slice(0, 4), [postCards]);
  const latestPostDate = postCards.length > 0 ? formatDate(postCards[0].date) : '--';

  return (
    <div className="animate-fade-in">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-teal-900/15 to-slate-100/88 dark:from-cyan-950/45 dark:via-teal-900/25 dark:to-slate-950/90" />

        {/* 浮动粒子层 */}
        <div ref={particleRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden" />

        <div className="relative z-20 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-16 md:py-20">
          <div className="glow-border w-full rounded-2xl bg-cyan-950/25 p-6 text-white shadow-lg backdrop-blur-sm md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <img
                src="/profile.webp"
                alt="avatar"
                className="stagger-1 avatar-glow h-24 w-24 rounded-full border-4 border-cyan-200/60 object-cover md:h-32 md:w-32"
              />

              <div className="max-w-3xl">
                <div className="stagger-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  Personal Blog
                </div>

                <h1 className="stagger-3 mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
                  <span className={typingDone ? 'text-shimmer' : ''}>
                    {typedTitle}
                  </span>
                  {!typingDone && <span className="typing-cursor" />}
                </h1>
                <p className="stagger-3 mt-4 max-w-2xl text-sm text-white/85 md:text-base">
                  Rust / React / TypeScript / Golang / Galgame
                </p>

                <div className="stagger-4 mt-6 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
                    Articles {posts.length}
                  </span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
                    Update Recently {recentUpdates.length}
                  </span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
                    Continue Updating
                  </span>
                </div>

                <div className="stagger-5 mt-8 flex flex-wrap gap-3">
                  <a
                    href="#entry-content"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200 hover:scale-105 active:scale-95"
                  >
                    Slide
                    <ArrowDown className="h-4 w-4 animate-bounce" />
                  </a>
                  <Link
                    to="/posts"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                  >
                    Article List
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="entry-content" className="mx-auto w-full max-w-6xl space-y-14 px-4 pb-20 pt-8 md:pt-14">
        <div className="rounded-2xl border border-gray-200/80 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/30 md:p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Sparkles className="h-4 w-4" />
              Landing
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
              <Clock3 className="h-4 w-4" />
              last update：{latestPostDate}
            </span>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pinned Articles</h2>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader className="h-4 w-4 animate-spin" />
              loading...
            </div>
          ) : error ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No Pinned Article
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/30 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/80 dark:bg-gray-900/30"
                >
                  <div className="aspect-video overflow-hidden">
                    {post.cover ? (
                      <img
                        src={post.cover}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${post.coverBg}`} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="truncate text-xl font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 flex items-center gap-2">
                      <Pin className="h-4 w-4 shrink-0 text-cyan-500" />
                      {post.title}
                    </h3>
                    <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-300">{post.summary}</p>
                    <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(post.date)}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        {post.tags.slice(0, 2).join(' / ') || '未分类'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Latest Updates</h2>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader className="h-4 w-4 animate-spin" />
              loading...
            </div>
          ) : error ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {recentUpdates.map((item) => (
                <Link
                  key={`${item.id}-update`}
                  to={`/post/${item.id}`}
                  className="group rounded-2xl border border-gray-200/80 bg-white/30 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900/30"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Newspaper className="h-3.5 w-3.5" />
                    动态
                  </div>
                  <h3 className="mt-3 truncate text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {item.title}
                  </h3>
                  <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-300">
                    {item.summary || 'No Summary'}
                  </p>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(item.date)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Program</h2>
            <a
              href="https://github.com/yurika0211"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Github className="h-4 w-4" />
              GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {ghRepos.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader className="h-4 w-4 animate-spin" />
              loading repos...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {ghRepos.slice(0, 6).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-gray-200/80 bg-white/30 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <Workflow className="h-3.5 w-3.5" />
                      {repo.language || 'Repository'}
                    </div>
                    {repo.stargazers_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5" />
                        {repo.stargazers_count}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {repo.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {repo.description || 'No description'}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
