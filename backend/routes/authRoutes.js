// backend/routes/authRoutes.js

const express    = require("express");
const upload     = require("../config/multer");
const auth       = require("../middleware/authMiddleware");
const adminOnly  = require("../middleware/adminMiddleware");
const {
  register,
  login,
  getMe,
  getAllVendors,
  approveVendor,
  rejectVendor,
  updateLogo,
} = require("../controllers/authController");

const router = express.Router();

// ── Middleware: generate vendorId BEFORE multer runs ─────
// Multer uses req.vendorId to name the uploaded file.
// Without this, the filename would be a temp name.
const assignVendorId = (req, _res, next) => {
  req.vendorId = "VND-" + require("crypto").randomBytes(4).toString("hex").toUpperCase();
  next();
};

// ════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ════════════════════════════════════════════════════════

// POST /api/auth/register
// multipart/form-data — includes optional logo image
router.post(
  "/register",
  assignVendorId,                   // 1. generate VND-XXXXXXXX
  upload.single("logo"),            // 2. save logo as logos/VND-XXXXXXXX.ext
  register                          // 3. create user in DB
);

// POST /api/auth/login
router.post("/login", login);

// ════════════════════════════════════════════════════════
//  PROTECTED — any logged-in user
// ════════════════════════════════════════════════════════

// GET /api/auth/me
router.get("/me", auth, getMe);

// PATCH /api/auth/update-logo
// Vendor can update their logo after approval
router.patch(
  "/update-logo",
  auth,
  (req, _res, next) => {
    // reuse their existing vendorId for the filename
    req.vendorId = req.user.vendorId;
    next();
  },
  upload.single("logo"),
  updateLogo
);

// ════════════════════════════════════════════════════════
//  ADMIN-ONLY ROUTES
// ════════════════════════════════════════════════════════

// GET /api/auth/vendors  — list all vendors
router.get("/vendors", auth, adminOnly, getAllVendors);

// PATCH /api/auth/vendors/:id/approve
router.patch("/vendors/:id/approve", auth, adminOnly, approveVendor);

// PATCH /api/auth/vendors/:id/reject
router.patch("/vendors/:id/reject", auth, adminOnly, rejectVendor);

module.exports = router;