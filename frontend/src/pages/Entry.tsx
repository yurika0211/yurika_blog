import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
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
import HeroReadingWall from '../components/HeroReadingWall';
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
        const message = err instanceof Error ? err.message : 'Failed to load posts';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, []);

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
    <div>
      <HeroReadingWall
      />

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
                    <h3 className="flex items-center gap-2 truncate text-2xl font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
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
