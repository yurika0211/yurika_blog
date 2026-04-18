import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Tag as TagIcon, Loader, AlertCircle, Hash, FileText } from 'lucide-react';
import Pagination from '../components/Pagination';
import { blog } from '../services/api';
import type { BlogPost } from '../types';

const TAGS_PER_PAGE = 12;

export default function Tags() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(searchParams.get('page')) || 1);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(pageFromUrl);
  }, [pageFromUrl]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await blog.getPosts();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tags');
      } finally {
        setLoading(false);
      }
    };
    void fetchPosts();
  }, []);

  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) {
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const totalPages = Math.ceil(tagStats.length / TAGS_PER_PAGE);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : currentPage;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      const params = new URLSearchParams(searchParams);
      if (totalPages === 1) {
        params.delete('page');
      } else {
        params.set('page', String(totalPages));
      }
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [currentPage, navigate, searchParams, totalPages]);

  const pagedTags = useMemo(() => {
    const start = (safeCurrentPage - 1) * TAGS_PER_PAGE;
    return tagStats.slice(start, start + TAGS_PER_PAGE);
  }, [safeCurrentPage, tagStats]);

  const visibleStart = tagStats.length === 0 ? 0 : (safeCurrentPage - 1) * TAGS_PER_PAGE + 1;
  const visibleEnd = Math.min(safeCurrentPage * TAGS_PER_PAGE, tagStats.length);

  const handlePageChange = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    if (pageNumber <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(pageNumber));
    }
    navigate(`?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Loading tags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <TagIcon className="w-6 h-6 text-blue-500" />
          Tag Archive
        </h2>
        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
          <div>{tagStats.length} tags</div>
          {tagStats.length > 0 ? (
            <div>Showing {visibleStart}-{visibleEnd}</div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {pagedTags.map(({ name, count }) => (
          <Link
            key={name}
            to={`/tag/${encodeURIComponent(name)}`}
            className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-sm shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <FileText className="w-3.5 h-3.5" />
                <span>{count} articles</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
