// backend/utils/seedAdmin.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/userModel");

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  await User.deleteOne({ role: "admin" });
  console.log("Cleared old admin.");

  const plainPassword = process.env.ADMIN_PASSWORD || "Admin@1234";
  const hash = await bcrypt.hash(plainPassword, 10);

  const admin = await User.create({
    name:     "LabRepo Admin",
    email:    (process.env.ADMIN_EMAIL || "admin@labrepo.in").toLowerCase(),
    password: hash,
    role:     "admin",
    status:   "approved", // ✅ matches your enum
  });

  console.log("✅ Admin created!");
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Password : ${plainPassword}`);
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});