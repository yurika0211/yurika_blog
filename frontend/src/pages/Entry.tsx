import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
import { APP_AVATAR_SRC } from '../constants/avatar';
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

const HERO_ROTATION_INTERVAL = 5200;

const HERO_CARD_META = [
  {
    id: 'workspace',
    index: '01',
    label: 'Live Board',
    title: 'Workspace Snapshot',
    description: 'Latest writing, release rhythm, and repo activity on one rotating surface.',
    glowClass: 'from-cyan-400/30 via-sky-300/12 to-transparent dark:from-cyan-500/24 dark:via-sky-400/10 dark:to-transparent',
    badgeClass: 'border-cyan-200/80 bg-cyan-50/80 text-cyan-800 dark:border-cyan-800/70 dark:bg-cyan-950/55 dark:text-cyan-100',
    surfaceClass: 'border-cyan-100/90 bg-cyan-50/75 dark:border-cyan-900/70 dark:bg-cyan-950/40',
  },
  {
    id: 'pinned',
    index: '02',
    label: 'Pinned Shelf',
    title: 'Pinned Articles On Deck',
    description: 'A quick-access stack for the posts that define the front page right now.',
    glowClass: 'from-amber-400/28 via-orange-300/12 to-transparent dark:from-amber-500/24 dark:via-orange-400/10 dark:to-transparent',
    badgeClass: 'border-amber-200/80 bg-amber-50/80 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100',
    surfaceClass: 'border-amber-100/90 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/35',
  },
  {
    id: 'stack',
    index: '03',
    label: 'Build Stack',
    title: 'Current Tools And Momentum',
    description: 'Languages, shipping habits, and the project pace behind the blog.',
    glowClass: 'from-emerald-400/28 via-teal-300/12 to-transparent dark:from-emerald-500/22 dark:via-teal-400/10 dark:to-transparent',
    badgeClass: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100',
    surfaceClass: 'border-emerald-100/90 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/35',
  },
] as const;

type HeroCardState = 'active' | 'prev' | 'next' | 'hidden';

const getHeroCardState = (
  cardIndex: number,
  activeIndex: number,
  totalCards: number,
): HeroCardState => {
  const offset = (cardIndex - activeIndex + totalCards) % totalCards;

  if (offset === 0) return 'active';
  if (offset === 1) return 'next';
  if (offset === totalCards - 1) return 'prev';
  return 'hidden';
};

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
  const [activeHeroCard, setActiveHeroCard] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await blog.getPosts();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load posts';
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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener('change', syncPreference);

    return () => {
      mediaQuery.removeEventListener('change', syncPreference);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setActiveHeroCard((current) => (current + 1) % HERO_CARD_META.length);
    }, HERO_ROTATION_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [prefersReducedMotion]);

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
  const activeHeroMeta = HERO_CARD_META[activeHeroCard];

  const handlePrevHeroCard = () => {
    setActiveHeroCard((current) => (current - 1 + HERO_CARD_META.length) % HERO_CARD_META.length);
  };

  const handleNextHeroCard = () => {
    setActiveHeroCard((current) => (current + 1) % HERO_CARD_META.length);
  };

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

        <div className="relative z-20 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl items-center px-4 py-8 md:py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.98fr)] lg:gap-12">
            <div className="max-w-2xl">
              <div className="hero-rise">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/65 px-4.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-700/70 dark:bg-gray-900/45 dark:text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Design + Code + Writing
                </span>

                <h1 className="mt-5 text-5xl font-black leading-[1.04] text-[#0f2f43] dark:text-[#f0eee6] [text-shadow:0_2px_16px_rgba(240,238,230,0.85)] dark:[text-shadow:0_2px_16px_rgba(20,20,19,0.55)] sm:text-6xl md:text-[3.8rem]">
                  Design your ideas,
                  <span className="block text-[#0a6a89] dark:text-[#9fd7ea]">ship your stories.</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-8 text-cyan-900/80 dark:text-cyan-100/85 md:text-lg">
                  Built around Rust, React, TypeScript, and Golang, this is one place for development logs, learning notes, and project updates.
                </p>
              </div>

              <div className="hero-rise-delay-1 mt-6 flex flex-wrap gap-3">
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

              <div className="hero-rise-delay-2 mt-6 flex flex-wrap gap-2.5 text-sm font-medium">
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

              <div className="hero-rise-delay-3 mt-6 max-w-xl rounded-[1.75rem] border border-cyan-200/70 bg-white/55 p-5 shadow-[0_20px_50px_rgba(12,57,87,0.12)] backdrop-blur-md dark:border-cyan-900/70 dark:bg-slate-950/45">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                      Rotating Hero Deck
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-cyan-950 dark:text-cyan-50">
                      {activeHeroMeta.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-cyan-200/80 bg-cyan-50/80 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-800/70 dark:bg-cyan-950/55 dark:text-cyan-100">
                    {activeHeroMeta.index} / {HERO_CARD_META.length}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-cyan-900/75 dark:text-cyan-100/75">
                  {activeHeroMeta.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-900/60 dark:text-cyan-100/60">
                  <span className="rounded-full border border-cyan-200/80 bg-white/70 px-3 py-1 dark:border-cyan-800/70 dark:bg-slate-900/60">
                    {prefersReducedMotion ? 'Manual rotation' : 'Auto rotation every 5.2s'}
                  </span>
                  <span className="rounded-full border border-cyan-200/80 bg-white/70 px-3 py-1 dark:border-cyan-800/70 dark:bg-slate-900/60">
                    Focused on cards, not panels
                  </span>
                </div>
              </div>
            </div>

            <div className="hero-rise-delay-3 lg:justify-self-end">
              <div className="hero-rotator-shell mx-auto w-full max-w-[40rem]">
                <div className="hero-rotator-stage min-h-[30rem] sm:min-h-[32rem] lg:min-h-[34rem]">
                  {HERO_CARD_META.map((card, index) => {
                    const state = getHeroCardState(index, activeHeroCard, HERO_CARD_META.length);
                    const isActive = state === 'active';

                    return (
                      <article
                        key={card.id}
                        data-state={state}
                        aria-hidden={!isActive}
                        className={`hero-rotator-card overflow-hidden rounded-[2rem] border bg-white/72 p-5 shadow-[0_28px_80px_rgba(7,32,51,0.2)] backdrop-blur-xl dark:bg-slate-950/78 sm:p-6 ${card.surfaceClass} ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                      >
                        <div className={`pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-[2rem] bg-gradient-to-b ${card.glowClass}`} />

                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${card.badgeClass}`}>
                                {card.id === 'workspace' ? <Sparkles className="h-3.5 w-3.5" /> : null}
                                {card.id === 'pinned' ? <Pin className="h-3.5 w-3.5" /> : null}
                                {card.id === 'stack' ? <Workflow className="h-3.5 w-3.5" /> : null}
                                {card.label}
                              </div>
                              <h3 className="mt-4 text-[1.85rem] font-black leading-tight text-slate-950 dark:text-slate-50">
                                {card.title}
                              </h3>
                              <p className="mt-2 max-w-md text-sm leading-7 text-slate-700/85 dark:text-slate-200/80">
                                {card.description}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200">
                              {card.index}
                            </span>
                          </div>

                          {card.id === 'workspace' ? (
                            <>
                              <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.4rem] border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                    Blog Workspace
                                  </p>
                                  <h4 className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">
                                    ユリカのブログ
                                  </h4>
                                </div>
                                <img
                                  src={APP_AVATAR_SRC}
                                  alt="avatar"
                                  className="h-12 w-12 rounded-full border-2 border-cyan-200 object-cover dark:border-cyan-700"
                                />
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Posts</p>
                                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{posts.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Pinned</p>
                                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{recentPosts.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Repos</p>
                                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{ghRepos.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Updated</p>
                                  <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-slate-50">{latestPostDate}</p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Latest Updates
                                </p>
                                <div className="mt-3 space-y-2.5">
                                  {loading ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Syncing updates…</p>
                                  ) : error ? (
                                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                                  ) : heroUpdatePreview.length === 0 ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-300">No updates yet.</p>
                                  ) : (
                                    heroUpdatePreview.map((item) => (
                                      <Link
                                        key={`hero-update-${item.id}`}
                                        to={`/post/${item.id}`}
                                        tabIndex={isActive ? 0 : -1}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/40"
                                      >
                                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                                      </Link>
                                    ))
                                  )}
                                </div>
                              </div>
                            </>
                          ) : null}

                          {card.id === 'pinned' ? (
                            <>
                              <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/72 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Front Page Picks
                                  </p>
                                  <span className="rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-100">
                                    {recentPosts.length} pinned
                                  </span>
                                </div>
                                <div className="mt-4 space-y-3">
                                  {loading ? (
                                    <p className="rounded-2xl border border-dashed border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300">
                                      Loading pinned articles…
                                    </p>
                                  ) : error ? (
                                    <p className="rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                                      {error}
                                    </p>
                                  ) : heroPinnedPreview.length === 0 ? (
                                    <p className="rounded-2xl border border-dashed border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300">
                                      No pinned article.
                                    </p>
                                  ) : (
                                    heroPinnedPreview.map((item, itemIndex) => (
                                      <Link
                                        key={`hero-pin-${item.id}`}
                                        to={`/post/${item.id}`}
                                        tabIndex={isActive ? 0 : -1}
                                        className="block rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/80 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-amber-700 dark:hover:bg-amber-950/35"
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950">
                                            0{itemIndex + 1}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                                              {item.title}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                              {formatDate(item.date)}
                                            </p>
                                          </div>
                                        </div>
                                      </Link>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/72 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Last Update
                                  </p>
                                  <p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">
                                    {latestPostDate}
                                  </p>
                                </div>
                                <Link
                                  to="/posts"
                                  tabIndex={isActive ? 0 : -1}
                                  className="inline-flex items-center justify-between rounded-[1.4rem] border border-slate-200/80 bg-slate-950 px-4 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:border-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                                >
                                  Browse full archive
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </>
                          ) : null}

                          {card.id === 'stack' ? (
                            <>
                              <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/72 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Core Stack
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {stackKeywords.map((keyword) => (
                                    <span
                                      key={keyword}
                                      className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/72 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Active Signals
                                  </p>
                                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                    <p className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/55">
                                      Ship in progress
                                    </p>
                                    <p className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/55">
                                      Keep writing and building
                                    </p>
                                    <p className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/55">
                                      {ghRepos.length} public repositories tracked
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/72 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/55">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Shortcuts
                                  </p>
                                  <div className="mt-3 space-y-2.5">
                                    <Link
                                      to="/posts"
                                      tabIndex={isActive ? 0 : -1}
                                      className="inline-flex w-full items-center justify-between rounded-xl bg-emerald-600 px-3.5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 dark:bg-emerald-300 dark:text-emerald-950 dark:hover:bg-emerald-200"
                                    >
                                      Open Feed
                                      <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <a
                                      href="https://github.com/yurika0211"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      tabIndex={isActive ? 0 : -1}
                                      className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-100 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/35"
                                    >
                                      GitHub Profile
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-1 self-start rounded-full border border-cyan-200/80 bg-white/70 p-1 shadow-sm backdrop-blur-sm dark:border-cyan-900/70 dark:bg-slate-950/50">
                    <button
                      type="button"
                      onClick={handlePrevHeroCard}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cyan-900 transition-colors hover:bg-cyan-100 dark:text-cyan-100 dark:hover:bg-slate-900"
                      aria-label="Show previous hero card"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextHeroCard}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cyan-900 transition-colors hover:bg-cyan-100 dark:text-cyan-100 dark:hover:bg-slate-900"
                      aria-label="Show next hero card"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {HERO_CARD_META.map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setActiveHeroCard(index)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${activeHeroCard === index ? 'border-cyan-900 bg-cyan-900 text-white shadow-[0_12px_24px_rgba(8,43,65,0.18)] dark:border-cyan-200 dark:bg-cyan-200 dark:text-cyan-950' : 'border-cyan-200/80 bg-white/70 text-cyan-800 hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/70 dark:bg-slate-950/50 dark:text-cyan-100 dark:hover:border-cyan-700 dark:hover:bg-slate-900'}`}
                        aria-pressed={activeHeroCard === index}
                      >
                        {card.label}
                      </button>
                    ))}
                  </div>
                </div>
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
              Last update: {latestPostDate}
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
                        {post.tags.slice(0, 2).join(' / ') || 'Uncategorized'}
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
                    Updates
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
