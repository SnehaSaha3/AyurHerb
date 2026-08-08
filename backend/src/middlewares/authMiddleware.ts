import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  if (!process.env.JWT_SECRET) {
    console.error("❌ authMiddleware: JWT_SECRET is not set in this process");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { farmerId: string };
    if (!decoded.farmerId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }
    req.user = { farmerId: decoded.farmerId };
    next();
  } catch (err: any) {
    console.error("authMiddleware verify failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};