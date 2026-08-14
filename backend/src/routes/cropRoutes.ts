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
    // quantity added — this was the actual gap: nothing in this route
    // ever wrote it, so every crop silently sat at the schema default
    // of 0 regardless of what the farmer intended. Required now, not
    // optional — a crop listing with no quantity can't be ordered or
    // stock-checked, so letting it default to 0 was the real bug, not
    // a reasonable default.
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

/* -------------------- EDIT A CROP (MongoDB only, for now) --------------------
 * Scoped deliberately to Mongo, not blockchain: on-chain updateCrop()
 * is separate in-progress work (adding quantity to CropRegistry.sol
 * and redeploying). Blocking quantity edits on that finishing first
 * would stall testing the escrow/stock flow for no reason — this
 * unblocks that now. Once the on-chain side lands, this route is
 * where the corresponding updateCropOnChain() call gets added.
 */
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

    // Ownership check — a farmer can only edit their OWN crop. cropId
    // alone isn't enough to prove ownership, so this must be scoped
    // to req.user.farmerId's own crops array, not a bare Crop lookup.
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

    // quantity added — blockchain-sourced crops don't carry quantity
    // yet (that's the separate on-chain-quantity work in progress),
    // so onChainFormatted intentionally has no quantity field here.
    // Off-chain (MongoDB) crops are the authoritative source for
    // quantity right now — see the flagged collision risk on this.
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