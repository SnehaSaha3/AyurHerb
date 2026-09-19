import dotenv from "dotenv";
dotenv.config(); 

import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import farmerRoutes from "./routes/farmerRoutes";
import companyRoutes from "./routes/companyRoutes";
import cropRoutes from "./routes/cropRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import messageRoutes from "./routes/messageRoutes";
import { initSocket } from "./socket";
import orderRoutes from "./routes/orderRoutes"
import shipmentRoutes from "./routes/shipmentRoutes";
import publicVerifyRoutes from "./routes/publicRoutes"
import publicVerificationRouter from "./routes/publicVerificationRouter"
import marketRoutes from "./routes/marketRoutes";


const app = express();

app.use(cors({
  origin: "https://ayurherb-i3oe.onrender.com",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use("/api/farmers", farmerRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/public", publicVerifyRoutes)
app.use("/api/public",publicVerificationRouter);
app.use("/api/market", marketRoutes)

mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 8000;

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});