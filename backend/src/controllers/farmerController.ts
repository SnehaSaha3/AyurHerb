import { Request, Response } from "express";
import Farmer from "../models/farmer";
import { sendRegistrationEmail } from "../services/EmailService";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";

export const registerFarmer = async (req: Request, res: Response) => {
  try {
    const { name, contact, email, address, herb } = req.body;

    // ✅ Generate blockchain wallet
    const wallet = ethers.Wallet.createRandom();

    // ✅ Create farmer with wallet + default crop
    const newFarmer = new Farmer({
      name,
      contact,
      email,
      address,
      herb,
      walletAddress: wallet.address,
      privateKey: wallet.privateKey, // ⚠️ store securely in real-world apps
      crops: [
        {
          cropId: "0", // dummy/default id
          cropName: "Default Crop",
          location: { lat: 0, lng: 0 },
          season: "N/A",
          soilType: "N/A",
        },
      ],
    });

    await newFarmer.save();

    // ✅ Send registration email
    if (email) {
      await sendRegistrationEmail(email, name);
    }

    // ✅ Generate JWT (safer payload)
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign(
      {
        farmerId: newFarmer._id,
        walletAddress: newFarmer.walletAddress,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // longer validity (can change as per need)
    );

    res.status(201).json({
      message: "Farmer registered successfully",
      farmer: newFarmer,
      token,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Failed to register farmer", details: error });
  }
};