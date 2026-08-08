import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Search } from "lucide-react";
import axios from "axios";
import { getSocket, decodeJwtPayload } from "../../lib/Socket.client";

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

export default function FarmerMessages() {
  const [searchParams] = useSearchParams();

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------------- RESOLVE FARMER IDENTITY + CONNECT SOCKET ---------------- */
 useEffect(() => {
     const token = localStorage.getItem("token");
     if (!token) return;
 
     const payload = decodeJwtPayload<{ farmerId: string }>(token);

if (!payload?.farmerId) return;

setFarmerId(payload.farmerId);
 
     const socket = getSocket(token);
 
     socket.on("receive_message", (msg: Message) => {
       setMessages((prev) => {
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
  /* ---------------- FETCH COMPANIES ---------------- */
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/companies");

        if (res.data.success) {
          setCompanies(res.data.companies);
          setFilteredCompanies(res.data.companies);
        } else {
          setCompanies([]);
          setFilteredCompanies([]);
        }
      } catch (err) {
        console.error("Error fetching companies", err);
        setCompanies([]);
        setFilteredCompanies([]);
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

  /* ---------------- SEARCH FILTER ---------------- */
  useEffect(() => {
    const filtered = companies.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [search, companies]);

  /* ---------------- FETCH CHAT HISTORY ---------------- */
  useEffect(() => {
  if (!selectedCompany || !farmerId) return;

  const fetchMessages = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get(
        `http://localhost:8000/api/messages/chat/${selectedCompany.companyId}/${farmerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
}, [selectedCompany, farmerId]);

  /* ---------------- AUTO-SCROLL ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = () => {
    if (!input.trim() || !selectedCompany || !farmerId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = getSocket(token);
    const text = input.trim();

    setInput("");

    socket.emit(
      "send_message",
      {
        receiverId: selectedCompany.companyId,
        receiverType: "company",
        text,
      },
      (ack: { success: boolean; error?: string }) => {
        if (!ack?.success) {
          console.error("Message failed to send:", ack?.error);
          setInput(text);
        }
      }
    );
  };

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!farmerId) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-gray-500">
          Please log in as a farmer to view messages.
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
              placeholder="Search companies..."
              className="ml-2 text-sm outline-none w-full bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCompanies.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-6">
              No companies found 🏢
            </p>
          )}

          {filteredCompanies.map((c) => (
            <div
              key={c.companyId}
              onClick={() => setSelectedCompany(c)}
              className={`p-4 cursor-pointer transition-all duration-200 border-b ${
                selectedCompany?.companyId === c.companyId
                  ? "bg-gradient-to-r from-green-200 to-emerald-100"
                  : "hover:bg-green-50"
              }`}
            >
              <p className="font-semibold text-sm text-gray-800">{c.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {c.address || "No address info"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- CHAT PANEL ---------------- */}
      <div className="flex-1 flex flex-col backdrop-blur-lg bg-white/40">

        <div className="p-4 border-b bg-white/60 backdrop-blur-md">
          <p className="font-semibold text-gray-800">
            {selectedCompany?.name || "Select a company"}
          </p>
          <p className="text-xs text-gray-500">
            {selectedCompany?.address || ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {!selectedCompany && (
            <p className="text-center text-gray-400 mt-10">
              Select a company to start chatting 🏢
            </p>
          )}

          {selectedCompany && messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm">
              No messages yet. Start conversation 👋
            </p>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.senderId === farmerId;

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

        {selectedCompany && (
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
    </div>
  );
}