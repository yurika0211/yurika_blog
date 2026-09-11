import { useState, useEffect, useMemo, useRef } from "react";
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { AlertCircle, Loader, Lock, SearchX } from "lucide-react";
import Pagination from "../components/Pagination";
import SearchWidget from "../components/SearchWidget";
import ArchiveWidget from "../components/ArchiveWidget";
import { blog } from "../services/api";
import type { BlogPost } from "../types";
import { formatDate } from "../utils/date";
import { attachHorizontalWheel, lockDocumentScroll } from "../utils/scroll";

const POSTS_PER_PAGE = 5;

const COVER_BACKGROUNDS = [
  "from-sky-200 to-cyan-100 dark:from-sky-900/70 dark:to-cyan-900/60",
  "from-emerald-200 to-lime-100 dark:from-emerald-900/70 dark:to-lime-900/60",
  "from-amber-200 to-orange-100 dark:from-amber-900/70 dark:to-orange-900/60",
  "from-rose-200 to-pink-100 dark:from-rose-900/70 dark:to-pink-900/60",
  "from-indigo-200 to-violet-100 dark:from-indigo-900/70 dark:to-violet-900/60",
];

const ARCHIVE_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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

const formatArchiveLabel = (archive: string): string => {
  const [yearStr, monthStr] = archive.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return archive;
  }

  return `${ARCHIVE_MONTH_NAMES[month - 1]} ${year}`;
};

export default function Home() {
  const { tag } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const railRef = useRef<HTMLDivElement | null>(null);
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = searchParams.get("search") || "";
  const archiveParam = searchParams.get("archive") || "";
  const categoryParam = searchParams.get("category") || "";
  const tagQueryParam = searchParams.get("tag") || "";
  const activeTag = tag || tagQueryParam;

  // 筛选条件变化时重置到第 1 页（跳过首次挂载）
  const isFirstMount = useRef(true);
  const prevFilters = useRef({ activeTag, searchQuery, archiveParam, categoryParam });
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const prev = prevFilters.current;
    prevFilters.current = { activeTag, searchQuery, archiveParam, categoryParam };
    if (
      prev.activeTag !== activeTag ||
      prev.searchQuery !== searchQuery ||
      prev.archiveParam !== archiveParam ||
      prev.categoryParam !== categoryParam
    ) {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      navigate(`?${params.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, searchQuery, archiveParam, categoryParam]);

  useEffect(() => lockDocumentScroll(), []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    return attachHorizontalWheel(rail);
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (archiveParam && !searchQuery) {
          // 归档模式：获取全部文章，前端按年月过滤+分页
          const allPosts = await blog.getPosts();
          const [yearStr, monthStr] = archiveParam.split("-");
          const year = Number(yearStr);
          const month = Number(monthStr);
          const filtered = allPosts.filter((post) => {
            if (!post.date) return false;
            const d = new Date(post.date);
            const matchesArchive = d.getFullYear() === year && d.getMonth() + 1 === month;
            const normalizedCategory = post.category?.trim() || "Uncategorized";
            const matchesCategory = !categoryParam || normalizedCategory === categoryParam;
            const matchesTag = !activeTag || post.tags.includes(activeTag);
            return matchesArchive && matchesCategory && matchesTag;
          });
          const start = (currentPage - 1) * POSTS_PER_PAGE;
          if (!isCurrentRequest) {
            return;
          }
          setPosts(filtered.slice(start, start + POSTS_PER_PAGE));
          setTotalPosts(filtered.length);
        } else {
          const result = await blog.getPostsPaginated({
            page: currentPage,
            per_page: POSTS_PER_PAGE,
            category: categoryParam || undefined,
            tag: activeTag || undefined,
            search: searchQuery || undefined,
          });
          if (!isCurrentRequest) {
            return;
          }
          setPosts(result.data);
          setTotalPosts(result.total);
        }
        setHasLoadedOnce(true);
      } catch (err) {
        if (!isCurrentRequest) {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load posts";
        setError(errorMessage);
        console.error("Error fetching posts:", err);
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };

    void fetchPosts();

    return () => {
      isCurrentRequest = false;
    };
  }, [currentPage, activeTag, searchQuery, archiveParam, categoryParam]);

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
    const params = new URLSearchParams(searchParams);
    if (pageNumber <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(pageNumber));
    }
    navigate(`?${params.toString()}`);
    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const headingText = searchQuery
    ? `检索「${searchQuery}」`
    : activeTag && categoryParam
      ? `${categoryParam} · ${activeTag}`
      : activeTag
        ? `标签「${activeTag}」`
        : categoryParam && archiveParam
          ? `${categoryParam} · ${formatArchiveLabel(archiveParam)}`
          : categoryParam
            ? `类目「${categoryParam}」`
            : archiveParam
              ? formatArchiveLabel(archiveParam)
              : "卷中所收文章，自新至旧，逐段向右展开。";

  const isFiltered = Boolean(searchQuery || activeTag || categoryParam || archiveParam);

  return (
    <section className="scroll-stage">
      <div ref={railRef} className="scroll-rail" aria-label="文录手卷">
        <div className="scroll-mount">
          <div className="scroll-rod scroll-rod--head" aria-hidden="true" />

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">文录</h2>
              <p className="scroll-title-kana">ブンロク</p>
            </div>

            <div className="scroll-copy-col">
              <p className="scroll-copy">{headingText}</p>
              <span className="scroll-seal" aria-hidden="true">文録</span>
            </div>

            <div className="scroll-plain scroll-plain--narrow scroll-plain--center">
              <SearchWidget />
              <p className="scroll-slip-mark" style={{ writingMode: "horizontal-tb" }}>
                {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                {`共 ${totalPosts} 篇`}
              </p>
              {isFiltered ? (
                <Link to="/posts" className="scroll-link" style={{ writingMode: "horizontal-tb" }}>
                  <SearchX aria-hidden="true" />
                  清除筛选
                </Link>
              ) : null}
            </div>
          </section>

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">篇目</h2>
              <p className="scroll-title-kana">ヘンモク</p>
            </div>

            <div className="scroll-index">
              {error ? (
                <p className="scroll-note scroll-note--error">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : loading && !hasLoadedOnce ? (
                <p className="scroll-note">
                  <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>正在展卷…</span>
                </p>
              ) : postCards.length === 0 ? (
                <p className="scroll-note">此卷无文，换个词再检索。</p>
              ) : (
                postCards.map((post) => (
                  <Link key={post.id} to={`/post/${post.id}`} className="scroll-slip">
                    <div className="scroll-slip-cover">
                      {post.cover ? (
                        <img src={post.cover} alt="" loading="lazy" />
                      ) : (
                        <div className={`bg-gradient-to-br ${post.coverBg}`} />
                      )}
                    </div>

                    <div className="scroll-slip-text">
                      <h3 className="scroll-slip-title">{post.title}</h3>
                      <p className="scroll-slip-summary">{post.summary || "未著小序。"}</p>
                      <p className="scroll-slip-mark">
                        {post.is_login_required ? <Lock aria-hidden="true" /> : null}
                        {formatDate(post.date)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">卷尾</h2>
              <p className="scroll-title-kana">カンビ</p>
            </div>

            <div className="scroll-plain scroll-plain--narrow scroll-plain--center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              <ArchiveWidget />
            </div>

            <span className="scroll-seal scroll-seal--solid" aria-hidden="true">卷尾</span>
          </section>

          <div className="scroll-rod scroll-rod--tail" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
