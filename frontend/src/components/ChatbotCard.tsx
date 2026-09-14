import { useEffect, useRef, useState } from "react";
import { askChatbot } from "./services/Chatbot";
import type { WeatherData } from "./services/Weather";
import type { CropSummary } from "./farmer/FarmContext"

interface FarmLocation {
  lat: number;
  lng: number;
}

interface ChatbotCardProps {
  farmLocation?: FarmLocation | null;
  weatherData?: WeatherData;
  crops?: CropSummary[];
  avgMoisture?: number | null;
}

type Message = {
  from: "user" | "bot";
  text: string;
};

export default function ChatbotCard({
  farmLocation,
  weatherData,
  crops = [],
  avgMoisture,
}: ChatbotCardProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "This is AyurMate 🌿, Look into your farm today.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

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

    /*
     * Build the farmer context from the actual FarmContext data.
     *
     * This is what makes AyurMate an agricultural agent rather
     * than a generic chatbot.
     */
    const farmer = {
      crops,

      location: farmLocation
        ? {
            latitude: farmLocation.lat,
            longitude: farmLocation.lng,
          }
        : {},

      moisture: avgMoisture ?? undefined,

      weather: weatherData
        ? {
            temp: weatherData.temp,
            description: weatherData.description,
            rainChance: weatherData.rainChance,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
          }
        : {},
    };

    console.log("AyurMate farmer context:", farmer);

    try {
      const result = await askChatbot(
        trimmedInput,
        farmer,
      );

      const decision = result?.decision;

      if (decision) {
        const formattedMessage = formatDecision(decision);

        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: formattedMessage,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: "AyurMate couldn't generate a decision right now.",
          },
        ]);
      }
    } catch (error) {
      console.error("AyurMate error:", error);

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text:
            "Oops! AyurMate couldn't connect right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
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

      {/* CHAT */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white px-3 py-4 sm:px-4">
        <div className="space-y-3">
          {messages.map((m, i) => {
            const isUser = m.from === "user";

            return (
              <div
                key={i}
                className={`flex ${
                  isUser
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${
                    isUser
                      ? "rounded-br-md bg-green-600 text-white"
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
                  <span className="animate-pulse">
                    •••
                  </span>
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* INPUT */}
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
            {loading ? "..." : "Send"}
          </button>
        </div>

        <p className="mt-2 px-1 text-[9px] text-gray-400">
          Ask about crops, weather, field conditions or farm decisions.
        </p>
      </div>
    </div>
  );
}


/**
 * Convert AyurMate's structured agent decision
 * into the simple chat message currently used by the UI.
 */
function formatDecision(decision: {
  action?: string;
  priority?: string;
  crop?: string | null;
  title?: string;
  message?: string;
  reason?: string[];
  next_steps?: string[];
}) {
  const parts: string[] = [];

  if (decision.title) {
    parts.push(decision.title);
  }

  if (decision.message) {
    parts.push(decision.message);
  }

  if (decision.reason?.length) {
    parts.push(
      `Why: ${decision.reason.join(" ")}`,
    );
  }

  if (decision.next_steps?.length) {
    parts.push(
      `Next: ${decision.next_steps.join(" ")}`,
    );
  }

  return parts.join("\n\n");
}