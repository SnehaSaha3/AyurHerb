import { Router, Request, Response } from "express";
import Farmer from "../models/farmer";
import { Crop } from "../models/crop";
import {
  upsertCropOnChain,
  getAllCropsFromChain,
  getFarmerCropsFromChain,
} from "../controllers/cropController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/* -------------------- ADD / UPSERT A CROP -------------------- */
router.post("/add", authMiddleware, async (req: any, res: Response) => {
  try {
    const { cropName, season, soilType, lat, lng } = req.body;
    if (!cropName || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: "cropName, lat & lng are required",
      });
    }

    // Use farmerId from JWT
    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer)
      return res.status(404).json({ success: false, error: "Farmer not found" });

    // Save to blockchain
    const { txHash, cropId } = await upsertCropOnChain({
      name: cropName,
      area: "N/A",
      season: season || "",
      soil: soilType || "",
      lat,
      lng,
    });

    
    farmer.crops = farmer.crops || [];
    farmer.crops.push(
      new Crop({
        cropId: cropId?.toString() || "",
        cropName,
        soilType: soilType || "-",
        season: season || "-",
        location: { lat: Number(lat), lng: Number(lng) },
      })
    );

    await farmer.save();

    res.json({ success: true, txHash, cropId });
  } catch (err: any) {
    console.error("Error in POST /crops/add:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal Server Error" });
  }
});

/* -------------------- GET LOGGED-IN FARMER CROPS -------------------- */
router.get("/mine", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId);

    console.log("farmer:", farmer);
    console.log("farmerId:", farmer?.farmerId);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: "Farmer not found",
      });
    }

    // ✅ Always safe default
    let onChainFormatted: any[] = [];

    // ✅ Only call blockchain if farmerId exists
    if (farmer.farmerId !== undefined && farmer.farmerId !== null) {
      try {
        const onChain = await getFarmerCropsFromChain(farmer.farmerId);

        onChainFormatted = onChain.map((c) => ({
          cropId: c.id?.toString() || "",
          cropName: c.name || "🌱 Unknown",
          soilType: c.soil || "-",
          season: c.season || "-",
          location: { lat: c.lat || 0, lng: c.lng || 0 },
          source: "Blockchain",
        }));
      } catch (blockErr: any) {
        console.error("Blockchain error:", blockErr.message);
        // ❗ Do NOT crash API
      }
    } else {
      console.warn("⚠️ farmerId missing → skipping blockchain");
    }

    // ✅ Mongo data (always works)
    const offChain =
      farmer.crops?.map((c) => ({
        cropId: c.cropId ?? "",
        cropName: c.cropName ?? "🌱 Unknown",
        soilType: c.soilType ?? "-",
        season: c.season ?? "-",
        location: c.location ?? { lat: 0, lng: 0 },
        source: "MongoDB",
      })) || [];

    return res.json({
      success: true,
      crops: [...onChainFormatted, ...offChain],
    });

  } catch (err: any) {
    console.error("Error in GET /crops/mine:", err);

    return res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
});
/* -------------------- GET CROPS BY FARMERID -------------------- */
router.get("/:farmerId", async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;
    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer)
      return res.status(404).json({ success: false, error: "Farmer not found" });

    const onChain = await getFarmerCropsFromChain(farmer.farmerId!);
    const onChainFormatted = onChain.map((c) => ({
      cropId: c.id?.toString() || "",
      cropName: c.name || "🌱 Unknown",
      soilType: c.soil || "-",
      season: c.season || "-",
      location: { lat: c.lat || 0, lng: c.lng || 0 },
      source: "Blockchain",
    }));

    const offChain =
      farmer.crops?.map((c) => ({
        cropId: c.cropId ?? "",
        cropName: c.cropName ?? "🌱 Unknown",
        soilType: c.soilType ?? "-",
        season: c.season ?? "-",
        location: c.location ?? { lat: 0, lng: 0 },
        source: "MongoDB",
      })) || [];

    res.json({ success: true, crops: [...onChainFormatted, ...offChain] });
  } catch (err: any) {
    console.error("Error in GET /crops/:farmerId:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal Server Error" });
  }
});

/* -------------------- GET ALL CROPS -------------------- */
router.get("/", async (_req: Request, res: Response) => {
  try {
    let onChain: any[] = [];

    try {
      onChain = await getAllCropsFromChain();
    } catch (err) {
      console.warn("⚠️ Blockchain not running, using only MongoDB");
    }

    const farmers = await Farmer.find();

    const offChain: any[] = [];

    farmers.forEach((f) => {
      (f.crops ?? []).forEach((c) => {
        offChain.push({
          cropId: c.cropId ?? "",
          cropName: c.cropName ?? "🌱 Unknown",
          soilType: c.soilType ?? "-",
          season: c.season ?? "-",
          location: c.location ?? { lat: 0, lng: 0 },
          source: "MongoDB",
          farmerName: f.name,
          farmerId: f._id,
        });
      });
    });

    res.json({
      success: true,
      crops: [...onChain, ...offChain],
    });

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
export default router;