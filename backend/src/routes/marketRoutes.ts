import { Router } from "express";
import {
  getMarketReference,
  getTopCrops,
  getPriceHistory,
} from "../controllers/marketController";

const router = Router();

router.get("/reference/:cropName", getMarketReference);
router.get("/top-crops", getTopCrops);
router.get("/history/:cropName", getPriceHistory);

export default router;