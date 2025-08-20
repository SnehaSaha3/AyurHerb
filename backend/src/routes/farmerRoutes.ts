import { Router } from "express";
import farmer from "../models/farmer";// ✅ relative path (.. goes one level up)

const router = Router();

router.post("/", async (req, res) => {
  try {
    const Farmer = new farmer(req.body);
    await Farmer.save();
    res.status(201).json(farmer);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;