const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User               = require("../models/User");
const BlacklistedToken   = require("../models/BlacklistedToken");
const { protect }        = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationHelper");
const { validatePassword }   = require("../utils/passwordValidator");
const { authLimiter }    = require("../middleware/security");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });


router.post(
  "/register",
  authLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Min 8 characters"),
    body("role").isIn(["customer", "shopkeeper"]).withMessage("Invalid role"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, phone } = req.body;

    
    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      return res.status(400).json({
        message: "Password is not strong enough",
        errors: pwCheck.errors,
      });
    }

    try {
      if (email === process.env.ADMIN_EMAIL || email === process.env.EMAIL)
        return res.status(400).json({ message: "This email is reserved" });

      const exists = await User.findOne({ email });
      if (exists)
        return res.status(400).json({ message: "Email already registered" });

      const user = await User.create({ name, email, password, role, phone });

      
      await createNotification({
        recipientId: user._id,
        type: "welcome",
        title: "Welcome to LocalMart! 🎉",
        message: `Hi ${user.name}! Account created. ${
          user.role === "shopkeeper"
            ? "Start by creating your shop."
            : "Start searching for products!"
        }`,
        link: user.role === "shopkeeper" ? "/create-shop" : "/search",
      });

      res.status(201).json({
        _id: user._id, name: user.name,
        email: user.email, role: user.role,
        token: generateToken(user._id),
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await user.matchPassword(password)))
        return res.status(401).json({ message: "Invalid email or password" });

      if (user.isBanned)
        return res.status(403).json({ message: "Your account has been banned" });

      const redirectTo =
        user.role === "admin"      ? "/admin"     :
        user.role === "shopkeeper" ? "/dashboard" : "/search";

      res.json({
        _id: user._id, name: user.name,
        email: user.email, role: user.role,
        phone: user.phone || "",
        token: generateToken(user._id),
        redirectTo,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

router.post("/logout", protect, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token);

    await BlacklistedToken.create({
      token,
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name)  user.name  = name;
    if (phone !== undefined) user.phone = phone;

    const updated = await user.save();
    res.json({
      _id: updated._id, name: updated.name,
      email: updated.email, role: updated.role,
      phone: updated.phone, token: generateToken(updated._id),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords required" });

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) {
      return res.status(400).json({
        message: "New password is not strong enough",
        errors: pwCheck.errors,
      });
    }

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "If this email exists, OTP was sent" });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;

    user.resetOtp        = otp;
    user.resetOtpExpires = expires;
    await user.save();

    console.log(`\n🔑 OTP for ${email}: ${otp} (15 min)\n`);

    res.json({
      message: "OTP sent! Check server console.",
      devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields required" });

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) {
      return res.status(400).json({
        message: "Password not strong enough",
        errors: pwCheck.errors,
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.resetOtp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > user.resetOtpExpires)
      return res.status(400).json({ message: "OTP expired" });

    user.password        = newPassword;
    user.resetOtp        = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: "Password reset! You can now login." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;