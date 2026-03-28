import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef, useCallback, type HTMLAttributes, type VideoHTMLAttributes, type IframeHTMLAttributes, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Calendar, AlertCircle, Loader, Edit, Trash2, List, Copy, Check } from 'lucide-react';
import { blog, comment as commentApi } from '../services/api';
import type { BlogPost, BlogComment } from '../types';
import Comment from '../components/Comment';
import { formatDate } from '../utils/date';
import { useAuth } from '../hooks/useAuth';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

type TocHeading = {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
};

const APP_NAME = "Yurikas's Blog";
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children?: ReactNode;
};

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: ReactNode;
};

type MarkdownVideoProps = VideoHTMLAttributes<HTMLVideoElement>;
type MarkdownIframeProps = IframeHTMLAttributes<HTMLIFrameElement>;

/** 将独占一行的视频链接自动转换为嵌入标签 */
const autoEmbedVideos = (markdown: string): string =>
  markdown.replace(/^(https?:\/\/\S+)$/gm, (_match, url: string) => {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;

    // Bilibili
    const bili = url.match(/bilibili\.com\/video\/(BV[\w]+)/i);
    if (bili) return `<iframe src="https://player.bilibili.com/player.html?bvid=${bili[1]}&autoplay=0" allowfullscreen></iframe>`;

    // 直接视频文件
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return `<video src="${url}" controls></video>`;

    return url;
  });

const getFirstImageFromMarkdown = (markdown: string): string | null => {
  const markdownImg = markdown.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (markdownImg?.[1]) {
    return markdownImg[1].trim();
  }

  const htmlImg = markdown.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (htmlImg?.[1]) {
    return htmlImg[1].trim();
  }

  return null;
};

const stripMarkdownText = (text: string): string =>
  text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/[*_~>#]/g, '')
    .trim();

const slugifyHeading = (text: string): string => {
  const normalized = stripMarkdownText(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized || 'section';
};

const extractHeadings = (markdown: string): TocHeading[] => {
  const lines = markdown.split('\n');
  const headings: TocHeading[] = [];
  const slugCount: Record<string, number> = {};
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = /^(#{1,6})\s*(.+)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    const text = stripMarkdownText(match[2]);
    if (!text) {
      continue;
    }

    const base = slugifyHeading(text);
    const current = (slugCount[base] ?? 0) + 1;
    slugCount[base] = current;
    const id = current === 1 ? base : `${base}-${current}`;

    headings.push({ id, text, level });
  }

  return headings;
};

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-5 rounded-xl overflow-hidden shadow-lg bg-[#1e1e1e]">
      {/* macOS title bar */}
      <div className="flex items-center px-4 py-2.5 bg-[#2d2d2d] border-b border-gray-700/40">
        {/* Traffic lights */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
        </div>
        {/* Language label (centered) */}
        <span className="flex-1 text-center text-xs font-medium text-gray-500 tracking-wide">{language}</span>
        {/* Copy button */}
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 transition-all hover:bg-white/10 hover:text-gray-300"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem 1.25rem', background: 'transparent', fontSize: '0.85rem', lineHeight: '1.7' }}
          showLineNumbers
          lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#4a4a4a', userSelect: 'none' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function Post() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [deletingCommentIndex, setDeletingCommentIndex] = useState<number | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id) {
          setError('Article ID is missing');
          setLoading(false);
          return;
        }
        const fetchedPost = await blog.getPostById(id);
        setPost(fetchedPost);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load post';
        setError(errorMessage);
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPost();
  }, [id]);

  const loadComments = async (articleId: string) => {
    try {
      setCommentsError(null);
      setCommentsLoading(true);
      const latestComments = await commentApi.getComment(articleId);
      setComments(latestComments);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载评论失败';
      setCommentsError(message);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!post) {
      setComments([]);
      return;
    }

    void loadComments(post.id);
  }, [post]);

  const postContent = post?.content ?? '';
  const coverImage = useMemo(() => getFirstImageFromMarkdown(postContent), [postContent]);
  const coverSrc = coverImage || '/bg.webp';
  const tocHeadings = useMemo(() => extractHeadings(postContent), [postContent]);
  const readMinutes = useMemo(() => Math.max(1, Math.round(postContent.length / 700)), [postContent]);

  useEffect(() => {
    if (loading) {
      document.title = `加载文章中 | ${APP_NAME}`;
      return;
    }

    if (error) {
      document.title = `文章加载失败 | ${APP_NAME}`;
      return;
    }

    if (!post) {
      document.title = `文章未找到 | ${APP_NAME}`;
      return;
    }

    document.title = `${post.title} | ${APP_NAME}`;
  }, [loading, error, post]);

  const articleRef = useRef<HTMLDivElement>(null);

  const jumpToHeading = useCallback((tocIndex: number, smooth = true) => {
    if (!articleRef.current) return;
    const headings = articleRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const target = headings[tocIndex];
    if (!target) return;

    const headerOffset = 96;
    const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    const headingId = tocHeadings[tocIndex]?.id ?? '';
    if (headingId) {
      window.history.replaceState(null, '', `#${encodeURIComponent(headingId)}`);
    }
  }, [tocHeadings]);

  useEffect(() => {
    if (!post || tocHeadings.length === 0) {
      return;
    }

    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) {
      return;
    }

    let headingId = rawHash;
    try {
      headingId = decodeURIComponent(rawHash);
    } catch {
      headingId = rawHash;
    }

    const idx = tocHeadings.findIndex((h) => h.id === headingId);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        jumpToHeading(idx, false);
      });
    }
  }, [post, tocHeadings, jumpToHeading]);

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
        <h3 className="text-xl font-medium text-red-600 dark:text-red-400 mb-2">加载失败</h3>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <Link
          to="/posts"
          className="mt-6 px-6 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
        >
          返回首页
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">文章未找到</h2>
        <Link to="/posts" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 block">
          返回首页
        </Link>
      </div>
    );
  }

  const handleAddComment = async () => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }

    const newContent = content.trim();
    if (!newContent) {
      return;
    }

    try {
      setCommentsError(null);
      setIsCreatingComment(true);
      const now = new Date();
      const newComment: BlogComment = {
        article_id: post.id,
        author: author.trim() || '匿名用户',
        content: newContent,
        date: now.toISOString().slice(0, 10),
      };

      const createdComments = await commentApi.createComment(newComment);
      setAuthor('');
      setContent('');

      if (createdComments.length > 0) {
        setComments((prev) => [...prev, ...createdComments]);
      } else {
        setComments((prev) => [...prev, newComment]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '新增评论失败';
      setCommentsError(message);
    } finally {
      setIsCreatingComment(false);
    }
  };

  const handleDeleteComment = async (targetComment: BlogComment, index: number) => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }

    try {
      setCommentsError(null);
      setDeletingCommentIndex(index);
      await commentApi.deleteComment(post.id, targetComment);
      setComments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除评论失败';
      setCommentsError(message);
    } finally {
      setDeletingCommentIndex(null);
    }
  };

  const handleEditPost = () => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/editor/${post.id}`)}`);
      return;
    }
    navigate(`/editor/${post.id}`);
  };

  const handleDeletePost = async () => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`);
      return;
    }

    if (deletingPost) {
      return;
    }

    if (!window.confirm('确定要删除这篇文章吗？删除后无法恢复！')) {
      return;
    }

    try {
      setDeletingPost(true);
      await blog.deletePost(post.id);
      navigate('/posts');
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除文章失败';
      alert(`删除失败: ${message}`);
    } finally {
      setDeletingPost(false);
    }
  };

  const headingIndexRef = { current: 0 };

  const headingClassMap: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: '!text-[1.3rem] !leading-8 mt-9 mb-4',
    2: '!text-[1.18rem] !leading-7 mt-8 mb-3',
    3: '!text-[1.02rem] !leading-6 mt-6 mb-2',
    4: '!text-[0.95rem] !leading-6 mt-5 mb-2',
    5: '!text-[0.9rem] !leading-5 mt-4 mb-2',
    6: '!text-[0.86rem] !leading-5 mt-4 mb-2',
  };

  const renderHeading =
    (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    ({ children, ...props }: MarkdownHeadingProps) => {
      const idx = headingIndexRef.current;
      headingIndexRef.current += 1;
      const headingId = tocHeadings[idx]?.id ?? `heading-${idx}`;
      const className = typeof props.className === 'string' ? props.className : '';
      const Tag = `h${level}` as HeadingTag;
      return (
        <Tag
          id={headingId}
          data-toc-index={idx}
          {...props}
          className={`scroll-mt-24 font-semibold ${headingClassMap[level]} ${className}`.trim()}
        >
          {children}
        </Tag>
      );
    };

  return (
    <div className="w-full">
      <section className="relative -mt-16 left-1/2 -translate-x-1/2 w-screen h-[430px] min-h-[430px] max-h-[70vh] overflow-hidden bg-slate-900">
        <img src={coverSrc} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />

        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />

        <div className="absolute z-10 h-full w-full left-0 top-[3vh] flex items-center justify-center">
          <div className="max-w-[85%] text-center">
          <Link
            to="/posts"
            className="inline-flex items-center text-slate-100/90 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回列表
          </Link>

            <h1 className="text-xl sm:text-2xl md:text-[1.7rem] font-bold text-[#e094c5] leading-relaxed break-words">
              {post.title}
            </h1>

            <div className="mt-2 text-sm md:text-base text-[#e7acb4] space-y-1">
              <p>创建时间：{formatDate(post.date)}</p>
              <p>更新时间：{formatDate(post.date)}</p>
              <p>{readMinutes} 分钟阅读 • {comments.length} 条评论 • 0 人喜欢</p>
            </div>

            <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {isLoggedIn ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleEditPost}
                  className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  编辑文章
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeletePost()}
                  disabled={deletingPost}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200/40 bg-red-500/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500/55 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingPost ? '删除中...' : '删除文章'}
                </button>
              </div>
            ) : (
              <div className="mt-5 text-sm text-slate-200">
                登录后可编辑或删除文章
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="post-paper-wall min-h-[62vh] md:min-h-[68vh] py-12 md:py-16 transition-colors">
        <div className="max-w-[1320px] mx-auto px-4">
          <div className="flex gap-8">
            <div className="flex-1 w-full min-w-0">
              <article className="max-w-full w-full 2xl:w-[62rem] mt-2">
            <div className="mb-6 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </span>
            </div>

            <div ref={articleRef} className="prose prose-base md:prose-lg prose-slate dark:prose-invert max-w-none prose-h2:!text-[1.18rem] prose-h3:!text-[1.02rem] prose-h4:!text-[0.95rem] prose-h2:!leading-7 prose-h3:!leading-6 prose-h4:!leading-6 prose-pre:!p-0 prose-pre:!m-0 prose-pre:!bg-transparent prose-pre:!border-0 prose-pre:!rounded-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                  code({ inline, className, children, ...props }: MarkdownCodeProps) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      const lang = match[1];
                      return <CodeBlock language={lang} code={codeString} />;
                    }

                    return (
                      <code className={`${className ?? ''} px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm text-pink-600 dark:text-pink-400 font-mono`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: renderHeading(1),
                  h2: renderHeading(2),
                  h3: renderHeading(3),
                  h4: renderHeading(4),
                  h5: renderHeading(5),
                  h6: renderHeading(6),
                  video(props: MarkdownVideoProps) {
                    return (
                      <video
                        controls
                        preload="metadata"
                        className="w-full rounded-lg my-4"
                        {...props}
                      />
                    );
                  },
                  iframe(props: MarkdownIframeProps) {
                    return (
                      <div className="relative w-full aspect-video my-4 rounded-lg overflow-hidden">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          allowFullScreen
                          loading="lazy"
                          {...props}
                        />
                      </div>
                    );
                  },
                }}
              >
                {autoEmbedVideos(post.content)}
              </ReactMarkdown>
            </div>

            <section className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">评论 ({comments.length})</h2>

              {isLoggedIn ? (
                <div className="mt-4 rounded-xl border border-[#b0aea5]/70 dark:border-[#a1a0a0]/80 bg-[#f0eee6]/85 dark:bg-[#e8e6dc]/85 p-4">
                  <div className="grid gap-3">
                    <input
                      type="text"
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                      placeholder="你的昵称（可选）"
                      className="w-full rounded-md border border-[#b0aea5]/70 dark:border-[#a1a0a0]/80 bg-[#f7f5ee]/90 dark:bg-[#f0eee6]/90 px-3 py-2 text-sm text-[#141413] dark:text-[#141413] outline-none transition focus:border-[#6396d6]"
                    />
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="写下你的评论..."
                      rows={3}
                      className="w-full resize-none rounded-md border border-[#b0aea5]/70 dark:border-[#a1a0a0]/80 bg-[#f7f5ee]/90 dark:bg-[#f0eee6]/90 px-3 py-2 text-sm text-[#141413] dark:text-[#141413] outline-none transition focus:border-[#6396d6]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAddComment()}
                        disabled={!content.trim() || isCreatingComment}
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCreatingComment ? '提交中...' : '增加评论'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#b0aea5]/80 bg-[#f0eee6]/85 px-4 py-3 text-sm text-[#30302e] dark:border-[#a1a0a0]/80 dark:bg-[#e8e6dc]/85 dark:text-[#30302e]">
                  当前为只读模式，登录后可新增或删除评论。
                  <Link to={`/login?redirect=${encodeURIComponent(`/post/${post.id}`)}`} className="ml-2 text-blue-600 hover:underline dark:text-blue-400">
                    去登录
                  </Link>
                </div>
              )}

              {commentsError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{commentsError}</p> : null}

              <div className="mt-4 space-y-4">
                {commentsLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">评论加载中...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <Comment
                      key={`${comment.id ?? `${comment.article_id}-${comment.author}-${comment.date}`}-${index}`}
                      comment={comment}
                      isDeleting={deletingCommentIndex === index}
                      canDelete={isLoggedIn}
                      onDelete={() => void handleDeleteComment(comment, index)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">暂无评论</p>
                )}
              </div>
            </section>
              </article>
            </div>

            <aside className="hidden xl:block w-64 shrink-0">
              <div className="sticky top-[12%] rounded-lg border border-[#b0aea5]/70 dark:border-[#a1a0a0]/80 bg-[#f0eee6]/90 dark:bg-[#e8e6dc]/90 p-4 transition-colors">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-100 flex items-center gap-2 mb-4">
                  <List className="w-5 h-5 text-blue-500" />
                  目录
                </h3>

                {tocHeadings.length > 0 ? (
                  <ul className="space-y-2 text-sm max-h-[70vh] overflow-y-auto">
                    {tocHeadings.map((heading, index) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className={`block hover:text-blue-600 transition-colors ${
                            heading.level === 6
                              ? 'pl-14 text-gray-500 dark:text-gray-400'
                              : heading.level === 5
                                ? 'pl-12 text-gray-500 dark:text-gray-400'
                                : heading.level === 4
                                  ? 'pl-9 text-gray-500 dark:text-gray-400'
                                  : heading.level === 3
                                    ? 'pl-6 text-gray-500 dark:text-gray-400'
                                    : heading.level === 2
                                      ? 'pl-3 text-gray-700 dark:text-gray-200'
                                      : 'pl-0 text-gray-800 dark:text-gray-100 font-medium'
                          }`}
                          onClick={(event) => {
                            event.preventDefault();
                            jumpToHeading(index);
                          }}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">暂无可用目录</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
