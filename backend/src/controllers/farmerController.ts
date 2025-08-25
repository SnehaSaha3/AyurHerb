import { Request, Response } from "express"
import farmer from "../models/farmer"
import jwt from "jsonwebtoken"
import { sendRegistrationEmail } from "../services/EmailService"

// Register Farmer and Generate Token + Send Email
export const registerFarmer = async (req: Request, res: Response) => {
  try {
    const { name, contact, email, address, herb } = req.body;

    
    const newFarmer = new farmer({
      name,
      contact,
      email,
      address,
      herb,
    });

    await newFarmer.save();

    
    if (email) {
      await sendRegistrationEmail(email, name);
    }

   
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
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Failed to register farmer", details: error })
  }
};


export const getFarmers = async (req: Request, res: Response) => {
  try {
    const farmers = await farmer.find()
    res.status(200).json(farmers)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch farmers", details: error })
  }
}
