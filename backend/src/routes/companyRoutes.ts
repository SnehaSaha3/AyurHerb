import { Router, Request, Response } from "express";
import { registerCompany, loginCompany } from "../controllers/companyController";
import { companyAuthMiddleware } from "../middlewares/companyAuthMiddleware";
import Company from "../models/company";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter";


const router = Router();


router.post("/register", registerLimiter, registerCompany);
router.post("/login", loginLimiter, loginCompany);


router.get("/me", companyAuthMiddleware, async (req: any, res: Response) => {
  try {
    // -privateKey added: Company now has a custodial wallet key, same
    // as Farmer — /me must never leak it, mirroring farmerRoutes.ts's
    // existing "-password -privateKey" guard.
    const company = await Company.findById(req.user.companyId).select("-password -privateKey");
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({ company });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/:companyId", async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId).select("name address contact");
    if (!company) return res.status(404).json({ success: false, error: "Company not found" });
    res.json({
      success: true,
      company: { companyId: company._id, name: company.name, address: company.address, contact: company.contact },
    });
  } catch {
    res.status(404).json({ success: false, error: "Company not found" });
  }
});


router.get("/", async (_req: Request, res: Response) => {
  try {
    const companies = await Company.find().select("name address contact email");
    const formatted = companies.map((c) => ({
      companyId: c._id,
      name: c.name,
      address: c.address,
      contact: c.contact,
    }));
    res.json({ success: true, companies: formatted });
  } catch (err: any) {
    console.error("Fetch companies error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});


export default router;