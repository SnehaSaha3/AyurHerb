import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import farmerRoutes from "./routes/farmerRoutes"
import dotenv from "dotenv"
import cropRoutes from "./routes/cropRoutes"
import weatherRoutes from "./routes/weatherRoutes"
import messageRoutes from "./routes/messageRoutes"


dotenv.config()


const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json());
console.log("JWT_Secret:", process.env.JWT_SECRET)


app.use("/api/farmers", farmerRoutes)
app.use("/api/messages", messageRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/weather", weatherRoutes);



mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err))

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

