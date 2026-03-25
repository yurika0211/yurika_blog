import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, ChevronDown, ChevronRight } from 'lucide-react';
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

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function ArchiveWidget() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchParams] = useSearchParams();
  const currentArchive = searchParams.get('archive') || '';

  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    blog.getPosts().then(setPosts).catch(() => {});
  }, []);

  const archive = buildArchive(posts);

  const toggleYear = (year: number) => {
    setCollapsedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (archive.length === 0) return null;

  return (
    <nav>
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
        <Archive className="w-4 h-4 text-orange-500" />
        Archive
      </h3>

      <div className="space-y-1">
        {archive.map(({ year, months, total }) => {
          const isYearCollapsed = collapsedYears.has(year);
          return (
            <div key={year}>
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="w-full flex items-center gap-1.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                {isYearCollapsed ? (
                  <ChevronRight className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                )}
                <span>{year}</span>
                <span className="ml-auto text-[10px] text-gray-400 font-normal">
                  {total}
                </span>
              </button>

              {!isYearCollapsed && (
                <div className="ml-4 space-y-px">
                  {months.map(({ month, count }) => {
                    const key = `${year}-${String(month).padStart(2, '0')}`;
                    const isActive = currentArchive === key;
                    return (
                      <Link
                        key={key}
                        to={`/posts?archive=${key}`}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        <span>{MONTH_NAMES[month - 1]}</span>
                        <span className="text-[10px] text-gray-400">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
