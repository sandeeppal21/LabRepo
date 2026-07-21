const mongoose = require("mongoose");

// ── Parameter schema ──────────────────────────────────────
const parameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  fieldType: {
    type: String,
    enum: ["numeric", "text", "option", "heading"],
    default: "numeric",
  },

  unit: { type: String, trim: true, default: "" },
  rangeMin: { type: Number, default: null },
  rangeMax: { type: Number, default: null },


  rangeText: { type: String, trim: true, default: "" },


  options: [{ type: String, trim: true }],


  isSubField: { type: Boolean, default: false },


  showInReport: { type: Boolean, default: true },


  order: { type: Number, default: 0 },

}, { _id: true });

// ── Test schema ───────────────────────────────────────────
const testSchema = new mongoose.Schema({

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
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  department: { type: String, required: true, trim: true },
  sampleType: { type: String, trim: true, default: "" },
  tat: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  gender: { type: String, enum: ["male", "female", "both"], default: "both" },


  parameters: [parameterSchema],


  interpretation: { type: String, trim: true, default: "" },

  isActive: { type: Boolean, default: true },

}, { timestamps: true });


testSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("Test", testSchema);