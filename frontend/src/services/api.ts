import axios, { AxiosError } from "axios";
import type {
  BlogPost,
  BlogComment,
  BlogMoment,
  CreateGuestbookMessagePayload,
  CreateMomentPayload,
  CreateMomentCommentPayload,
  FriendLinkApplication,
  FriendLinkApplicationPayload,
  FriendLinkStatus,
  GuestbookMessage,
  MomentComment,
  MomentLikeState,
} from "../types";
import { getAuthToken, isAuthenticated } from "../utils/auth";
import { normalizeDisplayName } from "../utils/displayName";
import { getOrCreateDeviceId } from "../utils/device";
import { API_BASE_URL } from "./apiConfig";
import { cachedFetch, invalidateCache } from "../utils/cache";

// 定义接口类型 (和后端的结构对应)
const ensureAuthenticated = (action: string) => {
  if (!isAuthenticated()) {
    throw new Error(`Please log in to ${action}.`);
  }
};

const getViewerScope = () => (isAuthenticated() ? "auth" : "guest");

// 1. 创建一个 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 请求超时时间 (30秒)
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  const existingAuthorization =
    typeof config.headers?.Authorization === "string"
      ? config.headers.Authorization
      : typeof config.headers?.authorization === "string"
        ? config.headers.authorization
        : "";

  if (token && !existingAuthorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type CreatePostPayload = Omit<BlogPost, "id" | "date"> & {
  date?: string;
};

export type UpdatePostPayload = Partial<Omit<BlogPost, "id">>;

// 添加错误拦截器，用于调试
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    console.error("API Error Details:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Request failed. Please try again.",
): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const candidates = [
        record.error_message,
        record.message,
        record.error,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

// 2. 封装评论相关的逻辑
export const comment = {
  normalizeCommentItem: (raw: unknown): BlogComment | null => {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const item = raw as Record<string, unknown>;
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!content) {
      return null;
    }

    const rawArticleId = item.article_id ?? item.articleId;
    const articleId =
      typeof rawArticleId === "number"
        ? String(rawArticleId)
        : typeof rawArticleId === "string"
          ? rawArticleId
          : "";

    if (!articleId) {
      return null;
    }

    const author = normalizeDisplayName(
      typeof item.author === "string" ? item.author : "",
      "Anonymous user",
    );

    const rawDate = item.date ?? item.created_at ?? item.createdAt;
    const date =
      typeof rawDate === "string" && rawDate.trim()
        ? rawDate
        : new Date().toISOString();

    const rawId = item.id;
    const id =
      typeof rawId === "number" || typeof rawId === "string" ? rawId : undefined;

    return {
      id,
      article_id: articleId,
      author,
      content,
      date,
    };
  },

  normalizeComments: (payload: unknown): BlogComment[] => {
    if (Array.isArray(payload)) {
      return payload
        .map((item) => comment.normalizeCommentItem(item))
        .filter((item): item is BlogComment => Boolean(item));
    }

    if (payload && typeof payload === "object") {
      const data = payload as {
        data?: unknown;
        comments?: unknown;
        list?: unknown;
      };

      const listCandidate = data.comments ?? data.data ?? data.list;
      if (Array.isArray(listCandidate)) {
        return listCandidate
          .map((item) => comment.normalizeCommentItem(item))
          .filter((item): item is BlogComment => Boolean(item));
      }

      const single = comment.normalizeCommentItem(payload);
      return single ? [single] : [];
    }

    return [];
  },

  extractAffectedRows: (payload: unknown): number | null => {
    if (typeof payload === "string") {
      const matched = payload.match(/rows_affected:\s*(\d+)/i);
      if (matched) {
        return Number(matched[1]);
      }
      return null;
    }

    if (payload && typeof payload === "object") {
      const data = payload as Record<string, unknown>;
      const candidates = [data.rows_affected, data.affected, data.count];
      for (const candidate of candidates) {
        if (typeof candidate === "number") {
          return candidate;
        }
      }
    }

    return null;
  },

  //get comment by id
  getComment: (id: string) =>
    cachedFetch<BlogComment[]>(`comment:${id}`, async () => {
      try {
        const response = await apiClient.get(`/comments/${id}`);
        return comment.normalizeComments(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 404 || status === 500) {
            return [];
          }
        }
        throw error;
      }
    }, 2 * 60 * 1000),
  // 兼容两种后端行为：
  // 1) /comments/{commentId} 删除单条
  // 2) /comments/{articleId} 删除文章下评论
  deleteComment: async(
    articleId: string,
    target?: Partial<BlogComment> & { id?: string | number }
  ) => {
    ensureAuthenticated("delete comments");

    const candidateIds = [
      target?.id !== undefined && target?.id !== null ? String(target.id) : null,
      articleId,
    ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

    let lastData: unknown = null;
    for (let i = 0; i < candidateIds.length; i += 1) {
      const candidateId = candidateIds[i];
      const response = await apiClient.delete(`/comments/${candidateId}`);
      lastData = response.data;

      // 如果是首轮用 commentId 删除且后端明确返回 0 行受影响，则继续回退到 articleId
      if (i === 0 && candidateIds.length > 1) {
        const affectedRows = comment.extractAffectedRows(response.data);
        if (affectedRows === 0) {
          continue;
        }
      }

      invalidateCache("comment:");
      return response.data;
    }

    invalidateCache("comment:");
    return lastData;
  },
  //create new comment
  createComment: async (payload: BlogComment) => {
    ensureAuthenticated("post comments");

    const articleIdNum = Number(payload.article_id);
    const requestBody: Record<string, unknown> = {
      author: payload.author?.trim() || "Anonymous user",
      content: payload.content,
    };

    if (Number.isFinite(articleIdNum)) {
      requestBody.article_id = articleIdNum;
    }

    // 不主动传 date，交给后端数据库默认时间，避免 NaiveDateTime 反序列化失败
    const response = await apiClient.post(`/comments/`, requestBody);
    invalidateCache("comment:");
    return comment.normalizeComments(response.data);
  }
}

export interface PaginatedResponse {
  data: BlogPost[];
  total: number;
  page: number;
  per_page: number;
}

const normalizeMomentItem = (raw: unknown): BlogMoment | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "number" ? item.id : Number(item.id);
  const author = normalizeDisplayName(
    typeof item.author === "string" ? item.author : "",
    "Yurika",
  );
  const content = typeof item.content === "string" ? item.content : "";
  const images = Array.isArray(item.images)
    ? item.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];
  const likesCount =
    typeof item.likes_count === "number"
      ? item.likes_count
      : Number(item.likes_count ?? 0);
  const comments = Array.isArray(item.comments)
    ? item.comments
        .map((entry) => normalizeMomentCommentItem(entry))
        .filter((entry): entry is MomentComment => Boolean(entry))
    : [];
  const commentsCount =
    typeof item.comments_count === "number"
      ? item.comments_count
      : Number(item.comments_count ?? comments.length);
  const likedByDevice = Boolean(item.liked_by_device);

  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    author,
    content,
    images,
    created_at:
      typeof item.created_at === "string" && item.created_at.trim()
        ? item.created_at
        : null,
    updated_at:
      typeof item.updated_at === "string" && item.updated_at.trim()
        ? item.updated_at
        : null,
    likes_count: Number.isFinite(likesCount) ? likesCount : 0,
    comments_count: Number.isFinite(commentsCount) ? commentsCount : comments.length,
    liked_by_device: likedByDevice,
    comments,
  };
};

const normalizeMomentCommentItem = (raw: unknown): MomentComment | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "number" ? item.id : Number(item.id);
  const momentId =
    typeof item.moment_id === "number" ? item.moment_id : Number(item.moment_id);
  const author = normalizeDisplayName(
    typeof item.author === "string" ? item.author : "",
    "Anonymous user",
  );
  const content = typeof item.content === "string" ? item.content.trim() : "";

  if (!Number.isFinite(id) || !Number.isFinite(momentId) || !content) {
    return null;
  }

  return {
    id,
    moment_id: momentId,
    author,
    content,
    created_at:
      typeof item.created_at === "string" && item.created_at.trim()
        ? item.created_at
        : null,
  };
};

const normalizeMomentLikeState = (raw: unknown): MomentLikeState | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const momentId =
    typeof item.moment_id === "number" ? item.moment_id : Number(item.moment_id);
  const likesCount =
    typeof item.likes_count === "number"
      ? item.likes_count
      : Number(item.likes_count ?? 0);

  if (!Number.isFinite(momentId) || !Number.isFinite(likesCount)) {
    return null;
  }

  return {
    moment_id: momentId,
    likes_count: likesCount,
    liked_by_device: Boolean(item.liked_by_device),
  };
};

const normalizeGuestbookMessageItem = (raw: unknown): GuestbookMessage | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "number" ? item.id : Number(item.id);
  const author = normalizeDisplayName(
    typeof item.author === "string" ? item.author : "",
    "GitHub user",
  );
  const content = typeof item.content === "string" ? item.content.trim() : "";

  if (!Number.isFinite(id) || !content) {
    return null;
  }

  return {
    id,
    author,
    author_avatar_url:
      typeof item.author_avatar_url === "string" && item.author_avatar_url.trim()
        ? item.author_avatar_url.trim()
        : null,
    author_profile_url:
      typeof item.author_profile_url === "string" && item.author_profile_url.trim()
        ? item.author_profile_url.trim()
        : null,
    content,
    created_at:
      typeof item.created_at === "string" && item.created_at.trim()
        ? item.created_at
        : null,
  };
};

const normalizeGuestbookMessageList = (payload: unknown): GuestbookMessage[] => {
  if (!Array.isArray(payload)) {
    const single = normalizeGuestbookMessageItem(payload);
    return single ? [single] : [];
  }

  return payload
    .map((item) => normalizeGuestbookMessageItem(item))
    .filter((item): item is GuestbookMessage => Boolean(item));
};

const normalizeMomentList = (payload: unknown): BlogMoment[] => {
  if (!Array.isArray(payload)) {
    const single = normalizeMomentItem(payload);
    return single ? [single] : [];
  }

  return payload
    .map((item) => normalizeMomentItem(item))
    .filter((item): item is BlogMoment => Boolean(item));
};

const normalizeFriendLinkStatus = (value: unknown): FriendLinkStatus => {
  if (value === "approved" || value === "rejected") {
    return value;
  }
  return "pending";
};

const normalizeFriendLinkItem = (raw: unknown): FriendLinkApplication | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "number" ? item.id : Number(item.id);
  const siteName = typeof item.site_name === "string" ? item.site_name.trim() : "";
  const siteUrl = typeof item.site_url === "string" ? item.site_url.trim() : "";
  const description = typeof item.description === "string" ? item.description.trim() : "";
  const avatarUrl = typeof item.avatar_url === "string" ? item.avatar_url.trim() : "";

  if (!Number.isFinite(id) || !siteName || !siteUrl || !description || !avatarUrl) {
    return null;
  }

  const readDate = (key: "created_at" | "updated_at" | "reviewed_at") => {
    const value = item[key];
    return typeof value === "string" && value.trim() ? value : null;
  };

  return {
    id,
    site_name: siteName,
    site_url: siteUrl,
    description,
    avatar_url: avatarUrl,
    status: normalizeFriendLinkStatus(item.status),
    review_note:
      typeof item.review_note === "string" && item.review_note.trim()
        ? item.review_note.trim()
        : null,
    created_at: readDate("created_at"),
    updated_at: readDate("updated_at"),
    reviewed_at: readDate("reviewed_at"),
  };
};

const normalizeFriendLinkList = (payload: unknown): FriendLinkApplication[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeFriendLinkItem(item))
      .filter((item): item is FriendLinkApplication => Boolean(item));
  }

  const single = normalizeFriendLinkItem(payload);
  return single ? [single] : [];
};

export const friendLink = {
  getApproved: () =>
    cachedFetch<FriendLinkApplication[]>("friend-links:approved", async () => {
      const response = await apiClient.get("/friend-links");
      return normalizeFriendLinkList(response.data).filter(
        (item) => item.status === "approved",
      );
    }, 2 * 60 * 1000),

  createApplication: async (payload: FriendLinkApplicationPayload) => {
    const response = await apiClient.post("/friend-links/applications", {
      site_name: payload.site_name,
      site_url: payload.site_url,
      description: payload.description,
      avatar_url: payload.avatar_url,
    });

    invalidateCache("friend-links:");
    const created = normalizeFriendLinkItem(response.data);
    if (!created) {
      throw new Error("The friend link application was submitted, but the response format was invalid.");
    }
    return created;
  },

  getApplications: async (status?: FriendLinkStatus | "all") => {
    ensureAuthenticated("review friend link applications");
    const params = status && status !== "all" ? { status } : undefined;
    const response = await apiClient.get("/friend-links/applications", { params });
    return normalizeFriendLinkList(response.data);
  },

  reviewApplication: async (
    id: number,
    payload: { status: FriendLinkStatus; review_note?: string },
  ) => {
    ensureAuthenticated("review friend link applications");
    const response = await apiClient.patch(`/friend-links/applications/${id}`, payload);
    invalidateCache("friend-links:");
    const updated = normalizeFriendLinkItem(response.data);
    if (!updated) {
      throw new Error("The review succeeded, but the response format was invalid.");
    }
    return updated;
  },
};

export const moments = {
  getMoments: () =>
    cachedFetch<BlogMoment[]>(
      `moments:list:${getViewerScope()}:${getOrCreateDeviceId()}`,
      async () => {
        const response = await apiClient.get("/moments", {
          headers: {
            "X-Device-Id": getOrCreateDeviceId(),
          },
        });
        return normalizeMomentList(response.data);
      },
      30 * 1000,
    ),

  createMoment: async (payload: CreateMomentPayload) => {
    ensureAuthenticated("post moments");

    const response = await apiClient.post("/moments", {
      author: payload.author,
      content: payload.content,
      images: payload.images ?? [],
    });

    invalidateCache("moments:");
    const created = normalizeMomentItem(response.data);
    if (!created) {
      throw new Error("The moment was created, but the response format was invalid.");
    }
    return created;
  },

  createComment: async (momentId: number, payload: CreateMomentCommentPayload) => {
    ensureAuthenticated("comment on moments");

    const response = await apiClient.post(`/moments/${momentId}/comments`, {
      author: payload.author,
      content: payload.content,
    });

    invalidateCache("moments:");
    const created = normalizeMomentCommentItem(response.data);
    if (!created) {
      throw new Error("The comment was created, but the response format was invalid.");
    }
    return created;
  },

  deleteComment: async (momentId: number, commentId: number) => {
    ensureAuthenticated("delete moment comments");
    const response = await apiClient.delete(`/moments/${momentId}/comments/${commentId}`);
    invalidateCache("moments:");
    return response.data;
  },

  likeMoment: async (momentId: number) => {
    const response = await apiClient.post(
      `/moments/${momentId}/like`,
      undefined,
      {
        headers: {
          "X-Device-Id": getOrCreateDeviceId(),
        },
      },
    );

    invalidateCache("moments:");
    const state = normalizeMomentLikeState(response.data);
    if (!state) {
      throw new Error("The like succeeded, but the response format was invalid.");
    }
    return state;
  },

  unlikeMoment: async (momentId: number) => {
    const response = await apiClient.delete(`/moments/${momentId}/like`, {
      headers: {
        "X-Device-Id": getOrCreateDeviceId(),
      },
    });

    invalidateCache("moments:");
    const state = normalizeMomentLikeState(response.data);
    if (!state) {
      throw new Error("The unlike succeeded, but the response format was invalid.");
    }
    return state;
  },

  deleteMoment: async (id: number) => {
    ensureAuthenticated("delete moments");
    const response = await apiClient.delete(`/moments/${id}`);
    invalidateCache("moments:");
    return response.data;
  },
};

export const guestbook = {
  getMessages: () =>
    cachedFetch<GuestbookMessage[]>(
      "guestbook:messages",
      async () => {
        const response = await apiClient.get("/guestbook/messages");
        return normalizeGuestbookMessageList(response.data);
      },
      30 * 1000,
    ),
  createMessage: async (payload: CreateGuestbookMessagePayload) => {
    const response = await apiClient.post("/guestbook/messages", {
      author: payload.author,
      content: payload.content,
    });

    invalidateCache("guestbook:");
    const created = normalizeGuestbookMessageItem(response.data);
    if (!created) {
      throw new Error("The guestbook message response was invalid.");
    }

    return created;
  },
};

// 3. 封装具体的请求函数
export const blog = {
  // 获取所有文章 (用于 Entry 等需要全量数据的页面)
  getPosts: () =>
    cachedFetch<BlogPost[]>(`blog:${getViewerScope()}:allPosts`, async () => {
      const response = await apiClient.get<BlogPost[]>("/posts/");
      return response.data;
    }),

  // 分页获取文章
  getPostsPaginated: (params: {
    page?: number;
    per_page?: number;
    category?: string;
    tag?: string;
    search?: string;
  }) => {
    const cacheKey = `blog:${getViewerScope()}:paginated:${JSON.stringify(params)}`;
    return cachedFetch<PaginatedResponse>(cacheKey, async () => {
      const response = await apiClient.get<PaginatedResponse>("/posts/", { params });
      return response.data;
    });
  },

  // 获取单篇文章
  getPostById: (id: string) =>
    cachedFetch<BlogPost>(`blog:${getViewerScope()}:post:${id}`, async () => {
      const response = await apiClient.get<BlogPost>(`/posts/${id}`);
      return response.data;
    }),

  // 发布文章
  createPost: async (post: CreatePostPayload) => {
    ensureAuthenticated("publish posts");
    const response = await apiClient.post<BlogPost>("/posts/", post);
    invalidateCache("blog:");
    return response.data;
  },

  // 删除文章
  deletePost: async (id: string | number) => {
    ensureAuthenticated("delete posts");
    const response = await apiClient.delete(`/posts/${id}`);
    invalidateCache("blog:");
    return response.data;
  },

  // 更新文章
  updatePost: async (id: string | number, post: UpdatePostPayload) => {
    ensureAuthenticated("edit posts");
    const response = await apiClient.put(`/posts/${id}`, post);
    invalidateCache("blog:");
    return response.data;
  },
};
