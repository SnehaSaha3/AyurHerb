import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/message";

interface AuthedSocket extends Socket {
  userId?: string;
  userType?: "farmer" | "company";
}

interface SendMessagePayload {
  receiverId: string;
  receiverType: "farmer" | "company";
  text: string;
}

/**
 * Attaches Socket.IO to the same HTTP server Express is running on.
 * Auth: client connects with `auth: { token }` — same JWT_SECRET / shape
 * used by authMiddleware and companyAuthMiddleware, so no separate login
 * is needed for sockets.
 */
export function initSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        farmerId?: string;
        companyId?: string;
      };

      if (decoded.farmerId) {
        socket.userId = decoded.farmerId;
        socket.userType = "farmer";
      } else if (decoded.companyId) {
        socket.userId = decoded.companyId;
        socket.userType = "company";
      } else {
        return next(new Error("Invalid token payload"));
      }

      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const room = `${socket.userType}:${socket.userId}`;
    socket.join(room);

    socket.on(
      "send_message",
      async (
        payload: SendMessagePayload,
        ack?: (res: { success: boolean; message?: any; error?: string }) => void
      ) => {
        try {
          const { receiverId, receiverType, text } = payload || ({} as SendMessagePayload);

          if (!receiverId || !receiverType || !text?.trim()) {
            return ack?.({ success: false, error: "Missing fields" });
          }

          const message = await Message.create({
            senderId: socket.userId,
            senderType: socket.userType,
            receiverId,
            receiverType,
            text: text.trim(),
          });

          const receiverRoom = `${receiverType}:${receiverId}`;

          // deliver to the receiver, and echo back to the sender's own
          // room so other open tabs/devices for the sender stay in sync
          io.to(receiverRoom).emit("receive_message", message);
          io.to(room).emit("receive_message", message);

          ack?.({ success: true, message });
        } catch (err) {
          console.error("send_message error:", err);
          ack?.({ success: false, error: "Failed to send message" });
        }
      }
    );

    socket.on("disconnect", () => {
    });
  });

  return io;
}