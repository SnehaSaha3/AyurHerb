import { useState, useRef, useEffect } from "react";
import { askChatbot } from "./services/Chatbot";
import type { WeatherData } from "./services/Weather";

interface ChatbotCardProps {
  farmLocation?: { lat: number; lng: number } | null;
  weatherData?: WeatherData;
}

type Message = { from: "user" | "bot" | "alert"; text: string };

export default function ChatbotCard({
  farmLocation,
  weatherData,
}: ChatbotCardProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "This is AyurMate 🌿, Look into your farm today ",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to the newest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

  // Example alert notification
  useEffect(() => {
    const interval = setInterval(() => {
      const alertText = "🌦️ Heavy rainfall expected in your area!";

      if (lastAlert !== alertText) {
        setMessages((prev) => [
          ...prev,
          {
            from: "alert",
            text: alertText,
          },
        ]);

        setLastAlert(alertText);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [lastAlert]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || loading) return;

    const userMsg: Message = {
      from: "user",
      text: trimmedInput,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context = {
      location: farmLocation
        ? `${farmLocation.lat},${farmLocation.lng}`
        : "",
      weather: weatherData || {},
    };

    try {
      const answer = await askChatbot(trimmedInput, context);

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: answer as string,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Oops! Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(34,197,94,0.10)]">
      {/* HEADER */}
      <div className="flex shrink-0 items-center border-b border-green-100 bg-gradient-to-r from-green-50/90 to-white px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 text-sm font-bold text-white shadow-sm">
          A
        </div>

        <div className="ml-3 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-green-900">
              AyurMate
            </h2>

            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          </div>

          <p className="text-[11px] text-gray-500">
            Your Helping Friend 
          </p>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white px-3 py-4 sm:px-4">
        <div className="space-y-3">
          {messages.map((m, i) => {
            const isUser = m.from === "user";
            const isAlert = m.from === "alert";

            return (
              <div
                key={i}
                className={`flex ${
                  isUser
                    ? "justify-end"
                    : isAlert
                    ? "justify-center"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${
                    isUser
                      ? "rounded-br-md bg-green-600 text-white"
                      : isAlert
                      ? "max-w-[95%] border border-amber-200 bg-amber-50 text-center text-xs text-amber-800"
                      : "rounded-bl-md border border-gray-100 bg-white text-gray-700"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-3.5 py-2.5 text-xs text-gray-400 shadow-sm">
                <span className="inline-flex items-center gap-1">
                  AyurMate is thinking
                  <span className="animate-pulse">•••</span>
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* INPUT — ALWAYS VISIBLE */}
      <div className="shrink-0 border-t border-gray-100 bg-white p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 transition-all duration-200 focus-within:border-green-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-100">
          <input
            type="text"
            placeholder="Ask AyurMate..."
            aria-label="Ask AyurMate a question"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-green-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>

        <p className="mt-2 px-1 text-[9px] text-gray-400">
          Ask about crops, weather, field conditions or farm decisions.
        </p>
      </div>
    </div>
  );
}