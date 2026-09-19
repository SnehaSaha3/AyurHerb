import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * Returns one shared Socket.IO connection for the currently
 * authenticated user.
 */
export function getSocket(token: string): Socket {
  if (!token) {
    throw new Error("Socket token is required");
  }

  /*
   * Reuse the existing socket when it belongs to the same user
   * and is either connected or in the process of connecting.
   */
  if (
    socket &&
    socketToken === token &&
    (socket.connected || socket.active)
  ) {
    return socket;
  }

  /*
   * If a socket exists for another token/user, clean it up first.
   */
  if (socket && socketToken !== token) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  socket = io(
  import.meta.env.VITE_API_BASE_URL ||
    "https://ayurherb-backend-7yw4.onrender.com",
  {
    auth: {
      token,
    },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  socketToken = token;

  return socket;
}

/**
 * Disconnect and completely destroy the shared socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = null;
  socketToken = null;
}

/*
 * Keep the old misspelled function available so existing imports
 * don't break.
 */
export const dissconnectSocket = disconnectSocket;

/**
 * Decodes a JWT payload client-side without needing
 * an additional dependency.
 */
export function decodeJwtPayload<T = any>(
  token: string
): T | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64Payload = parts[1];

    const json = atob(
      base64Payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
    );

    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}