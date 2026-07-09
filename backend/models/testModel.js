const mongoose = require("mongoose");

// ── Parameter schema ──────────────────────────────────────
const parameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // numeric  → number entry with min/max range
  // text     → free text result
  // option   → fixed choices e.g. Positive / Negative
  // heading  → section label only, no value entered (bold group title in report)
  fieldType: {
    type: String,
    enum: ["numeric", "text", "option", "heading"],
    default: "numeric",
  },

  unit:     { type: String, trim: true, default: "" },
  rangeMin: { type: Number, default: null },
  rangeMax: { type: Number, default: null },

  // Display string for range e.g. "0.2 - 1.2" or "< 5.0"
  // Used on the printed report. If empty, auto-generated from rangeMin/rangeMax.
  rangeText: { type: String, trim: true, default: "" },

  // For fieldType "option" — list of valid choices
  // e.g. ["Positive", "Negative", "Reactive", "Non-Reactive"]
  options: [{ type: String, trim: true }],

  // true  → indented under the nearest heading above it
  // false → normal top-level row
  isSubField: { type: Boolean, default: false },

  // false → parameter exists in DB but is hidden on the printed report
  showInReport: { type: Boolean, default: true },

  // Controls display order in the report
  order: { type: Number, default: 0 },

}, { _id: true });

// ── Test schema ───────────────────────────────────────────
const testSchema = new mongoose.Schema({
  // Who added this test to the global library
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdByRole: {
    type: String,
    enum: ["admin", "vendor"],
    required: true,
  },

  // ── Core info ─────────────────────────────────────────
  name:        { type: String, required: true, trim: true },
  code:        { type: String, required: true, trim: true, uppercase: true },
  department:  { type: String, required: true, trim: true },
  sampleType:  { type: String, trim: true, default: "" },
  tat:         { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  gender:      { type: String, enum: ["male", "female", "both"], default: "both" },

  // ── Parameters (all rows shown in the report) ─────────
  // Order matters — always sort by `order` field when rendering
  parameters: [parameterSchema],

  // ── Interpretation text ───────────────────────────────
  // Shown below test results on the printed report
  interpretation: { type: String, trim: true, default: "" },

  isActive: { type: Boolean, default: true },

}, { timestamps: true });

// Test code must be globally unique across all vendors
testSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("Test", testSchema);