// routes/userRoutes.js

import express from "express";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password, role });

    res.status(201).json({ message: "User created successfully", id: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", email);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log(" User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      console.log(" Password mismatch for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Debug secret
    console.log(" JWT Secret:", process.env.JWT_SECRET);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log("Login successful", user.email);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(" Server login error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



// Admin-only: List users
router.get("/all", protect, adminOnly, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});


//
// UPDATE PASSWORD (by email)
router.put("/update-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
