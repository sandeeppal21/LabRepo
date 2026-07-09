// backend/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const User = require("../models/userModel");

// ── Helper: sign JWT ──────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, status: user.status, vendorId: user.vendorId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ════════════════════════════════════════════════════════
//  REGISTER  —  POST /api/auth/register
//  Accepts multipart/form-data because of logo upload.
//  Flow:
//    1. Generate vendorId early (multer uses it for filename)
//    2. Multer middleware runs (see authRoutes)
//    3. Hash password
//    4. Create user with logo path
// ════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { name, email, password, businessName, phone, address, city, state } = req.body;

    // ── Basic validation ──────────────────────────────────
    if (!name || !email || !password) {
      // if a file was uploaded but validation fails, delete it
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    // ── Duplicate email check ─────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // ── Hash password ─────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Build logo object if file uploaded ────────────────
    let logoData = { path: "", originalName: "", mimeType: "" };
    if (req.file) {
      // req.vendorId was set in route middleware (see authRoutes.js)
      const relativePath = `logos/${path.basename(req.file.path)}`;
      logoData = {
        path: relativePath,           // "logos/VND-3F8A1C2B.png"
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };
    }

    // ── Create user ───────────────────────────────────────
    const user = await User.create({
      vendorId: req.vendorId, // set by middleware in authRoutes
      name,
      email,
      password: hashedPassword,
      businessName: businessName || "",
      phone: phone || "",
      address: address || "",
      city: city || "",
      state: state || "",
      logo: logoData,
      role: "vendor",
      status: "pending",   // admin must approve before login works
    });

    return res.status(201).json({
      message: "Registration successful. Awaiting admin approval.",
      vendorId: user.vendorId,
    });
  } catch (err) {
    console.error("Register error:", err);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Server error during registration." });
  }
};

// ════════════════════════════════════════════════════════
//  LOGIN  —  POST /api/auth/login
// ════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    // ── Find user ─────────────────────────────────────────
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid credentials." });

    // ── Check password ────────────────────────────────────
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials." });

    // ── Vendor status gate ────────────────────────────────
    if (user.role === "vendor" && user.status === "pending")
      return res.status(403).json({
        message: "Your account is pending admin approval.",
        status: "pending",
      });

    if (user.role === "vendor" && user.status === "rejected")
      return res.status(403).json({
        message: `Your vendor request was rejected. Reason: ${user.rejectionReason || "No reason given."}`,
        status: "rejected",
      });

    // ── Issue JWT ─────────────────────────────────────────
    const token = signToken(user);

    return res.status(200).json({
      token,
      role: user.role,
      status: user.status,
      vendorId: user.vendorId,
      name: user.name,
      businessName: user.businessName,
      logoUrl: user.logoUrl,
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      phone: user.phone || "",
      email: user.email || "",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
};

// ════════════════════════════════════════════════════════
//  GET ME  —  GET /api/auth/me
//  Returns current logged-in user's profile.
// ════════════════════════════════════════════════════════
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ════════════════════════════════════════════════════════
//  ADMIN: GET ALL VENDORS  —  GET /api/auth/vendors
// ════════════════════════════════════════════════════════
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: "vendor" }).sort({ createdAt: -1 });
    return res.status(200).json(vendors);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ════════════════════════════════════════════════════════
//  ADMIN: APPROVE VENDOR  —  PATCH /api/auth/vendors/:id/approve
// ════════════════════════════════════════════════════════
exports.approveVendor = async (req, res) => {
  try {
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved", approvedAt: new Date(), rejectionReason: "" },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found." });

    // TODO: send approval email here (nodemailer)

    return res.status(200).json({ message: "Vendor approved.", vendor });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ════════════════════════════════════════════════════════
//  ADMIN: REJECT VENDOR  —  PATCH /api/auth/vendors/:id/reject
// ════════════════════════════════════════════════════════
exports.rejectVendor = async (req, res) => {
  try {
    const { reason } = req.body;
    const vendor = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason || "Not specified." },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found." });

    // TODO: send rejection email here (nodemailer)

    return res.status(200).json({ message: "Vendor rejected.", vendor });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ════════════════════════════════════════════════════════
//  UPDATE LOGO  —  PATCH /api/auth/update-logo
//  Lets an approved vendor update their logo later.
// ════════════════════════════════════════════════════════
exports.updateLogo = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // ── Delete old logo file if exists ───────────────────
    if (user.logo?.path) {
      const oldPath = path.join(__dirname, "..", "uploads", user.logo.path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const relativePath = `logos/${path.basename(req.file.path)}`;
    user.logo = {
      path: relativePath,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    };
    await user.save();

    return res.status(200).json({
      message: "Logo updated successfully.",
      logoUrl: user.logoUrl,
    });
  } catch (err) {
    console.error("Logo update error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};