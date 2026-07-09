// backend/routes/reportRoutes.js

const express = require("express");
const router  = express.Router();
const protect  = require("../middleware/authMiddleware");
const {
  initReport, getReport, saveValues,
  verifyReport, listReports,
} = require("../controllers/reportController");

router.use(protect);

router.get  ("/",                    listReports);   // GET  /api/reports
router.post ("/init/:billId",        initReport);    // POST /api/reports/init/:billId
router.get  ("/:billId",             getReport);     // GET  /api/reports/:billId
router.put  ("/:billId/values",      saveValues);    // PUT  /api/reports/:billId/values
router.patch("/:billId/verify",      verifyReport);  // PATCH /api/reports/:billId/verify

module.exports = router;
