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


router.post("/add", authMiddleware, async (req: any, res: Response) => {
  try {
    const { cropName, season, soilType, lat, lng, quantity } = req.body;
    if (!cropName || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: "cropName, lat & lng are required",
      });
    }
    if (quantity === undefined || quantity === null || isNaN(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({
        success: false,
        error: "quantity is required and must be a non-negative number",
      });
    }

    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer)
      return res.status(404).json({ success: false, error: "Farmer not found" });
    if (!farmer.walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Farmer has no wallet address on file",
      });
    }

    const { txHash, cropId } = await upsertCropOnChain({
      farmerAddr: farmer.walletAddress,
      name: cropName,
      area: "N/A",
      season: season || "",
      soil: soilType || "",
      lat,
      lng,
    });

   if (cropId === null) {
  console.warn(`⚠️ upsertCropOnChain returned no cropId for farmer ${farmer._id} — check log parsing`);
  }

    farmer.crops = farmer.crops || [];
    farmer.crops.push(
      new Crop({
        cropId: cropId?.toString() || "",
        cropName,
        soilType: soilType || "-",
        season: season || "-",
        quantity: Number(quantity),
        location: { lat: Number(lat), lng: Number(lng) },
      })
    );

    await farmer.save();

    res.json({ success: true, txHash, cropId, quantity: Number(quantity) });
  } catch (err: any) {
    console.error("Error in POST /crops/add:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Internal Server Error" });
  }
});

router.patch("/:cropId", authMiddleware, async (req: any, res: Response) => {
  try {
    const { cropId } = req.params;
    const { cropName, soilType, season, quantity } = req.body;

    if (
      quantity !== undefined &&
      (isNaN(Number(quantity)) || Number(quantity) < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a non-negative number",
      });
    }

    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer) {
      return res.status(404).json({ success: false, error: "Farmer not found" });
    }
    const crop = farmer.crops?.find((c: any) => c.cropId === cropId);
    if (!crop) {
      return res.status(404).json({
        success: false,
        error: "Crop not found on this farmer's account",
      });
    }

    if (cropName !== undefined) crop.cropName = cropName;
    if (soilType !== undefined) crop.soilType = soilType;
    if (season !== undefined) crop.season = season;
    if (quantity !== undefined) crop.quantity = Number(quantity);

    await farmer.save();

    res.json({
      success: true,
      crop: {
        cropId: crop.cropId,
        cropName: crop.cropName,
        soilType: crop.soilType,
        season: crop.season,
        quantity: crop.quantity,
        location: crop.location,
      },
    });
  } catch (err: any) {
    console.error("Error in PATCH /crops/:cropId:", err);
    res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
});


router.get("/mine", authMiddleware, async (req: any, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.user.farmerId);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: "Farmer not found",
      });
    }

    let onChainFormatted: any[] = [];

    if (farmer.walletAddress) {
      try {
        const onChain = await getFarmerCropsFromChain(farmer.walletAddress);

        onChainFormatted = onChain.map((c) => ({
          cropId: c.id?.toString() || "",
          cropName: c.name || "🌱 Unknown",
          soilType: c.soil || "-",
          season: c.season || "-",
          location: { lat: c.lat, lng: c.lng },
          source: "Blockchain",
          farmerName: farmer.name,
          farmerId: farmer._id,
        }));
      } catch (blockErr: any) {
        console.error("Blockchain error:", blockErr.message);
      }
    } else {
      console.warn("⚠️ farmer has no walletAddress → skipping blockchain");
    }

    const offChain =
      farmer.crops?.map((c) => ({
        cropId: c.cropId ?? "",
        cropName: c.cropName ?? "🌱 Unknown",
        soilType: c.soilType ?? "-",
        season: c.season ?? "-",
        quantity: c.quantity ?? 0,
        location: c.location ?? { lat: 0, lng: 0 },
        source: "MongoDB",
        farmerName: farmer.name,
        farmerId: farmer._id,
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


router.get("/:farmerId", async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId);
    if (!farmer)
      return res.status(404).json({ success: false, error: "Farmer not found" });

    let onChainFormatted: any[] = [];

    if (farmer.walletAddress) {
      try {
        const onChain = await getFarmerCropsFromChain(farmer.walletAddress);
        onChainFormatted = onChain.map((c) => ({
          cropId: c.id?.toString() || "",
          cropName: c.name || "🌱 Unknown",
          soilType: c.soil || "-",
          season: c.season || "-",
          location: { lat: c.lat, lng: c.lng },
          source: "Blockchain",
          farmerName: farmer.name,
          farmerId: farmer._id,
        }));
      } catch (blockErr: any) {
        console.error("Blockchain error:", blockErr.message);
      }
    }

    const offChain =
      farmer.crops?.map((c) => ({
        cropId: c.cropId ?? "",
        cropName: c.cropName ?? "🌱 Unknown",
        soilType: c.soilType ?? "-",
        season: c.season ?? "-",
        quantity: c.quantity ?? 0,
        location: c.location ?? { lat: 0, lng: 0 },
        source: "MongoDB",
        farmerName: farmer.name,
        farmerId: farmer._id,
      })) || [];

    res.json({ success: true, crops: [...onChainFormatted, ...offChain] });
  } catch (err: any) {
    console.error("Error in GET /crops/:farmerId:", err);
    res.status(404).json({ success: false, error: "Farmer not found" });
  }
});


router.get("/", async (_req: Request, res: Response) => {
  try {
    let onChain: any[] = [];

    try {
      onChain = await getAllCropsFromChain();
    } catch (err) {
      console.warn("⚠️ Blockchain not running, using only MongoDB");
    }

    const farmers = await Farmer.find();

    const walletToFarmer = new Map<string, typeof farmers[number]>();
    farmers.forEach((f) => {
      if (f.walletAddress) {
        walletToFarmer.set(f.walletAddress.toLowerCase(), f);
      }
    });

    const onChainFormatted = onChain.map((c) => {
      const matchedFarmer = walletToFarmer.get((c.farmer || "").toLowerCase());
      return {
        cropId: c.id?.toString() || "",
        cropName: c.name || "🌱 Unknown",
        soilType: c.soil || "-",
        season: c.season || "-",
        location: { lat: c.lat, lng: c.lng },
        source: "Blockchain",
        farmerName: matchedFarmer?.name || "Unknown",
        farmerId: matchedFarmer?._id || c.farmer,
      };
    });
    const onChainKeys = new Set(
      onChainFormatted.map((c) => `${c.farmerId}:${c.cropId}`)
    );

    const offChain: any[] = [];
    farmers.forEach((f) => {
      (f.crops ?? []).forEach((c) => {
        const key = `${f._id}:${c.cropId ?? ""}`;
        if (onChainKeys.has(key)) return; 

        offChain.push({
          cropId: c.cropId ?? "",
          cropName: c.cropName ?? "🌱 Unknown",
          soilType: c.soilType ?? "-",
          season: c.season ?? "-",
          quantity: c.quantity ?? 0,
          location: c.location ?? { lat: 0, lng: 0 },
          source: "MongoDB",
          farmerName: f.name,
          farmerId: f._id,
        });
      });
    });

    res.json({
      success: true,
      crops: [...onChainFormatted, ...offChain],
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;