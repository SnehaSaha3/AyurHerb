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

    const farmer = await Farmer.findById(req.user.farmerId);
    if (!farmer)
      return res.status(404).json({ success: false, error: "Farmer not found" });

    // farmer.walletAddress must be a real on-chain address for this farmer.
    // See note below about the Farmer model.
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


/* -------------------- GET CROPS BY FARMER _id -------------------- */
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

    // Build a set of "farmerId:cropId" already represented on-chain,
    // so the same crop isn't shown a second time from MongoDB.
    const onChainKeys = new Set(
      onChainFormatted.map((c) => `${c.farmerId}:${c.cropId}`)
    );

    const offChain: any[] = [];
    farmers.forEach((f) => {
      (f.crops ?? []).forEach((c) => {
        const key = `${f._id}:${c.cropId ?? ""}`;
        if (onChainKeys.has(key)) return; // already have this one from chain

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