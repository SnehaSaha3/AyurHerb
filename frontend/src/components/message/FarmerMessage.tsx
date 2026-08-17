import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Search } from "lucide-react";
import axios from "axios";
import { getSocket, decodeJwtPayload } from "../../lib/Socket.client";
import { useUnread } from "../../context/UnreadContext";

interface Message {
  senderId: string;
  senderType: "farmer" | "company";
  receiverId: string;
  receiverType: "farmer" | "company";
  text: string;
  createdAt: string;
}

interface Company {
  companyId: string;
  name: string;
  address?: string;
  contact?: string;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function FarmerMessages() {
  const [searchParams] = useSearchParams();
  const { unreadCounts, setActiveThread } = useUnread();

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");

  const [lastActivity, setLastActivity] = useState<Record<string, string>>({});
  const [lastPreview, setLastPreview] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getUnreadFor = (id: string): number => unreadCounts?.[id] ?? 0;

  const fetchInbox = async (token: string) => {
    try {
      const res = await axios.get("http://localhost:8000/api/messages/inbox", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data.conversations)) {
        const activity: Record<string, string> = {};
        const preview: Record<string, string> = {};
        for (const c of res.data.conversations) {
          if (c.otherType !== "company") continue;
          activity[c.otherId] = c.lastAt;
          preview[c.otherId] = c.lastMessage;
        }
        setLastActivity(activity);
        setLastPreview(preview);
      }
    } catch (err) {
      console.error("Error fetching inbox", err);
    }
  };

  /* ---------------- RESOLVE FARMER IDENTITY + CONNECT SOCKET ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("farmerToken");
    if (!token) return;

    const payload = decodeJwtPayload<{ farmerId: string }>(token);
    if (!payload?.farmerId) return;

    setFarmerId(payload.farmerId);
    fetchInbox(token);

    const socket = getSocket(token);

    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => {
        if (
          prev.some((m) => m.createdAt === msg.createdAt && m.senderId === msg.senderId && m.text === msg.text)
        ) {
          return prev;
        }
        return [...prev, msg];
      });

      const otherId = msg.senderId === payload.farmerId ? msg.receiverId : msg.senderId;
      setLastActivity((prev) => ({ ...prev, [otherId]: msg.createdAt }));
      setLastPreview((prev) => ({ ...prev, [otherId]: msg.text }));
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  // Leaving this page entirely means no thread is "active" anymore —
  // otherwise a stale activeThreadId would keep suppressing that
  // company's badge even after navigating away.
  useEffect(() => {
    return () => setActiveThread(null);
  }, []);

  /* ---------------- FETCH COMPANIES ---------------- */
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/companies");
        if (res.data?.success && Array.isArray(res.data.companies)) {
          setCompanies(res.data.companies);
        } else {
          setCompanies([]);
        }
      } catch (err) {
        console.error("Error fetching companies", err);
        setCompanies([]);
      }
    };

    fetchCompanies();
  }, []);

  /* ---------------- AUTO-SELECT COMPANY FROM URL (?companyId=) ---------------- */
  useEffect(() => {
    const companyIdFromUrl = searchParams.get("companyId");
    if (!companyIdFromUrl || companies.length === 0) return;

    const match = companies.find((c) => c.companyId === companyIdFromUrl);
    if (match) setSelectedCompany(match);
  }, [searchParams, companies]);

  /* ---------------- SEARCH + FILTER + RECENT-FIRST SORT ---------------- */
  const visibleCompanies = useMemo(() => {
    let list = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

    if (filterMode === "unread") {
      list = list.filter((c) => getUnreadFor(c.companyId) > 0);
    }

    return [...list].sort((a, b) => {
      const aTime = lastActivity[a.companyId];
      const bTime = lastActivity[b.companyId];
      if (aTime && bTime) return new Date(bTime).getTime() - new Date(aTime).getTime();
      if (aTime && !bTime) return -1;
      if (!aTime && bTime) return 1;
      return 0;
    });
  }, [companies, search, filterMode, unreadCounts, lastActivity]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  /* ---------------- SELECT A COMPANY → mark thread active + fetch history ---------------- */
  const selectCompany = (c: Company) => {
    setSelectedCompany(c);
    setActiveThread(c.companyId);
  };

  useEffect(() => {
    if (!selectedCompany || !farmerId) return;

    const fetchMessages = async () => {
      const token = localStorage.getItem("farmerToken");
      if (!token) return;

      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${selectedCompany.companyId}/${farmerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.success && Array.isArray(res.data.messages)) {
          setMessages(res.data.messages);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Error fetching messages", err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedCompany, farmerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedCompany || !farmerId) return;

    const token = localStorage.getItem("farmerToken");
    if (!token) return;

    const socket = getSocket(token);
    const text = input.trim();

    setInput("");

    socket.emit(
      "send_message",
      { receiverId: selectedCompany.companyId, receiverType: "company", text },
      (ack: { success: boolean; error?: string }) => {
        if (!ack?.success) {
          console.error("Message failed to send:", ack?.error);
          setInput(text);
        }
      }
    );
  };

  if (!farmerId) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-gray-500">Please log in as a farmer to view messages.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] rounded-3xl overflow-hidden shadow-2xl border bg-gradient-to-br from-green-50 via-white to-emerald-100">
      <div className="w-1/4 backdrop-blur-lg bg-white/60 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center bg-white/80 px-3 py-2 rounded-xl border shadow-sm focus-within:ring-2 focus-within:ring-green-400 transition">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="ml-2 text-sm outline-none w-full bg-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterMode === "all" ? "bg-green-600 text-white" : "bg-white/80 text-gray-600 border"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode("unread")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterMode === "unread" ? "bg-green-600 text-white" : "bg-white/80 text-gray-600 border"
              }`}
            >
              Unread{totalUnread > 0 ? ` (${totalUnread})` : ""}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleCompanies.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-6">
              {filterMode === "unread" ? "No unread messages 🎉" : "No companies found 🏢"}
            </p>
          )}

          {visibleCompanies.map((c) => {
            const unread = getUnreadFor(c.companyId);
            const preview = lastPreview[c.companyId];
            const activity = lastActivity[c.companyId];

            return (
              <div
                key={c.companyId}
                onClick={() => selectCompany(c)}
                className={`p-4 cursor-pointer transition-all duration-200 border-b flex items-center justify-between gap-2 ${
                  selectedCompany?.companyId === c.companyId
                    ? "bg-gradient-to-r from-green-200 to-emerald-100"
                    : "hover:bg-green-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                    {c.name}
                  </p>
                  <p className={`text-xs truncate ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                    {preview || c.address || "No address info"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {activity && <span className="text-[10px] text-gray-400">{formatRelativeTime(activity)}</span>}
                  {unread > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col backdrop-blur-lg bg-white/40">
        <div className="p-4 border-b bg-white/60 backdrop-blur-md">
          <p className="font-semibold text-gray-800">{selectedCompany?.name || "Select a company"}</p>
          <p className="text-xs text-gray-500">{selectedCompany?.address || ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!selectedCompany && <p className="text-center text-gray-400 mt-10">Select a company to start chatting 🏢</p>}
          {selectedCompany && messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm">No messages yet. Start conversation 👋</p>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === farmerId;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-4 py-2 rounded-2xl text-sm max-w-xs shadow-md transition whitespace-pre-line ${
                    isMe ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-white text-gray-800 border"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {selectedCompany && (
          <div className="p-3 border-t flex items-center gap-2 bg-white/70 backdrop-blur-md">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message... (try /report)"
              className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 text-white p-3 rounded-xl shadow-md transition"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}