import { Router, Request, Response } from "express";
import Message from "../models/message";

const router = Router();

/* ---------------- SEND MESSAGE ---------------- */
router.post("/send", async (req: Request, res: Response) => {
  try {
    const { senderId, senderType, receiverId, receiverType, text } = req.body;

    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const message = new Message({
      senderId,
      senderType,
      receiverId,
      receiverType,
      text,
    });

    await message.save();

    res.json({ success: true, message });
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ---------------- GET CONVERSATION ---------------- */
router.get("/chat/:user1/:user2", async (req: Request, res: Response) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (err) {
    console.error("Fetch Chat Error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ---------------- GET ALL CHATS FOR USER ---------------- */
router.get("/inbox/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (err) {
    console.error("Inbox Error:", err);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

export default router;