import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors"; // ✅ import cors
import router from "./routes/farmerRoutes";

dotenv.config();

const app = express();

// ✅ Allow requests from your frontend
app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/api/farmers", router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
