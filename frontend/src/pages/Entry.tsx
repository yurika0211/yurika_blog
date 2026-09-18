import { useEffect, useMemo, useState } from 'react';
import HeroReadingWall, {
  type ReadingWallPostCard,
  type ReadingWallRepoCard,
} from '../components/HeroReadingWall';
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

type GitHubRepoCandidate = ReadingWallRepoCard & { fork?: boolean };

const toRepoCard = (repo: GitHubRepoCandidate): ReadingWallRepoCard => ({
  name: repo.name,
  description: repo.description ?? null,
  language: repo.language ?? null,
  html_url: repo.html_url,
  stargazers_count: repo.stargazers_count,
});

const isGitHubRepo = (value: unknown): value is GitHubRepoCandidate => {
  if (typeof value !== 'object' || value === null) return false;
  const repo = value as Partial<GitHubRepoCandidate>;
  return (
    typeof repo.name === 'string'
    && (typeof repo.description === 'string' || repo.description === null || repo.description === undefined)
    && (typeof repo.language === 'string' || repo.language === null || repo.language === undefined)
    && typeof repo.html_url === 'string'
    && typeof repo.stargazers_count === 'number'
    && (typeof repo.fork === 'boolean' || repo.fork === undefined)
  );
};

export default function Entry() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [repos, setRepos] = useState<ReadingWallRepoCard[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setPostsLoading(true);
        setPostsError(null);
        const data = await blog.getPosts();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load posts';
        setPostsError(message);
      } finally {
        setPostsLoading(false);
      }
    };

    void fetchPosts();
  }, []);

  useEffect(() => {
    const CACHE_KEY = 'gh_repos';
    const CACHE_TTL = 30 * 60 * 1000;

    const fetchRepos = async () => {
      try {
        setReposLoading(true);
        setReposError(null);

        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, ts } = JSON.parse(cached) as { data?: unknown; ts?: unknown };
            if (Date.now() - Number(ts) < CACHE_TTL && Array.isArray(data)) {
              const cachedRepos = data
                .filter(isGitHubRepo)
                .filter((repo) => !repo.fork)
                .map(toRepoCard);
              setRepos(cachedRepos);
              setReposLoading(false);
              return;
            }
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }

        const response = await fetch(`${API_BASE_URL}/github/repos`);
        if (!response.ok) {
          throw new Error(`Failed to load repositories: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Repository payload was invalid.');
        }

        const nextRepos = data
          .filter(isGitHubRepo)
          .filter((repo) => !repo.fork)
          .map(toRepoCard);
        setRepos(nextRepos);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: nextRepos, ts: Date.now() }));
        } catch {
          // Ignore quota / private-mode write failures after a successful fetch.
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load repositories';
        setReposError(message);
      } finally {
        setReposLoading(false);
      }
    };

    void fetchRepos();
  }, []);

  const postCards = useMemo<ReadingWallPostCard[]>(
    () =>
      [...posts]
        .sort((a, b) => getPostTimestamp(b.date) - getPostTimestamp(a.date))
        .map((post) => ({
          id: post.id,
          title: post.title,
          summary: post.summary,
          date: post.date,
          category: post.category,
          tags: Array.isArray(post.tags) ? post.tags : [],
          is_pinned: post.is_pinned,
          cover: getFirstCoverImage(post.content || ''),
          coverBg: getCoverBackground(post.id),
        })),
    [posts],
  );

  const featuredPosts = useMemo(
    () => postCards.filter((post) => post.is_pinned).slice(0, 4),
    [postCards],
  );

  const recentPosts = useMemo(() => postCards.slice(0, 4), [postCards]);
  const projects = useMemo(() => repos.slice(0, 4), [repos]);
  const latestPostDate = postCards.length > 0 ? formatDate(postCards[0].date) : '--';

  return (
    <HeroReadingWall
      featuredPosts={featuredPosts}
      recentPosts={recentPosts}
      projects={projects}
      latestPostDate={latestPostDate}
      postsLoading={postsLoading}
      postsError={postsError}
      reposLoading={reposLoading}
      reposError={reposError}
    />
  );
}
