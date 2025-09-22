import { useState, useRef, useEffect } from "react";
import { askChatbot } from "./services/Chatbot";
import type { WeatherData } from "./services/Weather";

interface ChatbotCardProps {
  farmLocation?: { lat: number; lng: number } | null;
  weatherData?: WeatherData;
}

type Message = { from: "user" | "bot" | "alert"; text: string };

export default function ChatbotCard({ farmLocation, weatherData }: ChatbotCardProps) {
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Hello! I'm AyurMate 🌿 How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Example: single alert notification
  useEffect(() => {
    const interval = setInterval(() => {
      const alertText = "🌦️ Heavy rainfall expected in your area!";

      if (lastAlert !== alertText) {
        setMessages(prev => [...prev, { from: "alert", text: alertText }]);
        setLastAlert(alertText);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [lastAlert]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { from: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context = {
      location: farmLocation ? `${farmLocation.lat},${farmLocation.lng}` : "",
      weather: weatherData || {}
    };

    try {
      const answer = await askChatbot(input, context);
      setMessages(prev => [...prev, { from: "bot", text: answer as string }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Oops! Something went wrong. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-green-50 rounded-t-2xl">
        <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
          A
        </div>
        <div className="ml-3">
          <h2 className="text-lg font-semibold text-green-900">AyurMate</h2>
          <p className="text-xs text-gray-600">Your farm assistant 🌿</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : m.from === "bot" ? "justify-start" : "justify-center"}`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[70%] break-words shadow ${
                m.from === "user"
                  ? "bg-green-100 text-green-900"
                  : m.from === "bot"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-yellow-100 text-yellow-900 text-center italic"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-gray-500 italic animate-pulse">AyurMate is typing...</div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex p-3 border-t border-gray-200 gap-2">
        <input
          type="text"
          placeholder="Ask your question..."
          className="flex-1 border rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-green-300"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 rounded-full transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
