import { Request, Response } from "express"
import farmer from "../models/farmer"

export const registerFarmer = async (req: Request, res: Response) => {
  try {
    const { name, contact, address, herb } = req.body

    
    const newFarmer = new farmer({
      name,
      contact,
      address,
      herb,
      image: null 
    });

    await newFarmer.save()

    res.status(201).json({ message: "Farmer registered successfully", farmer: newFarmer })
  } catch (error) {
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
