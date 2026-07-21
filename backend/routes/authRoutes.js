// backend/routes/authRoutes.js

const express = require("express");
const upload = require("../config/multer");
const auth = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
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


const assignVendorId = (req, _res, next) => {
  req.vendorId = "VND-" + require("crypto").randomBytes(4).toString("hex").toUpperCase();
  next();
};

router.post(
  "/register",
  assignVendorId,                   // 1. generate VND-XXXXXXXX
  upload.single("logo"),            // 2. save logo as logos/VND-XXXXXXXX.ext
  register                          // 3. create user in DB
);

// POST /api/auth/login
router.post("/login", login);

router.get("/me", auth, getMe);

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


router.get("/vendors", auth, adminOnly, getAllVendors);

// PATCH /api/auth/vendors/:id/approve
router.patch("/vendors/:id/approve", auth, adminOnly, approveVendor);

// PATCH /api/auth/vendors/:id/reject
router.patch("/vendors/:id/reject", auth, adminOnly, rejectVendor);

module.exports = router;