import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import Farmer from "../models/farmer";
import { authMiddleware } from "../middlewares/authMiddleware";
import { sendRegistrationEmail } from "../services/EmailService";
import { ethers } from "ethers";

const router = Router();

// --- Register Farmer ---
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, contact, email, address, herb } = req.body;

    // Generate blockchain wallet
    const wallet = ethers.Wallet.createRandom();

    const newFarmer = new Farmer({
      name,
      contact,
      email,
      address,
      herb,
      walletAddress: wallet.address,
      privateKey: wallet.privateKey, // ⚠️ encrypt in prod
      crops: [],
    });

    await newFarmer.save();

    const token = jwt.sign(
      { farmerId: newFarmer._id, walletAddress: newFarmer.walletAddress },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    if (newFarmer.email) {
      await sendRegistrationEmail(newFarmer.email, newFarmer.name);
    }

    res.status(201).json({
      farmer: {
        id: newFarmer._id,
        name: newFarmer.name,
        email: newFarmer.email,
        walletAddress: newFarmer.walletAddress,
        crops: newFarmer.crops,
      },
      token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Farmer Profile (Protected) ---
router.get("/profile", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });
    res.json(farmer);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// --- Get current farmer ---
router.get("/me", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });
    res.json(farmer);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// 👉 NEW alias for dashboard
router.get("/farmer-dashboard", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    // Send only what your dashboard needs
    res.json({
      id: farmer._id,
      name: farmer.name,
      email: farmer.email,
      walletAddress: farmer.walletAddress,
      crops: farmer.crops,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load farmer", details: err });
  }
});

/* ---------------- GET ALL FARMERS ---------------- */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const farmers = await Farmer.find().select(
      "farmerId name address herb walletAddress"
    );

    res.json({
      success: true,
      farmers,
    });
  } catch (err: any) {
    console.error("Fetch farmers error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

export default router;