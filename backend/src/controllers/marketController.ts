import { Request, Response } from "express";
import axios from "axios";

const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:8001";

export const getMarketReference = async (req: Request, res: Response) => {
  try {
    const { cropName } = req.params;

    if (!cropName) {
      return res.status(400).json({ success: false, error: "cropName is required" });
    }

    const { state, district } = req.query;

    const agentRes = await axios.post(`${AGENTS_URL}/market/evaluate`, {
      cropName,
      state: state || undefined,
      district: district || undefined,
    });

    res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error("Market reference error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch market reference" });
  }
};

export const getTopCrops = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const agentRes = await axios.get(`${AGENTS_URL}/market/top-crops`, {
      params: limit ? { limit } : undefined,
    });
    res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error("Top crops error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch top crops" });
  }
};

export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const { cropName } = req.params;

    if (!cropName) {
      return res.status(400).json({ success: false, error: "cropName is required" });
    }

    const { days } = req.query;

    const agentRes = await axios.get(
      `${AGENTS_URL}/market/price-history/${encodeURIComponent(cropName)}`,
      { params: days ? { days } : undefined },
    );

    res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error("Price history error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch price history" });
  }
};