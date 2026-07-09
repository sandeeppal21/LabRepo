const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");   // single function export
const requireAdmin = require("../middleware/adminMiddleware"); // single function export
const { getAllVendors, getVendorById } = require("../controllers/adminController");

router.get("/vendors", protect, requireAdmin, getAllVendors);
router.get("/vendors/:id", protect, requireAdmin, getVendorById);

module.exports = router;