const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getStats,
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} = require("../controllers/referralController");

router.use(protect);

router.get("/stats", getStats);
router.get("/", getEntries);
router.post("/", createEntry);
router.put("/:entryId", updateEntry);
router.delete("/:entryId", deleteEntry);

module.exports = router;