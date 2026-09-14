import { Router } from "express";

import {
  verifyPublicOrder,
} from "../controllers/publicVerificationController";

const router = Router();

router.get(
  "/verify/:orderId/:qrToken",
  verifyPublicOrder
);

export default router;