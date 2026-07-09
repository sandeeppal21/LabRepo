// backend/routes/publicRoutes.js
// NO auth middleware — these routes are public (accessed via QR scan)

const express = require("express");
const router = express.Router();
const { getPublicReport, getFullReport } = require("../controllers/publicController");

// GET /api/public/report/:billId
router.get("/report/:billId", getPublicReport);
router.get("/report/:billId/full", getFullReport);   // ← ADD

module.exports = router;
