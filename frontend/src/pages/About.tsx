import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Send, MoreVertical, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_AVATAR_SRC } from "../constants/avatar";
import { useAuth } from "../hooks/useAuth";
import { ai_chat, type ChatMessage } from "../services/api_chat";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STREAMING_CURSOR = "▋";

const initialMessages: UiMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "こんにちは！ゆりかです。。\n立ち止まり、諦めた場所。そこがいつでも「最果て」になる。\nこの足が動く限り、最果ては常に、もっと先にあるのだから。",
  },

];

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const messageSignature = (msg: Pick<UiMessage, "role" | "content">) =>
  `${msg.role}::${msg.content.trim()}`;

const mergeMessages = (base: UiMessage[], incoming: UiMessage[]) => {
  const baseSignatureCount = new Map<string, number>();
  const consumedBaseCount = new Map<string, number>();

  for (const msg of base) {
    const sig = messageSignature(msg);
    baseSignatureCount.set(sig, (baseSignatureCount.get(sig) || 0) + 1);
  }

  const merged = [...base];

  for (const msg of incoming) {
    const signature = messageSignature(msg);
    const consumed = consumedBaseCount.get(signature) || 0;
    const baseCount = baseSignatureCount.get(signature) || 0;
    if (consumed < baseCount) {
      consumedBaseCount.set(signature, consumed + 1);
      continue;
    }
    merged.push(msg);
  }

  return merged;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ABOUT_CHAT_DRAFT_KEY = "about.chat.draft";

const getPendingDraft = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.sessionStorage.getItem(ABOUT_CHAT_DRAFT_KEY) ?? "";
};

const setPendingDraft = (draft: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(ABOUT_CHAT_DRAFT_KEY, draft);
};

const clearPendingDraft = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(ABOUT_CHAT_DRAFT_KEY);
};

const upsertAssistantDraft = (
  draftId: string,
  content: string,
  prev: UiMessage[]
) => {
  const exists = prev.some((msg) => msg.id === draftId);
  if (!exists) {
    return [
      ...prev,
      {
        id: draftId,
        role: "assistant" as const,
        content,
      },
    ];
  }

  return prev.map((msg) =>
    msg.id === draftId
      ? {
          ...msg,
          content,
        }
      : msg
  );
};

const animateAssistantReply = async (
  fullText: string,
  draftId: string,
  setMessages: Dispatch<SetStateAction<UiMessage[]>>
) => {
  const trimmed = fullText.trim();
  if (!trimmed) {
    setMessages((prev) =>
      upsertAssistantDraft(
        draftId,
        "I received your message, but no reply is available right now.",
        prev
      )
    );
    return;
  }

  const runes = Array.from(trimmed);
  let current = "";
  const chunkSize = runes.length > 360 ? 8 : runes.length > 180 ? 5 : 3;

  for (let i = 0; i < runes.length; i += chunkSize) {
    current += runes.slice(i, i + chunkSize).join("");
    setMessages((prev) => upsertAssistantDraft(draftId, current, prev));
    await sleep(22);
  }
};

const toUiMessages = (history: ChatMessage[]): UiMessage[] =>
  history
    .filter(
      (msg): msg is ChatMessage & { role: "user" | "assistant" } =>
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    )
    .map((msg) => ({
      id: createMessageId(),
      role: msg.role,
      content: msg.content,
    }));

export default function ChatProfile() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [input, setInput] = useState(() => getPendingDraft());
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, historyLoading]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!isLoggedIn) {
        if (isMounted) {
          setHistoryLoading(false);
        }
        return;
      }

      try {
        setHistoryLoading(true);
        const history = await ai_chat.getHistory();
        if (!isMounted) {
          return;
        }

        const historyMessages = toUiMessages(history);
        if (historyMessages.length > 0) {
          setMessages((prev) => {
            if (hasUserInteractedRef.current) {
              return mergeMessages(prev, historyMessages);
            }
            return historyMessages;
          });
        }
      } catch (error) {
        console.error("Load chat history failed:", error);
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isTyping) {
      return;
    }

    if (!isLoggedIn) {
      setPendingDraft(input);
      navigate(`/login?redirect=${encodeURIComponent("/about")}`);
      return;
    }

    hasUserInteractedRef.current = true;
    clearPendingDraft();

    const userMsg: UiMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedInput,
    };

    const baseMessages = [...messages, userMsg];
    const draftAssistantId = createMessageId();

    setMessages(baseMessages);
    setInput("");
    setIsTyping(true);

    try {
      let streamStarted = false;
      let streamCompleted = false;

      try {
        await ai_chat.streamMessage(trimmedInput, {
          onStart: () => {
            streamStarted = true;
            setIsTyping(false);
            setStreamingMessageId(draftAssistantId);
            setMessages((prev) =>
              upsertAssistantDraft(draftAssistantId, "", prev)
            );
          },
          onDelta: (_delta, fullText) => {
            streamStarted = true;
            setIsTyping(false);
            setStreamingMessageId(draftAssistantId);
            setMessages((prev) =>
              upsertAssistantDraft(draftAssistantId, fullText, prev)
            );
          },
          onDone: (text) => {
            streamCompleted = true;
            setIsTyping(false);
            setStreamingMessageId((current) =>
              current === draftAssistantId ? null : current
            );
            setMessages((prev) =>
              upsertAssistantDraft(
                draftAssistantId,
                text.trim() ||
                  "I received your message, but no reply is available right now.",
                prev
              )
            );
          },
        });
      } catch (streamError) {
        if (streamStarted) {
          throw streamError;
        }

        console.warn("Stream chat failed, fallback to one-shot reply:", streamError);
        const reply = await ai_chat.sendMessage(trimmedInput);
        setIsTyping(false);
        setStreamingMessageId(draftAssistantId);
        setMessages((prev) =>
          upsertAssistantDraft(draftAssistantId, "", prev)
        );
        await animateAssistantReply(reply.text || "", draftAssistantId, setMessages);
        setStreamingMessageId((current) =>
          current === draftAssistantId ? null : current
        );
        streamCompleted = true;
      }

      if (!streamCompleted) {
        setStreamingMessageId((current) =>
          current === draftAssistantId ? null : current
        );
        setMessages((prev) =>
          upsertAssistantDraft(
            draftAssistantId,
            "I received your message, but no reply is available right now.",
            prev
          )
        );
      }
    } catch (error) {
      setStreamingMessageId(null);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send the message. Please try again later.";
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: `Message failed to send: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="my-4 mx-auto flex h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/20 shadow-2xl backdrop-blur-md dark:border-gray-700/30 dark:bg-gray-900/20 animate-fade-in">
      <div className="z-10 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-sm p-4 dark:border-gray-700/30 dark:bg-gray-800/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
            <img
              src={APP_AVATAR_SRC}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              yurika
            </h2>
            <p className="text-xs font-medium text-blue-500">
              Rust & React Developer
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-gray-400">
          <Phone className="h-5 w-5 cursor-pointer hover:text-gray-600" />
          <MoreVertical className="h-5 w-5 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto bg-transparent p-4"
      >
        {historyLoading && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500">
            Syncing chat history...
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <img
              src={APP_AVATAR_SRC}
              alt={msg.role === "user" ? "User Avatar" : "Assistant Avatar"}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "rounded-br-none bg-blue-600/80 text-white backdrop-blur-sm"
                  : "rounded-bl-none border border-white/30 bg-white/50 text-gray-700 backdrop-blur-sm dark:border-gray-700/30 dark:bg-gray-800/50 dark:text-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.content}
                {msg.id === streamingMessageId && (
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block animate-pulse text-blue-500 dark:text-blue-300"
                  >
                    {STREAMING_CURSOR}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <img
              src={APP_AVATAR_SRC}
              alt="Assistant Avatar"
              className="ml-0 h-8 w-8 rounded-full object-cover"
            />
            <div className="flex gap-1 rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-75"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-150"></span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-white/20 bg-white/30 backdrop-blur-sm p-4 dark:border-gray-700/30 dark:bg-gray-800/30"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-gray-100 px-5 py-3 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="transform rounded-full bg-blue-600 p-3 text-white shadow-md transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
