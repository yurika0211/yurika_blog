import {
  Camera,
  ImagePlus,
  Loader2,
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
import type { BlogMoment } from "../types";

const MAX_IMAGES = 6;
const MAX_IMAGE_SIDE = 1600;
const IMAGE_OUTPUT_QUALITY = 0.84;

type SubmissionState =
  | {
      status: "success" | "error";
      message: string;
    }
  | null;

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
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

export default function MomentsSection() {
  const navigate = useNavigate();
  const { isLoggedIn, username } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [moments, setMoments] = useState<BlogMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);

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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <Sparkles className="h-3.5 w-3.5" />
            QQ Zone Style
          </div>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            Moments
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            A lighter feed for snapshots, progress notes, and photo posts. Pick images,
            write a short caption, and publish a moment directly from the blog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isLoggedIn && (
            <Link
              to={`/login?redirect=${encodeURIComponent("/moments")}`}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Post after login
            </Link>
          )}
          <div className="rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400">
            {moments.length} moments
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isLoggedIn ? "xl:grid-cols-[1.05fr_0.95fr]" : "grid-cols-1"}`}>
        {isLoggedIn && (
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30"
          >
            <div className="border-b border-gray-200/70 px-6 py-5 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <img
                  src={APP_AVATAR_SRC}
                  alt="Moment author"
                  className="h-12 w-12 rounded-2xl border border-white/80 object-cover shadow-sm dark:border-gray-800"
                />
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {username || "Yurika"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Post a quick update with photos.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="What's happening today?"
                rows={5}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-rose-400 dark:border-gray-700 dark:bg-gray-950/70 dark:text-gray-100"
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
                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-950/60"
                      >
                        <img
                          src={image}
                          alt={`Selected moment image ${index + 1}`}
                          className="h-40 w-full object-cover"
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
                  The selected photos are compressed in the browser before posting.
                </p>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        )}

        <div className={`space-y-4 ${isLoggedIn ? "" : "max-w-4xl"}`}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-[1.75rem] border border-gray-200/80 bg-white/60 px-6 py-10 text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading moments...
            </div>
          ) : feedError ? (
            <div className="rounded-[1.75rem] border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {feedError}
            </div>
          ) : moments.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center text-gray-500 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
              No moments yet. The first photo post will appear here.
            </div>
          ) : (
            moments.map((moment) => (
              <article
                key={moment.id}
                className="overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30"
              >
                <div className="flex items-start justify-between gap-4 px-5 py-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={APP_AVATAR_SRC}
                      alt={moment.author}
                      className="h-11 w-11 rounded-2xl border border-white/80 object-cover shadow-sm dark:border-gray-800"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {moment.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMomentTime(moment.created_at)}
                      </p>
                    </div>
                  </div>

                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(moment.id)}
                      disabled={deletingId === moment.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                      {deletingId === moment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  )}
                </div>

                <div className="space-y-4 px-5 pb-5">
                  {moment.content && (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-200">
                      {moment.content}
                    </p>
                  )}

                  {moment.images.length > 0 && (
                    <div className={`grid gap-3 ${getImageGridClass(moment.images.length)}`}>
                      {moment.images.map((image, index) => (
                        <div
                          key={`${moment.id}-${index}`}
                          className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-950/60"
                        >
                          <img
                            src={image}
                            alt={`Moment ${moment.id} image ${index + 1}`}
                            loading="lazy"
                            className="h-52 w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
