import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  SendHorizontal,
} from "lucide-react";
import { APP_AVATAR_SRC } from "../constants/avatar";
import { getApiErrorMessage, guestbook as guestbookApi } from "../services/api";
import type { GuestbookMessage } from "../types";
import { attachHorizontalWheel, lockDocumentScroll } from "../utils/scroll";

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
  const railRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);
  const [composerCollapsed, setComposerCollapsed] = useState(false);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    return lockDocumentScroll();
  }, []);

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

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    return attachHorizontalWheel(rail, {
      minWidth: 0,
      root: window,
    });
  }, []);

  return (
    <section className="guestbook-page-shell scroll-stage">
      <div ref={railRef} className="scroll-rail" aria-label="留札手卷">
        <div className={`scroll-mount guestbook-bookmark-board ${composerCollapsed ? "is-collapsed" : ""}`}>
          <div className="scroll-rod scroll-rod--head" aria-hidden="true" />

              <section className="scroll-leaf guestbook-bookmark-composer-panel">
                <div className="guestbook-bookmark-composer">
                  <div className="guestbook-bookmark-composer-rail">
                    <div className="guestbook-bookmark-strip">
                      <h2 className="guestbook-bookmark-strip-title">留札</h2>
                      <span className="guestbook-bookmark-strip-kana">ゲスト</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setComposerCollapsed((current) => !current)}
                      className="guestbook-bookmark-toggle"
                      aria-expanded={!composerCollapsed}
                      aria-controls="guestbook-compose-sheet"
                      aria-label={composerCollapsed ? "展开留札" : "收起留札"}
                    >
                      {composerCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronLeft className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div
                    id="guestbook-compose-sheet"
                    aria-hidden={composerCollapsed}
                    className="guestbook-bookmark-compose-sheet"
                  >
                    <div className="guestbook-bookmark-meta-row">
                      <span className="guestbook-bookmark-chip">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Guestbook
                      </span>
                      <span className="guestbook-bookmark-chip">每人一句</span>
                    </div>

                    <p className="guestbook-bookmark-compose-note">
                      保留项目现有留言能力，但把输入体验也拉进同一套纸面语义里，不再是普通表单卡片。
                    </p>

                    <div className="guestbook-bookmark-compose-fields">
                      <input
                        value={author}
                        onChange={(event) => setAuthor(event.target.value)}
                        placeholder="Your name (optional)"
                        className="guestbook-bookmark-input"
                      />
                      <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        rows={6}
                        placeholder="Leave a message..."
                        className="guestbook-bookmark-textarea"
                      />
                    </div>

                    <div className="guestbook-bookmark-compose-footer">
                      <span className="guestbook-bookmark-hint">每个人只能留下一句话哦</span>
                      <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!content.trim() || submitting || hasPosted}
                        className="scroll-button"
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

                    {error ? (
                      <div className="guestbook-bookmark-error">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="scroll-leaf guestbook-bookmark-messages-panel">
                <div className="guestbook-bookmark-messages">
                  <div className="guestbook-bookmark-messages-meta">
                    <span className="guestbook-bookmark-chip">留言回览</span>
                    <span className="guestbook-bookmark-message-count">{messages.length} messages</span>
                  </div>

                  {loading ? (
                    <div className="guestbook-bookmark-loading">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading messages...
                    </div>
                  ) : error && messages.length === 0 ? (
                    <div className="guestbook-bookmark-empty text-rose-700 dark:text-rose-300">
                      {error}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="guestbook-bookmark-empty">
                      No messages yet. Be the first one to leave a note.
                    </div>
                  ) : (
                    <div className="guestbook-bookmark-messages-scroll">
                      <div className="guestbook-bookmark-messages-rail">
                        {messages.map((message) => (
                          <article key={message.id} className="guestbook-bookmark-message-card">
                            <div className="guestbook-bookmark-message-meta-vertical">
                              <img
                                src={message.author_avatar_url || APP_AVATAR_SRC}
                                alt={message.author}
                                className="guestbook-bookmark-message-avatar"
                              />
                              <strong>{message.author}</strong>
                              <span>{formatMessageTime(message.created_at)}</span>
                            </div>

                            <div className="guestbook-bookmark-message-title">Message</div>
                            <div className="guestbook-bookmark-message-copy">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </section>

          <div className="scroll-rod scroll-rod--tail" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
