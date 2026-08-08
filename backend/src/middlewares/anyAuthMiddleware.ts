import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const anyAuthMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  if (!process.env.JWT_SECRET) {
    console.error("❌ anyAuthMiddleware: JWT_SECRET is not set in this process");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      farmerId?: string;
      companyId?: string;
    };

    if (decoded.farmerId) {
      req.user = { id: decoded.farmerId, type: "farmer" };
    } else if (decoded.companyId) {
      req.user = { id: decoded.companyId, type: "company" };
    } else {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    next();
  } catch (err: any) {
    console.error("anyAuthMiddleware verify failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};