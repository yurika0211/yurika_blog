import { useEffect, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, SendHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_AVATAR_SRC } from "../constants/avatar";
import { getApiErrorMessage, guestbook as guestbookApi } from "../services/api";
import type { GuestbookMessage } from "../types";

const formatMessageTime = (value?: string | null) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function Guestbook() {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await guestbookApi.getMessages();
        if (!cancelled) {
          setMessages(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "Failed to load guestbook messages."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || submitting || hasPosted) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await guestbookApi.createMessage({
        author: author.trim(),
        content: trimmedContent,
      });
      setMessages((prev) => [created, ...prev]);
      setContent("");
      setHasPosted(true);
    } catch (submitError) {
      const message = getApiErrorMessage(
        submitError,
        "Failed to publish your guestbook message.",
      );
      if (message.toLowerCase().includes("already left")) {
        setHasPosted(true);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="rounded-[2rem] border border-gray-200/80 bg-white/55 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/35">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/85 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800/85 dark:text-slate-200">
              <MessageSquare className="h-3.5 w-3.5" />
              Guestbook
            </div>
            <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              留言板
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              请你留下想对我说的话吧
            </p>
          </div>

          <div className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400">
            {messages.length} messages
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[2rem] border border-gray-200/80 bg-white/55 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/35">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            留言
          </h2>

          <div className="mt-4 space-y-4">
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Your name (optional)"
              className="w-full rounded-[1.25rem] border border-gray-200 bg-white/85 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-slate-400 dark:border-gray-700 dark:bg-gray-950/70 dark:text-gray-100"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Leave a message..."
              className="w-full resize-none rounded-[1.5rem] border border-gray-200 bg-white/85 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-slate-400 dark:border-gray-700 dark:bg-gray-950/70 dark:text-gray-100"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                每个人只能留下一句话哦
              </p>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!content.trim() || submitting || hasPosted}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
                {submitting
                  ? "Posting..."
                  : hasPosted
                    ? "Posted from this IP"
                    : "Post message"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[1.5rem] border border-red-200 bg-red-50/90 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-[1.75rem] border border-gray-200/80 bg-white/55 px-6 py-10 text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/35 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white/55 px-6 py-14 text-center text-gray-500 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/35 dark:text-gray-400">
              No messages yet. Be the first one to leave a note.
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className="rounded-[1.75rem] border border-gray-200/80 bg-white/55 p-5 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/35"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={message.author_avatar_url || APP_AVATAR_SRC}
                    alt={message.author}
                    className="h-11 w-11 rounded-full border border-white/80 object-cover shadow-sm dark:border-gray-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {message.author}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-200">
                      {message.content}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400">
            需要返回文章区的话，可以去 <Link to="/posts" className="text-sky-600 hover:underline dark:text-sky-400">Posts</Link>。
          </div>
        </section>
      </div>
    </section>
  );
}
