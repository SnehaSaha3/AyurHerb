import { Router, Request, Response } from "express";
import Farmer from "../models/farmer";
import { upsertCropOnChain, getAllCropsFromChain, getFarmerCropsFromChain } from "../controllers/cropController";
import { Crop } from "../models/crop";

const router = Router();

// --- Add / Upsert a crop ---
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { farmerId, cropName, season, soilType } = req.body;
    if (!farmerId || !cropName) {
      return res.status(400).json({ success: false, error: "farmerId and cropName are required" });
    }

    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer) return res.status(404).json({ success: false, error: "Farmer not found" });

    const lat = farmer.lat?.toString() || "0.0";
    const lng = farmer.lng?.toString() || "0.0";

    // Save on blockchain
    const { txHash, cropId } = await upsertCropOnChain({
      name: cropName,
      area: "N/A",
      season: season || "",
      soil: soilType || "",
      lat,
      lng,
    });

    if (!farmer.crops) farmer.crops = [];
    farmer.crops.push(
      new Crop({
        cropId: cropId?.toString() || "",
        cropName,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        season,
        soilType,
      })
    );

    await farmer.save();

    return res.json({ success: true, txHash, cropId });
  } catch (err: any) {
    console.error("Error in /crops/add:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
});

// --- Get crops for a specific farmer ---
router.get("/:farmerId", async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;
    const farmer = await Farmer.findOne({ farmerId });
    if (!farmer) return res.status(404).json({ success: false, error: "Farmer not found" });

    const farmerLat = farmer.lat?.toString() || "0.0";
    const farmerLng = farmer.lng?.toString() || "0.0";

    const onChainCrops = await getFarmerCropsFromChain(farmerLat, farmerLng);

    const offChainCrops = farmer.crops?.map((c) => ({
      ...c.toObject(),
      source: "MongoDB",
      farmerName: farmer.name,
      farmerId: farmer.farmerId ?? farmer._id,
    })) || [];

    return res.json({
      success: true,
      crops: [
        ...onChainCrops.map((c) => ({ ...c, source: "Blockchain", farmerName: farmer.name, farmerId: farmer.farmerId ?? farmer._id })),
        ...offChainCrops,
      ],
    });
  } catch (err: any) {
    console.error("Error in /crops/:farmerId:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
});

// --- Get all crops ---
router.get("/", async (_req: Request, res: Response) => {
  try {
    const onChainCrops = await getAllCropsFromChain();
    const farmers = await Farmer.find();
    const offChainCrops: any[] = [];

    farmers.forEach((f) => {
      if (f.crops && f.crops.length > 0) {
        f.crops.forEach((c) => offChainCrops.push({ 
          ...c.toObject(), 
          source: "MongoDB", 
          farmerName: f.name, 
          farmerId: f.farmerId ?? f._id 
        }));
      }
    });

    const allCrops = [
      ...onChainCrops.map((c) => ({ ...c, source: "Blockchain" })),
      ...offChainCrops,
    ];

    return res.json({ success: true, crops: allCrops });
  } catch (err: any) {
    console.error("Error in /crops:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
});

export default router;
