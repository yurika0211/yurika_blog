import { useEffect, useMemo, useState } from 'react';
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

export default function Entry() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);

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
  const heroPinnedPreview = useMemo(() => recentPosts.slice(0, 3), [recentPosts]);
  const heroUpdatePreview = useMemo(() => recentUpdates.slice(0, 3), [recentUpdates]);
  const stackKeywords = ['Rust', 'React', 'TypeScript', 'Golang', 'Galgame'];

  return (
    <div className="animate-fade-in">
      <section className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-50 dark:opacity-25" />
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-teal-900/15 to-slate-100/74 dark:from-cyan-950/45 dark:via-teal-900/25 dark:to-slate-950/84" />
          <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-cyan-300/35 blur-3xl dark:bg-cyan-500/20" />
          <div className="absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/20" />
          <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-500/20" />
        </div>

        <div className="relative z-20 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl items-center px-4 py-6 md:py-8">
          <div className="w-full -translate-y-3 md:-translate-y-5">
            <div className="hero-rise mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/65 px-4.5 py-2 text-xs font-semibold tracking-[0.16em] text-cyan-800 uppercase dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Design + Code + Writing
            </span>

            <h1 className="mt-5 text-5xl font-black leading-[1.04] text-[#0f2f43] dark:text-[#f0eee6] [text-shadow:0_2px_16px_rgba(240,238,230,0.85)] dark:[text-shadow:0_2px_16px_rgba(20,20,19,0.55)] sm:text-6xl md:text-[3.8rem]">
              Design your ideas,
              <span className="block text-[#0a6a89] dark:text-[#9fd7ea]">ship your stories.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-4xl text-base leading-8 text-cyan-900/80 dark:text-cyan-100/85 md:text-lg">
              以 Rust、React、TypeScript、Golang 为核心，把开发记录、学习沉淀和项目更新放进同一个发布空间。
            </p>

            <div className="hero-rise-delay-1 mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/posts"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-900 px-6 py-3 text-base font-semibold text-white transition-all hover:bg-cyan-800 hover:-translate-y-0.5 dark:bg-cyan-200 dark:text-cyan-950 dark:hover:bg-cyan-100"
              >
                Read Articles
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#entry-content"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/80 bg-white/65 px-6 py-3 text-base font-semibold text-cyan-900 transition-all hover:bg-white hover:-translate-y-0.5 dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-100 dark:hover:bg-gray-900/60"
              >
                Explore Feed
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>

            <div className="hero-rise-delay-2 mt-6 flex flex-wrap justify-center gap-2.5 text-sm font-medium">
              <span className="rounded-full border border-cyan-200/80 bg-white/70 px-3.5 py-1.5 text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-200">
                Articles {posts.length}
              </span>
              <span className="rounded-full border border-cyan-200/80 bg-white/70 px-3.5 py-1.5 text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-200">
                Recent Updates {recentUpdates.length}
              </span>
              <span className="rounded-full border border-cyan-200/80 bg-white/70 px-3.5 py-1.5 text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-200">
                Last Update {latestPostDate}
              </span>
            </div>
            </div>

            <div className="hero-rise-delay-3 mt-7 md:mt-8">
              <div className="grid gap-4 md:grid-cols-12">
                <article className="hero-card-float rounded-2xl border border-cyan-200/80 bg-white/50 p-5 md:p-6 shadow-md backdrop-blur-sm dark:border-cyan-800/80 dark:bg-gray-900/50 md:col-span-3 md:mt-5 md:min-h-[20rem]">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-cyan-700 uppercase dark:text-cyan-300">
                  <Pin className="h-3.5 w-3.5" />
                  Pinned
                </div>
                <div className="mt-3 space-y-2">
                  {heroPinnedPreview.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-cyan-200/80 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-700 dark:border-cyan-700/60 dark:bg-gray-900/50 dark:text-cyan-200">
                      No pinned article
                    </p>
                  ) : (
                    heroPinnedPreview.map((item) => (
                      <Link
                        key={`hero-pin-${item.id}`}
                        to={`/post/${item.id}`}
                        className="block truncate rounded-lg border border-cyan-100/80 bg-cyan-50/70 px-3 py-2 text-xs font-medium text-cyan-900 transition-colors hover:bg-cyan-100 dark:border-cyan-800/80 dark:bg-gray-900/55 dark:text-cyan-100 dark:hover:bg-gray-900/75"
                      >
                        {item.title}
                      </Link>
                    ))
                  )}
                </div>
              </article>

                <article className="hero-card-float-slow rounded-3xl border border-cyan-200/80 bg-white/50 p-6 md:p-7 shadow-lg backdrop-blur-sm dark:border-cyan-800/80 dark:bg-gray-900/50 md:col-span-6 md:min-h-[22rem]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.1em] text-cyan-700 uppercase dark:text-cyan-300">
                      Blog Workspace
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-cyan-950 dark:text-cyan-50 md:text-3xl">
                      ユリカのブログ
                    </h2>
                  </div>
                  <img
                    src="/profile.webp"
                    alt="avatar"
                    className="h-11 w-11 rounded-full border-2 border-cyan-200 object-cover dark:border-cyan-700"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl border border-cyan-100/90 bg-cyan-50/75 px-3 py-2 dark:border-cyan-800/80 dark:bg-gray-900/55">
                    <p className="text-[11px] text-cyan-700 dark:text-cyan-300">Posts</p>
                    <p className="mt-1 text-lg font-bold text-cyan-950 dark:text-cyan-50">{posts.length}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-100/90 bg-cyan-50/75 px-3 py-2 dark:border-cyan-800/80 dark:bg-gray-900/55">
                    <p className="text-[11px] text-cyan-700 dark:text-cyan-300">Pinned</p>
                    <p className="mt-1 text-lg font-bold text-cyan-950 dark:text-cyan-50">{recentPosts.length}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-100/90 bg-cyan-50/75 px-3 py-2 dark:border-cyan-800/80 dark:bg-gray-900/55">
                    <p className="text-[11px] text-cyan-700 dark:text-cyan-300">Repos</p>
                    <p className="mt-1 text-lg font-bold text-cyan-950 dark:text-cyan-50">{ghRepos.length}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-100/90 bg-cyan-50/75 px-3 py-2 dark:border-cyan-800/80 dark:bg-gray-900/55">
                    <p className="text-[11px] text-cyan-700 dark:text-cyan-300">Updated</p>
                    <p className="mt-1 truncate text-sm font-bold text-cyan-950 dark:text-cyan-50">{latestPostDate}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-cyan-100/90 bg-cyan-50/75 p-3 dark:border-cyan-800/80 dark:bg-gray-900/55">
                  <p className="text-xs font-semibold tracking-[0.1em] text-cyan-700 uppercase dark:text-cyan-300">
                    Latest Updates
                  </p>
                  <div className="mt-2 space-y-2">
                    {heroUpdatePreview.length === 0 ? (
                      <p className="text-xs text-cyan-700 dark:text-cyan-200">No updates yet.</p>
                    ) : (
                      heroUpdatePreview.map((item) => (
                        <Link
                          key={`hero-update-${item.id}`}
                          to={`/post/${item.id}`}
                          className="block truncate text-sm font-medium text-cyan-900 transition-colors hover:text-cyan-700 dark:text-cyan-100 dark:hover:text-cyan-300"
                        >
                          {item.title}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </article>

                <article className="hero-card-float-alt rounded-2xl border border-cyan-200/80 bg-white/50 p-5 md:p-6 shadow-md backdrop-blur-sm dark:border-cyan-800/80 dark:bg-gray-900/50 md:col-span-3 md:mt-8 md:min-h-[20rem]">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-cyan-700 uppercase dark:text-cyan-300">
                  <Workflow className="h-3.5 w-3.5" />
                  Stack
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stackKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-cyan-200/80 bg-cyan-50/70 px-2.5 py-1 text-xs text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/55 dark:text-cyan-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="rounded-lg border border-cyan-100/80 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/55 dark:text-cyan-200">
                    Ship in progress
                  </p>
                  <p className="rounded-lg border border-cyan-100/80 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/55 dark:text-cyan-200">
                    Keep writing and building
                  </p>
                  <Link
                    to="/posts"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 dark:bg-cyan-200 dark:text-cyan-950 dark:hover:bg-cyan-100"
                  >
                    Open Feed
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="entry-content" className="mx-auto w-full max-w-7xl space-y-16 px-4 pb-20 pt-8 md:pt-16">
        <div className="rounded-2xl border border-gray-200/80 bg-white/30 p-5 shadow-sm backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/30 md:p-6">
          <div className="flex flex-wrap items-center gap-3 text-base text-gray-700 dark:text-gray-200">
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Pinned Articles</h2>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-base font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
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
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="truncate text-2xl font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 flex items-center gap-2">
                      <Pin className="h-4 w-4 shrink-0 text-cyan-500" />
                      {post.title}
                    </h3>
                    <p className="mt-2 truncate text-base text-gray-600 dark:text-gray-300">{post.summary}</p>
                    <div className="mt-auto flex items-center gap-3 pt-4 text-sm text-gray-500 dark:text-gray-400">
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Latest Updates</h2>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-base font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
              {recentUpdates.map((item) => (
                <Link
                  key={`${item.id}-update`}
                  to={`/post/${item.id}`}
                  className="group rounded-2xl border border-gray-200/80 bg-white/30 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900/30"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Newspaper className="h-3.5 w-3.5" />
                    动态
                  </div>
                  <h3 className="mt-3 truncate text-xl font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {item.title}
                  </h3>
                  <p className="mt-2 truncate text-base text-gray-600 dark:text-gray-300">
                    {item.summary || 'No Summary'}
                  </p>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Recent Program</h2>
            <a
              href="https://github.com/yurika0211"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-base font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
            <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {ghRepos.slice(0, 6).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-gray-200/80 bg-white/30 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900/30"
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
                  <h3 className="mt-3 truncate text-xl font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {repo.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-base leading-7 text-gray-600 dark:text-gray-300">
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
