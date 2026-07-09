// backend/models/patientModel.js

const mongoose = require("mongoose");

// ── Auto-generate Patient ID: YYMMDD + 3-digit seq e.g. 260512001 ──
async function generatePatientId() {
  const today  = new Date();
  const dd     = String(today.getDate()).padStart(2, "0");
  const mm     = String(today.getMonth() + 1).padStart(2, "0");
  const yy     = String(today.getFullYear()).slice(2);
  const prefix = `${yy}${mm}${dd}`;

  const last = await mongoose.model("Patient").findOne(
    { patientId: { $regex: `^${prefix}` } },
    { patientId: 1 },
    { sort: { patientId: -1 } }
  );

  const seq = last
    ? String(parseInt(last.patientId.slice(6)) + 1).padStart(3, "0")
    : "001";

  return `${prefix}${seq}`;
}

// ─────────────────────────────────────────────────────────────
const patientSchema = new mongoose.Schema(
  {
    // ── Vendor link (custom string ID e.g. "VND-0FF31FD5") ──
    vendorId: {
      type:     String,
      required: true,
    },

    // ── Auto-generated unique patient ID e.g. "260512001" ───
    patientId: {
      type:   String,
      unique: true,   // index created by unique:true — do NOT add index:true
    },

    // ── Demographics ─────────────────────────────────────────
    designation: {
      type:    String,
      enum:    ["MR.", "MRS.", "MS.", "DR.", "MASTER", "BABY"],
      default: "MR.",
    },
    firstName: {
      type:     String,
      required: [true, "First name is required"],
      trim:     true,
    },
    lastName: {
      type:    String,
      trim:    true,
      default: "",
    },
    gender: {
      type:     String,
      enum:     ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    age: {
      type:     Number,
      required: [true, "Age is required"],
      min:      [0, "Age cannot be negative"],
    },
    ageType: {
      type:    String,
      enum:    ["year", "month", "day"],
      default: "year",
    },

    // ── Contact ───────────────────────────────────────────────
    phone: {
      type:    String,
      trim:    true,
      default: "",
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   "",
    },
    address: {
      type:    String,
      trim:    true,
      default: "",
    },

    // ── Lab context ───────────────────────────────────────────
    ownerName: {
      type:    String,
      trim:    true,
      default: "",
    },

    // Sub-document _id from ReferralList.doctors[] array
    // No `ref` because Mongoose cannot populate sub-doc _ids directly
    referringDoctorId: {
      type:    mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referringDoctorName: {
      type:    String,
      trim:    true,
      default: "",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Rule: declare EITHER index:true on field OR schema.index() — never both.

// Primary lookup: all patients for a vendor
patientSchema.index({ vendorId: 1, createdAt: -1 });

// Fast search by phone within a vendor
patientSchema.index({ vendorId: 1, phone: 1 });

// Fast search by name within a vendor (case-insensitive via collation at query time)
patientSchema.index({ vendorId: 1, firstName: 1, lastName: 1 });

// patientId is already indexed via unique:true above — no extra index needed

// ── Pre-save: auto-generate patientId ─────────────────────────
patientSchema.pre("save", async function (next) {
  if (!this.patientId) {
    this.patientId = await generatePatientId();
  }
  next();
});

module.exports = mongoose.model("Patient", patientSchema);