import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

function makeToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET || "local-development-secret",
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email
  };
}

router.post("/register", asyncHandler(async (request, response) => {
  const { name, email, password } = request.body || {};
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!cleanName || cleanName.length > 100) {
    return response.status(400).json({ message: "Enter your name (up to 100 characters)." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 160) {
    return response.status(400).json({ message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return response.status(400).json({ message: "Choose a password between 8 and 72 characters." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: cleanName, email: cleanEmail, passwordHash });
  return response.status(201).json({
    token: makeToken(user),
    user: publicUser(user)
  });
}));

router.post("/login", asyncHandler(async (request, response) => {
  const { email, password } = request.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: cleanEmail }).select("+passwordHash");

  if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
    return response.status(401).json({ message: "Email or password is incorrect." });
  }

  return response.json({
    token: makeToken(user),
    user: publicUser(user)
  });
}));

router.get("/me", requireAuth, asyncHandler(async (request, response) => {
  const user = await User.findById(request.userId);
  if (!user) {
    return response.status(401).json({ message: "Your account is no longer available. Please sign in again." });
  }
  return response.json({ user: publicUser(user) });
}));

export default router;
