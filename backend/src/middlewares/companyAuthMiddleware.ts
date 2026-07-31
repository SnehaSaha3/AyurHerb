import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const companyAuthMiddleware = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { companyId: string };

    if (!decoded.companyId) {
      return res.status(403).json({ error: "Not a company token" });
    }

    req.user = { companyId: decoded.companyId };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};