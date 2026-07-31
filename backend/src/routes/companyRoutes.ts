import { Router, Response } from "express";
import { registerCompany, loginCompany } from "../controllers/companyController"
import { companyAuthMiddleware } from "../middlewares/companyAuthMiddleware";
import Company from "../models/company";

const router = Router();

router.post("/register", registerCompany);
router.post("/login", loginCompany);

/* --- Get current logged-in company (for restoring session on page load) --- */
router.get("/me", companyAuthMiddleware, async (req: any, res: Response) => {
  try {
    const company = await Company.findById(req.user.companyId).select("-password");
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;