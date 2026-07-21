const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  initReport, getReport, saveValues,
  verifyReport, listReports,
} = require("../controllers/reportController");

router.use(protect);

router.get("/", listReports);
router.post("/init/:billId", initReport);
router.get("/:billId", getReport);
router.put("/:billId/values", saveValues);
router.patch("/:billId/verify", verifyReport);

module.exports = router;
