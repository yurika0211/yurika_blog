import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tag as TagIcon, Loader, AlertCircle, Hash, FileText } from 'lucide-react';
import { blog } from '../services/api';
import type { BlogPost } from '../types';

const TAG_COLORS = [
  'from-sky-400 to-cyan-300 dark:from-sky-600 dark:to-cyan-500',
  'from-emerald-400 to-lime-300 dark:from-emerald-600 dark:to-lime-500',
  'from-amber-400 to-orange-300 dark:from-amber-600 dark:to-orange-500',
  'from-rose-400 to-pink-300 dark:from-rose-600 dark:to-pink-500',
  'from-indigo-400 to-violet-300 dark:from-indigo-600 dark:to-violet-500',
  'from-teal-400 to-emerald-300 dark:from-teal-600 dark:to-emerald-500',
  'from-fuchsia-400 to-purple-300 dark:from-fuchsia-600 dark:to-purple-500',
  'from-orange-400 to-red-300 dark:from-orange-600 dark:to-red-500',
];

const getTagColor = (tag: string): string => {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export default function Tags() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await blog.getPosts();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300">加载标签中...</p>
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
          标签归档
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {tagStats.length} 个标签
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tagStats.map(({ name, count }) => (
          <Link
            key={name}
            to={`/tag/${encodeURIComponent(name)}`}
            className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/30 backdrop-blur-sm shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            {/* 渐变顶栏 */}
            <div className={`h-2 bg-gradient-to-r ${getTagColor(name)}`} />

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <FileText className="w-3.5 h-3.5" />
                <span>{count} 篇文章</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
