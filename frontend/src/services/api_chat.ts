import axios, { AxiosError, type AxiosInstance } from "axios";

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  text: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CHAT_ENDPOINTS = ["/message/", "/chat/"] as const;

const normalizeBaseUrl = (raw: string) => raw.trim().replace(/\/+$/, "");

const collectBaseUrlCandidates = () => {
  const candidates: string[] = [];
  const push = (raw?: string | null) => {
    if (!raw) {
      return;
    }
    const normalized = normalizeBaseUrl(raw);
    if (!normalized || candidates.includes(normalized)) {
      return;
    }
    candidates.push(normalized);
  };

  push(import.meta.env.VITE_CHAT_API_BASE_URL);
  push("/chat/api/v1");
  push("/api/v1");

  return candidates;
};

const CHAT_BASE_URL_CANDIDATES = collectBaseUrlCandidates();

const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error("❌ API 请求失败:", {
        baseURL,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

const normalizeRole = (role: unknown): ChatMessage["role"] => {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "assistant";
};

const extractText = (value: unknown, depth = 0): string => {
  if (depth > 5 || value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = extractText(item, depth + 1);
      if (candidate) {
        return candidate;
      }
    }
    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  const obj = value as Record<string, unknown>;

  if (Array.isArray(obj.choices)) {
    for (const choice of obj.choices) {
      const candidate = extractText(choice, depth + 1);
      if (candidate) {
        return candidate;
      }
    }
  }

  const priorityKeys = [
    "content",
    "text",
    "message",
    "reply",
    "answer",
    "response",
    "output",
    "result",
    "data",
  ];

  for (const key of priorityKeys) {
    const candidate = extractText(obj[key], depth + 1);
    if (candidate) {
      return candidate;
    }
  }

  for (const valueItem of Object.values(obj)) {
    const candidate = extractText(valueItem, depth + 1);
    if (candidate) {
      return candidate;
    }
  }

  return "";
};

const unwrapList = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const data = payload as {
    data?: unknown;
    messages?: unknown;
    list?: unknown;
  };

  if (Array.isArray(data.messages)) {
    return data.messages;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.list)) {
    return data.list;
  }

  return payload;
};

const parseHistory = (payload: unknown): ChatMessage[] => {
  const listPayload = unwrapList(payload);
  if (!Array.isArray(listPayload)) {
    return [];
  }

  return listPayload
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const obj = item as {
        role?: unknown;
        content?: unknown;
        text?: unknown;
        message?: unknown;
      };

      const content =
        extractText(obj.content) ||
        extractText(obj.text) ||
        extractText(obj.message);
      if (!content) {
        return null;
      }

      return {
        role: normalizeRole(obj.role),
        content,
      } as ChatMessage;
    })
    .filter((item): item is ChatMessage => Boolean(item));
};

const parseReply = (payload: unknown): string => extractText(payload);

const isEndpointUnavailable = (error: unknown) =>
  axios.isAxiosError(error) &&
  (error.response?.status === 404 || error.response?.status === 405);

const isTransportError = (error: unknown) =>
  axios.isAxiosError(error) && !error.response;

const requestWithFallback = async <T>(
  runner: (client: AxiosInstance, endpoint: string, baseURL: string) => Promise<T>
): Promise<T> => {
  let lastError: unknown;

  for (const baseURL of CHAT_BASE_URL_CANDIDATES) {
    const client = createApiClient(baseURL);
    for (const endpoint of CHAT_ENDPOINTS) {
      try {
        return await runner(client, endpoint, baseURL);
      } catch (error) {
        lastError = error;
        if (isTransportError(error) || isEndpointUnavailable(error)) {
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError ?? new Error("No available chat endpoint");
};

const toReadableError = (error: unknown): Error => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error("请求失败");
  }

  if (!error.response) {
    return new Error(
      `无法连接聊天服务（尝试: ${CHAT_BASE_URL_CANDIDATES.join(", ")}）。请检查后端地址或代理配置。`
    );
  }

  const serverMessage =
    typeof error.response.data === "string"
      ? error.response.data
      : (
          error.response.data as
            | { message?: string; error?: string }
            | undefined
        )?.message ||
        (
          error.response.data as
            | { message?: string; error?: string }
            | undefined
        )?.error;

  return new Error(
    serverMessage?.trim() ||
      `请求失败（HTTP ${error.response.status} ${error.response.statusText || ""}`.trim() +
        ")"
  );
};

export const ai_chat = {
  sendMessage: async (content: string): Promise<SendMessageResponse> => {
    const payload: SendMessageRequest = { content };
    try {
      return await requestWithFallback(async (client, endpoint) => {
        const response = await client.post(endpoint, payload);
        const text = parseReply(response.data);
        return { text };
      });
    } catch (error) {
      throw toReadableError(error);
    }
  },

  getHistory: async (): Promise<ChatMessage[]> => {
    try {
      return await requestWithFallback(async (client, endpoint) => {
        const response = await client.get(endpoint);
        return parseHistory(response.data);
      });
    } catch (error) {
      const readable = toReadableError(error);
      const lower = readable.message.toLowerCase();
      if (lower.includes("id is required") || lower.includes("http 400")) {
        return [];
      }
      throw readable;
    }
  },

  // 兼容旧调用方式
  postMessage: async (content: string) => ai_chat.sendMessage(content),
};
