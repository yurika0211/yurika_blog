import {
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  SendHorizontal,
  Sparkles,
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

const getMomentHandle = (author: string, momentId: number) => {
  const normalized = author.trim().replace(/\s+/g, "_").slice(0, 20);
  return `@${normalized || `moment_${momentId}`}`;
};

export default function MomentsSection() {
  const navigate = useNavigate();
  const { isLoggedIn, username } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            X-style feed
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            Moments
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            A lighter feed for snapshots, progress notes, and photo posts. Post a
            quick update, reply in the thread, and like once per device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isLoggedIn && (
            <Link
              to={`/login?redirect=${encodeURIComponent("/moments")}`}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
            >
              Log in to post
            </Link>
          )}
          <div className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400">
            {moments.length} moments
          </div>
        </div>
      </div>

      {feedError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50/90 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {feedError}
        </div>
      )}

      <div className={`grid gap-6 ${showComposer ? "xl:grid-cols-[1.02fr_0.98fr]" : "grid-cols-1"}`}>
        {isLoggedIn &&
          (showComposer ? (
            <form
              id="moments-composer"
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#0f1419]/70"
            >
              <div className="border-b border-gray-200/70 px-6 py-5 dark:border-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={APP_AVATAR_SRC}
                      alt="Moment author"
                      className="h-12 w-12 rounded-full border border-white/80 object-cover shadow-sm dark:border-gray-800"
                    />
                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {username || "Yurika"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Share a short post with photos.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-300 dark:hover:bg-gray-950"
                  >
                    <X className="h-4 w-4" />
                    Hide
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
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
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              aria-expanded={false}
              aria-controls="moments-composer"
              className="flex w-full items-center justify-between gap-4 rounded-[1.75rem] border border-gray-200/80 bg-white/60 px-6 py-5 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-sky-200 hover:bg-white/80 dark:border-gray-800 dark:bg-[#0f1419]/70 dark:hover:border-sky-900 dark:hover:bg-[#0f1419]/80"
            >
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src={APP_AVATAR_SRC}
                  alt="Moment author"
                  className="h-12 w-12 rounded-full border border-white/80 object-cover shadow-sm dark:border-gray-800"
                />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {username || "Yurika"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {hasDraft
                      ? `Resume your draft${pendingImages.length > 0 ? ` with ${pendingImages.length} photo${pendingImages.length > 1 ? "s" : ""}` : ""}.`
                      : "Open the composer to publish a new moment."}
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700">
                <ImagePlus className="h-4 w-4" />
                {hasDraft ? "Resume draft" : "Post a moment"}
              </span>
            </button>
          ))}

        <div className={`w-full space-y-4 ${showComposer ? "" : "max-w-4xl"}`}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-[1.75rem] border border-gray-200/80 bg-white/60 px-6 py-10 text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#0f1419]/70 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading moments...
            </div>
          ) : moments.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center text-gray-500 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-[#0f1419]/70 dark:text-gray-400">
              No moments yet. The first photo post will appear here.
            </div>
          ) : (
            moments.map((moment) => {
              const commentsOpen = Boolean(expandedComments[moment.id]);
              const likeBusy = togglingLikeId === moment.id;
              const commentDraft = commentDrafts[moment.id] ?? "";

              return (
                <article
                  key={moment.id}
                  className="overflow-hidden rounded-[1.9rem] border border-gray-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#0f1419]/70"
                >
                  <div className="flex gap-4 px-5 py-5 sm:px-6">
                    <img
                      src={APP_AVATAR_SRC}
                      alt={moment.author}
                      className="h-12 w-12 rounded-full border border-white/80 object-cover shadow-sm dark:border-gray-800"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="truncate font-semibold text-gray-900 dark:text-white">
                              {moment.author}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {getMomentHandle(moment.author, moment.id)}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <time className="text-gray-500 dark:text-gray-400">
                              {formatMomentTime(moment.created_at)}
                            </time>
                          </div>
                        </div>

                        {isLoggedIn ? (
                          <button
                            type="button"
                            onClick={() => void handleDelete(moment.id)}
                            disabled={deletingId === moment.id}
                            className="inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                            aria-label="Delete moment"
                          >
                            {deletingId === moment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <div className="rounded-full p-2 text-gray-400 dark:text-gray-500">
                            <MoreHorizontal className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {moment.content && (
                        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-gray-900 dark:text-gray-100">
                          {moment.content}
                        </p>
                      )}

                      {moment.images.length > 0 && (
                        <div className={`mt-4 grid gap-3 ${getImageGridClass(moment.images.length)}`}>
                          {moment.images.map((image, index) => (
                            <button
                              key={`${moment.id}-${index}`}
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  src: image,
                                  alt: `Moment ${moment.id} image ${index + 1}`,
                                })
                              }
                              className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-gray-50 text-left transition-transform hover:scale-[1.01] dark:border-gray-700 dark:bg-gray-950/60"
                            >
                              <img
                                src={image}
                                alt={`Moment ${moment.id} image ${index + 1}`}
                                loading="lazy"
                                className="max-h-[32rem] w-full cursor-zoom-in object-contain bg-gray-50 dark:bg-gray-950/60"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <button
                            type="button"
                            onClick={() => toggleCommentPanel(moment.id)}
                            className="group inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm text-gray-500 transition-colors hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors group-hover:bg-sky-50 dark:group-hover:bg-sky-950/30">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                            <span>{formatCompactCount(moment.comments_count)}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleLike(moment)}
                            disabled={likeBusy}
                            className={`group inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              moment.liked_by_device
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400"
                            }`}
                          >
                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                moment.liked_by_device
                                  ? "bg-rose-50 dark:bg-rose-950/30"
                                  : "group-hover:bg-rose-50 dark:group-hover:bg-rose-950/30"
                              }`}
                            >
                              {likeBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Heart
                                  className={`h-4 w-4 ${moment.liked_by_device ? "fill-current" : ""}`}
                                />
                              )}
                            </span>
                            <span>{formatCompactCount(moment.likes_count)}</span>
                          </button>
                        </div>

                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {moment.images.length > 0
                            ? `${moment.images.length} photo${moment.images.length > 1 ? "s" : ""}`
                            : "Text update"}
                        </div>
                      </div>

                      {commentsOpen && (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                          {isLoggedIn ? (
                            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
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
                                className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-400 dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-100"
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
                            <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50/80 px-4 py-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
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
