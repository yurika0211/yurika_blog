import { useState, useEffect } from "react";
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
} from "lucide-react";
import Pagination from "../components/Pagination";
import { blog } from "../services/api";
import type { BlogPost } from "../types";
import { formatDate } from "../utils/date";

const POSTS_PER_PAGE = 5;

export default function Home() {
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  // 从 API 获取数据的状态管理
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. 获取搜索关键词 (转小写，方便模糊匹配)
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  // 3. 初始化时从 API 获取文章
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const posts = await blog.getPosts();
        setAllPosts(posts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load posts";
        setError(errorMessage);
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 4. 当 Tag 或 搜索词 变化时，重置回第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [tag, searchQuery]);

  // 5. 核心筛选逻辑：同时支持 Tag 和 Search
  const filteredPosts = allPosts.filter((post) => {
    // 规则 A: 如果 URL 有 tag，必须包含该 tag
    const matchesTag = tag ? post.tags.includes(tag) : true;

    // 规则 B: 如果有搜索词，标题或摘要必须包含它
    const matchesSearch = searchQuery
      ? post.title.toLowerCase().includes(searchQuery) ||
        post.summary.toLowerCase().includes(searchQuery)
      : true;

    // 两个规则必须同时满足
    return matchesTag && matchesSearch;
  });

  // 6. 分页计算 (注意：现在是基于 filteredPosts 计算)
  const indexOfLastPost = currentPage * POSTS_PER_PAGE;
  const indexOfFirstPost = indexOfLastPost - POSTS_PER_PAGE;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 7. 加载状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300">加载文章中...</p>
      </div>
    );
  }

  // 8. 错误状态
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
          {/* 根据不同状态显示不同标题 */}
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
          共 {filteredPosts.length} 篇
        </span>
      </div>

      {/* 9. 空状态处理：如果没有找到文章 */}
      {filteredPosts.length === 0 ? (
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
        /* 文章列表 */
        <div className="grid gap-8">
          {currentPosts.map((post) => (
            <article
              key={post.id}
              className="group bg-white/40 dark:bg-gray-900/40 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </div>
                <div className="flex gap-2">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <Link to={`/post/${post.id}`} className="block">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                  {post.summary}
                </p>
              </Link>

              <Link
                to={`/post/${post.id}`}
                className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
              >
                阅读全文 <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* 分页组件 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
