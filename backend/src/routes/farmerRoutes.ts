import { Router } from "express";
import farmer from "../models/farmer"; // farmer model

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const Farmer = new farmer(req.body); // create new document
    await Farmer.save();
    res.status(201).json(Farmer); // return saved doc
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
