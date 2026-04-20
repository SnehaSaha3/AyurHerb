import { useEffect, useState } from "react";
import { Send, Search } from "lucide-react";
import axios from "axios";

interface Message {
  senderId: string;
  receiverId: string;
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
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const companyId = "company-1"; // replace later with real auth

  /* ---------------- FETCH FARMERS ---------------- */
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/farmers");
        setFarmers(res.data.farmers || []);
      } catch (err) {
        console.error("Error fetching farmers", err);
      }
    };

    fetchFarmers();
  }, []);

  /* ---------------- FETCH CHAT ---------------- */
  useEffect(() => {
    if (!selectedFarmer) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${companyId}/${selectedFarmer.farmerId}`
        );
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error("Error fetching messages", err);
      }
    };

    fetchMessages();
  }, [selectedFarmer])

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!input.trim() || !selectedFarmer) return;

    const newMsg = {
      senderId: companyId,
      senderType: "company",
      receiverId: selectedFarmer.farmerId,
      receiverType: "farmer",
      text: input,
    };

    try {
      await axios.post("http://localhost:8000/api/messages/send", newMsg);

      setMessages((prev) => [
        ...prev,
        { ...newMsg, createdAt: new Date().toISOString() },
      ]);

      setInput("");
    } catch (err) {
      console.error("Send failed", err);
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl overflow-hidden border shadow-sm">

      {/* ---------------- LEFT PANEL ---------------- */}
      <div className="w-1/4 border-r bg-gray-50 flex flex-col">

        {/* Search */}
        <div className="p-3 border-b">
          <div className="flex items-center bg-white px-3 py-2 rounded-xl border focus-within:ring-2 focus-within:ring-green-500">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Search farmers..."
              className="ml-2 text-sm outline-none w-full"
            />
          </div>
        </div>

        {/* Farmers List */}
        <div className="flex-1 overflow-y-auto">
          {farmers.map((f) => (
            <div
              key={f.farmerId}
              onClick={() => setSelectedFarmer(f)}
              className={`p-4 cursor-pointer border-b transition ${
                selectedFarmer?.farmerId === f.farmerId
                  ? "bg-green-100"
                  : "hover:bg-gray-100"
              }`}
            >
              <p className="font-medium text-sm">{f.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {f.herb || "No crop info"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- CHAT PANEL ---------------- */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <p className="font-semibold">
              {selectedFarmer?.name || "Select a farmer"}
            </p>
            <p className="text-xs text-gray-500">
              {selectedFarmer?.address}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === companyId;

            return (
              <div
                key={i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl text-sm max-w-xs shadow ${
                    isMe
                      ? "bg-green-500 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t flex items-center gap-2 bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={sendMessage}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl transition"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      {selectedFarmer && (
        <div className="w-1/4 border-l bg-gray-50 p-5 hidden lg:block">
          <h3 className="font-semibold mb-4">Farmer Details</h3>

          <div className="space-y-3 text-sm">
            <p><span className="text-gray-500">Name:</span> {selectedFarmer.name}</p>
            <p><span className="text-gray-500">Location:</span> {selectedFarmer.address}</p>
            <p><span className="text-gray-500">Herb:</span> {selectedFarmer.herb}</p>
            <p className="truncate">
              <span className="text-gray-500">Wallet:</span>{" "}
              {selectedFarmer.walletAddress}
            </p>
          </div>

          <button className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl transition">
            Place Order
          </button>
        </div>
      )}
    </div>
  );
}