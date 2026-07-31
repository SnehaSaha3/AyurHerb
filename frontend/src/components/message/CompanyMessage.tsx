import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Search } from "lucide-react";
import axios from "axios";
import { getSocket, decodeJwtPayload } from "../../lib/Socket.client"

interface Message {
  senderId: string;
  senderType: "farmer" | "company";
  receiverId: string;
  receiverType: "farmer" | "company";
  text: string;
  createdAt: string;
}

interface Farmer {
  farmerId: string;
  name: string;
  address?: string;
  herb?: string;
  walletAddress?: string;
}

export default function CompanyMessages() {
  const [searchParams] = useSearchParams();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------------- RESOLVE COMPANY IDENTITY + CONNECT SOCKET ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) return; // handled by the "not logged in" state below

    const payload = decodeJwtPayload<{ companyId: string }>(token);
    if (!payload?.companyId) return;

    setCompanyId(payload.companyId);

    const socket = getSocket(token);

    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => {
        // safety net against accidental duplicate emits (e.g. reconnects)
        if (
          prev.some(
            (m) =>
              m.createdAt === msg.createdAt &&
              m.senderId === msg.senderId &&
              m.text === msg.text
          )
        ) {
          return prev;
        }
        return [...prev, msg];
      });
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  /* ---------------- FETCH FARMERS ---------------- */
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/farmers");

        if (res.data.success) {
          setFarmers(res.data.farmers);
          setFilteredFarmers(res.data.farmers);
        } else {
          setFarmers([]);
          setFilteredFarmers([]);
        }
      } catch (err) {
        console.error("Error fetching farmers", err);
        setFarmers([]);
        setFilteredFarmers([]);
      }
    };

    fetchFarmers();
  }, []);

  /* ---------------- AUTO-SELECT FARMER FROM "View Farmer" REDIRECT ---------------- */
  useEffect(() => {
    const farmerIdFromUrl = searchParams.get("farmerId");
    if (!farmerIdFromUrl || farmers.length === 0) return;

    const match = farmers.find((f) => f.farmerId === farmerIdFromUrl);
    if (match) setSelectedFarmer(match);
  }, [searchParams, farmers]);

  /* ---------------- SEARCH FILTER ---------------- */
  useEffect(() => {
    const filtered = farmers.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredFarmers(filtered);
  }, [search, farmers]);

  /* ---------------- FETCH CHAT HISTORY (sockets handle new messages live) ---------------- */
  useEffect(() => {
    if (!selectedFarmer || !companyId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${companyId}/${selectedFarmer.farmerId}`
        );

        if (res.data.success) {
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
  }, [selectedFarmer, companyId]);

  /* ---------------- AUTO-SCROLL TO LATEST MESSAGE ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- SEND MESSAGE (real-time via socket) ---------------- */
  const sendMessage = () => {
    if (!input.trim() || !selectedFarmer || !companyId) return;

    const token = localStorage.getItem("companyToken");
    if (!token) return;

    const socket = getSocket(token);
    const text = input.trim();

    setInput("");

    socket.emit(
      "send_message",
      {
        receiverId: selectedFarmer.farmerId,
        receiverType: "farmer",
        text,
      },
      (ack: { success: boolean; error?: string }) => {
        if (!ack?.success) {
          console.error("Message failed to send:", ack?.error);
          // give the text back so the user can retry
          setInput(text);
        }
      }
    );
  };

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!companyId) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-gray-500">
          Please log in as a company to view messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] rounded-3xl overflow-hidden shadow-2xl border bg-gradient-to-br from-green-50 via-white to-emerald-100">

      {/* ---------------- LEFT PANEL ---------------- */}
      <div className="w-1/4 backdrop-blur-lg bg-white/60 border-r flex flex-col">

        <div className="p-4 border-b">
          <div className="flex items-center bg-white/80 px-3 py-2 rounded-xl border shadow-sm focus-within:ring-2 focus-within:ring-green-400 transition">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmers..."
              className="ml-2 text-sm outline-none w-full bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredFarmers.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-6">
              No farmers found 🌱
            </p>
          )}

          {filteredFarmers.map((f) => (
            <div
              key={f.farmerId}
              onClick={() => setSelectedFarmer(f)}
              className={`p-4 cursor-pointer transition-all duration-200 border-b ${
                selectedFarmer?.farmerId === f.farmerId
                  ? "bg-gradient-to-r from-green-200 to-emerald-100"
                  : "hover:bg-green-50"
              }`}
            >
              <p className="font-semibold text-sm text-gray-800">{f.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {f.herb || "No crop info"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- CHAT PANEL ---------------- */}
      <div className="flex-1 flex flex-col backdrop-blur-lg bg-white/40">

        <div className="p-4 border-b bg-white/60 backdrop-blur-md">
          <p className="font-semibold text-gray-800">
            {selectedFarmer?.name || "Select a farmer"}
          </p>
          <p className="text-xs text-gray-500">
            {selectedFarmer?.address || ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {!selectedFarmer && (
            <p className="text-center text-gray-400 mt-10">
              Select a farmer to start chatting 👨‍🌾
            </p>
          )}

          {selectedFarmer && messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm">
              No messages yet. Start conversation 👋
            </p>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === companyId;

            return (
              <div
                key={i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl text-sm max-w-xs shadow-md transition ${
                    isMe
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "bg-white text-gray-800 border"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {selectedFarmer && (
          <div className="p-3 border-t flex items-center gap-2 bg-white/70 backdrop-blur-md">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
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

      {/* ---------------- RIGHT PANEL ---------------- */}
      {selectedFarmer && (
        <div className="w-1/4 border-l backdrop-blur-lg bg-white/60 p-6 hidden lg:block">

          <h3 className="font-semibold mb-4 text-gray-800">
            🌾 Farmer Details
          </h3>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Name:</span>{" "}
              <span className="font-medium">{selectedFarmer.name}</span>
            </p>

            <p>
              <span className="text-gray-500">Location:</span>{" "}
              {selectedFarmer.address || "—"}
            </p>

            <p>
              <span className="text-gray-500">Herb:</span>{" "}
              {selectedFarmer.herb || "—"}
            </p>

            <p className="truncate">
              <span className="text-gray-500">Wallet:</span>{" "}
              {selectedFarmer.walletAddress || "—"}
            </p>
          </div>

          <button className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02] text-white py-2 rounded-xl shadow-md transition">
            Place Order 🚜
          </button>
        </div>
      )}
    </div>
  );
}