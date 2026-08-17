import { createContext, useContext, useEffect, useRef, useState ,type ReactNode} from "react";
import axios from "axios";
import { getSocket } from "../lib/Socket.client";

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

/**
 * Single shared unread state for the whole app — the dashboard nav badge
 * and the per-thread sidebar badges both read from this, so clearing a
 * thread anywhere updates everywhere instantly. No more "works on the
 * Messages page but the nav badge needs a refresh to catch up."
 */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const token = localStorage.getItem("farmerToken") || localStorage.getItem("companyToken");
    if (!token) return;

    const fetchUnreadCounts = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/messages/unread-counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success && res.data.unreadCounts && typeof res.data.unreadCounts === "object") {
          setUnreadCounts(res.data.unreadCounts);
        }
      } catch (err) {
        console.error("Error fetching unread counts", err);
      }
    };

    fetchUnreadCounts();

    const socket = getSocket(token);

    socket.on("unread:update", (payload: { senderId?: string }) => {
      const senderId = payload?.senderId;
      if (!senderId) return;

      // Don't bump the thread the user is actively looking at right now —
      // they'll see the message land live; it's not "unread" to them.
      if (senderId === activeThreadRef.current) return;

      setUnreadCounts((prev) => ({ ...(prev || {}), [senderId]: (prev?.[senderId] ?? 0) + 1 }));
    });

    return () => {
      socket.off("unread:update");
    };
  }, []);

  const setActiveThread = (id: string | null) => {
    setActiveThreadId(id);
    if (id) {
      setUnreadCounts((prev) => ({ ...(prev || {}), [id]: 0 }));
    }
  };

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  return (
    <UnreadContext.Provider value={{ unreadCounts, totalUnread, activeThreadId, setActiveThread }}>
      {children}
    </UnreadContext.Provider>
  );
}
