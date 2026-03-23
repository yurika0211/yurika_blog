import { useState, useEffect, useMemo } from "react";
import {
  useParams,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  Calendar,
  Tag as TagIcon,
  ArrowRight,
  SearchX,
  Search,
  AlertCircle,
  Loader,
  BookOpen,
} from "lucide-react";
import Pagination from "../components/Pagination";
import { blog } from "../services/api";
import type { BlogPost } from "../types";
import { formatDate } from "../utils/date";

const POSTS_PER_PAGE = 5;

const COVER_BACKGROUNDS = [
  "from-sky-200 to-cyan-100 dark:from-sky-900/70 dark:to-cyan-900/60",
  "from-emerald-200 to-lime-100 dark:from-emerald-900/70 dark:to-lime-900/60",
  "from-amber-200 to-orange-100 dark:from-amber-900/70 dark:to-orange-900/60",
  "from-rose-200 to-pink-100 dark:from-rose-900/70 dark:to-pink-900/60",
  "from-indigo-200 to-violet-100 dark:from-indigo-900/70 dark:to-violet-900/60",
];

const getFirstCoverImage = (markdown: string): string | null => {
  const mdMatch = markdown.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (mdMatch?.[1]) return mdMatch[1].trim();
  const htmlMatch = markdown.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (htmlMatch?.[1]) return htmlMatch[1].trim();
  return null;
};

const getCoverBackground = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return COVER_BACKGROUNDS[Math.abs(hash) % COVER_BACKGROUNDS.length];
};

export default function Home() {
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  useEffect(() => {
    setCurrentPage(1);
  }, [tag, searchQuery]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await blog.getPostsPaginated({
          page: currentPage,
          per_page: POSTS_PER_PAGE,
          tag: tag || undefined,
          search: searchQuery || undefined,
        });
        setPosts(result.data);
        setTotalPosts(result.total);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load posts";
        setError(errorMessage);
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [currentPage, tag, searchQuery]);

  const postCards = useMemo(
    () =>
      posts.map((post) => ({
        ...post,
        cover: getFirstCoverImage(post.content || ""),
        coverBg: getCoverBackground(post.id),
      })),
    [posts],
  );

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300">加载文章中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-medium text-red-600 dark:text-red-400 mb-2">
          加载失败
        </h3>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 头部标题区 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {searchQuery ? (
            <>
              <Search className="w-6 h-6 text-purple-500" />
              <span className="text-gray-500 text-base font-normal">搜索:</span>
              <span className="text-purple-600 dark:text-purple-400">
                "{searchQuery}"
              </span>
            </>
          ) : tag ? (
            <>
              <TagIcon className="w-6 h-6 text-blue-500" />
              <span className="text-blue-600 dark:text-blue-400">#{tag}</span>{" "}
              的文章
            </>
          ) : (
            "全部文章"
          )}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {totalPosts} 篇
        </span>
      </div>

      {postCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 backdrop-blur-sm">
          <SearchX className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300">
            没有找到相关文章
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            尝试更换关键词，或者查看全部文章
          </p>
          <Link
            to="/posts"
            className="mt-6 px-6 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
          >
            清空筛选
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {postCards.map((post) => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl bg-white/45 dark:bg-gray-900/45 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 backdrop-blur-sm sm:h-48"
            >
              {/* 封面图 */}
              <div className="sm:w-64 sm:min-w-64 h-48 sm:h-full overflow-hidden shrink-0">
                {post.cover ? (
                  <img
                    src={post.cover}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${post.coverBg} flex items-center justify-center`}
                  >
                    <BookOpen className="w-10 h-10 text-white/50" />
                  </div>
                )}
              </div>

              {/* 文字内容 */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-1 leading-relaxed text-sm">
                  {post.summary}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </span>
                    <div className="flex gap-1.5">
                      {post.tags.slice(0, 3).map((t) => (
                        <Link
                          key={t}
                          to={`/tag/${encodeURIComponent(t)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
                        >
                          #{t}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <span className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    阅读全文 <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
