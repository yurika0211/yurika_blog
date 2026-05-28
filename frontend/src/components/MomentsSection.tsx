import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { APP_AVATAR_SRC } from "../constants/avatar";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage, moments as momentsApi } from "../services/api";
import type { BlogMoment, MomentComment } from "../types";

const MAX_IMAGES = 6;
const MAX_IMAGE_SIDE = 1600;
const IMAGE_OUTPUT_QUALITY = 0.84;
const compactCountFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type SubmissionState =
  | {
      status: "success" | "error";
      message: string;
    }
  | null;

type PreviewImage = {
  src: string;
  alt: string;
} | null;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read the selected image."));
    };
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to process the selected image."));
    image.src = src;
  });

const compressImageFile = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  try {
    const image = await loadImage(dataUrl);
    const maxSide = Math.max(image.width, image.height);
    const scale = maxSide > MAX_IMAGE_SIDE ? MAX_IMAGE_SIDE / maxSide : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return dataUrl;
    }

    context.drawImage(image, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/webp", IMAGE_OUTPUT_QUALITY);
    return compressed.startsWith("data:image/") ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
};

const formatMomentTime = (value?: string | null) => {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) {
    return "刚刚";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  if (diffDays < 7) {
    return `${diffDays}天前`;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatCompactCount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return compactCountFormatter.format(value);
};

const getImageGridClass = (count: number) => {
  if (count <= 1) {
    return "grid-cols-1";
  }
  if (count === 2) {
    return "grid-cols-2";
  }
  if (count === 4) {
    return "grid-cols-2";
  }
  return "grid-cols-2 md:grid-cols-3";
};

const getMomentParagraphs = (content?: string | null) =>
  (content ?? "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const MOMENT_PANEL_TITLES = ["片羽", "短札", "留痕", "潮声", "水纹", "小记"];

const getMomentPanelConfig = (moment: BlogMoment, index: number) => {
  if (moment.images.length > 0) {
    return {
      widthClass: "reading-wall-panel-scroll",
      layoutClass: "reading-wall-panel-scroll",
      title: MOMENT_PANEL_TITLES[index % MOMENT_PANEL_TITLES.length],
      titleKun: "モーメント",
    };
  }

  if ((moment.content?.length ?? 0) > 110) {
    return {
      widthClass: "reading-wall-panel-wide",
      layoutClass: "reading-wall-panel-scroll",
      title: MOMENT_PANEL_TITLES[index % MOMENT_PANEL_TITLES.length],
      titleKun: "モーメント",
    };
  }

  return {
    widthClass: "reading-wall-panel-medium",
    layoutClass: index % 2 === 0 ? "reading-wall-panel-folio-mid" : "reading-wall-panel-folio-low",
    title: MOMENT_PANEL_TITLES[index % MOMENT_PANEL_TITLES.length],
    titleKun: "モーメント",
  };
};

export default function MomentsSection() {
  const navigate = useNavigate();
  const { isLoggedIn, username } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const [moments, setMoments] = useState<BlogMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [content, setContent] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImage>(null);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [expandedBodies, setExpandedBodies] = useState<Record<number, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(null);
  const [deletingCommentKey, setDeletingCommentKey] = useState<string | null>(null);
  const [togglingLikeId, setTogglingLikeId] = useState<number | null>(null);

  const hasDraft = content.trim().length > 0 || pendingImages.length > 0;
  const showComposer = isLoggedIn && isComposerOpen;

  const canSubmit = useMemo(
    () =>
      !processingImages &&
      !submitting &&
      (content.trim().length > 0 || pendingImages.length > 0),
    [content, pendingImages.length, processingImages, submitting],
  );

  const loadMoments = async () => {
    try {
      setLoading(true);
      setFeedError(null);
      const data = await momentsApi.getMoments();
      setMoments(data);
    } catch (error) {
      setFeedError(getApiErrorMessage(error, "Failed to load moments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMoments();
  }, []);

  useEffect(() => {
    if (showComposer) {
      composerTextareaRef.current?.focus();
    }
  }, [showComposer]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth < 1024) {
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      rail.scrollBy({
        left: event.deltaY,
        behavior: "auto",
      });
    };

    rail.addEventListener("wheel", handleWheel, { passive: false });
    return () => rail.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage]);

  const updateMomentInState = (
    momentId: number,
    updater: (current: BlogMoment) => BlogMoment,
  ) => {
    setMoments((prev) =>
      prev.map((item) => (item.id === momentId ? updater(item) : item)),
    );
  };

  const handlePickImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (pendingImages.length + files.length > MAX_IMAGES) {
      setSubmissionState({
        status: "error",
        message: `You can attach up to ${MAX_IMAGES} images per moment.`,
      });
      return;
    }

    try {
      setProcessingImages(true);
      setSubmissionState(null);
      const nextImages = await Promise.all(files.map((file) => compressImageFile(file)));
      setPendingImages((prev) => [...prev, ...nextImages]);
    } catch (error) {
      setSubmissionState({
        status: "error",
        message: getApiErrorMessage(error, "Failed to process the selected images."),
      });
    } finally {
      setProcessingImages(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent("/moments")}`);
      return;
    }

    if (!canSubmit) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionState(null);
      const created = await momentsApi.createMoment({
        author: username || "Yurika",
        content: content.trim(),
        images: pendingImages,
      });

      setMoments((prev) => [created, ...prev]);
      setExpandedComments((prev) => ({ ...prev, [created.id]: false }));
      setContent("");
      setPendingImages([]);
      setSubmissionState({
        status: "success",
        message: "Moment posted.",
      });
    } catch (error) {
      setSubmissionState({
        status: "error",
        message: getApiErrorMessage(error, "Failed to post the moment."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (momentId: number) => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent("/moments")}`);
      return;
    }

    if (!window.confirm("Delete this moment?")) {
      return;
    }

    try {
      setDeletingId(momentId);
      setFeedError(null);
      await momentsApi.deleteMoment(momentId);
      setMoments((prev) => prev.filter((item) => item.id !== momentId));
    } catch (error) {
      setFeedError(getApiErrorMessage(error, "Failed to delete the moment."));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleCommentPanel = (momentId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [momentId]: !prev[momentId],
    }));
  };

  const handleToggleLike = async (moment: BlogMoment) => {
    if (togglingLikeId === moment.id) {
      return;
    }

    try {
      setTogglingLikeId(moment.id);
      setFeedError(null);
      const nextState = moment.liked_by_device
        ? await momentsApi.unlikeMoment(moment.id)
        : await momentsApi.likeMoment(moment.id);

      updateMomentInState(moment.id, (current) => ({
        ...current,
        likes_count: nextState.likes_count,
        liked_by_device: nextState.liked_by_device,
      }));
    } catch (error) {
      setFeedError(getApiErrorMessage(error, "Failed to update the like."));
    } finally {
      setTogglingLikeId(null);
    }
  };

  const handleAddComment = async (momentId: number) => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent("/moments")}`);
      return;
    }

    const draft = commentDrafts[momentId]?.trim() ?? "";
    if (!draft) {
      return;
    }

    try {
      setSubmittingCommentId(momentId);
      setFeedError(null);
      const created = await momentsApi.createComment(momentId, {
        author: username || "Yurika",
        content: draft,
      });

      setCommentDrafts((prev) => ({
        ...prev,
        [momentId]: "",
      }));
      setExpandedComments((prev) => ({
        ...prev,
        [momentId]: true,
      }));
      updateMomentInState(momentId, (current) => ({
        ...current,
        comments: [...current.comments, created],
        comments_count: current.comments_count + 1,
      }));
    } catch (error) {
      setFeedError(getApiErrorMessage(error, "Failed to post the comment."));
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const handleDeleteComment = async (momentId: number, comment: MomentComment) => {
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent("/moments")}`);
      return;
    }

    const deletingKey = `${momentId}-${comment.id}`;

    try {
      setDeletingCommentKey(deletingKey);
      setFeedError(null);
      await momentsApi.deleteComment(momentId, comment.id);
      updateMomentInState(momentId, (current) => ({
        ...current,
        comments: current.comments.filter((item) => item.id !== comment.id),
        comments_count: Math.max(0, current.comments_count - 1),
      }));
    } catch (error) {
      setFeedError(getApiErrorMessage(error, "Failed to delete the comment."));
    } finally {
      setDeletingCommentKey(null);
    }
  };

  const toggleBodyFold = (momentId: number) => {
    setExpandedBodies((current) => ({
      ...current,
      [momentId]: !(current[momentId] ?? true),
    }));
  };

  return (
    <section className="reading-wall-section relative min-h-screen overflow-hidden bg-[#f5efe2] dark:bg-[#16110c]">
      <div className="hero-grid absolute inset-0 opacity-[0.14] mix-blend-multiply dark:opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,242,231,0.98)_0%,rgba(242,234,219,0.95)_46%,rgba(238,229,211,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(24,18,13,0.98)_0%,rgba(20,15,11,0.95)_48%,rgba(16,12,9,0.98)_100%)]" />
        <div className="absolute inset-x-[6%] top-[6%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.16),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.14),transparent)]" />
        <div className="absolute inset-x-[8%] bottom-[8%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.1),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.1),transparent)]" />
        <div className="absolute left-[-7rem] top-[10%] h-64 w-96 rounded-full bg-[radial-gradient(circle,rgba(84,61,34,0.12)_0%,rgba(84,61,34,0.06)_26%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(164,130,82,0.08)_0%,rgba(164,130,82,0.04)_22%,transparent_66%)]" />
        <div className="absolute right-[-5rem] top-[18%] h-72 w-80 rounded-full bg-[radial-gradient(circle,rgba(126,94,52,0.1)_0%,rgba(126,94,52,0.04)_24%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(150,118,73,0.08)_0%,rgba(150,118,73,0.04)_24%,transparent_68%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] items-stretch px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <div
          ref={railRef}
          className="reading-wall-rail reading-wall-rail-full moments-reading-wall-rail"
          aria-label="Moments reading wall"
        >
          <article className="reading-wall-panel reading-wall-panel-narrow reading-wall-panel-plaque">
            <div className="reading-wall-panel-surface">
              <div className="reading-wall-panel-shell">
                <div className="reading-wall-column reading-wall-title-column">
                  <div className="reading-wall-title-stack">
                    <h2 className="reading-wall-vertical-title">
                      <span className="reading-wall-title-char">近</span>
                      <span className="reading-wall-title-char">札</span>
                    </h2>
                    <p className="reading-wall-title-kun">モーメント</p>
                  </div>
                </div>
                <div className="reading-wall-rule" />
                <div className="reading-wall-column reading-wall-copy-column">
                  <div className="moments-reading-wall-intro">
                    <p className="reading-wall-vertical-copy">
                      这里收起的是零碎的短句、片刻的心情与顺手记下的日常。沿着长卷向右翻，每一则动态便是一页小札。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="reading-wall-panel reading-wall-panel-medium reading-wall-panel-folio-tall">
            <div className="reading-wall-panel-surface">
              <div className="reading-wall-panel-shell">
                <div className="reading-wall-column reading-wall-title-column">
                  <div className="reading-wall-title-stack">
                    <h2 className="reading-wall-vertical-title">
                      <span className="reading-wall-title-char">卷</span>
                      <span className="reading-wall-title-char">览</span>
                    </h2>
                    <p className="reading-wall-title-kun">インデックス</p>
                  </div>
                </div>
                <div className="reading-wall-rule" />
                <div className="reading-wall-column reading-wall-copy-column">
                  <div className="moments-reading-wall-overview">
                    <div className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400">
                      {moments.length} moments
                    </div>

                    {feedError && (
                      <div className="rounded-[1.25rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        {feedError}
                      </div>
                    )}

                    {!isLoggedIn ? (
                      <Link
                        to={`/login?redirect=${encodeURIComponent("/moments")}`}
                        className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
                      >
                        Log in to post
                      </Link>
                    ) : showComposer ? (
                      <button
                        type="button"
                        onClick={() => setIsComposerOpen(false)}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-300 dark:hover:bg-gray-950"
                      >
                        <X className="h-4 w-4" />
                        Hide composer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsComposerOpen(true)}
                        aria-expanded={false}
                        aria-controls="moments-composer"
                        className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {hasDraft ? "Resume draft" : "Post a moment"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {isLoggedIn && showComposer && (
            <article className="reading-wall-panel reading-wall-panel-scroll reading-wall-panel-scroll">
              <div className="reading-wall-panel-surface">
                <div className="reading-wall-panel-shell">
                  <div className="reading-wall-column reading-wall-title-column">
                    <div className="reading-wall-title-stack">
                      <h2 className="reading-wall-vertical-title">
                        <span className="reading-wall-title-char">发</span>
                        <span className="reading-wall-title-char">札</span>
                      </h2>
                      <p className="reading-wall-title-kun">エディタ</p>
                    </div>
                  </div>
                  <div className="reading-wall-rule" />
                  <div className="reading-wall-column reading-wall-copy-column">
                    <form
                      id="moments-composer"
                      onSubmit={handleSubmit}
                      className="moments-reading-wall-composer"
                    >
                      <textarea
                        ref={composerTextareaRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="What's happening today?"
                        rows={5}
                        className="w-full resize-none rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-400 dark:border-gray-700 dark:bg-gray-950/70 dark:text-gray-100"
                      />

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePickImages}
                          />
                          <button
                            type="button"
                            disabled={processingImages}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200 dark:hover:bg-gray-950"
                          >
                            {processingImages ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImagePlus className="h-4 w-4" />
                            )}
                            {processingImages ? "Processing images..." : "Add Photos"}
                          </button>

                          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Camera className="h-4 w-4" />
                            Up to {MAX_IMAGES} images per moment
                          </div>
                        </div>

                        {pendingImages.length > 0 && (
                          <div className={`grid gap-3 ${getImageGridClass(pendingImages.length)}`}>
                            {pendingImages.map((image, index) => (
                              <div
                                key={`${image.slice(0, 32)}-${index}`}
                                className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/60"
                              >
                                <img
                                  src={image}
                                  alt={`Selected moment image ${index + 1}`}
                                  onClick={() =>
                                    setPreviewImage({
                                      src: image,
                                      alt: `Selected moment image ${index + 1}`,
                                    })
                                  }
                                  className="max-h-72 w-full cursor-zoom-in object-contain bg-gray-50 dark:bg-gray-950/60"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingImages((prev) =>
                                      prev.filter((_, currentIndex) => currentIndex !== index),
                                    )
                                  }
                                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
                                  aria-label={`Remove image ${index + 1}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {submissionState && (
                        <div
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            submissionState.status === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                          }`}
                        >
                          {submissionState.message}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Images are compressed in the browser before posting.
                        </p>

                        <button
                          type="submit"
                          disabled={!canSubmit}
                          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizontal className="h-4 w-4" />
                          )}
                          {submitting ? "Posting..." : "Post Moment"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          )}

          {loading ? (
            <article className="reading-wall-panel reading-wall-panel-medium reading-wall-panel-folio-mid">
              <div className="reading-wall-panel-surface">
                <div className="reading-wall-panel-shell">
                  <div className="reading-wall-column reading-wall-title-column">
                    <div className="reading-wall-title-stack">
                      <h2 className="reading-wall-vertical-title">
                        <span className="reading-wall-title-char">待</span>
                        <span className="reading-wall-title-char">载</span>
                      </h2>
                      <p className="reading-wall-title-kun">ロード</p>
                    </div>
                  </div>
                  <div className="reading-wall-rule" />
                  <div className="reading-wall-column reading-wall-copy-column">
                    <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
                      <div className="inline-flex items-center gap-3 rounded-[1.75rem] border border-gray-200/80 bg-white/60 px-6 py-10 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#0f1419]/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading moments...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ) : moments.length === 0 ? (
            <article className="reading-wall-panel reading-wall-panel-medium reading-wall-panel-folio-mid">
              <div className="reading-wall-panel-surface">
                <div className="reading-wall-panel-shell">
                  <div className="reading-wall-column reading-wall-title-column">
                    <div className="reading-wall-title-stack">
                      <h2 className="reading-wall-vertical-title">
                        <span className="reading-wall-title-char">空</span>
                        <span className="reading-wall-title-char">卷</span>
                      </h2>
                      <p className="reading-wall-title-kun">ブランク</p>
                    </div>
                  </div>
                  <div className="reading-wall-rule" />
                  <div className="reading-wall-column reading-wall-copy-column">
                    <div className="flex h-full items-center justify-center rounded-[1.75rem] border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center text-gray-500 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-[#0f1419]/70 dark:text-gray-400">
                      No moments yet. The first photo post will appear here.
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            moments.map((moment, index) => {
              const commentsOpen = Boolean(expandedComments[moment.id]);
              const bodyExpanded = expandedBodies[moment.id] ?? false;
              const likeBusy = togglingLikeId === moment.id;
              const commentDraft = commentDrafts[moment.id] ?? "";
              const panelConfig = getMomentPanelConfig(moment, index);
              const paragraphs = getMomentParagraphs(moment.content);
              const previewComments = moment.comments.slice(0, 2);
              const bookmarkLead =
                paragraphs[0]?.replace(/\s+/g, "").slice(0, 4) || panelConfig.title;
              const collapsedExcerpt =
                paragraphs[0]?.slice(0, 30) ||
                (moment.images.length > 0 ? `${moment.images.length} 张附图` : "展开阅读这则小札。");

              return (
                <article
                  key={moment.id}
                  className={`reading-wall-panel moments-bookmark-panel ${
                    bodyExpanded ? "moments-bookmark-panel-open" : "moments-bookmark-panel-closed"
                  }`}
                >
                  <div className="reading-wall-panel-surface">
                    <div className="moments-bookmark-stage">
                      <div className="moments-bookmark-assembly">
                        <div className="moments-bookmark-strip">
                          <h2 className="moments-bookmark-title" aria-label={panelConfig.title}>
                            {Array.from(panelConfig.title).map((char, charIndex) => (
                              <span
                                key={`${panelConfig.title}-${charIndex}`}
                                className="moments-bookmark-title-char"
                              >
                                {char}
                              </span>
                            ))}
                          </h2>
                          <p className="moments-bookmark-kana">{panelConfig.titleKun}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBodyFold(moment.id)}
                          className="moments-bookmark-toggle"
                          aria-expanded={bodyExpanded}
                          aria-label={bodyExpanded ? "收起这则 moments" : "展开这则 moments"}
                        >
                          {bodyExpanded ? (
                            <ChevronLeft className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {bodyExpanded ? (
                        <div className="moments-bookmark-open-shell">
                          <div className="moments-bookmark-open-panel">
                            <section className="moments-bookmark-content">
                              <div className="moments-bookmark-meta">
                                <div className="moments-bookmark-meta-left">
                                  <span className="moments-bookmark-time-chip">
                                    {formatMomentTime(moment.created_at)}
                                  </span>
                                  <span className="moments-bookmark-time-chip">展开阅读</span>
                                </div>
                                <div className="moments-bookmark-meta-right">
                                  <span className="moments-bookmark-time-chip">正文与评论均为竖排</span>
                                  {isLoggedIn ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(moment.id)}
                                      disabled={deletingId === moment.id}
                                      className="moments-bookmark-icon-button"
                                      aria-label="Delete moment"
                                    >
                                      {deletingId === moment.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              <div className="moments-bookmark-reader-body">
                                <div className="moments-bookmark-reader-flow moments-bookmark-reader-support">
                                  <h3 className="moments-bookmark-reader-title">{bookmarkLead}</h3>
                                  <section className="moments-bookmark-comments">
                                    <h4 className="moments-bookmark-comments-title">评论</h4>
                                    {previewComments.length > 0 ? (
                                      previewComments.map((comment) => (
                                        <article key={comment.id} className="moments-bookmark-comment">
                                          <div className="moments-bookmark-avatar" />
                                          <p className="moments-bookmark-comment-name">{comment.author}</p>
                                          <p className="moments-bookmark-comment-text">{comment.content}</p>
                                        </article>
                                      ))
                                    ) : (
                                      <article className="moments-bookmark-comment">
                                        <div className="moments-bookmark-avatar moments-bookmark-avatar-muted" />
                                        <p className="moments-bookmark-comment-text">暂无评论，等你写下第一句回应。</p>
                                      </article>
                                    )}
                                  </section>
                                </div>

                                <div className="moments-bookmark-reader-shell">
                                  <div className="moments-bookmark-reader-flow moments-bookmark-reader-main">
                                    {moment.images.map((image, imageIndex) => (
                                      <figure key={`${moment.id}-image-${imageIndex}`} className="moments-bookmark-figure">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewImage({
                                              src: image,
                                              alt: `Moment ${moment.id} image ${imageIndex + 1}`,
                                            })
                                          }
                                          className="moments-bookmark-figure-trigger"
                                        >
                                          <img
                                            src={image}
                                            alt={`Moment ${moment.id} image ${imageIndex + 1}`}
                                            loading="lazy"
                                            className="moments-bookmark-figure-image"
                                          />
                                        </button>
                                        <figcaption className="moments-bookmark-figure-caption">
                                          附图自然嵌进文章中。
                                        </figcaption>
                                      </figure>
                                    ))}

                                    {paragraphs.length > 0 ? (
                                      paragraphs.map((paragraph, paragraphIndex) => (
                                        <p key={`${moment.id}-paragraph-${paragraphIndex}`} className="moments-bookmark-paragraph">
                                          {paragraph}
                                        </p>
                                      ))
                                    ) : (
                                      <p className="moments-bookmark-paragraph">
                                        这则 moments 只保留了图像与留白。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="moments-bookmark-toolbar">
                                <div className="moments-bookmark-toolbar-left">
                                  <button
                                    type="button"
                                    onClick={() => toggleCommentPanel(moment.id)}
                                    className="moments-bookmark-pill"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{formatCompactCount(moment.comments_count)} 条评论</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleToggleLike(moment)}
                                    disabled={likeBusy}
                                    className={`moments-bookmark-pill ${
                                      moment.liked_by_device ? "moments-bookmark-pill-liked" : ""
                                    }`}
                                  >
                                    {likeBusy ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Heart className={`h-4 w-4 ${moment.liked_by_device ? "fill-current" : ""}`} />
                                    )}
                                    <span>{formatCompactCount(moment.likes_count)} 赞</span>
                                  </button>
                                </div>

                                <div className="moments-bookmark-toolbar-right">
                                  <span className="moments-bookmark-toolbar-note">
                                    {moment.images.length > 0
                                      ? `${moment.images.length} 张附图`
                                      : "纯文字片段"}
                                  </span>
                                </div>
                              </div>

                              {commentsOpen && (
                                <div className="moments-bookmark-replies">
                                  {isLoggedIn ? (
                                    <div className="moments-bookmark-reply-editor">
                                      <textarea
                                        value={commentDraft}
                                        onChange={(event) =>
                                          setCommentDrafts((prev) => ({
                                            ...prev,
                                            [moment.id]: event.target.value,
                                          }))
                                        }
                                        placeholder={`Reply as ${username || "Yurika"}...`}
                                        rows={3}
                                        className="moments-bookmark-reply-input"
                                      />
                                      <div className="mt-3 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => void handleAddComment(moment.id)}
                                          disabled={!commentDraft.trim() || submittingCommentId === moment.id}
                                          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {submittingCommentId === moment.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <SendHorizontal className="h-4 w-4" />
                                          )}
                                          {submittingCommentId === moment.id ? "Replying..." : "Reply"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="moments-bookmark-login-hint">
                                      Log in to reply in this thread.
                                      <Link
                                        to={`/login?redirect=${encodeURIComponent("/moments")}`}
                                        className="ml-2 text-sky-600 hover:underline dark:text-sky-400"
                                      >
                                        Log in
                                      </Link>
                                    </div>
                                  )}

                                  {moment.comments.length > 0 ? (
                                    <div className="space-y-3">
                                      {moment.comments.map((comment) => {
                                        const commentDeleteKey = `${moment.id}-${comment.id}`;
                                        return (
                                          <div key={comment.id} className="flex gap-3">
                                            <img
                                              src={APP_AVATAR_SRC}
                                              alt={comment.author}
                                              className="mt-1 h-9 w-9 shrink-0 rounded-full border border-white/80 object-cover shadow-sm dark:border-gray-800"
                                            />

                                            <div className="min-w-0 flex-1 rounded-[1.25rem] bg-gray-50 px-4 py-3 dark:bg-gray-950/40">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                      {comment.author}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                      {formatMomentTime(comment.created_at)}
                                                    </span>
                                                  </div>
                                                </div>

                                                {isLoggedIn && (
                                                  <button
                                                    type="button"
                                                    onClick={() => void handleDeleteComment(moment.id, comment)}
                                                    disabled={deletingCommentKey === commentDeleteKey}
                                                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                                                  >
                                                    {deletingCommentKey === commentDeleteKey ? (
                                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                  </button>
                                                )}
                                              </div>

                                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                                                {comment.content}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No replies yet.
                                    </p>
                                  )}
                                </div>
                              )}
                            </section>
                          </div>
                        </div>
                      ) : (
                        <div className="moments-bookmark-collapsed">
                          <div className="moments-bookmark-collapsed-time">
                            {formatMomentTime(moment.created_at)}
                          </div>
                          <p className="moments-bookmark-collapsed-copy">{collapsedExcerpt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Moment image preview"
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>

            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[88vh] w-auto max-w-full rounded-[1.75rem] object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
}
