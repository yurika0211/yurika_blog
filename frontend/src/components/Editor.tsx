import { useState, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Save, Eye, PenLine, Tag, FileText, Pin, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { blog, type CreatePostPayload, type UpdatePostPayload } from '../services/api';
import type { BlogPost } from '../types';

const DEFAULT_CATEGORY = 'Uncategorized';

type ApiLikeError = {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
};

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: ReactNode;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null) {
    const e = err as ApiLikeError;
    return e.response?.data?.message || e.message || fallback;
  }
  return fallback;
};

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('# Hello World');
  const [isPinned, setIsPinned] = useState(false);
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  const [originalDate, setOriginalDate] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseTags = (raw: string) =>
    raw
      ? raw
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : ['Uncategorized'];

  useEffect(() => {
    let mounted = true;
    async function fetchPost() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setStatusMsg('Loading article from the server...');

      try {
        const post = await blog.getPostById(id);
        if (!mounted) return;
        if (!post) {
          setError('The requested article could not be found.');
          setStatusMsg(null);
          return;
        }

        setTitle(post.title || '');
        setCategory(post.category?.trim() || DEFAULT_CATEGORY);
        setSummary(post.summary || '');
        setTags(post.tags.join(', '));
        setContent(post.content || '');
        setOriginalDate(post.date);
        setIsPinned(post.is_pinned ?? false);
        setIsLoginRequired(post.is_login_required ?? false);
        setStatusMsg(null);
      } catch (err: unknown) {
        console.error('Fetch post failed:', err);
        setError(getErrorMessage(err, 'Something went wrong while loading the article.'));
        setStatusMsg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void fetchPost();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    setError(null);
    setStatusMsg(null);

    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.');
      return;
    }

    const tagsArray = parseTags(tags);

    const payload: CreatePostPayload = {
      title: title.trim(),
      category: category.trim() || DEFAULT_CATEGORY,
      summary: summary.trim() || `${content.slice(0, 50)}...`,
      tags: tagsArray,
      content,
      is_pinned: isPinned,
      is_login_required: isLoginRequired,
    };

    if (originalDate) {
      payload.date = originalDate;
    }

    setSaving(true);
    setStatusMsg(id ? 'Updating article...' : 'Publishing article...');

    try {
      if (id) {
        const updatePayload: UpdatePostPayload = { ...payload };
        const updated = await blog.updatePost(id, updatePayload);
        if (updated?.date) setOriginalDate(updated.date);
        setStatusMsg('Article updated. Returning to the article list...');
        setTimeout(() => navigate('/posts'), 600);
      } else {
        const created = await blog.createPost(payload);

        if (created && typeof created === 'object') {
          if ((created as BlogPost).date) setOriginalDate((created as BlogPost).date);
          if ((created as BlogPost).title) setTitle((created as BlogPost).title);
          setCategory((created as BlogPost).category?.trim() || DEFAULT_CATEGORY);
          if ((created as BlogPost).summary) setSummary((created as BlogPost).summary);
          if (Array.isArray((created as BlogPost).tags)) setTags((created as BlogPost).tags.join(', '));
          if ((created as BlogPost).content) setContent((created as BlogPost).content);
          setIsPinned(Boolean((created as BlogPost).is_pinned));
          setIsLoginRequired(Boolean((created as BlogPost).is_login_required));

          const newId = (created as BlogPost).id;
          if (newId) {
            setStatusMsg('Article published. Opening the new editor page...');
            setTimeout(() => navigate(`/editor/${newId}`), 300);
            return;
          }
        }

        setStatusMsg('Article published. Returning to the article list...');
        setTimeout(() => navigate('/posts'), 600);
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setError(getErrorMessage(err, 'Something went wrong while saving the article.'));
      setStatusMsg(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PenLine className="w-5 h-5 text-blue-500" />
            {id ? 'Edit Article' : 'New Article'}
          </h2>

          <div className="flex items-center gap-3">
            {loading && <div className="text-sm text-gray-500">Loading article...</div>}
            {statusMsg && <div className="text-sm text-gray-700 dark:text-gray-300">{statusMsg}</div>}
            {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors shadow-lg ${
                saving
                  ? 'bg-gray-400 text-white cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
              }`}
              aria-disabled={loading || saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : id ? 'Save Changes' : 'Publish Article'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Article Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write a compelling title..."
            disabled={loading || saving}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="For example: Tech, Notes, Galgame"
              disabled={loading || saving}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Summary
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Write a short introduction..."
              disabled={loading || saving}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags (comma separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="For example: Rust, React, Life"
                disabled={loading || saving}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                disabled={loading || saving}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isPinned
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-600 dark:text-cyan-300'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                }`}
                title={isPinned ? 'Unpin article' : 'Pin article'}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'text-cyan-500' : ''}`} />
                {isPinned ? 'Pinned' : 'Pin'}
              </button>
              <button
                type="button"
                onClick={() => setIsLoginRequired(!isLoginRequired)}
                disabled={loading || saving}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isLoginRequired
                    ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                }`}
                title={isLoginRequired ? 'Remove login-only access' : 'Make this article login-only'}
              >
                <Lock className={`w-4 h-4 ${isLoginRequired ? 'text-amber-500' : ''}`} />
                {isLoginRequired ? 'Login only' : 'Public'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-200">
        <div className="flex flex-col bg-white/30 dark:bg-gray-900/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium text-sm text-gray-500">
            Markdown Source
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="grow w-full p-4 bg-transparent resize-none focus:outline-none font-mono text-sm text-gray-800 dark:text-gray-200"
            placeholder="Write Markdown here..."
            disabled={loading || saving}
            aria-label="Markdown editor"
          />
        </div>

        <div className="flex flex-col bg-white/30 dark:bg-gray-900/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium text-sm text-gray-500 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Live Preview
          </div>

          <div className="grow p-6 overflow-y-auto prose prose-blue dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ inline, className, children }: MarkdownCodeProps) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div">
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
