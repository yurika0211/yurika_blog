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

interface CategoryGroup {
  name: string;
  total: number;
}

interface TagGroup {
  name: string;
  count: number;
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
  const map = new Map<string, number>();

  for (const post of posts) {
    const category = normalizeCategory(post.category);
    map.set(category, (map.get(category) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([name, total]) => ({
      name,
      total,
    }))
    .sort((a, b) => {
      if (a.name === UNCATEGORIZED_LABEL) return 1;
      if (b.name === UNCATEGORIZED_LABEL) return -1;
      return b.total - a.total || a.name.localeCompare(b.name);
    });
}

function buildTags(posts: BlogPost[]): TagGroup[] {
  const map = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      map.set(normalized, (map.get(normalized) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export default function ArchiveWidget() {
  const { tag: tagFromRoute } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchParams] = useSearchParams();
  const currentArchive = searchParams.get('archive') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentTag = tagFromRoute || searchParams.get('tag') || '';

  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    blog.getPosts().then(setPosts).catch(() => {});
  }, []);

  const archive = useMemo(() => buildArchive(posts), [posts]);
  const categories = useMemo(() => buildCategories(posts), [posts]);
  const tags = useMemo(() => buildTags(posts), [posts]);

  const toggleYear = (year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const buildCategoryLink = (category: string) => {
    const params = new URLSearchParams();
    params.set('category', category);
    return `/posts?${params.toString()}`;
  };

  const buildTagLink = (tag: string) => {
    const params = new URLSearchParams();
    params.set('tag', tag);
    if (currentCategory) params.set('category', currentCategory);
    return `/posts?${params.toString()}`;
  };

  const buildArchiveLink = (archiveKey: string) => {
    const params = new URLSearchParams();
    params.set('archive', archiveKey);
    if (currentCategory) params.set('category', currentCategory);
    if (currentTag) params.set('tag', currentTag);
    return `/posts?${params.toString()}`;
  };

  if (archive.length === 0 && categories.length === 0 && tags.length === 0) return null;

  return (
    <nav className="paper-archive">
      {categories.length > 0 ? (
        <section>
          <h3 className="paper-kicker mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4" aria-hidden="true" />
            Categories
          </h3>

          <div className="paper-entry-list">
            <Link
              to="/posts"
              className="paper-entry"
              data-active={!currentCategory && !currentTag && !currentArchive ? "true" : "false"}
            >
              <span>All posts</span>
            </Link>

            {categories.map(({ name, total }) => {
              const isCategoryActive = currentCategory === name && !currentTag;
              return (
                <div key={name}>
                  <Link
                    to={buildCategoryLink(name)}
                    className="paper-entry"
                    data-active={isCategoryActive ? "true" : "false"}
                  >
                    <span className="truncate">{name}</span>
                    <span className="paper-entry-count">{total}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section>
          <h3 className="paper-kicker mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4" aria-hidden="true" />
            Tags
          </h3>

          <div className="paper-entry-list">
            {tags.map(({ name, count }) => {
              const isActive = currentTag === name;
              return (
                <Link
                  key={name}
                  to={buildTagLink(name)}
                  className="paper-entry"
                  data-active={isActive ? "true" : "false"}
                >
                  <span className="truncate">#{name}</span>
                  <span className="paper-entry-count">{count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {archive.length > 0 ? (
        <section>
          <h3 className="paper-kicker mb-3 flex items-center gap-2">
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archive
          </h3>

          <div className="paper-entry-list">
            {archive.map(({ year, months, total }) => {
              const isYearCollapsed = collapsedYears.has(year);
              return (
                <div key={year}>
                  <button
                    type="button"
                    onClick={() => toggleYear(year)}
                    className="paper-entry paper-entry--head"
                  >
                    {isYearCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                    <span>{year}</span>
                    <span className="paper-entry-count">
                      {total}
                    </span>
                  </button>

                  {!isYearCollapsed ? (
                    <div className="paper-entry-list ml-4">
                      {months.map(({ month, count }) => {
                        const key = `${year}-${String(month).padStart(2, '0')}`;
                        const isActive = currentArchive === key;
                        return (
                          <Link
                            key={key}
                            to={buildArchiveLink(key)}
                            className="paper-entry"
                            data-active={isActive ? "true" : "false"}
                          >
                            <span>{MONTH_NAMES[month - 1]}</span>
                            <span className="paper-entry-count">{count}</span>
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
