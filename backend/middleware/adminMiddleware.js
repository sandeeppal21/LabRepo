// backend/middleware/adminMiddleware.js
// Must be used AFTER authMiddleware.
// Blocks any non-admin from reaching admin-only routes.

module.exports = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access only." });
  next();
};