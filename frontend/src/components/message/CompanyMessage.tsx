import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Search, X } from "lucide-react";
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

interface CropEntry {
  cropId?: string;
  cropName: string;
  soilType?: string;
  season?: string;
  quantity?: number;
}

interface Farmer {
  farmerId: string;
  name: string;
  address?: string;
  herb?: string;
  walletAddress?: string;
  crops?: CropEntry[];
}

const CROP_ICONS: Record<string, string> = {
  ashwagandha: "🌿",
  tulsi: "🍃",
  "aloe vera": "🪴",
  neem: "🌳",
  turmeric: "🟡",
  ginger: "🫚",
};

function getCropIcon(cropName: string): string {
  const key = cropName.trim().toLowerCase();
  return CROP_ICONS[key] || "🌱";
}

function getFarmerCrops(f: Farmer): CropEntry[] {
  if (f.crops && f.crops.length > 0) return f.crops;
  if (f.herb) return [{ cropName: f.herb }];
  return [];
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
  const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);

  // ---- Order modal state ----
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderCropId, setOrderCropId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderGst, setOrderGst] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------------- RESOLVE COMPANY IDENTITY + CONNECT SOCKET ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) return;

    const payload = decodeJwtPayload<{ companyId: string }>(token);
    if (!payload?.companyId) return;

    setCompanyId(payload.companyId);

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

  /* ---------------- CROP SEARCH FILTER ---------------- */
  useEffect(() => {
    if (!search.trim()) {
      setFilteredFarmers(farmers);
      return;
    }
    const q = search.toLowerCase();
    const matched = farmers.filter((f) =>
      getFarmerCrops(f).some((c) => c.cropName.toLowerCase().includes(q))
    );
    setFilteredFarmers(matched);
  }, [search, farmers]);

  /* ---------------- FETCH CHAT HISTORY (authenticated) ---------------- */
  useEffect(() => {
    if (!selectedFarmer || !companyId) return;

    const fetchMessages = async () => {
      const token = localStorage.getItem("companyToken");
      if (!token) return;

      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${companyId}/${selectedFarmer.farmerId}`,
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
          setInput(text);
        }
      }
    );
  };

  /* ---------------- OPEN ORDER MODAL ---------------- */
  const openOrderModal = () => {
    if (!selectedFarmer) return;
    const crops = getFarmerCrops(selectedFarmer);
    setOrderCropId(crops[0]?.cropId || "");
    setOrderQuantity("");
    setOrderAmount("");
    setOrderGst("");
    setOrderStatus(null);
    setOrderModalOpen(true);
  };

  /* ---------------- SUBMIT ORDER ---------------- */
  const submitOrder = async () => {
    if (!selectedFarmer) return;

    const crops = getFarmerCrops(selectedFarmer);
    const chosenCrop = crops.find((c) => c.cropId === orderCropId) || crops[0];

    if (!chosenCrop || !orderQuantity || !orderAmount || !orderGst.trim()) {
      setOrderStatus({ type: "error", text: "Fill in all fields before placing the order." });
      return;
    }

    const token = localStorage.getItem("companyToken");
    if (!token) {
      setOrderStatus({ type: "error", text: "Please log in again." });
      return;
    }

    setOrderSubmitting(true);
    setOrderStatus(null);

    try {
      const res = await axios.post(
        "http://localhost:8000/api/orders/create",
        {
          farmerId: selectedFarmer.farmerId,
          cropId: chosenCrop.cropId,
          cropName: chosenCrop.cropName,
          quantity: Number(orderQuantity),
          amount: Number(orderAmount),
          gstNumber: orderGst.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setOrderStatus({ type: "success", text: "✅ Order confirmed and logged on-chain!" });
        setTimeout(() => setOrderModalOpen(false), 1800);
      } else {
        setOrderStatus({ type: "error", text: res.data.error || "Order could not be placed." });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOrderStatus({ type: "error", text: err.response?.data?.error || "Order failed." });
      } else {
        setOrderStatus({ type: "error", text: "Unexpected error placing order." });
      }
      console.error(err);
    } finally {
      setOrderSubmitting(false);
    }
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
              placeholder="Search by crop (e.g. Tulsi)..."
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

          {filteredFarmers.map((f) => {
            const crops = getFarmerCrops(f);
            const query = search.trim().toLowerCase();
            const matchedCrop =
              (query && crops.find((c) => c.cropName.toLowerCase().includes(query))) ||
              crops[0];
            const otherCount = crops.length - (matchedCrop ? 1 : 0);
            const isExpanded = expandedFarmerId === f.farmerId;
            const icon = getCropIcon(matchedCrop?.cropName || "");

            return (
              <div key={f.farmerId} className="border-b">
                <div
                  onClick={() => setSelectedFarmer(f)}
                  className={`p-4 cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                    selectedFarmer?.farmerId === f.farmerId
                      ? "bg-gradient-to-r from-green-200 to-emerald-100"
                      : "hover:bg-green-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 border flex items-center justify-center text-lg shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{f.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {matchedCrop?.cropName || "No crop info"}
                      {otherCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedFarmerId(isExpanded ? null : f.farmerId);
                          }}
                          className="ml-1 text-green-600 font-medium hover:underline"
                        >
                          +{otherCount}
                        </button>
                      )}
                    </p>
                    {f.address && (
                      <p className="text-[11px] text-gray-400 truncate">📍 {f.address}</p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-16 pb-3 pr-4 space-y-1">
                    {crops.map((c, i) => (
                      <div key={c.cropId ?? i} className="text-xs text-gray-600 flex items-center gap-2">
                        <span>{getCropIcon(c.cropName)}</span>
                        <span>{c.cropName}</span>
                        {c.season && <span className="text-gray-400">· {c.season}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

            <div className="space-y-1">
              <span className="text-gray-500">Crops:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {getFarmerCrops(selectedFarmer).map((c, i) => (
                  <span
                    key={c.cropId ?? i}
                    className="text-xs bg-green-50 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1"
                  >
                    {getCropIcon(c.cropName)} {c.cropName}
                  </span>
                ))}
                {getFarmerCrops(selectedFarmer).length === 0 && (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </div>

            <p className="truncate">
              <span className="text-gray-500">Wallet:</span>{" "}
              {selectedFarmer.walletAddress || "—"}
            </p>
          </div>

          <button
            onClick={openOrderModal}
            className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02] text-white py-2 rounded-xl shadow-md transition"
          >
            Place Order 🚜
          </button>
        </div>
      )}

      {/* ---------------- PLACE ORDER MODAL ---------------- */}
      {orderModalOpen && selectedFarmer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setOrderModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-gray-800 mb-1">Place Order</h3>
            <p className="text-xs text-gray-500 mb-4">with {selectedFarmer.name}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Crop</label>
                <select
                  value={orderCropId}
                  onChange={(e) => setOrderCropId(e.target.value)}
                  className="border p-2 w-full rounded text-sm"
                >
                  {getFarmerCrops(selectedFarmer).map((c, i) => (
                    <option key={c.cropId ?? i} value={c.cropId}>
                      {getCropIcon(c.cropName)} {c.cropName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="border p-2 w-full rounded text-sm"
                  placeholder="e.g. 50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  className="border p-2 w-full rounded text-sm"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Company GSTIN</label>
                <input
                  type="text"
                  value={orderGst}
                  onChange={(e) => setOrderGst(e.target.value.toUpperCase())}
                  className="border p-2 w-full rounded text-sm"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>

              {orderStatus && (
                <p className={`text-xs ${orderStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {orderStatus.text}
                </p>
              )}

              <button
                onClick={submitOrder}
                disabled={orderSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {orderSubmitting ? "Placing order..." : "Confirm Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}