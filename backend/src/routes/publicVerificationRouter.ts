import { Router } from "express";

import {
  verifyPublicOrder,
  generatePublicProvenancePdf,
} from "../controllers/publicVerificationController";

const router = Router();

router.get(
  "/verify/:orderId/:qrToken",
  verifyPublicOrder
);

router.get(
  "/verify/:orderId/:qrToken/pdf",
  generatePublicProvenancePdf
);

export default router;