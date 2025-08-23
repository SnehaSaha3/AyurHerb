import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import farmer from "../models/farmer";

const router = Router();

// -----------------------------
// Farmer Register
// -----------------------------
router.post("/register", async (req: Request, res: Response) => {
  try {
    const Farmer = new farmer(req.body);
    await Farmer.save();  

    // Generate JWT token with farmer's MongoDB _id
    const token = jwt.sign(
      { farmerId: Farmer._id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.status(201).json({ Farmer, token });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// -----------------------------
// Farmer Profile (Protected)
// -----------------------------
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      farmerId: string;
    };

    const Farmer = await farmer.findById(decoded.farmerId);
    if (!Farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    res.json(Farmer);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// -----------------------------
// Get Farmer by ID (Public)
// -----------------------------
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const Farmer = await farmer.findById(req.params.id);
    if (!Farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    res.json(Farmer);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
