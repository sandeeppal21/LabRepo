// backend/routes/referralRoutes.js

const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getStats,
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} = require("../controllers/referralController");

router.use(protect);

router.get   ("/stats",      getStats);    // GET    /api/referrals/stats
router.get   ("/",           getEntries);  // GET    /api/referrals?category=doctor&page=1&search=
router.post  ("/",           createEntry); // POST   /api/referrals
router.put   ("/:entryId",   updateEntry); // PUT    /api/referrals/:entryId
router.delete("/:entryId",   deleteEntry); // DELETE /api/referrals/:entryId

module.exports = router;