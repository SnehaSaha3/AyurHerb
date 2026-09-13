import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  Search,
  Send,
  Sprout,
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

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FarmerMessages() {
  const [searchParams] = useSearchParams();

  const {
    unreadCounts,
    setActiveThread,
  } = useUnread();

  const [farmerId, setFarmerId] =
    useState<string | null>(null);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [search, setSearch] =
    useState("");

  const [filterMode, setFilterMode] =
    useState<"all" | "unread">("all");

  const [lastActivity, setLastActivity] =
    useState<Record<string, string>>({});

  const [lastPreview, setLastPreview] =
    useState<Record<string, string>>({});

  /*
   * Mobile:
   * false = company list
   * true = conversation
   */
  const [mobileChatOpen, setMobileChatOpen] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const getUnreadFor = (id: string): number =>
    unreadCounts?.[id] ?? 0;

  /* =====================================================
     FETCH INBOX
     ===================================================== */

  const fetchInbox = async (token: string) => {
    try {
      const res = await axios.get(
        "http://localhost:8000/api/messages/inbox",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        res.data?.success &&
        Array.isArray(res.data.conversations)
      ) {
        const activity: Record<string, string> =
          {};

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

  /* =====================================================
     FARMER IDENTITY + SOCKET
     ===================================================== */

  useEffect(() => {
    const token =
      localStorage.getItem("farmerToken");

    if (!token) return;

    const payload =
      decodeJwtPayload<{ farmerId: string }>(
        token
      );

    if (!payload?.farmerId) return;

    setFarmerId(payload.farmerId);

    fetchInbox(token);

    const socket = getSocket(token);

    socket.on(
      "receive_message",
      (msg: Message) => {
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m.createdAt === msg.createdAt &&
              m.senderId === msg.senderId &&
              m.text === msg.text
          );

          if (exists) return prev;

          return [...prev, msg];
        });

        const otherId =
          msg.senderId === payload.farmerId
            ? msg.receiverId
            : msg.senderId;

        setLastActivity((prev) => ({
          ...prev,
          [otherId]: msg.createdAt,
        }));

        setLastPreview((prev) => ({
          ...prev,
          [otherId]: msg.text,
        }));
      }
    );

    return () => {
      socket.off("receive_message");
    };
  }, []);

  /* =====================================================
     CLEAR ACTIVE THREAD WHEN LEAVING PAGE
     ===================================================== */

  useEffect(() => {
    return () => setActiveThread(null);
  }, []);

  /* =====================================================
     FETCH COMPANIES
     ===================================================== */

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/companies"
        );

        if (
          res.data?.success &&
          Array.isArray(res.data.companies)
        ) {
          setCompanies(res.data.companies);
        } else {
          setCompanies([]);
        }
      } catch (err) {
        console.error(
          "Error fetching companies",
          err
        );

        setCompanies([]);
      }
    };

    fetchCompanies();
  }, []);

  /* =====================================================
     AUTO SELECT FROM URL
     ===================================================== */

  useEffect(() => {
    const companyIdFromUrl =
      searchParams.get("companyId");

    if (
      !companyIdFromUrl ||
      companies.length === 0
    ) {
      return;
    }

    const match = companies.find(
      (c) =>
        c.companyId === companyIdFromUrl
    );

    if (match) {
      setSelectedCompany(match);
      setMobileChatOpen(true);
      setActiveThread(match.companyId);
    }
  }, [searchParams, companies]);

  /* =====================================================
     SEARCH + FILTER + SORT
     ===================================================== */

  const visibleCompanies = useMemo(() => {
    let list = companies.filter((c) =>
      c.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );

    if (filterMode === "unread") {
      list = list.filter(
        (c) =>
          getUnreadFor(c.companyId) > 0
      );
    }

    return [...list].sort((a, b) => {
      const aTime =
        lastActivity[a.companyId];

      const bTime =
        lastActivity[b.companyId];

      if (aTime && bTime) {
        return (
          new Date(bTime).getTime() -
          new Date(aTime).getTime()
        );
      }

      if (aTime && !bTime) return -1;

      if (!aTime && bTime) return 1;

      return 0;
    });
  }, [
    companies,
    search,
    filterMode,
    unreadCounts,
    lastActivity,
  ]);

  const totalUnread = Object.values(
    unreadCounts
  ).reduce((sum, n) => sum + n, 0);

  /* =====================================================
     SELECT COMPANY
     ===================================================== */

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);

    setActiveThread(company.companyId);

    setMobileChatOpen(true);
  };

  /* =====================================================
     FETCH CHAT HISTORY
     ===================================================== */

  useEffect(() => {
    if (!selectedCompany || !farmerId) return;

    const fetchMessages = async () => {
      const token =
        localStorage.getItem("farmerToken");

      if (!token) return;

      try {
        const res = await axios.get(
          `http://localhost:8000/api/messages/chat/${selectedCompany.companyId}/${farmerId}`,
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
  }, [selectedCompany, farmerId]);

  /* =====================================================
     AUTO SCROLL
     ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* =====================================================
     SEND MESSAGE
     ===================================================== */

  const sendMessage = () => {
    if (
      !input.trim() ||
      !selectedCompany ||
      !farmerId
    ) {
      return;
    }

    const token =
      localStorage.getItem("farmerToken");

    if (!token) return;

    const socket = getSocket(token);

    const text = input.trim();

    setInput("");

    socket.emit(
      "send_message",
      {
        receiverId:
          selectedCompany.companyId,
        receiverType: "company",
        text,
      },
      (ack: {
        success: boolean;
        error?: string;
      }) => {
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

  /* =====================================================
     NOT LOGGED IN
     ===================================================== */

  if (!farmerId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
          <Sprout
            className="mx-auto mb-3 text-emerald-500"
            size={30}
          />

          <p className="text-sm text-gray-600">
            Please log in as a farmer to view
            messages.
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN UI
     ===================================================== */

  return (
  <div className="w-full min-w-0 px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
    {/* =====================================================
        CHAT WORKSPACE
        ===================================================== */}
    <div className="mx-auto flex w-full max-w-7xl justify-center">
      <div
        className="
          flex
          h-[calc(100dvh-150px)]
          min-h-[560px]
          max-h-[780px]
          w-full
          min-w-0
          overflow-hidden
          rounded-[22px]
          border
          border-emerald-100
          bg-[#f6faf7]
          shadow-[0_18px_55px_rgba(20,83,45,0.10)]
          sm:rounded-[26px]
        "
      >
        {/* =================================================
            COMPANY SIDEBAR
            ================================================= */}
        <aside
          className={`
            flex
            w-full
            min-w-0
            flex-col
            bg-white

            lg:w-[310px]
            lg:min-w-[290px]
            lg:border-r
            lg:border-emerald-100

            xl:w-[340px]

            ${
              mobileChatOpen
                ? "hidden lg:flex"
                : "flex"
            }
          `}
        >
          {/* -------------------------------------------------
              SIDEBAR HEADER
              ------------------------------------------------- */}
          <div className="shrink-0 border-b border-gray-100 px-4 pb-4 pt-5 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-emerald-50
                    ring-1
                    ring-emerald-100
                  "
                >
                  <Sprout
                    size={18}
                    className="text-emerald-600"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                    AyurHerb
                  </p>

                  <h1 className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-gray-900">
                    Messages
                  </h1>
                </div>
              </div>

              {totalUnread > 0 && (
                <span
                  className="
                    shrink-0
                    rounded-full
                    bg-emerald-50
                    px-2.5
                    py-1
                    text-[10px]
                    font-semibold
                    text-emerald-700
                  "
                >
                  {totalUnread} unread
                </span>
              )}
            </div>

            {/* -------------------------------------------------
                SEARCH
                ------------------------------------------------- */}
            <div
              className="
                mt-5
                flex
                h-10
                items-center
                rounded-xl
                border
                border-gray-200
                bg-gray-50
                px-3
                transition
                focus-within:border-emerald-300
                focus-within:bg-white
                focus-within:ring-2
                focus-within:ring-emerald-100
              "
            >
              <Search
                size={15}
                className="shrink-0 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search companies..."
                className="
                  ml-2
                  w-full
                  min-w-0
                  bg-transparent
                  text-xs
                  text-gray-800
                  outline-none
                  placeholder:text-gray-400
                "
              />
            </div>

            {/* -------------------------------------------------
                FILTERS
                ------------------------------------------------- */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilterMode("all")
                }
                className={`
                  rounded-lg
                  px-3
                  py-1.5
                  text-[11px]
                  font-semibold
                  transition
                  ${
                    filterMode === "all"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                      : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                All
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilterMode("unread")
                }
                className={`
                  rounded-lg
                  px-3
                  py-1.5
                  text-[11px]
                  font-semibold
                  transition
                  ${
                    filterMode === "unread"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                      : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                Unread
                {totalUnread > 0
                  ? ` (${totalUnread})`
                  : ""}
              </button>
            </div>
          </div>

          {/* =================================================
              COMPANY LIST
              ================================================= */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleCompanies.length === 0 && (
              <div className="flex h-full items-center justify-center px-6">
                <div className="text-center">
                  <div
                    className="
                      mx-auto
                      mb-3
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-gray-50
                      ring-1
                      ring-gray-100
                    "
                  >
                    <Building2
                      size={20}
                      className="text-gray-300"
                    />
                  </div>

                  <p className="text-sm font-semibold text-gray-500">
                    {filterMode === "unread"
                      ? "No unread messages"
                      : "No companies found"}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {filterMode === "unread"
                      ? "You're all caught up."
                      : "Try a different search."}
                  </p>
                </div>
              </div>
            )}

            {visibleCompanies.map((company) => {
              const unread = getUnreadFor(
                company.companyId
              );

              const preview =
                lastPreview[company.companyId];

              const activity =
                lastActivity[company.companyId];

              const isSelected =
                selectedCompany?.companyId ===
                company.companyId;

              return (
                <button
                  type="button"
                  key={company.companyId}
                  onClick={() =>
                    selectCompany(company)
                  }
                  className={`
                    group
                    flex
                    w-full
                    min-w-0
                    items-center
                    gap-3
                    border-b
                    border-gray-100
                    px-4
                    py-3
                    text-left
                    transition
                    sm:px-5

                    ${
                      isSelected
                        ? "bg-emerald-50/80"
                        : "hover:bg-gray-50"
                    }
                  `}
                >
                  {/* Selected indicator */}
                  <div
                    className={`
                      h-9
                      w-1
                      shrink-0
                      rounded-full
                      transition
                      ${
                        isSelected
                          ? "bg-emerald-500"
                          : "bg-transparent"
                      }
                    `}
                  />

                  {/* Avatar */}
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
                      transition

                      ${
                        isSelected
                          ? "border-emerald-200 bg-emerald-100"
                          : "border-gray-100 bg-gray-50 group-hover:bg-white"
                      }
                    `}
                  >
                    <Building2
                      size={17}
                      className={
                        isSelected
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }
                    />
                  </div>

                  {/* Company info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`
                          truncate
                          text-[13px]
                          ${
                            unread > 0
                              ? "font-bold text-gray-900"
                              : "font-semibold text-gray-700"
                          }
                        `}
                      >
                        {company.name}
                      </p>

                      {activity && (
                        <span className="shrink-0 text-[9px] text-gray-400">
                          {formatRelativeTime(
                            activity
                          )}
                        </span>
                      )}
                    </div>

                    <p
                      className={`
                        mt-1
                        truncate
                        text-[11px]
                        ${
                          unread > 0
                            ? "font-medium text-gray-600"
                            : "text-gray-400"
                        }
                      `}
                    >
                      {preview ||
                        company.address ||
                        "No address information"}
                    </p>
                  </div>

                  {/* Unread */}
                  {unread > 0 && (
                    <span
                      className="
                        flex
                        h-5
                        min-w-[20px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-emerald-600
                        px-1.5
                        text-[9px]
                        font-bold
                        text-white
                        shadow-sm
                      "
                    >
                      {unread > 9
                        ? "9+"
                        : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* =================================================
            CHAT AREA
            ================================================= */}
        <main
          className={`
            flex
            min-h-0
            min-w-0
            flex-1
            flex-col
            bg-[#f7faf8]

            ${
              mobileChatOpen
                ? "flex"
                : "hidden lg:flex"
            }
          `}
        >
          {/* =================================================
              CHAT HEADER
              ================================================= */}
          <header
            className="
              flex
              min-h-[72px]
              shrink-0
              items-center
              gap-3
              border-b
              border-gray-100
              bg-white
              px-3
              sm:px-5
              lg:px-6
            "
          >
            {/* Mobile back */}
            <button
              type="button"
              onClick={() => {
                setMobileChatOpen(false);
                setActiveThread(null);
              }}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-gray-200
                bg-white
                text-gray-500
                transition
                hover:bg-gray-50
                lg:hidden
              "
            >
              <ArrowLeft size={17} />
            </button>

            {selectedCompany ? (
              <>
                {/* Avatar */}
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-emerald-100
                    bg-emerald-50
                  "
                >
                  <Building2
                    size={18}
                    className="text-emerald-600"
                  />
                </div>

                {/* Company */}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-gray-900 sm:text-[15px]">
                    {selectedCompany.name}
                  </h2>

                  <p className="mt-0.5 truncate text-[10px] text-gray-400 sm:text-[11px]">
                    {selectedCompany.address ||
                      "Business partner"}
                  </p>
                </div>

                {/* Connected */}
                <div
                  className="
                    hidden
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-emerald-100
                    bg-emerald-50
                    px-3
                    py-1.5
                    sm:flex
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <span className="text-[10px] font-semibold text-emerald-700">
                    Connected
                  </span>
                </div>
              </>
            ) : (
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Select a company
                </h2>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  Start a conversation
                </p>
              </div>
            )}
          </header>

          {/* =================================================
              MESSAGE AREA
              ================================================= */}
          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              px-3
              py-5
              sm:px-5
              sm:py-6
              lg:px-8
            "
          >
            {/* No company */}
            {!selectedCompany && (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm px-5 text-center">
                  <div
                    className="
                      mx-auto
                      mb-5
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-3xl
                      bg-emerald-50
                      ring-1
                      ring-emerald-100
                    "
                  >
                    <Sprout
                      size={28}
                      className="text-emerald-500"
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-gray-700">
                    Your farmer network
                  </h3>

                  <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-gray-400">
                    Select a company to discuss crops,
                    orders, pricing or business
                    opportunities.
                  </p>
                </div>
              </div>
            )}

            {/* Empty conversation */}
            {selectedCompany &&
              messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm px-5 text-center">
                    <div
                      className="
                        mx-auto
                        mb-4
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-2xl
                        bg-white
                        shadow-sm
                        ring-1
                        ring-gray-100
                      "
                    >
                      <Building2
                        size={22}
                        className="text-emerald-500"
                      />
                    </div>

                    <h3 className="text-sm font-semibold text-gray-700">
                      Start the conversation
                    </h3>

                    <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                      Send a message to{" "}
                      <span className="font-medium text-gray-500">
                        {selectedCompany.name}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              )}

            {/* Messages */}
            {selectedCompany &&
              messages.length > 0 && (
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                  {/* Conversation badge */}
                  <div className="flex justify-center py-1">
                    <span
                      className="
                        rounded-full
                        border
                        border-gray-200
                        bg-white
                        px-3
                        py-1
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.14em]
                        text-gray-400
                        shadow-sm
                      "
                    >
                      Conversation
                    </span>
                  </div>

                  {messages.map((msg, index) => {
                    const isMe =
                      msg.senderId === farmerId;

                    return (
                      <div
                        key={`${msg.createdAt}-${index}`}
                        className={`
                          flex
                          w-full
                          ${
                            isMe
                              ? "justify-end"
                              : "justify-start"
                          }
                        `}
                      >
                        <div
                          className={`
                            flex
                            max-w-[90%]
                            flex-col
                            sm:max-w-[72%]
                            lg:max-w-[65%]
                            ${
                              isMe
                                ? "items-end"
                                : "items-start"
                            }
                          `}
                        >
                          {/* Sender */}
                          <span className="mb-1.5 px-1 text-[9px] font-medium text-gray-400">
                            {isMe
                              ? "You"
                              : selectedCompany.name}
                          </span>

                          {/* Bubble */}
                          <div
                            className={`
                              rounded-2xl
                              px-4
                              py-3
                              text-[13px]
                              leading-relaxed
                              shadow-sm
                              sm:px-4.5
                              ${
                                isMe
                                  ? "rounded-br-md bg-emerald-600 text-white shadow-emerald-900/5"
                                  : "rounded-bl-md border border-gray-200 bg-white text-gray-700"
                              }
                            `}
                          >
                            <p className="whitespace-pre-line break-words">
                              {msg.text}
                            </p>
                          </div>

                          {/* Time */}
                          <div
                            className={`
                              mt-1.5
                              flex
                              items-center
                              gap-1
                              px-1
                              text-[9px]
                              text-gray-400
                            `}
                          >
                            <span>
                              {formatMessageTime(
                                msg.createdAt
                              )}
                            </span>

                            {isMe && (
                              <CheckCheck
                                size={12}
                                className="text-emerald-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              )}
          </div>

          {/* =================================================
              COMPOSER
              ================================================= */}
          {selectedCompany && (
            <div
              className="
                shrink-0
                border-t
                border-gray-100
                bg-white
                px-3
                py-3
                sm:px-5
                sm:py-4
                lg:px-6
              "
            >
              <div className="mx-auto w-full max-w-4xl">
                <div
                  className="
                    flex
                    items-end
                    gap-2
                    rounded-2xl
                    border
                    border-gray-200
                    bg-gray-50
                    p-1.5
                    transition
                    focus-within:border-emerald-300
                    focus-within:bg-white
                    focus-within:ring-2
                    focus-within:ring-emerald-100
                  "
                >
                  <textarea
                    value={input}
                    onChange={(e) =>
                      setInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder={`Message ${selectedCompany.name}...`}
                    className="
                      max-h-28
                      min-h-[42px]
                      flex-1
                      resize-none
                      bg-transparent
                      px-3
                      py-2.5
                      text-sm
                      leading-relaxed
                      text-gray-800
                      outline-none
                      placeholder:text-gray-400
                    "
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
                      bg-emerald-600
                      text-white
                      shadow-sm
                      transition
                      hover:bg-emerald-700
                      active:scale-95
                      disabled:cursor-not-allowed
                      disabled:bg-gray-200
                      disabled:text-gray-400
                    "
                  >
                    <Send size={16} />
                  </button>
                </div>

                <p className="mt-1.5 hidden px-2 text-[9px] text-gray-400 sm:block">
                  Enter to send · Shift + Enter for a new line
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  </div>
  )
}