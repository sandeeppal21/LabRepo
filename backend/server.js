// backend/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const profile = require("./routes/profileRoute");
const test = require("./routes/testRoutes");
const Patient = require("./routes/patientRoutes");
const Bill = require("./routes/billRoutes");
const Report = require("./routes/reportRoutes")
const referralRoutes = require("./routes/referralRoutes");
const PublicReport = require("./routes/publicRoutes");
const Admin = require("./routes/adminRoutes");
const Payment = require("./routes/paymentRoutes");


const app = express();

// ── Connect MongoDB ───────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
    origin: [
        process.env.CLIENT_URL,
        "http://localhost:5173"
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for uploaded logos ────────────────
// Any logo stored at  uploads/logos/VND-XXXXXXXX.png
// is publicly accessible at  GET /uploads/logos/VND-XXXXXXXX.png
// This URL is what gets embedded in PDF reports.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ── API Routes ────────────────────────────────────────────
app.use("/api/public", PublicReport);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profile);
app.use("/api/tests", test);

// ── Add to server.js ──────────────────────────────────
app.use("/api/patients", Patient);
app.use("/api/bills", Bill);
app.use("/api/reports", Report);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin", Admin);
app.use("/api/payment", Payment);


// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
