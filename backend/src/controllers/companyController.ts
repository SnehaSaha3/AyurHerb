import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Company from "../models/company";

export const registerCompany = async (req: Request, res: Response) => {
  try {
    const { name, email, password, contact, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email & password are required" });
    }

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "A company with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCompany = new Company({
      name,
      email,
      password: hashedPassword,
      contact,
      address,
    });

    await newCompany.save();

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign(
      { companyId: newCompany._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Company registered successfully",
      company: {
        id: newCompany._id,
        name: newCompany.name,
        email: newCompany.email,
        contact: newCompany.contact,
        address: newCompany.address,
      },
      token,
    });
  } catch (error) {
    console.error("Company Registration Error:", error);
    res.status(500).json({ error: "Failed to register company" });
  }
};

export const loginCompany = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email & password are required" });
    }

    const company = await Company.findOne({ email: email.toLowerCase() });
    if (!company) {
      return res.status(404).json({ error: "No company found with this email" });
    }

    const validPassword = await bcrypt.compare(password, company.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const token = jwt.sign(
      { companyId: company._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        contact: company.contact,
        address: company.address,
      },
      token,
    });
  } catch (error) {
    console.error("Company Login Error:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
};