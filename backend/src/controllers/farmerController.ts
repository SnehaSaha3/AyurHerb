import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Farmer from "../models/farmer";
import { sendRegistrationEmail } from "../services/EmailService";
import { ethers } from "ethers";
import { encryptPrivateKey } from "../utils/walletCrypto";

export const registerFarmer = async (req: Request, res: Response) => {
  try {
    if (!process.env.JWT_SECRET) {
      // fail before any writes, not after — avoids orphaned farmer/wallet records
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const { name, contact, email, password, address, herb, lat, lng } = req.body;

    if (!name || !email || !password || !herb) {
      return res.status(400).json({ error: "name, email, password & herb are required" });
    }

    const existing = await Farmer.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "A farmer with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const wallet = ethers.Wallet.createRandom();

    const parsedLat = lat !== undefined && lat !== null && lat !== "" ? Number(lat) : null;
    const parsedLng = lng !== undefined && lng !== null && lng !== "" ? Number(lng) : null;
    const hasValidLocation =
      parsedLat !== null && parsedLng !== null && !isNaN(parsedLat) && !isNaN(parsedLng);

    // Only seed a crop with real coordinates. A farmer who registered
    // without granting location (denied permission, no GPS, desktop
    // browser) gets no crop yet rather than a fake pin at (0,0) — they
    // can add one later once AddCrop.tsx captures a real location.
    const newFarmer = new Farmer({
      name,
      contact,
      email,
      password: hashedPassword,
      address,
      herb,
      walletAddress: wallet.address,
      privateKey: encryptPrivateKey(wallet.privateKey),
      lat: hasValidLocation ? String(parsedLat) : undefined,
      lng: hasValidLocation ? String(parsedLng) : undefined,
      crops: hasValidLocation
        ? [
            {
              cropName: herb,
              location: { lat: parsedLat, lng: parsedLng },
              season: "N/A",
              soilType: "N/A",
            },
          ]
        : [],
    });

    await newFarmer.save();

    if (email) {
      await sendRegistrationEmail(email, name);
    }

    const token = jwt.sign(
      { farmerId: newFarmer._id, walletAddress: newFarmer.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, privateKey: _pk, ...safeFarmer } = newFarmer.toObject();

    res.status(201).json({
      message: "Farmer registered successfully",
      farmer: safeFarmer,
      token,
      locationCaptured: hasValidLocation,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Failed to register farmer" });
  }
};

export const loginFarmer = async (req: Request, res: Response) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email & password are required" });
    }

    const farmer = await Farmer.findOne({ email: email.toLowerCase() });
    if (!farmer) {
      return res.status(404).json({ error: "No farmer found with this email" });
    }

    const validPassword = await bcrypt.compare(password, farmer.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { farmerId: farmer._id, walletAddress: farmer.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, privateKey: _pk, ...safeFarmer } = farmer.toObject();

    res.json({
      message: "Login successful",
      farmer: safeFarmer,
      token,
    });
  } catch (error) {
    console.error("Farmer Login Error:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
};