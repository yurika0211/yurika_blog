import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Archive, ChevronDown, ChevronRight, FolderTree, Hash } from 'lucide-react';
import { blog } from '../services/api';
import type { BlogPost } from '../types';

interface MonthEntry {
  month: number;
  count: number;
}

interface YearGroup {
  year: number;
  months: MonthEntry[];
  total: number;
}

interface CategoryTagEntry {
  tag: string;
  count: number;
}

interface CategoryGroup {
  name: string;
  total: number;
  tags: CategoryTagEntry[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const UNCATEGORIZED_LABEL = 'Uncategorized';

function normalizeCategory(category?: string | null): string {
  const normalized = category?.trim();
  return normalized ? normalized : UNCATEGORIZED_LABEL;
}

function buildArchive(posts: { date: string }[]): YearGroup[] {
  const map = new Map<number, Map<number, number>>();

  for (const post of posts) {
    if (!post.date) continue;
    const d = new Date(post.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (!map.has(year)) map.set(year, new Map());
    const months = map.get(year)!;
    months.set(month, (months.get(month) || 0) + 1);
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => {
      const monthList = Array.from(months.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, count]) => ({ month, count }));
      return {
        year,
        months: monthList,
        total: monthList.reduce((s, m) => s + m.count, 0),
      };
    });
}

function buildCategories(posts: BlogPost[]): CategoryGroup[] {
  const map = new Map<string, { total: number; tags: Map<string, number> }>();

  for (const post of posts) {
    const category = normalizeCategory(post.category);
    if (!map.has(category)) {
      map.set(category, { total: 0, tags: new Map() });
    }

    const group = map.get(category)!;
    group.total += 1;
    for (const tag of post.tags) {
      const trimmedTag = tag.trim();
      if (!trimmedTag) continue;
      group.tags.set(trimmedTag, (group.tags.get(trimmedTag) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      total: value.total,
      tags: Array.from(value.tags.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    }))
    .sort((a, b) => {
      if (a.name === UNCATEGORIZED_LABEL) return 1;
      if (b.name === UNCATEGORIZED_LABEL) return -1;
      return b.total - a.total || a.name.localeCompare(b.name);
    });
}

export default function ArchiveWidget() {
  const { tag: tagFromRoute } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchParams] = useSearchParams();
  const currentArchive = searchParams.get('archive') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentTag = tagFromRoute || searchParams.get('tag') || '';

  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    blog.getPosts().then(setPosts).catch(() => {});
  }, []);

  const archive = useMemo(() => buildArchive(posts), [posts]);
  const categories = useMemo(() => buildCategories(posts), [posts]);

  const toggleYear = (year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const buildCategoryLink = (category: string) => {
    const params = new URLSearchParams();
    params.set('category', category);
    return `/posts?${params.toString()}`;
  };

  const buildCategoryTagLink = (category: string, tag: string) => {
    const params = new URLSearchParams();
    params.set('category', category);
    params.set('tag', tag);
    return `/posts?${params.toString()}`;
  };

  const buildArchiveLink = (archiveKey: string) => {
    const params = new URLSearchParams();
    params.set('archive', archiveKey);
    if (currentCategory) params.set('category', currentCategory);
    if (currentTag) params.set('tag', currentTag);
    return `/posts?${params.toString()}`;
  };

  if (archive.length === 0 && categories.length === 0) return null;

  return (
    <nav className="space-y-7">
      {categories.length > 0 ? (
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <FolderTree className="h-5 w-5 text-emerald-500" />
            Categories
          </h3>

          <div className="space-y-1.5">
            <Link
              to="/posts"
              className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
                !currentCategory && !currentTag && !currentArchive
                  ? 'bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>All posts</span>
            </Link>

            {categories.map(({ name, total, tags }) => {
              const isCategoryCollapsed = collapsedCategories.has(name);
              const isCategoryActive = currentCategory === name && !currentTag;
              return (
                <div key={name}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCategory(name)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label={isCategoryCollapsed ? `Expand ${name}` : `Collapse ${name}`}
                    >
                      {isCategoryCollapsed ? (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      )}
                    </button>

                    <Link
                      to={buildCategoryLink(name)}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                        isCategoryActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      <span className="ml-3 text-xs font-normal text-gray-400">{total}</span>
                    </Link>
                  </div>

                  {!isCategoryCollapsed && tags.length > 0 ? (
                    <div className="ml-9 mt-1 space-y-1">
                      {tags.map(({ tag, count }) => {
                        const isActive = currentCategory === name && currentTag === tag;
                        return (
                          <Link
                            key={`${name}-${tag}`}
                            to={buildCategoryTagLink(name, tag)}
                            className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-100 font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2 truncate">
                              <Hash className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{tag}</span>
                            </span>
                            <span className="ml-3 text-xs text-gray-400">{count}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {archive.length > 0 ? (
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <Archive className="h-5 w-5 text-orange-500" />
            Archive
          </h3>

          <div className="space-y-1.5">
            {archive.map(({ year, months, total }) => {
              const isYearCollapsed = collapsedYears.has(year);
              return (
                <div key={year}>
                  <button
                    type="button"
                    onClick={() => toggleYear(year)}
                    className="flex w-full items-center gap-1.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors whitespace-nowrap hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
                  >
                    {isYearCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    <span>{year}</span>
                    <span className="ml-auto text-xs font-normal text-gray-400">
                      {total}
                    </span>
                  </button>

                  {!isYearCollapsed ? (
                    <div className="ml-5 space-y-1">
                      {months.map(({ month, count }) => {
                        const key = `${year}-${String(month).padStart(2, '0')}`;
                        const isActive = currentArchive === key;
                        return (
                          <Link
                            key={key}
                            to={buildArchiveLink(key)}
                            className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                              isActive
                                ? 'bg-blue-100 font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                            }`}
                          >
                            <span>{MONTH_NAMES[month - 1]}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </nav>
  );
}
