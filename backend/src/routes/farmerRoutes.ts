import { Router } from "express"
import farmer from "../models/farmer"

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const Farmer = new farmer(req.body);
    await Farmer.save()
    res.status(201).json(Farmer)
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
});

export default router
