const jwt  = require("jsonwebtoken");
const User = require("../models/userModel");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided." });

    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Fetch real _id from DB (needed where vendorId is ObjectId) ──
    const user = await User.findById(decoded.id).select("_id vendorId role status").lean();
    if (!user) return res.status(401).json({ message: "User not found." });

    req.user = {
      id:       decoded.id,         // JWT id (User _id string)
      objectId: user._id,           // ← real MongoDB ObjectId — use this in VendorTestPrice queries
      role:     decoded.role,
      status:   decoded.status,
      vendorId: decoded.vendorId,   // custom string "VND-0FF31FD5" — use this in Patient/Bill queries
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};