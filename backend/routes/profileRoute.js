const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const {
  getProfile,
  updateProfile,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  changePassword,
} = require("../controllers/profileController");
const protect = require("../middleware/authMiddleware");

// ── Logo upload dir ────────────────────────────────────────
const logoDir = path.join(__dirname, "..", "uploads", "logos");
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const vendorId = req.user.vendorId || req.user.id;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${vendorId}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(png|jpeg|jpg|webp)/;
    allowed.test(file.mimetype) ? cb(null, true) : cb(new Error("Only PNG, JPG, WEBP images are allowed."));
  },
});

// ── Staff signature upload dir ──────────────────────────────
const staffSigDir = path.join(__dirname, "..", "uploads", "staff-signatures");
if (!fs.existsSync(staffSigDir)) fs.mkdirSync(staffSigDir, { recursive: true });


const assignStaffId = (req, res, next) => {
  req.staffId = req.params.staffId || new mongoose.Types.ObjectId().toString();
  next();
};

const staffSigStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, staffSigDir),
  filename: (req, file, cb) => {
    const vendorId = req.user.vendorId || req.user.id;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${vendorId}_${req.staffId}${ext}`); // unique per staff member
  },
});

const uploadStaffSignature = multer({
  storage: staffSigStorage,
  limits: { fileSize: 500 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(png|jpeg|jpg|webp)/;
    allowed.test(file.mimetype) ? cb(null, true) : cb(new Error("Only PNG, JPG, WEBP images are allowed."));
  },
});

router.use(protect);

router.get("/me", getProfile);
router.put("/me", uploadLogo.single("logo"), updateProfile);

router.post("/me/staff", assignStaffId, uploadStaffSignature.single("signature"), addStaffMember);
router.put("/me/staff/:staffId", assignStaffId, uploadStaffSignature.single("signature"), updateStaffMember);
router.delete("/me/staff/:staffId", deleteStaffMember);

router.put("/me/password", changePassword);

module.exports = router;