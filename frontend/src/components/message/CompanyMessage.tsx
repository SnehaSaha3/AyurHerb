import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Search, X } from "lucide-react";
import axios from "axios";
import {
  getSocket,
  decodeJwtPayload,
} from "../../lib/Socket.client";
import { useUnread } from "../../context/UnreadContext";

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
  if (f.crops && f.crops.length > 0) {
    return f.crops;
  }

  if (f.herb) {
    return [{ cropName: f.herb }];
  }

  return [];
}

export default function CompanyMessages() {
  const [searchParams] = useSearchParams();

  const {
    unreadCounts,
    setActiveThread,
  } = useUnread();

  const [companyId, setCompanyId] =
    useState<string | null>(null);

  const [farmers, setFarmers] =
    useState<Farmer[]>([]);

  const [filteredFarmers, setFilteredFarmers] =
    useState<Farmer[]>([]);

  const [selectedFarmer, setSelectedFarmer] =
    useState<Farmer | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [expandedFarmerId, setExpandedFarmerId] =
    useState<string | null>(null);

  const [orderModalOpen, setOrderModalOpen] =
    useState(false);

  const [orderCropId, setOrderCropId] =
    useState("");

  const [orderQuantity, setOrderQuantity] =
    useState("");

  const [orderAmount, setOrderAmount] =
    useState("");

  const [orderGst, setOrderGst] =
    useState("");

  const [orderSubmitting, setOrderSubmitting] =
    useState(false);

  const [orderStatus, setOrderStatus] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const getUnreadFor = (id: string): number =>
    unreadCounts?.[id] ?? 0;

  /*
   * Resolve company identity and connect socket.
   * Unread updates are handled globally by UnreadContext.
   */
  useEffect(() => {
    const token =
      localStorage.getItem("companyToken");

    if (!token) return;

    const payload =
      decodeJwtPayload<{ companyId: string }>(
        token
      );

    if (!payload?.companyId) return;

    setCompanyId(payload.companyId);

    const socket = getSocket(token);

    const handleReceiveMessage = (
      msg: Message
    ) => {
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.createdAt === msg.createdAt &&
            m.senderId === msg.senderId &&
            m.text === msg.text
        );

        if (exists) {
          return prev;
        }

        return [...prev, msg];
      });
    };

    socket.on(
      "receive_message",
      handleReceiveMessage
    );

    return () => {
      socket.off(
        "receive_message",
        handleReceiveMessage
      );
    };
  }, []);

  /*
   * Fetch farmers.
   */
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/farmers"
        );

        if (
          res.data?.success &&
          Array.isArray(res.data.farmers)
        ) {
          setFarmers(res.data.farmers);
          setFilteredFarmers(
            res.data.farmers
          );
        } else {
          setFarmers([]);
          setFilteredFarmers([]);
        }
      } catch (err) {
        console.error(
          "Error fetching farmers",
          err
        );

        setFarmers([]);
        setFilteredFarmers([]);
      }
    };

    fetchFarmers();
  }, []);

  /*
   * Automatically select farmer from URL.
   */
  useEffect(() => {
    const farmerIdFromUrl =
      searchParams.get("farmerId");

    if (
      !farmerIdFromUrl ||
      farmers.length === 0
    ) {
      return;
    }

    const match = farmers.find(
      (f) =>
        f.farmerId === farmerIdFromUrl
    );

    if (match) {
      setSelectedFarmer(match);
      setActiveThread(match.farmerId);
    }
  }, [
    searchParams,
    farmers,
    setActiveThread,
  ]);

  /*
   * Crop search filter.
   */
  useEffect(() => {
    if (!search.trim()) {
      setFilteredFarmers(farmers);
      return;
    }

    const q = search.toLowerCase();

    const matched = farmers.filter((f) =>
      getFarmerCrops(f).some((c) =>
        c.cropName
          .toLowerCase()
          .includes(q)
      )
    );

    setFilteredFarmers(matched);
  }, [search, farmers]);

  /*
   * Fetch selected conversation.
   */
  useEffect(() => {
    if (
      !selectedFarmer ||
      !companyId
    ) {
      return;
    }

    const fetchMessages = async () => {
      const token =
        localStorage.getItem(
          "companyToken"
        );

      if (!token) return;

      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${companyId}/${selectedFarmer.farmerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (
          res.data?.success &&
          Array.isArray(res.data.messages)
        ) {
          setMessages(res.data.messages);

          setActiveThread(
            selectedFarmer.farmerId
          );
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error(
          "Error fetching messages",
          err
        );

        setMessages([]);
      }
    };

    fetchMessages();
  }, [
    selectedFarmer,
    companyId,
    setActiveThread,
  ]);

  /*
   * Scroll to newest message whenever:
   * - history loads
   * - a message is received
   * - a message is sent
   * - the selected farmer changes
   */
  useEffect(() => {
    if (
      !selectedFarmer ||
      messages.length === 0
    ) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: "smooth",
            block: "end",
          }
        );
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [
    messages,
    selectedFarmer,
  ]);

  /*
   * Send message.
   */
  const sendMessage = () => {
    if (
      !input.trim() ||
      !selectedFarmer ||
      !companyId
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        "companyToken"
      );

    if (!token) return;

    const socket = getSocket(token);

    const text = input.trim();

    setInput("");

    socket.emit(
      "send_message",
      {
        receiverId:
          selectedFarmer.farmerId,
        receiverType: "farmer",
        text,
      },
      (
        ack: {
          success: boolean;
          error?: string;
        }
      ) => {
        if (!ack?.success) {
          console.error(
            "Message failed to send:",
            ack?.error
          );

          setInput(text);
        }
      }
    );
  };

  /*
   * Select farmer.
   */
  const handleSelectFarmer = (
    farmer: Farmer
  ) => {
    setSelectedFarmer(farmer);
    setActiveThread(farmer.farmerId);
  };

  /*
   * Open order modal.
   */
  const openOrderModal = () => {
    if (!selectedFarmer) return;

    const crops =
      getFarmerCrops(selectedFarmer);

    setOrderCropId(
      crops[0]?.cropId || ""
    );

    setOrderQuantity("");
    setOrderAmount("");
    setOrderGst("");
    setOrderStatus(null);
    setOrderModalOpen(true);
  };

  /*
   * Submit order.
   */
  const submitOrder = async () => {
    if (!selectedFarmer) return;

    const crops =
      getFarmerCrops(selectedFarmer);

    const chosenCrop =
      crops.find(
        (c) =>
          c.cropId === orderCropId
      ) || crops[0];

    if (
      !chosenCrop ||
      !orderQuantity ||
      !orderAmount ||
      !orderGst.trim()
    ) {
      setOrderStatus({
        type: "error",
        text: "Fill in all fields before placing the order.",
      });

      return;
    }

    const token =
      localStorage.getItem(
        "companyToken"
      );

    if (!token) {
      setOrderStatus({
        type: "error",
        text: "Please log in again.",
      });

      return;
    }

    setOrderSubmitting(true);
    setOrderStatus(null);

    try {
      const res = await axios.post(
        "http://localhost:8000/api/orders/create",
        {
          farmerId:
            selectedFarmer.farmerId,

          cropId:
            chosenCrop.cropId,

          cropName:
            chosenCrop.cropName,

          quantity:
            Number(orderQuantity),

          amount:
            Number(orderAmount),

          gstNumber:
            orderGst.trim(),
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setOrderStatus({
          type: "success",
          text: "Order sent to farmer — awaiting payment.",
        });

        setTimeout(() => {
          setOrderModalOpen(false);
        }, 1800);
      } else {
        setOrderStatus({
          type: "error",
          text:
            res.data.error ||
            "Order could not be placed.",
        });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOrderStatus({
          type: "error",
          text:
            err.response?.data?.error ||
            "Order failed.",
        });
      } else {
        setOrderStatus({
          type: "error",
          text:
            "Unexpected error placing order.",
        });
      }

      console.error(err);
    } finally {
      setOrderSubmitting(false);
    }
  };

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
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-3xl border bg-gradient-to-br from-green-50 via-white to-emerald-100 shadow-2xl">

      {/* LEFT PANEL */}

      <div className="flex w-1/4 flex-col border-r bg-white/60 backdrop-blur-lg">

        <div className="border-b p-4">

          <div className="flex items-center rounded-xl border bg-white/80 px-3 py-2 shadow-sm transition focus-within:ring-2 focus-within:ring-green-400">

            <Search
              size={16}
              className="text-gray-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search by crop (e.g. Tulsi)..."
              className="ml-2 w-full bg-transparent text-sm outline-none"
            />

          </div>

        </div>

        <div className="flex-1 overflow-y-auto">

          {filteredFarmers.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-400">
              No farmers found 🌱
            </p>
          )}

          {filteredFarmers.map((f) => {

            const crops =
              getFarmerCrops(f);

            const query =
              search.trim().toLowerCase();

            const matchedCrop =
              (query &&
                crops.find((c) =>
                  c.cropName
                    .toLowerCase()
                    .includes(query)
                )) ||
              crops[0];

            const otherCount =
              crops.length -
              (matchedCrop ? 1 : 0);

            const isExpanded =
              expandedFarmerId ===
              f.farmerId;

            const icon =
              getCropIcon(
                matchedCrop?.cropName || ""
              );

            const unread =
              getUnreadFor(
                f.farmerId
              );

            return (
              <div
                key={f.farmerId}
                className="border-b"
              >

                <div
                  onClick={() =>
                    handleSelectFarmer(f)
                  }
                  className={`
                    flex cursor-pointer
                    items-center gap-3
                    p-4
                    transition-all duration-200
                    ${
                      selectedFarmer?.farmerId ===
                      f.farmerId
                        ? "bg-gradient-to-r from-green-200 to-emerald-100"
                        : "hover:bg-green-50"
                    }
                  `}
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-green-100 text-lg">
                    {icon}
                  </div>

                  <div className="min-w-0 flex-1">

                    <p
                      className={`
                        truncate text-sm
                        ${
                          unread > 0
                            ? "font-bold text-gray-900"
                            : "font-semibold text-gray-800"
                        }
                      `}
                    >
                      {f.name}
                    </p>

                    <p className="truncate text-xs text-gray-500">

                      {matchedCrop?.cropName ||
                        "No crop info"}

                      {otherCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setExpandedFarmerId(
                              isExpanded
                                ? null
                                : f.farmerId
                            );
                          }}
                          className="ml-1 font-medium text-green-600 hover:underline"
                        >
                          +{otherCount}
                        </button>
                      )}

                    </p>

                    {f.address && (
                      <p className="truncate text-[11px] text-gray-400">
                        📍 {f.address}
                      </p>
                    )}

                  </div>

                  {unread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-bold text-white">
                      {unread > 9
                        ? "9+"
                        : unread}
                    </span>
                  )}

                </div>

                {isExpanded && (
                  <div className="space-y-1 pb-3 pl-16 pr-4">

                    {crops.map((c, i) => (
                      <div
                        key={
                          c.cropId ?? i
                        }
                        className="flex items-center gap-2 text-xs text-gray-600"
                      >
                        <span>
                          {getCropIcon(
                            c.cropName
                          )}
                        </span>

                        <span>
                          {c.cropName}
                        </span>

                        {c.season && (
                          <span className="text-gray-400">
                            · {c.season}
                          </span>
                        )}
                      </div>
                    ))}

                  </div>
                )}

              </div>
            );
          })}

        </div>

      </div>

      {/* CHAT PANEL */}

      <div className="flex flex-1 flex-col bg-white/40 backdrop-blur-lg">

        <div className="border-b bg-white/60 p-4 backdrop-blur-md">

          <p className="font-semibold text-gray-800">
            {selectedFarmer?.name ||
              "Select a farmer"}
          </p>

          <p className="text-xs text-gray-500">
            {selectedFarmer?.address || ""}
          </p>

        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">

          {!selectedFarmer && (
            <p className="mt-10 text-center text-gray-400">
              Select a farmer to start chatting 👨‍🌾
            </p>
          )}

          {selectedFarmer &&
            messages.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                No messages yet. Start conversation 👋
              </p>
            )}

          {messages.map((msg, i) => {

            const isMe =
              msg.senderId ===
              companyId;

            return (
              <div
                key={`${msg.createdAt}-${msg.senderId}-${i}`}
                className={`flex ${
                  isMe
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`
                    max-w-xs whitespace-pre-line
                    rounded-2xl px-4 py-2
                    text-sm shadow-md
                    transition
                    ${
                      isMe
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                        : "border bg-white text-gray-800"
                    }
                  `}
                >
                  {msg.text}
                </div>

              </div>
            );
          })}

          <div
            ref={messagesEndRef}
            className="h-px w-full"
            aria-hidden="true"
          />

        </div>

        {selectedFarmer && (
          <div className="flex items-center gap-2 border-t bg-white/70 p-3 backdrop-blur-md">

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Type a message... (try /report)"
              className="flex-1 rounded-xl border bg-white/80 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-3 text-white shadow-md transition hover:scale-105"
            >
              <Send size={16} />
            </button>

          </div>
        )}

      </div>

      {/* RIGHT PANEL */}

      {selectedFarmer && (
        <div className="hidden w-1/4 border-l bg-white/60 p-6 backdrop-blur-lg lg:block">

          <h3 className="mb-4 font-semibold text-gray-800">
            🌾 Farmer Details
          </h3>

          <div className="space-y-3 text-sm">

            <p>
              <span className="text-gray-500">
                Name:
              </span>{" "}
              <span className="font-medium">
                {selectedFarmer.name}
              </span>
            </p>

            <p>
              <span className="text-gray-500">
                Location:
              </span>{" "}
              {selectedFarmer.address ||
                "—"}
            </p>

            <div className="space-y-1">

              <span className="text-gray-500">
                Crops:
              </span>

              <div className="mt-1 flex flex-wrap gap-1">

                {getFarmerCrops(
                  selectedFarmer
                ).map((c, i) => (
                  <span
                    key={
                      c.cropId ?? i
                    }
                    className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs"
                  >
                    {getCropIcon(
                      c.cropName
                    )}{" "}
                    {c.cropName}
                  </span>
                ))}

                {getFarmerCrops(
                  selectedFarmer
                ).length === 0 && (
                  <span className="text-xs text-gray-400">
                    —
                  </span>
                )}

              </div>

            </div>

            <p className="truncate">

              <span className="text-gray-500">
                Wallet:
              </span>{" "}

              {selectedFarmer.walletAddress ||
                "—"}

            </p>

          </div>

          <button
            onClick={openOrderModal}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-2 text-white shadow-md transition hover:scale-[1.02]"
          >
            Place Order 🚜
          </button>

        </div>
      )}

      {/* ORDER MODAL */}

      {orderModalOpen &&
        selectedFarmer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">

            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">

              <button
                onClick={() =>
                  setOrderModalOpen(false)
                }
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>

              <h3 className="mb-1 text-lg font-bold text-gray-800">
                Place Order
              </h3>

              <p className="mb-4 text-xs text-gray-500">
                with {selectedFarmer.name}
              </p>

              <div className="space-y-3">

                <div>

                  <label className="mb-1 block text-xs text-gray-500">
                    Crop
                  </label>

                  <select
                    value={orderCropId}
                    onChange={(e) =>
                      setOrderCropId(
                        e.target.value
                      )
                    }
                    className="w-full rounded border p-2 text-sm"
                  >

                    {getFarmerCrops(
                      selectedFarmer
                    ).map((c, i) => (
                      <option
                        key={
                          c.cropId ?? i
                        }
                        value={
                          c.cropId
                        }
                      >
                        {getCropIcon(
                          c.cropName
                        )}{" "}
                        {c.cropName}
                      </option>
                    ))}

                  </select>

                </div>

                <div>

                  <label className="mb-1 block text-xs text-gray-500">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={orderQuantity}
                    onChange={(e) =>
                      setOrderQuantity(
                        e.target.value
                      )
                    }
                    className="w-full rounded border p-2 text-sm"
                    placeholder="e.g. 50"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-xs text-gray-500">
                    Amount (₹)
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={orderAmount}
                    onChange={(e) =>
                      setOrderAmount(
                        e.target.value
                      )
                    }
                    className="w-full rounded border p-2 text-sm"
                    placeholder="e.g. 5000"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-xs text-gray-500">
                    Company GSTIN
                  </label>

                  <input
                    type="text"
                    value={orderGst}
                    onChange={(e) =>
                      setOrderGst(
                        e.target.value.toUpperCase()
                      )
                    }
                    className="w-full rounded border p-2 text-sm"
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />

                </div>

                {orderStatus && (
                  <p
                    className={`text-xs ${
                      orderStatus.type ===
                      "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {orderStatus.text}
                  </p>
                )}

                <button
                  onClick={submitOrder}
                  disabled={orderSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {orderSubmitting
                    ? "Placing order..."
                    : "Confirm Order"}
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}