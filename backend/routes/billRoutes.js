// backend/routes/billRoutes.js
const express = require("express");
const router  = express.Router();
const  protect  = require("../middleware/authMiddleware");
const { createBill, getBills, getBill, updateStatus } = require("../controllers/billController");

router.use(protect);
router.post("/",              createBill);
router.get("/",               getBills);
router.get("/:id",            getBill);
router.patch("/:id/status",   updateStatus);

module.exports = router;

