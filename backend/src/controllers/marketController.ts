import { Request, Response } from "express";
import axios from "axios";

const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:8001";

const AGENTS_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

const TRANSIENT_STATUSES = [502, 503, 504];
const TRANSIENT_CODES = [
  "ECONNABORTED",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(err: any): boolean {
  const status = err?.response?.status;

  if (status) {
    return TRANSIENT_STATUSES.includes(status);
  }

  return TRANSIENT_CODES.includes(err?.code);
}

async function callAgents<T>(request: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await request();
    } catch (err: any) {
      attempt += 1;

      if (!isTransient(err) || attempt >= MAX_ATTEMPTS) {
        throw err;
      }

      await delay(RETRY_DELAY_MS * attempt);
    }
  }
}

function parseDays(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_DAYS;
  }

  return Math.min(Math.max(Math.round(parsed), MIN_DAYS), MAX_DAYS);
}

export const getMarketReference = async (req: Request, res: Response) => {
  const cropName = String(req.params.cropName ?? "").trim();

  if (!cropName) {
    return res.status(400).json({ success: false, error: "cropName is required" });
  }

  const { state, district } = req.query;

  try {
    const agentRes = await callAgents(() =>
      axios.post(
        `${AGENTS_URL}/market/evaluate`,
        {
          cropName,
          state: state || undefined,
          district: district || undefined,
        },
        { timeout: AGENTS_TIMEOUT_MS }
      )
    );

    return res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error("Market reference error:", err?.response?.status ?? err?.code ?? err);

    return res.status(503).json({
      success: false,
      error: "Market service is temporarily unavailable. Please try again in a moment.",
    });
  }
};

export const getTopCrops = async (req: Request, res: Response) => {
  const { limit } = req.query;

  try {
    const agentRes = await callAgents(() =>
      axios.get(`${AGENTS_URL}/market/top-crops`, {
        params: limit ? { limit } : undefined,
        timeout: AGENTS_TIMEOUT_MS,
      })
    );

    return res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error("Top crops error:", err?.response?.status ?? err?.code ?? err);

    return res.json({ success: true, data: [], unavailable: true });
  }
};

export const getPriceHistory = async (req: Request, res: Response) => {
  const cropName = String(req.params.cropName ?? "").trim();

  if (!cropName) {
    return res.status(400).json({ success: false, error: "cropName is required" });
  }

  const days = parseDays(req.query.days);

  try {
    const agentRes = await callAgents(() =>
      axios.get(
        `${AGENTS_URL}/market/price-history/${encodeURIComponent(cropName)}`,
        { params: { days }, timeout: AGENTS_TIMEOUT_MS }
      )
    );

    return res.json({ success: true, data: agentRes.data });
  } catch (err: any) {
    console.error(
      `Price history error for "${cropName}":`,
      err?.response?.status ?? err?.code ?? err
    );

    return res.json({
      success: true,
      unavailable: true,
      data: {
        cropName,
        unit: "kg",
        history: [],
        todayPrice: null,
        changeFromYesterday: 0,
        estimated: true,
        source: "unavailable",
      },
    });
  }
};