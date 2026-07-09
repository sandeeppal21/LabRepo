const express = require("express");
const protect = require("../middleware/authMiddleware.js");

const router = express.Router();

router.get("/dashboard", protect, (req, res) => {
  res.json({
    message: "You are authenticated!",
    userId: req.user,
  });
});

module.exports = router;
