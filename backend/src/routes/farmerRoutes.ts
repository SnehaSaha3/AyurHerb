import { Router, Request, Response } from "express";
import Farmer from "../models/farmer";
import {registerFarmer,loginFarmer, getFarmerActivity} from "../controllers/farmerController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { loginLimiter, registerLimiter} from "../middlewares/rateLimiter";

const router = Router();


router.post("/register",registerLimiter,registerFarmer);

router.post(  "/login",loginLimiter,loginFarmer);



router.get(
  "/me",
  authMiddleware,
  async (req: any, res: Response) => {
    try {
      const farmer =
        await Farmer.findById(
          req.user.farmerId
        ).select(
          "-password -privateKey"
        );

      if (!farmer) {
        return res.status(404).json({
          success: false,
          error: "Farmer not found",
        });
      }

      return res.json({
        success: true,
        farmer,
      });

    } catch (err) {
      console.error(
        "Fetch farmer /me error:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);



router.get(
  "/activity",
  authMiddleware,
  getFarmerActivity
);



router.get(
  "/:farmerId",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const farmer =
        await Farmer.findById(
          req.params.farmerId
        ).select(
          "name address herb walletAddress"
        );

      if (!farmer) {
        return res.status(404).json({
          success: false,
          error: "Farmer not found",
        });
      }

      return res.json({
        success: true,

        farmer: {
          farmerId: farmer._id,
          name: farmer.name,
          address: farmer.address,
          herb: farmer.herb,
          walletAddress:
            farmer.walletAddress,
        },
      });

    } catch (err) {
      return res.status(404).json({
        success: false,
        error: "Farmer not found",
      });
    }
  }
);

router.get(
  "/",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const farmers =
        await Farmer.find({
          walletAddress: {
            $exists: true,
            $ne: null,
            $nin: [""],
          },
        }).select(
          "name address herb walletAddress crops lat lng"
        );

      const formatted =
        farmers.map((farmer: any) => ({
          farmerId: farmer._id,
          name: farmer.name,
          address: farmer.address,
          herb: farmer.herb,
          walletAddress:
            farmer.walletAddress,
          crops:
            farmer.crops || [],
          lat: farmer.lat,
          lng: farmer.lng,
        }));

      return res.json({
        success: true,
        farmers: formatted,
      });

    } catch (err: any) {
      console.error(
        "Fetch farmers error:",
        err
      );

      return res.status(500).json({
        success: false,
        error:
          err.message ||
          "Server error",
      });
    }
  }
);


export default router;