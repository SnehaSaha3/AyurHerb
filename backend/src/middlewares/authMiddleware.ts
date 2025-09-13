import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { farmerId: string };
    req.user = { farmerId: decoded.farmerId };   // <-- attach under user
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};