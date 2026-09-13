import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { getSocket } from "../lib/Socket.client";

interface UnreadUpdatePayload {
  senderId?: string;
  receiverId?: string;
  senderType?: "farmer" | "company";
  receiverType?: "farmer" | "company";
}

interface UnreadContextValue {
  unreadCounts: Record<string, number>;
  totalUnread: number;
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCounts: {},
  totalUnread: 0,
  activeThreadId: null,
  setActiveThread: () => {},
});

export function useUnread() {
  return useContext(UnreadContext);
}

function getTokenForRoute(pathname: string): string | null {
  const isCompanyRoute =
    pathname.startsWith("/company-dashboard") ||
    pathname.startsWith("/company");

  if (isCompanyRoute) {
    return localStorage.getItem("companyToken");
  }

  return localStorage.getItem("farmerToken");
}

export function UnreadProvider({ children }: { children: ReactNode }) {
  const location = useLocation();

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    {}
  );

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(() =>
    getTokenForRoute(window.location.pathname)
  );

  const activeThreadRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  /*
   * Detect which account is currently active.
   * This is important when both farmerToken and companyToken
   * exist in localStorage.
   */
  useEffect(() => {
    const currentToken = getTokenForRoute(location.pathname);

    if (currentToken !== token) {
      setToken(currentToken);
      setUnreadCounts({});
      setActiveThreadId(null);
      activeThreadRef.current = null;
    }
  }, [location.pathname, token]);

  /*
   * Handle storage changes from another browser tab.
   */
  useEffect(() => {
    const handleStorage = () => {
      const currentToken = getTokenForRoute(window.location.pathname);

      if (currentToken !== token) {
        setToken(currentToken);
        setUnreadCounts({});
        setActiveThreadId(null);
        activeThreadRef.current = null;
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [token]);

  /*
   * Fetch unread counts and listen for realtime updates.
   */
  useEffect(() => {
    if (!token) {
      setUnreadCounts({});
      return;
    }

    let cancelled = false;

    const fetchUnreadCounts = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/messages/unread-counts",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (
          !cancelled &&
          res.data?.success &&
          res.data?.unreadCounts &&
          typeof res.data.unreadCounts === "object"
        ) {
          setUnreadCounts(res.data.unreadCounts);
        }
      } catch (err) {
        console.error(
          "[UnreadContext] Error fetching unread counts:",
          err
        );
      }
    };

    fetchUnreadCounts();

    const socket = getSocket(token);

    const handleUnreadUpdate = (payload: UnreadUpdatePayload) => {
      if (!payload?.senderId) {
        return;
      }

      const threadId = payload.senderId;

      /*
       * If the user is currently inside this conversation,
       * don't show it as unread.
       */
      if (threadId === activeThreadRef.current) {
        return;
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [threadId]: (prev[threadId] ?? 0) + 1,
      }));
    };

    socket.on("unread:update", handleUnreadUpdate);

    return () => {
      cancelled = true;
      socket.off("unread:update", handleUnreadUpdate);
    };
  }, [token]);

  /*
   * Mark a conversation as active/read locally.
   */
  const setActiveThread = (id: string | null) => {
    setActiveThreadId(id);
    activeThreadRef.current = id;

    if (!id) {
      return;
    }

    setUnreadCounts((prev) => {
      if (!(id in prev)) {
        return prev;
      }

      return {
        ...prev,
        [id]: 0,
      };
    });
  };

  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, count) => sum + (Number(count) || 0),
    0
  );

  return (
    <UnreadContext.Provider
      value={{
        unreadCounts,
        totalUnread,
        activeThreadId,
        setActiveThread,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}