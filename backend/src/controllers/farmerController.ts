import { Request, Response } from "express";
import farmer from "../models/farmer";
import jwt from "jsonwebtoken";

// ✅ Register Farmer and Generate Token
export const registerFarmer = async (req: Request, res: Response) => {
  try {
    const { name, contact, address, herb } = req.body;

    // Create new farmer
    const newFarmer = new farmer({
      name,
      contact,
      address,
      herb,
      image: null, // default null if not provided
    });

    await newFarmer.save();

    // ✅ Create token using MongoDB _id
    const token = jwt.sign(
      { farmerId: newFarmer._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "Farmer registered successfully",
      farmer: newFarmer,
      token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to register farmer", details: error });
  }
};

// ✅ Fetch all farmers
export const getFarmers = async (req: Request, res: Response) => {
  try {
    const farmers = await farmer.find();
    res.status(200).json(farmers);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch farmers", details: error });
  }
};
