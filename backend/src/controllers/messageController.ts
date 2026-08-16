import { Response } from "express";
import Message from "../models/message";
import Farmer from "../models/farmer";
import Company from "../models/company";

export const getConversation = async (req: any, res: Response) => {
  try {
    const { id: selfId, type: selfType } = req.user;
    const { otherId } = req.params;
    const otherType = selfType === "farmer" ? "company" : "farmer";

    if (!otherId) {
      return res.status(400).json({ error: "otherId is required" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: selfId, senderType: selfType, receiverId: otherId, receiverType: otherType },
        { senderId: otherId, senderType: otherType, receiverId: selfId, receiverType: selfType },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (err: any) {
    console.error("Fetch conversation error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

export const getInbox = async (req: any, res: Response) => {
  try {
    const { id: selfId, type: selfType } = req.user;

    const messages = await Message.find({
      $or: [
        { senderId: selfId, senderType: selfType },
        { receiverId: selfId, receiverType: selfType },
      ],
    }).sort({ createdAt: -1 });

    const conversations = new Map <
      string,
      { otherId: string; otherType: "farmer" | "company"; lastMessage: string; lastAt: Date }
    >();

    for (const m of messages) {
      const isSelfSender = m.senderId === selfId && m.senderType === selfType;
      const otherId = isSelfSender ? m.receiverId : m.senderId;
      const otherType = isSelfSender ? m.receiverType : m.senderType;
      const key = `${otherType}:${otherId}`;

      if (!conversations.has(key)) {
        conversations.set(key, { otherId, otherType, lastMessage: m.text, lastAt: m.createdAt });
      }
    }

    const enriched = await Promise.all(
      Array.from(conversations.values()).map(async (c) => {
        const doc =
          c.otherType === "farmer"
            ? await Farmer.findById(c.otherId).select("name address")
            : await Company.findById(c.otherId).select("name address");
        return { ...c, name: doc?.name || "Unknown", address: doc?.address || "" };
      })
    );

    res.json({ success: true, conversations: enriched });
  } catch (err: any) {
    console.error("Fetch inbox error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch inbox" });
  }
};

/**
 * Conversation between one company and one farmer. NOW also marks every
 * message sent TO the requester in this thread as read — this is the
 * "opening a WhatsApp chat clears the badge" behavior. No separate
 * mark-read endpoint needed; opening the thread IS reading it.
 */
export const getConversationByIds = async (req: any, res: Response) => {
  try {
    const { companyId, farmerId } = req.params;
    const { id: selfId, type: selfType } = req.user;

    const isParticipant =
      (selfType === "company" && selfId === companyId) ||
      (selfType === "farmer" && selfId === farmerId);

    if (!isParticipant) {
      return res.status(403).json({ success: false, error: "Not a participant in this conversation" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: companyId, senderType: "company", receiverId: farmerId, receiverType: "farmer" },
        { senderId: farmerId, senderType: "farmer", receiverId: companyId, receiverType: "company" },
      ],
    }).sort({ createdAt: 1 });

    const otherId = selfType === "farmer" ? companyId : farmerId;
    const otherType = selfType === "farmer" ? "company" : "farmer";

    await Message.updateMany(
      { senderId: otherId, senderType: otherType, receiverId: selfId, receiverType: selfType, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, messages });
  } catch (err: any) {
    console.error("Fetch conversation error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

/**
 * Unread count per sender for the badge next to each company/farmer in
 * the sidebar list — e.g. { "<companyId>": 3, "<companyId2>": 1 }.
 */
export const getUnreadCounts = async (req: any, res: Response) => {
  try {
    const { id: selfId, type: selfType } = req.user;

    const counts = await Message.aggregate([
      { $match: { receiverId: selfId, receiverType: selfType, read: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const unreadCounts: Record<string, number> = {};
    counts.forEach((c: any) => {
      unreadCounts[c._id] = c.count;
    });

    res.json({ success: true, unreadCounts });
  } catch (err: any) {
    console.error("Fetch unread counts error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch unread counts" });
  }
};