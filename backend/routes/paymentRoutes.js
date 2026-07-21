const router = require("express").Router();
const { getSubscriptionStatus, bypassPayment } = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");

router.get("/status", protect, getSubscriptionStatus);
router.post("/bypass", protect, bypassPayment);

module.exports = router;