import { Router } from "express";
import { anyAuthMiddleware } from "../middlewares/anyAuthMiddleware";
import { getConversation, getInbox, getConversationByIds } from "../controllers/messageController";

const router = Router();

router.get("/chat/:companyId/:farmerId", anyAuthMiddleware, getConversationByIds);
router.get("/inbox", anyAuthMiddleware, getInbox);
router.get("/:otherId", anyAuthMiddleware, getConversation);

export default router;