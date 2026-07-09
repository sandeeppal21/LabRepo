const router = require("express").Router();
const { getSubscriptionStatus, bypassPayment } = require("../controllers/paymentController");

// ⚠️ Swap this for whatever auth middleware you already use
// on your other protected routes (the one that sets req.user.id).
const protect = require("../middleware/authMiddleware");

router.get("/status", protect, getSubscriptionStatus);
router.post("/bypass", protect, bypassPayment);

module.exports = router;