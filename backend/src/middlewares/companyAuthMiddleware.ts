import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const companyAuthMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  if (!process.env.JWT_SECRET) {
    console.error("❌ companyAuthMiddleware: JWT_SECRET is not set in this process");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { companyId: string };
    if (!decoded.companyId) {
      return res.status(403).json({ error: "Not a company token" });
    }
    req.user = { companyId: decoded.companyId };
    next();
  } catch (err: any) {
    console.error("companyAuthMiddleware verify failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};