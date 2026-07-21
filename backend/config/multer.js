const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ── Ensure upload directory exists ───────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "logos");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Storage engine ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    // Use vendorId from body if available, else timestamp fallback.
    // vendorId is generated in the controller BEFORE calling multer,
    // so we attach it to req.vendorId first (see authController).
    const base = req.vendorId || `tmp-${Date.now()}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${base}${ext}`);
  },
});

// ── File filter — images only ─────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed for the logo (JPEG, PNG, WEBP, SVG)."), false);
  }
};

// ── Multer instance ───────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max
  },
});

module.exports = upload;