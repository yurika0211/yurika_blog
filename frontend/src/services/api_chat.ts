import axios, { AxiosError, type AxiosInstance } from "axios";
import { getAuthToken, isAuthenticated } from "../utils/auth";

export interface SendMessageRequest {
  content: string;
  conversation_id: string;
}

export interface SendMessageResponse {
  text: string;
}

export interface StreamMessageCallbacks {
  onStart?: () => void;
  onDelta?: (delta: string, fullText: string) => void;
  onDone?: (text: string) => void;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CHAT_ENDPOINTS = ["/message/", "/chat/"] as const;
const CHAT_STREAM_ENDPOINT = "/message/stream/";
const DEFAULT_CONVERSATION_ID = "about-default";

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
    timeout: 60000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error("API request failed:", {
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

const buildAuthHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
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
    return error instanceof Error ? error : new Error("Request failed");
  }

  if (!error.response) {
    return new Error(
      `Unable to connect to the chat service (tried: ${CHAT_BASE_URL_CANDIDATES.join(", ")}). Please check the backend URL or proxy configuration.`
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
      `Request failed (HTTP ${error.response.status} ${error.response.statusText || ""}`.trim() +
        ")"
  );
};

const isResponseUnavailable = (response: Response) =>
  response.status === 404 || response.status === 405;

const parseSseEvent = (rawEvent: string) => {
  const lines = rawEvent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let event = "message";
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trim());
    }
  }

  if (dataParts.length === 0) {
    return null;
  }

  return {
    event,
    data: dataParts.join("\n"),
  };
};

const streamMessageWithBase = async (
  baseURL: string,
  payload: SendMessageRequest,
  callbacks: StreamMessageCallbacks
): Promise<SendMessageResponse> => {
  const response = await fetch(`${baseURL}${CHAT_STREAM_ENDPOINT}`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (isResponseUnavailable(response)) {
      const error = new Error(`HTTP ${response.status}`);
      throw error;
    }

    const responseText = await response.text();
    throw new Error(responseText.trim() || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response body is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let started = false;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const parsed = parseSseEvent(chunk);
      if (!parsed) {
        continue;
      }

      let payloadData: Record<string, unknown> = {};
      try {
        payloadData = JSON.parse(parsed.data) as Record<string, unknown>;
      } catch {
        payloadData = {};
      }

      if (parsed.event === "start") {
        started = true;
        callbacks.onStart?.();
        continue;
      }

      if (parsed.event === "delta") {
        if (!started) {
          started = true;
          callbacks.onStart?.();
        }
        const delta =
          typeof payloadData.delta === "string" ? payloadData.delta : "";
        const text =
          typeof payloadData.text === "string"
            ? payloadData.text
            : fullText + delta;
        fullText = text;
        if (delta || text) {
          callbacks.onDelta?.(delta, fullText);
        }
        continue;
      }

      if (parsed.event === "done") {
        const text =
          typeof payloadData.text === "string" ? payloadData.text : fullText;
        fullText = text;
        callbacks.onDone?.(fullText);
        return { text: fullText };
      }

      if (parsed.event === "error") {
        const message =
          typeof payloadData.error === "string"
            ? payloadData.error
            : "Stream request failed";
        throw new Error(message);
      }
    }

    if (done) {
      break;
    }
  }

  callbacks.onDone?.(fullText);
  return { text: fullText };
};

const ensureChatAuth = () => {
  if (!isAuthenticated()) {
    throw new Error("Please log in before chatting.");
  }
};

export const ai_chat = {
  sendMessage: async (content: string): Promise<SendMessageResponse> => {
    ensureChatAuth();
    const payload: SendMessageRequest = {
      content,
      conversation_id: DEFAULT_CONVERSATION_ID,
    };
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
    ensureChatAuth();
    try {
      return await requestWithFallback(async (client, endpoint) => {
        const response = await client.get(endpoint, {
          params: {
            conversation_id: DEFAULT_CONVERSATION_ID,
            limit: 100,
          },
        });
        return parseHistory(response.data);
      });
    } catch (error) {
      const readable = toReadableError(error);
      throw readable;
    }
  },

  streamMessage: async (
    content: string,
    callbacks: StreamMessageCallbacks = {}
  ): Promise<SendMessageResponse> => {
    ensureChatAuth();
    const payload: SendMessageRequest = {
      content,
      conversation_id: DEFAULT_CONVERSATION_ID,
    };

    let lastError: unknown;
    for (const baseURL of CHAT_BASE_URL_CANDIDATES) {
      try {
        return await streamMessageWithBase(baseURL, payload, callbacks);
      } catch (error) {
        lastError = error;
        if (
          error instanceof Error &&
          (error.message.startsWith("HTTP 404") ||
            error.message.startsWith("HTTP 405") ||
            error.message.includes("Failed to fetch"))
        ) {
          continue;
        }
        throw error;
      }
    }

    throw toReadableError(lastError);
  },

  // 兼容旧调用方式
  postMessage: async (content: string) => ai_chat.sendMessage(content),
};
