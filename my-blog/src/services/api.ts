import axios, { AxiosError } from "axios";
import type { BlogPost, BlogComment } from "../types";
import { isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "./apiConfig";

// 定义接口类型 (和后端的结构对应)
const ensureAuthenticated = (action: string) => {
  if (!isAuthenticated()) {
    throw new Error(`请先登录后再${action}`);
  }
};

// 1. 创建一个 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 请求超时时间 (10秒)
  headers: {
    "Content-Type": "application/json",
  },
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

    const author =
      typeof item.author === "string" && item.author.trim()
        ? item.author.trim()
        : "匿名用户";

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
  getComment: async (id: string) => {
    try {
      const response = await apiClient.get(`/comments/${id}`);
      return comment.normalizeComments(response.data);
    } catch (error) {
      // 后端当前实现在“没有评论”时可能返回 500（fetch_one 行为）
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 500) {
          return [];
        }
      }
      throw error;
    }
  },
  // 兼容两种后端行为：
  // 1) /comments/{commentId} 删除单条
  // 2) /comments/{articleId} 删除文章下评论
  deleteComment: async(
    articleId: string,
    target?: Partial<BlogComment> & { id?: string | number }
  ) => {
    ensureAuthenticated("delete Comment");

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

      return response.data;
    }

    return lastData;
  },
  //create new comment
  createComment: async (payload: BlogComment) => {
    ensureAuthenticated("Comment");

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
    return comment.normalizeComments(response.data);
  }
}

// 3. 封装具体的请求函数
export const blog = {
  // 获取所有文章
  getPosts: async () => {
    // axios 会自动把返回的 JSON 转成对象，放在 response.data 里
    const response = await apiClient.get<BlogPost[]>("/posts/");
    return response.data;
  },

  // 获取单篇文章
  getPostById: async (id: string) => {
    const response = await apiClient.get<BlogPost>(`/posts/${id}`);
    return response.data;
  },

  // 发布文章
  createPost: async (post: CreatePostPayload) => {
    ensureAuthenticated("Publish");
    const response = await apiClient.post<BlogPost>("/posts/", post);
    return response.data;
  },

  // 删除文章
  deletePost: async (id: string | number) => {
    ensureAuthenticated("Delete");
    const response = await apiClient.delete(`/posts/${id}`);
    return response.data;
  },

  // 更新文章
  updatePost: async (id: string | number, post: UpdatePostPayload) => {
    ensureAuthenticated("Edit");
    const response = await apiClient.put(`/posts/${id}`, post);
    return response.data;
  },
};
