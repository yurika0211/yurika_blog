import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, User, Bot, MoreVertical, Phone } from "lucide-react";
import { ai_chat, type ChatMessage } from "../services/api_chat";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const AVATAR_URL =
  "/profile.webp";

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

const assistantCount = (messages: UiMessage[]) =>
  messages.filter((msg) => msg.role === "assistant").length;

const HISTORY_POLL_INTERVAL_MS = 900;
const HISTORY_POLL_MAX_TIMES = 8;

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
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
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
      try {
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
  }, []);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isTyping) {
      return;
    }

    hasUserInteractedRef.current = true;

    const userMsg: UiMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedInput,
    };

    const baseMessages = [...messages, userMsg];
    const baseAssistantTotal = assistantCount(baseMessages);

    setMessages(baseMessages);
    setInput("");
    setIsTyping(true);

    try {
      const reply = await ai_chat.sendMessage(trimmedInput);
      const replyText = reply.text?.trim() || "";

      if (replyText) {
        const botMsg: UiMessage = {
          id: createMessageId(),
          role: "assistant",
          content: replyText,
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      let hasAssistantReplyFromHistory = false;
      let workingMessages = baseMessages;
      let historyUnavailable = false;
      for (let i = 0; i < HISTORY_POLL_MAX_TIMES; i += 1) {
        try {
          const latestHistory = await ai_chat.getHistory();
          const latestHistoryUi = toUiMessages(latestHistory);
          if (latestHistoryUi.length > 0) {
            workingMessages = mergeMessages(workingMessages, latestHistoryUi);
            setMessages(workingMessages);

            hasAssistantReplyFromHistory =
              assistantCount(workingMessages) > baseAssistantTotal;

            if (hasAssistantReplyFromHistory) {
              break;
            }
          }
        } catch (syncError) {
          console.error("Sync latest chat history failed:", syncError);
          const msg =
            syncError instanceof Error ? syncError.message.toLowerCase() : "";
          if (msg.includes("id is required") || msg.includes("http 400")) {
            historyUnavailable = true;
            break;
          }
        }

        if (!historyUnavailable && i < HISTORY_POLL_MAX_TIMES - 1) {
          await sleep(HISTORY_POLL_INTERVAL_MS);
        }
      }

      if (!hasAssistantReplyFromHistory) {
        const botMsg: UiMessage = {
          id: createMessageId(),
          role: "assistant",
          content: "我收到了你的消息，但暂时没有可用回复。",
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "发送失败，请稍后再试。";
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: `消息发送失败：${errorMessage}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="my-8 mx-auto flex h-[600px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-fade-in">
      <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
            <img
              src={AVATAR_URL}
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
        className="flex-1 space-y-6 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950/50"
      >
        {historyLoading && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500">
            正在同步历史消息...
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                msg.role === "user"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-transparent"
              }`}
            >
              {msg.role === "user" ? (
                <User size={16} />
              ) : (
                <img
                  src={AVATAR_URL}
                  alt="Assistant Avatar"
                  className="h-8 w-8 rounded-full"
                />
              )}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "rounded-br-none bg-blue-600 text-white"
                  : "rounded-bl-none border border-gray-100 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="ml-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
              <Bot size={16} className="text-gray-500" />
            </div>
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
        className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
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
