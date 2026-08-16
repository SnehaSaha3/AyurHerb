import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import axios from "axios";
import Message from "./models/message";
import Farmer from "./models/farmer";

interface AuthedSocket extends Socket {
  userId?: string;
  userType?: "farmer" | "company";
}

interface SendMessagePayload {
  receiverId: string;
  receiverType: "farmer" | "company";
  text: string;
}

let ioInstance: SocketIOServer | null = null;
const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:8001";

export function initSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  ioInstance = io;

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

    async function handleReportCommand(
      receiverId: string,
      receiverType: "farmer" | "company",
      text: string,
      ack?: (res: { success: boolean; message?: any; error?: string }) => void
    ) {
      try {
        const farmerId = socket.userType === "farmer" ? socket.userId! : receiverId;
        const companyId = socket.userType === "company" ? socket.userId! : receiverId;

        const farmer = await Farmer.findById(farmerId);
        if (!farmer) return ack?.({ success: false, error: "Farmer not found" });

        const crops = farmer.crops || [];
        if (crops.length === 0) {
          return ack?.({ success: false, error: "No crops on file for this farmer yet" });
        }

        const cropQuery = text.slice("/report".length).trim().toLowerCase();
        let crop =
          cropQuery
            ? crops.find((c: any) => c.cropName.toLowerCase() === cropQuery) ||
              crops.find((c: any) => c.cropName.toLowerCase().includes(cropQuery))
            : crops.length === 1
            ? crops[0]
            : undefined;

        if (!crop) {
          const names = crops.map((c: any) => c.cropName).join(", ");
          return ack?.({
            success: false,
            error: `Specify a crop: "/report <cropName>". Available: ${names}`,
          });
        }

        const reportRes = await axios.post(`${AGENTS_URL}/reports/generate-report`, {
          farmerName: farmer.name,
          cropName: crop.cropName,
          soilType: crop.soilType || "Not specified",
          season: crop.season || "Not specified",
          quantity: crop.quantity,
          location: farmer.address,
        });

        const reportText = `🌿 Crop Health Report — ${crop.cropName}\n\n${reportRes.data.report}`;

        const message = await Message.create({
          senderId: farmerId,
          senderType: "farmer",
          receiverId: companyId,
          receiverType: "company",
          text: reportText,
        });

        io.to(`farmer:${farmerId}`).emit("receive_message", message);
        io.to(`company:${companyId}`).emit("receive_message", message);
        io.to(`company:${companyId}`).emit("unread:update", { senderId: farmerId, senderType: "farmer" });

        ack?.({ success: true, message });
      } catch (err) {
        console.error("report command error:", err);
        ack?.({ success: false, error: "Failed to generate crop health report" });
      }
    }

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

          const trimmed = text.trim();

          if (trimmed.toLowerCase().startsWith("/report")) {
            return handleReportCommand(receiverId, receiverType, trimmed, ack);
          }

          const message = await Message.create({
            senderId: socket.userId,
            senderType: socket.userType,
            receiverId,
            receiverType,
            text: trimmed,
          });

          const receiverRoom = `${receiverType}:${receiverId}`;
          io.to(receiverRoom).emit("receive_message", message);
          io.to(room).emit("receive_message", message);

          // WhatsApp-style badge bump — receiver's sidebar increments
          // live without a refetch. Sender doesn't get this (they don't
          // need an unread badge for their own message).
          io.to(receiverRoom).emit("unread:update", {
            senderId: socket.userId,
            senderType: socket.userType,
          });

          ack?.({ success: true, message });
        } catch (err) {
          console.error("send_message error:", err);
          ack?.({ success: false, error: "Failed to send message" });
        }
      }
    );

    socket.on("disconnect", () => {});
  });

  return io;
}

export function emitToUser(
  userId: string,
  userType: "farmer" | "company",
  event: string,
  payload: unknown
) {
  if (!ioInstance) {
    console.warn(`emitToUser called before initSocket() — dropped event "${event}" for ${userType}:${userId}`);
    return;
  }
  ioInstance.to(`${userType}:${userId}`).emit(event, payload);
}