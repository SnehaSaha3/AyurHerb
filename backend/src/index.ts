import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import farmerRoutes from "./routes/farmerRoutes"
import dotenv from "dotenv"

dotenv.config()

const app = express()

app.use(cors());
app.use(express.json())


app.use("/api/farmers", farmerRoutes)


mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err))

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
