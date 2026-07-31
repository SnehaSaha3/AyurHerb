import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns a single shared socket connection for the app, authenticated
 * with whichever JWT (farmer or company) is passed in. Reuses the
 * existing connection if one is already open.
 */
export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;

  socket = io("http://localhost:8000", {
    auth: { token },
    autoConnect: true,
  });

  return socket;
}

export function dissconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Decodes a JWT payload client-side without needing an extra dependency. */
export function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    const base64Payload = token.split(".")[1];
    const json = atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}