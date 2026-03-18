import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Save, Eye, PenLine, Tag, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { blog, type CreatePostPayload, type UpdatePostPayload } from '../services/api';
import type { BlogPost } from '../types';

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('# Hello World');

  // meta state
  const [originalDate, setOriginalDate] = useState<string | undefined>(undefined);

  // ui state
  const [loading, setLoading] = useState(false); // loading post
  const [saving, setSaving] = useState(false); // saving post
  const [statusMsg, setStatusMsg] = useState<string | null>(null); // friendly status
  const [error, setError]
 = useState<string | null>(null);

  // parse tags input into array
  const parseTags = (raw: string) =>
    raw
      ? raw
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : ['Uncategorized'];

  // Fetch post for editing if id present
  useEffect(() => {
    let mounted = true;
    async function fetchPost() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setStatusMsg('正在从服务器加载文章…');

      try {
        const post = await blog.getPostById(id);
        if (!mounted) return;
        if (!post) {
          setError('未找到指定文章。');
          setStatusMsg(null);
          return;
        }

        // populate form with server data
        setTitle(post.title || '');
        setSummary(post.summary || '');
        setTags(post.tags.join(', '));
        setContent(post.content || '');
        setOriginalDate(post.date);
        setStatusMsg(null);
      } catch (err: any) {
        console.error('Fetch post failed:', err);
        setError(err?.response?.data?.message || err?.message || '获取文章时发生错误。');
        setStatusMsg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchPost();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    setError(null);
    setStatusMsg(null);

    if (!title?.trim() || !content?.trim()) {
      setError('标题和内容不能为空！');
      return;
    }

    const tagsArray = parseTags(tags);

    const payload: CreatePostPayload = {
      title: title.trim(),
      summary: summary?.trim() || `${content.slice(0, 50)}...`,
      tags: tagsArray,
      content,
    };
    if (originalDate) {
      payload.date = originalDate;
    }

    setSaving(true);
    setStatusMsg(id ? '正在更新文章…' : '正在发布文章…');

    try {
      if (id) {
        const updatePayload: UpdatePostPayload = { ...payload };
        const updated = await blog.updatePost(id, updatePayload);
        // use any server-returned date to keep sync
        if (updated?.date) setOriginalDate(updated.date);
        setStatusMsg('修改成功，正在返回文章列表…');
        // short delay to allow user to see message
        setTimeout(() => navigate('/posts'), 600);
      } else {
        // Create new post
        const created = await blog.createPost(payload);

        // If server returned an object, sync state and navigate to new editor route
        if (created && typeof created === 'object') {
          // Update local fields with authoritative server response where applicable
          if ((created as BlogPost).date) setOriginalDate((created as BlogPost).date);
          if ((created as BlogPost).title) setTitle((created as BlogPost).title);
          if ((created as BlogPost).summary) setSummary((created as BlogPost).summary);
          if (Array.isArray((created as BlogPost).tags)) setTags((created as BlogPost).tags.join(', '));
          if ((created as BlogPost).content) setContent((created as BlogPost).content);

          const newId = (created as BlogPost).id;
          if (newId) {
            setStatusMsg('发布成功！正在打开新文章编辑页…');
            // Navigate to the editor route for the newly created post so the user can continue editing
            // use setTimeout to let user see status briefly
            setTimeout(() => navigate(`/editor/${newId}`), 300);
            return;
          }
        }

        // Fallback behavior if server didn't return id
        setStatusMsg('发布成功！正在返回文章列表…');
        setTimeout(() => navigate('/posts'), 600);
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      const message = err?.response?.data?.message || err?.message || '保存文章时发生错误。';
      setError(String(message));
      setStatusMsg(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top meta area with status/error */}
      <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PenLine className="w-5 h-5 text-blue-500" />
            {id ? '编辑文章' : '新建文章'}
          </h2>

          <div className="flex items-center gap-3">
            {loading && <div className="text-sm text-gray-500">正在加载文章…</div>}
            {statusMsg && (
              <div className="text-sm text-gray-700 dark:text-gray-300">{statusMsg}</div>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
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
              {saving ? '保存中…' : '发布文章'}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            文章标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入引人入胜的标题..."
            disabled={loading || saving}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Summary */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> 摘要
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="简短的介绍..."
              disabled={loading || saving}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> 标签 (用逗号分隔)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如: Rust, React, Life"
              disabled={loading || saving}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-200">
        {/* Left: editor */}
        <div className="flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium text-sm text-gray-500">
            Markdown 源码
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="grow w-full p-4 bg-transparent resize-none focus:outline-none font-mono text-sm text-gray-800 dark:text-gray-200"
            placeholder="在此处编写 Markdown..."
            disabled={loading || saving}
            aria-label="Markdown 编辑器"
          />
        </div>

        {/* Right: preview */}
        <div className="flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-gray-700/30 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium text-sm text-gray-500 flex items-center gap-2">
            <Eye className="w-4 h-4" /> 实时预览
          </div>

          <div className="grow p-6 overflow-y-auto prose prose-blue dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
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
