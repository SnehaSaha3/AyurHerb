import { Router, Request, Response } from "express";
import Farmer from "../models/farmer";
import { authMiddleware } from "../middlewares/authMiddleware";
import { registerFarmer, loginFarmer } from "../controllers/farmerController";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter"
const router = Router();

router.post("/register", registerLimiter, registerFarmer);
router.post("/login", loginLimiter, loginFarmer);

/* -------------------- CURRENT FARMER (Protected) -------------------- */
router.get("/me", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId).select("-password -privateKey");

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    return res.json({ farmer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* -------------------- SINGLE FARMER BY MONGO _id -------------------- */
// Used by the map-click flow: click a pin → fetch just this farmer.
router.get("/:farmerId", async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId).select(
      "name address herb walletAddress"
    );
    if (!farmer) {
      return res.status(404).json({ success: false, error: "Farmer not found" });
    }
    res.json({
      success: true,
      farmer: {
        farmerId: farmer._id,
        name: farmer.name,
        address: farmer.address,
        herb: farmer.herb,
        walletAddress: farmer.walletAddress,
      },
    });
  } catch (err: any) {
    // Malformed ObjectId lands here too — treat as not found, not a 500
    res.status(404).json({ success: false, error: "Farmer not found" });
  }
});

/* -------------------- GET ALL FARMERS -------------------- */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const farmers = await Farmer.find({
      walletAddress: { $exists: true, $ne: null, $nin: [""] },
    }).select("name address herb walletAddress crops lat lng");

    const formatted = farmers.map((f) => ({
      farmerId: f._id,
      name: f.name,
      address: f.address,
      herb: f.herb,
      walletAddress: f.walletAddress,
      crops: f.crops || [],
      lat: f.lat,
      lng: f.lng,
    }));

    res.json({ success: true, farmers: formatted });
  } catch (err: any) {
    console.error("Fetch farmers error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});

export default router;