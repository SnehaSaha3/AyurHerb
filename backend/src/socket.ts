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


const REPORT_INTENT_REGEX =
  /\breport\b.*\b(crop|health|field|farm)\b|\b(crop|health|field|farm)\b.*\breport\b/i;

function detectsReportRequest(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.startsWith("/report")) return false; 
  return REPORT_INTENT_REGEX.test(trimmed);
}
async function generateAndSendReport(
  farmerId: string,
  companyId: string,
  crop: any,
  farmerName: string,
  farmerAddress: string,
  io: SocketIOServer
) {
  const reportRes = await axios.post(`${AGENTS_URL}/reports/generate-report`, {
    farmerName,
    cropName: crop.cropName,
    soilType: crop.soilType || "Not specified",
    season: crop.season || "Not specified",
    quantity: crop.quantity,
    location: farmerAddress,
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
  io.to(`company:${companyId}`).emit("unread:update", {
    senderId: farmerId,
    senderType: "farmer",
  });

  return message;
}

async function sendClarifyingCropQuestion(
  farmerId: string,
  companyId: string,
  cropNames: string[],
  io: SocketIOServer
) {
  const clarifyText = `Which crop would you like the report for? Available: ${cropNames.join(", ")}`;

  const message = await Message.create({
    senderId: farmerId,
    senderType: "farmer",
    receiverId: companyId,
    receiverType: "company",
    text: clarifyText,
  });

  io.to(`farmer:${farmerId}`).emit("receive_message", message);
  io.to(`company:${companyId}`).emit("receive_message", message);
  io.to(`company:${companyId}`).emit("unread:update", {
    senderId: farmerId,
    senderType: "farmer",
  });
}

async function autoSendCropReport(
  farmerId: string,
  companyId: string,
  requestText: string,
  io: SocketIOServer
) {
  try {
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) return;

    const crops = farmer.crops || [];
    if (crops.length === 0) return;

    const lowerText = requestText.toLowerCase();

    const crop =
      crops.find((c: any) => lowerText.includes(c.cropName.toLowerCase())) ||
      (crops.length === 1 ? crops[0] : undefined);

    if (!crop) {
      const names = crops.map((c: any) => c.cropName);
      await sendClarifyingCropQuestion(farmerId, companyId, names, io);
      return;
    }

    await generateAndSendReport(
      farmerId,
      companyId,
      crop,
      farmer.name,
      farmer.address,
      io
    );
  } catch (err) {
    console.error("Auto crop report error:", err);
  }
}

export function initSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "https://ayurherb-i3oe.onrender.com",
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

    /*
     * Explicit "/report" command — typed by the farmer, optionally
     * naming a crop ("/report tulsi").
     */
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
        const crop =
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

        const message = await generateAndSendReport(
          farmerId,
          companyId,
          crop,
          farmer.name,
          farmer.address,
          io
        );

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

          io.to(receiverRoom).emit("unread:update", {
            senderId: socket.userId,
            senderType: socket.userType,
          });

          ack?.({ success: true, message });

          /*
           * Auto-trigger: a company sent a plain-English report
           * request to a farmer. Generate and deliver it without
           * the farmer having to type anything.
           */
          if (
            socket.userType === "company" &&
            receiverType === "farmer" &&
            detectsReportRequest(trimmed)
          ) {
            await autoSendCropReport(receiverId, socket.userId!, trimmed, io);
          }
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