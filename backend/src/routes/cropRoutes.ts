import { Router, Request, Response } from "express";
import Farmer from "../models/farmer";
import { Crop } from "../models/crop";
import {
  upsertCropOnChain,
  updateCropOnChain,
  getAllCropsFromChain,
  getFarmerCropsFromChain,
} from "../controllers/cropController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

interface FormattedCrop {
  cropId: string;
  cropName: string;
  soilType: string;
  season: string;
  area?: string | number;
  quantity?: number;
  location: { lat: number; lng: number };
  source: string;
  farmerName: string;
  farmerId: any;
}

function formatOnChainCrop(
  c: { id: number; name: string; area: string; season: string; soil: string; lat: number; lng: number },
  farmerName: string,
  farmerId: any
): FormattedCrop {
  return {
    cropId: c.id?.toString() || "",
    cropName: c.name || "🌱 Unknown",
    soilType: c.soil || "-",
    season: c.season || "-",
    area: c.area,
    location: { lat: c.lat, lng: c.lng },
    source: "Verified",
    farmerName,
    farmerId,
  };
}

function formatOffChainCrop(c: any, farmerName: string, farmerId: any): FormattedCrop {
  return {
    cropId: c.cropId ?? "",
    cropName: c.cropName ?? "🌱 Unknown",
    soilType: c.soilType ?? "-",
    season: c.season ?? "-",
    quantity: c.quantity ?? 0,
    location: c.location ?? { lat: 0, lng: 0 },
    source: "Verified",
    farmerName,
    farmerId,
  };
}

/*
 * A single physical crop exists as two records: one written on-chain by
 * addCrop(), one written to Mongo in the same request, sharing a cropId.
 * That cropId is the real identity join — merge here, once, instead of
 * sending both records to the client and hoping the frontend can guess
 * they're the same crop from fields that don't even match (the contract
 * has no quantity field, so the chain copy never has one).
 */
function mergeCropSources(onChain: FormattedCrop[], offChain: FormattedCrop[]): FormattedCrop[] {
  const byCropId = new Map<string, FormattedCrop>();
  const unmatched: FormattedCrop[] = [];

  for (const crop of onChain) {
    if (crop.cropId) {
      byCropId.set(crop.cropId, crop);
    } else {
      unmatched.push(crop);
    }
  }

  for (const crop of offChain) {
    if (!crop.cropId) {
      unmatched.push(crop);
      continue;
    }

    const chainCrop = byCropId.get(crop.cropId);

    if (chainCrop) {
      // Mongo is the editable copy and the source of truth for every
      // field it tracks — including location. The chain's lat/lng are
      // scaled to integers and rounded back on read (parsedLat * 1e6,
      // then / 1e6), so they can drift from what the farmer's GPS
      // actually reported. Mongo stores the untouched value, so it
      // wins here too, not just for the obviously-editable fields.
      byCropId.set(crop.cropId, {
        ...chainCrop,
        cropName: crop.cropName,
        soilType: crop.soilType,
        season: crop.season,
        // Conditional spread instead of `quantity: crop.quantity` —
        // with exactOptionalPropertyTypes, explicitly assigning
        // `undefined` to an optional key is a type error even though
        // omitting the key entirely is fine.
        ...(crop.quantity !== undefined ? { quantity: crop.quantity } : {}),
        location: crop.location,
        source: "Synced",
      });
    } else {
      byCropId.set(crop.cropId, crop);
    }
  } // <-- closes the offChain for-loop; this brace was missing

  return [...byCropId.values(), ...unmatched];
}

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
      console.warn(`upsertCropOnChain returned no cropId for farmer ${farmer._id} — check log parsing`);
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

    if (farmer.walletAddress && /^\d+$/.test(cropId)) {
      try {
        await updateCropOnChain({
          cropId: Number(cropId),
          farmerAddr: farmer.walletAddress,
          name: crop.cropName,
          area: "N/A",
          season: crop.season || "",
          soil: crop.soilType || "",
          lat: crop.location?.lat ?? 0,
          lng: crop.location?.lng ?? 0,
        });
      } catch (chainErr: any) {
        console.error(`Failed to sync crop ${cropId} to chain:`, chainErr.message);
      }
    }

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

    let onChainFormatted: FormattedCrop[] = [];

    if (farmer.walletAddress) {
      try {
        const onChain = await getFarmerCropsFromChain(farmer.walletAddress);
        onChainFormatted = onChain.map((c) => formatOnChainCrop(c, farmer.name, farmer._id));
      } catch (blockErr: any) {
        console.error("Blockchain error:", blockErr.message);
      }
    } else {
      console.warn("farmer has no walletAddress — skipping blockchain");
    }

    const offChainFormatted =
      farmer.crops?.map((c) => formatOffChainCrop(c, farmer.name, farmer._id)) || [];

    return res.json({
      success: true,
      crops: mergeCropSources(onChainFormatted, offChainFormatted),
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

    let onChainFormatted: FormattedCrop[] = [];

    if (farmer.walletAddress) {
      try {
        const onChain = await getFarmerCropsFromChain(farmer.walletAddress);
        onChainFormatted = onChain.map((c) => formatOnChainCrop(c, farmer.name, farmer._id));
      } catch (blockErr: any) {
        console.error("Blockchain error:", blockErr.message);
      }
    }

    const offChainFormatted =
      farmer.crops?.map((c) => formatOffChainCrop(c, farmer.name, farmer._id)) || [];

    res.json({ success: true, crops: mergeCropSources(onChainFormatted, offChainFormatted) });
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
      console.warn("Blockchain not running, using only MongoDB");
    }

    const farmers = await Farmer.find();

    const byFarmer = new Map <
      string,
      { farmer: (typeof farmers)[number]; onChain: FormattedCrop[]; offChain: FormattedCrop[] }
    >();

    farmers.forEach((f) => {
      byFarmer.set(f._id.toString(), {
        farmer: f,
        onChain: [],
        offChain: (f.crops ?? []).map((c) => formatOffChainCrop(c, f.name, f._id)),
      });
    });

    const walletToFarmerId = new Map<string, string>();
    farmers.forEach((f) => {
      if (f.walletAddress) {
        walletToFarmerId.set(f.walletAddress.toLowerCase(), f._id.toString());
      }
    });

    onChain.forEach((c) => {
      const farmerId = walletToFarmerId.get((c.farmer || "").toLowerCase());
      if (!farmerId) return;

      const entry = byFarmer.get(farmerId);
      if (!entry) return;

      entry.onChain.push(formatOnChainCrop(c, entry.farmer.name, entry.farmer._id));
    });

    const crops = Array.from(byFarmer.values()).flatMap((entry) =>
      mergeCropSources(entry.onChain, entry.offChain)
    );

    res.json({ success: true, crops });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;