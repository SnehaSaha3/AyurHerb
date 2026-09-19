import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  Package,
  Search,
  Send,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
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

interface MarketOpportunity {
  status: string;
  score: number | null;
  label: string;
  differenceFromModalPercent: number | null;
}

interface MarketPreview {
  cropName: string;
  unit: string;
  market: {
    min?: number;
    max?: number;
    modal?: number;
    average?: number;
  };
  opportunity: MarketOpportunity;
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

function getFarmerCrops(farmer: Farmer): CropEntry[] {
  if (farmer.crops && farmer.crops.length > 0) {
    return farmer.crops;
  }

  if (farmer.herb) {
    return [{ cropName: farmer.herb }];
  }

  return [];
}

const OPPORTUNITY_LABELS: Record<
  string,
  { text: string; className: string }
> = {
  STRONG: {
    text: "Strong opportunity",
    className: "bg-emerald-100 text-emerald-700",
  },
  GOOD: {
    text: "Good opportunity",
    className: "bg-green-100 text-green-700",
  },
  FAIR: {
    text: "Fair opportunity",
    className: "bg-yellow-100 text-yellow-700",
  },
  LOW: {
    text: "Below market range",
    className: "bg-red-100 text-red-700",
  },
  REFERENCE: {
    text: "Market reference",
    className: "bg-blue-100 text-blue-700",
  },
  UNAVAILABLE: {
    text: "No market data",
    className: "bg-gray-100 text-gray-500",
  },
};

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

  const [orderCompanyOfferPrice, setOrderCompanyOfferPrice] =
    useState("");

  const [marketPreview, setMarketPreview] =
    useState<MarketPreview | null>(null);

  const [marketLoading, setMarketLoading] =
    useState(false);

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
          (message) =>
            message.createdAt === msg.createdAt &&
            message.senderId === msg.senderId &&
            message.text === msg.text
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
          "https://ayurherb-backend-7yw4.onrender.com/api/farmers"
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
      (farmer) =>
        farmer.farmerId === farmerIdFromUrl
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

    const query =
      search.trim().toLowerCase();

    const matched = farmers.filter(
      (farmer) =>
        getFarmerCrops(farmer).some(
          (crop) =>
            crop.cropName
              .toLowerCase()
              .includes(query)
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
          `https://ayurherb-backend-7yw4.onrender.com/api/messages/chat/${companyId}/${selectedFarmer.farmerId}`,
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
   * Scroll to newest message.
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
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [
    messages,
    selectedFarmer,
  ]);

  /*
   * Live market preview — refetches whenever the selected crop
   * or the optional company offer changes. The agent decides
   * whether an offer actually gets used at order-creation time;
   * this call is preview-only and never creates anything.
   */
  useEffect(() => {
    if (
      !orderModalOpen ||
      !selectedFarmer ||
      !orderCropId
    ) {
      setMarketPreview(null);
      return;
    }

    const crop = getFarmerCrops(
      selectedFarmer
    ).find(
      (c) => c.cropId === orderCropId
    );

    if (!crop) {
      setMarketPreview(null);
      return;
    }

    const token =
      localStorage.getItem(
        "companyToken"
      );

    if (!token) return;

    const offer = orderCompanyOfferPrice.trim()
      ? Number(orderCompanyOfferPrice)
      : null;

    let cancelled = false;
    setMarketLoading(true);

    const timer = setTimeout(() => {
      axios
        .post(
          "https://ayurherb-backend-7yw4.onrender.com/api/orders/market-preview",
          {
            cropName: crop.cropName,
            companyOfferPrice: offer,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((res) => {
          if (cancelled) return;

          if (res.data.success) {
            setMarketPreview(res.data.data);
          } else {
            setMarketPreview(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMarketPreview(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setMarketLoading(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    orderModalOpen,
    orderCropId,
    orderCompanyOfferPrice,
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
    setOrderCompanyOfferPrice("");
    setMarketPreview(null);
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
        (crop) =>
          crop.cropId === orderCropId
      ) || crops[0];

    if (
      !chosenCrop ||
      !orderQuantity ||
      !orderGst.trim()
    ) {
      setOrderStatus({
        type: "error",
        text: "Fill in all fields before placing the order.",
      });

      return;
    }

    const opportunityStatus =
      marketPreview?.opportunity.status;

    const needsManualPrice =
      opportunityStatus === "UNAVAILABLE";

    if (
      needsManualPrice &&
      !orderCompanyOfferPrice.trim()
    ) {
      setOrderStatus({
        type: "error",
        text: "No market reference is available for this crop — enter a price to continue.",
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
        "https://ayurherb-backend-7yw4.onrender.com/api/orders/create",
        {
          farmerId:
            selectedFarmer.farmerId,

          cropId:
            chosenCrop.cropId,

          cropName:
            chosenCrop.cropName,

          quantity:
            Number(orderQuantity),

          companyOfferPrice:
            orderCompanyOfferPrice.trim()
              ? Number(
                  orderCompanyOfferPrice
                )
              : null,

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
      <div className="flex min-h-[calc(100dvh-80px)] items-center justify-center px-4">
        <div className="rounded-2xl border border-[#e4ebe1] bg-white/80 px-6 py-5 text-center shadow-sm backdrop-blur-md">
          <p className="text-sm text-[#718071]">
            Please log in as a company to view messages.
          </p>
        </div>
      </div>
    );
  }

  const opportunityStatus =
    marketPreview?.opportunity.status;

  const selectedCrop =
    selectedFarmer &&
    getFarmerCrops(selectedFarmer).find(
      (c) => c.cropId === orderCropId
    );

  const availableStock =
    selectedCrop?.quantity;

  const isClearanceEligible =
    availableStock !== undefined &&
    availableStock > 0 &&
    Number(orderQuantity || 0) >=
      availableStock;

  /*
   * A manual offer only actually gets used when the agent
   * reports UNAVAILABLE, or LOW *and* the order clears the
   * farmer's full remaining stock. This mirrors the backend
   * rule in /api/orders/create — it's preview-only, the
   * backend re-checks it authoritatively.
   */
  const manualPriceApplies =
    opportunityStatus === "UNAVAILABLE" ||
    (opportunityStatus === "LOW" &&
      isClearanceEligible);

  const effectiveUnitPrice =
    manualPriceApplies &&
    orderCompanyOfferPrice.trim()
      ? Number(orderCompanyOfferPrice)
      : marketPreview?.market.modal;

  const estimatedTotal =
    effectiveUnitPrice &&
    orderQuantity &&
    Number(orderQuantity) > 0
      ? effectiveUnitPrice *
        Number(orderQuantity)
      : null;

  return (
    <div
      className="
        flex
        h-[calc(100dvh-100px)]
        min-h-[560px]
        w-full
        min-w-0
        overflow-hidden
        rounded-[26px]
        border
        border-white/80
        bg-white/[0.90]
        shadow-[0_18px_55px_rgba(31,69,39,0.08)]
        backdrop-blur-md
      "
    >
      {/* =========================================================
          LEFT — FARMERS
          ========================================================= */}
      <aside
        className="
          flex
          w-[280px]
          min-w-[240px]
          max-w-[32%]
          shrink-0
          flex-col
          border-r
          border-[#e5ece3]
          bg-white/55
        "
      >
        {/* HEADER */}
        <div className="shrink-0 border-b border-[#e8eee6] p-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa897]">
                Conversations
              </p>

              <h2 className="mt-1 truncate text-sm font-semibold text-[#193522]">
                Farmers
              </h2>
            </div>

            <span className="rounded-full bg-[#edf6eb] px-2.5 py-1 text-[10px] font-semibold text-[#4c8355]">
              {farmers.length}
            </span>
          </div>

          {/* SEARCH */}
          <div
            className="
              mt-4
              flex
              h-10
              items-center
              rounded-xl
              border
              border-[#dfe8dc]
              bg-white/80
              px-3
              transition
              focus-within:border-[#a9c7aa]
              focus-within:ring-2
              focus-within:ring-[#dcebd9]
            "
          >
            <Search
              size={15}
              className="shrink-0 text-[#8c9a8c]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search crops..."
              className="
                ml-2
                min-w-0
                flex-1
                bg-transparent
                text-xs
                text-[#314b36]
                outline-none
                placeholder:text-[#a1aaa0]
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[#9aa897] hover:text-[#526453]"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* FARMER LIST */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredFarmers.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f7ef] text-lg">
                🌱
              </div>

              <p className="mt-3 text-xs font-medium text-[#667467]">
                No farmers found
              </p>

              <p className="mt-1 text-[10px] text-[#9aa897]">
                Try another crop name.
              </p>
            </div>
          )}

          {filteredFarmers.map((farmer) => {
            const crops =
              getFarmerCrops(farmer);

            const query =
              search.trim().toLowerCase();

            const matchedCrop =
              (query &&
                crops.find((crop) =>
                  crop.cropName
                    .toLowerCase()
                    .includes(query)
                )) ||
              crops[0];

            const otherCount =
              crops.length -
              (matchedCrop ? 1 : 0);

            const isExpanded =
              expandedFarmerId ===
              farmer.farmerId;

            const icon =
              getCropIcon(
                matchedCrop?.cropName || ""
              );

            const unread =
              getUnreadFor(
                farmer.farmerId
              );

            const selected =
              selectedFarmer?.farmerId ===
              farmer.farmerId;

            return (
              <div
                key={farmer.farmerId}
                className="border-b border-[#edf1eb]"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleSelectFarmer(farmer)
                  }
                  className={`
                    flex
                    w-full
                    items-center
                    gap-3
                    px-4
                    py-3.5
                    text-left
                    transition
                    ${
                      selected
                        ? "bg-[#edf6eb]"
                        : "hover:bg-white/70"
                    }
                  `}
                >
                  {/* CROP ICON */}
                  <div
                    className={`
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      text-lg
                      ${
                        selected
                          ? "border-[#cde3ca] bg-white"
                          : "border-[#e2ebe0] bg-[#f5f9f3]"
                      }
                    `}
                  >
                    {icon}
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`
                          min-w-0
                          flex-1
                          truncate
                          text-sm
                          ${
                            unread > 0
                              ? "font-bold text-[#193522]"
                              : "font-semibold text-[#314b36]"
                          }
                        `}
                      >
                        {farmer.name}
                      </p>

                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#2f8a49] px-1.5 text-[9px] font-bold text-white">
                          {unread > 9
                            ? "9+"
                            : unread}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-[#829083]">
                      <span className="truncate">
                        {matchedCrop?.cropName ||
                          "No crop info"}
                      </span>

                      {otherCount > 0 && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            setExpandedFarmerId(
                              isExpanded
                                ? null
                                : farmer.farmerId
                            );
                          }}
                          className="shrink-0 font-semibold text-[#3e8650] hover:underline"
                        >
                          +{otherCount}
                        </button>
                      )}
                    </div>

                    {farmer.address && (
                      <div className="mt-1 flex min-w-0 items-center gap-1 text-[9px] text-[#a0aaa0]">
                        <MapPin
                          size={10}
                          className="shrink-0"
                        />

                        <span className="truncate">
                          {farmer.address}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* EXPANDED CROPS */}
                {isExpanded && (
                  <div className="space-y-2 bg-[#fafcf9] px-4 pb-3 pl-[68px]">
                    {crops.map(
                      (crop, index) => (
                        <div
                          key={
                            crop.cropId ??
                            index
                          }
                          className="flex items-center gap-2 text-[10px] text-[#667467]"
                        >
                          <span>
                            {getCropIcon(
                              crop.cropName
                            )}
                          </span>

                          <span className="truncate">
                            {crop.cropName}
                          </span>

                          {crop.season && (
                            <span className="shrink-0 text-[#a1aaa0]">
                              · {crop.season}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* =========================================================
          CENTER — CHAT
          ========================================================= */}
      <main
        className="
          flex
          min-w-0
          flex-1
          flex-col
          bg-white/35
        "
      >
        {/* CHAT HEADER */}
        <header
          className="
            flex
            min-h-[70px]
            shrink-0
            items-center
            justify-between
            gap-3
            border-b
            border-[#e5ece3]
            bg-white/60
            px-4
            py-3
            backdrop-blur-md
            sm:px-5
          "
        >
          {selectedFarmer ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf6eb] text-lg">
                {getCropIcon(
                  getFarmerCrops(
                    selectedFarmer
                  )[0]?.cropName || ""
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#193522]">
                  {selectedFarmer.name}
                </p>

                {selectedFarmer.address ? (
                  <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-[#8a9889]">
                    <MapPin
                      size={10}
                      className="shrink-0"
                    />

                    <span className="truncate">
                      {selectedFarmer.address}
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#9aa897]">
                    Farmer
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#193522]">
                Messages
              </p>

              <p className="mt-0.5 text-[10px] text-[#8a9889]">
                Select a farmer to start a conversation
              </p>
            </div>
          )}

          {selectedFarmer && (
            <div className="hidden shrink-0 items-center gap-2 rounded-full bg-[#f1f7ef] px-3 py-1.5 text-[10px] font-medium text-[#59805e] md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4c9a59]" />
              Conversation active
            </div>
          )}
        </header>

        {/* MESSAGES */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-4
            py-5
            sm:px-6
          "
        >
          {!selectedFarmer && (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f7ef] text-[#5a8c62]">
                  <Send
                    size={22}
                    strokeWidth={1.6}
                  />
                </div>

                <p className="mt-4 text-sm font-semibold text-[#526453]">
                  Start a conversation
                </p>

                <p className="mt-1 text-xs leading-5 text-[#929e91]">
                  Choose a farmer from the left to discuss
                  crops, availability or an order.
                </p>
              </div>
            </div>
          )}

          {selectedFarmer &&
            messages.length === 0 && (
              <div className="flex h-full min-h-[260px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f8f2] text-xl">
                    👋
                  </div>

                  <p className="mt-3 text-sm font-medium text-[#667467]">
                    No messages yet
                  </p>

                  <p className="mt-1 text-[11px] text-[#9aa897]">
                    Send the first message to
                    {selectedFarmer.name}.
                  </p>
                </div>
              </div>
            )}

          {messages.length > 0 && (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {messages.map(
                (message, index) => {
                  const isMe =
                    message.senderId ===
                    companyId;

                  return (
                    <div
                      key={`${message.createdAt}-${message.senderId}-${index}`}
                      className={`flex ${
                        isMe
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`
                          max-w-[78%]
                          whitespace-pre-line
                          rounded-2xl
                          px-4
                          py-2.5
                          text-sm
                          leading-5
                          ${
                            isMe
                              ? "rounded-br-md bg-[#28733d] text-white shadow-[0_5px_15px_rgba(40,115,61,0.12)]"
                              : "rounded-bl-md border border-[#e5ebe3] bg-white text-[#344637] shadow-sm"
                          }
                        `}
                      >
                        {message.text}

                        <p
                          className={`
                            mt-1
                            text-[8px]
                            ${
                              isMe
                                ? "text-white/60"
                                : "text-[#a1aaa0]"
                            }
                          `}
                        >
                          {new Date(
                            message.createdAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}

              <div
                ref={messagesEndRef}
                className="h-px w-full"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* COMPOSER */}
        {selectedFarmer && (
          <div
            className="
              shrink-0
              border-t
              border-[#e5ece3]
              bg-white/65
              p-3
              backdrop-blur-md
              sm:p-4
            "
          >
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="Type a message..."
                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-[#dfe8dc]
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  text-[#314b36]
                  outline-none
                  transition
                  placeholder:text-[#a1aaa0]
                  focus:border-[#a9c7aa]
                  focus:ring-2
                  focus:ring-[#dcebd9]
                "
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim()}
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#28733d]
                  text-white
                  shadow-[0_6px_18px_rgba(40,115,61,0.15)]
                  transition
                  hover:bg-[#216534]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
          RIGHT — FARMER DETAILS
          ========================================================= */}
      {selectedFarmer && (
        <aside
          className="
            hidden
            w-[260px]
            min-w-[230px]
            max-w-[28%]
            shrink-0
            flex-col
            border-l
            border-[#e5ece3]
            bg-white/50
            lg:flex
          "
        >
          {/* DETAILS HEADER */}
          <div className="shrink-0 border-b border-[#e8eee6] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6eb] text-[#4d8957]">
                <UserRound
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9aa897]">
                  Farmer
                </p>

                <h3 className="mt-1 truncate text-sm font-semibold text-[#193522]">
                  {selectedFarmer.name}
                </h3>
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              {/* LOCATION */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aa897]">
                  Location
                </p>

                <div className="mt-2 flex items-start gap-2">
                  <MapPin
                    size={14}
                    className="mt-0.5 shrink-0 text-[#6c9272]"
                  />

                  <p className="text-xs leading-5 text-[#526453]">
                    {selectedFarmer.address ||
                      "Location not available"}
                  </p>
                </div>
              </div>

              {/* CROPS */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aa897]">
                  Registered crops
                </p>

                <div className="mt-3 divide-y divide-[#edf1eb] border-y border-[#edf1eb]">
                  {getFarmerCrops(
                    selectedFarmer
                  ).map(
                    (crop, index) => (
                      <div
                        key={
                          crop.cropId ??
                          index
                        }
                        className="flex items-center gap-3 py-3"
                      >
                        <span className="text-base">
                          {getCropIcon(
                            crop.cropName
                          )}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#344637]">
                            {crop.cropName}
                          </p>

                          {crop.season && (
                            <p className="mt-0.5 text-[9px] text-[#929e91]">
                              {crop.season}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {getFarmerCrops(
                    selectedFarmer
                  ).length === 0 && (
                    <p className="py-3 text-xs text-[#9aa897]">
                      No crop information
                    </p>
                  )}
                </div>
              </div>

              {/* WALLET */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aa897]">
                  Wallet
                </p>

                <p className="mt-2 break-all rounded-xl bg-[#f7faf6] px-3 py-2.5 text-[10px] leading-4 text-[#667467]">
                  {selectedFarmer.walletAddress ||
                    "Wallet not available"}
                </p>
              </div>
            </div>
          </div>

          {/* ORDER */}
          <div className="shrink-0 border-t border-[#e5ece3] p-4">
            <button
              type="button"
              onClick={openOrderModal}
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#28733d]
                py-2.5
                text-xs
                font-semibold
                text-white
                shadow-[0_7px_18px_rgba(40,115,61,0.14)]
                transition
                hover:bg-[#216534]
              "
            >
              <ShoppingCart size={14} />
              Place order
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================
          ORDER MODAL
          ========================================================= */}
      {orderModalOpen &&
        selectedFarmer && (
          <div
            className="
              fixed
              inset-0
              z-[1000]
              flex
              items-center
              justify-center
              bg-black/35
              p-4
              backdrop-blur-[3px]
            "
          >
            <div
              className="
                relative
                max-h-[90dvh]
                w-full
                max-w-md
                overflow-y-auto
                rounded-2xl
                border
                border-white
                bg-white
                p-6
                shadow-[0_25px_80px_rgba(0,0,0,0.18)]
              "
            >
              {/* CLOSE */}
              <button
                type="button"
                onClick={() =>
                  setOrderModalOpen(false)
                }
                className="
                  absolute
                  right-4
                  top-4
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-[#9aa897]
                  transition
                  hover:bg-[#f3f7f2]
                  hover:text-[#526453]
                "
                aria-label="Close order modal"
              >
                <X size={17} />
              </button>

              {/* MODAL HEADER */}
              <div className="pr-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6eb] text-[#4d8957]">
                    <Package
                      size={18}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[#193522]">
                      Place order
                    </h3>

                    <p className="mt-0.5 text-[10px] text-[#8a9889]">
                      With {selectedFarmer.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* FORM */}
              <div className="mt-6 space-y-4">
                {/* CROP */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#829083]">
                    Crop
                  </label>

                  <select
                    value={orderCropId}
                    onChange={(event) =>
                      setOrderCropId(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dfe8dc]
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      text-[#314b36]
                      outline-none
                      focus:border-[#a9c7aa]
                      focus:ring-2
                      focus:ring-[#dcebd9]
                    "
                  >
                    {getFarmerCrops(
                      selectedFarmer
                    ).map(
                      (crop, index) => (
                        <option
                          key={
                            crop.cropId ??
                            index
                          }
                          value={
                            crop.cropId || ""
                          }
                        >
                          {getCropIcon(
                            crop.cropName
                          )}{" "}
                          {crop.cropName}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* QUANTITY */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#829083]">
                    Quantity
                    {availableStock !==
                      undefined && (
                      <span className="ml-1 normal-case text-[9px] font-normal text-[#a1aaa0]">
                        ({availableStock} kg
                        available)
                      </span>
                    )}
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={orderQuantity}
                    onChange={(event) =>
                      setOrderQuantity(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dfe8dc]
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      text-[#314b36]
                      outline-none
                      focus:border-[#a9c7aa]
                      focus:ring-2
                      focus:ring-[#dcebd9]
                    "
                    placeholder="e.g. 50"
                  />
                </div>

                {/* MARKET PRICE REFERENCE */}
                <div className="rounded-xl border border-[#dfe8dc] bg-[#f7faf6] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#829083]">
                      Market price
                    </span>

                    {marketPreview?.opportunity && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          OPPORTUNITY_LABELS[
                            marketPreview
                              .opportunity
                              .status
                          ]?.className ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {OPPORTUNITY_LABELS[
                          marketPreview
                            .opportunity
                            .status
                        ]?.text ||
                          marketPreview
                            .opportunity
                            .label}
                      </span>
                    )}
                  </div>

                  {marketLoading && (
                    <p className="mt-2 text-xs text-[#8a9889]">
                      Checking market reference...
                    </p>
                  )}

                  {!marketLoading &&
                    marketPreview &&
                    marketPreview.market
                      .modal !== undefined && (
                      <p className="mt-2 text-sm font-semibold text-[#193522]">
                        ₹
                        {
                          marketPreview
                            .market.modal
                        }
                        /kg{" "}
                        <span className="text-xs font-normal text-[#8a9889]">
                          agent-set price
                        </span>
                      </p>
                    )}

                  {!marketLoading &&
                    marketPreview &&
                    marketPreview.market
                      .modal === undefined && (
                      <p className="mt-2 text-xs text-[#b44f45]">
                        No market reference for
                        this crop — enter a
                        price below.
                      </p>
                    )}

                  {!marketLoading &&
                    !marketPreview && (
                      <p className="mt-2 text-xs text-[#8a9889]">
                        Select a crop to see
                        the market reference.
                      </p>
                    )}

                  {estimatedTotal !== null && (
                    <p className="mt-1.5 text-xs text-[#526453]">
                      Estimated total: ₹
                      {estimatedTotal.toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  )}
                </div>

                {/* MANUAL OFFER — only takes effect when the
                    agent reports UNAVAILABLE, or LOW *and* the
                    order clears the farmer's full remaining stock */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#829083]">
                    Your offer{" "}
                    {opportunityStatus ===
                    "UNAVAILABLE"
                      ? "(required — no market data)"
                      : "(optional)"}
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8a9889]">
                      ₹
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={
                        orderCompanyOfferPrice
                      }
                      onChange={(event) =>
                        setOrderCompanyOfferPrice(
                          event.target.value
                        )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-[#dfe8dc]
                        bg-white
                        py-2.5
                        pl-7
                        pr-3
                        text-sm
                        text-[#314b36]
                        outline-none
                        focus:border-[#a9c7aa]
                        focus:ring-2
                        focus:ring-[#dcebd9]
                      "
                      placeholder="per kg"
                    />
                  </div>

                  {orderCompanyOfferPrice.trim() &&
                    opportunityStatus ===
                      "LOW" && (
                      <p className="mt-1.5 text-[10px] text-[#8a9889]">
                        {isClearanceEligible
                          ? "Clearance order — this offer will be used."
                          : `Below-market offers are only accepted when ordering the farmer's full remaining stock${
                              availableStock !==
                              undefined
                                ? ` (${availableStock} kg)`
                                : ""
                            }. Otherwise the market price${
                              marketPreview
                                ?.market.modal !==
                              undefined
                                ? ` (₹${marketPreview.market.modal}/kg)`
                                : ""
                            } will be charged.`}
                      </p>
                    )}

                  {orderCompanyOfferPrice.trim() &&
                    opportunityStatus &&
                    opportunityStatus !==
                      "LOW" &&
                    opportunityStatus !==
                      "UNAVAILABLE" && (
                      <p className="mt-1.5 text-[10px] text-[#8a9889]">
                        This offer won't be
                        used — the agent's
                        market price will be
                        charged instead.
                      </p>
                    )}
                </div>

                {/* GST */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#829083]">
                    Company GSTIN
                  </label>

                  <input
                    type="text"
                    value={orderGst}
                    onChange={(event) =>
                      setOrderGst(
                        event.target.value.toUpperCase()
                      )
                    }
                    maxLength={15}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[#dfe8dc]
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      uppercase
                      text-[#314b36]
                      outline-none
                      focus:border-[#a9c7aa]
                      focus:ring-2
                      focus:ring-[#dcebd9]
                    "
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                {/* STATUS */}
                {orderStatus && (
                  <div
                    className={`
                      rounded-xl
                      px-3
                      py-2.5
                      text-xs
                      ${
                        orderStatus.type ===
                        "success"
                          ? "bg-[#edf7ee] text-[#347544]"
                          : "bg-[#fff2f0] text-[#b44f45]"
                      }
                    `}
                  >
                    {orderStatus.text}
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={
                    orderSubmitting
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#28733d]
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_8px_20px_rgba(40,115,61,0.15)]
                    transition
                    hover:bg-[#216534]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <ShoppingCart size={15} />

                  {orderSubmitting
                    ? "Placing order..."
                    : "Confirm order"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}