// backend/models/reportEntryModel.js
const mongoose = require("mongoose");

// ── Single parameter result ────────────────────────────────
const paramResultSchema = new mongoose.Schema({
  parameterId:  { type: mongoose.Schema.Types.ObjectId },
  name:         { type: String, required: true },
  fieldType:    { type: String, enum: ["numeric", "text", "option", "heading"], default: "numeric" },
  value:        { type: String, default: "" },
  unit:         { type: String, default: "" },
  rangeMin:     { type: Number, default: null },
  rangeMax:     { type: Number, default: null },
  rangeText:    { type: String, default: "" },
  options:      [{ type: String }],
  isSubField:   { type: Boolean, default: false },
  showInReport: { type: Boolean, default: true },
  order:        { type: Number, default: 0 },
  flag:         { type: String, enum: ["H", "L", "N", ""], default: "" },
  isAbnormal:   { type: Boolean, default: false },
}, { _id: true });

// ── Single test result ─────────────────────────────────────
const testResultSchema = new mongoose.Schema({
  testId:         { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  testName:       { type: String, required: true },
  testCode:       { type: String, required: true },
  department:     { type: String, default: "" },
  sampleType:     { type: String, default: "" },
  interpretation: { type: String, default: "" },
  paramResults:   [paramResultSchema],
  status:         { type: String, enum: ["pending", "entered", "verified"], default: "pending" },
}, { _id: true });

// ── Main report entry document ─────────────────────────────
const reportEntrySchema = new mongoose.Schema({
  billId:    { type: mongoose.Schema.Types.ObjectId, ref: "Bill",    required: true, unique: true },
  vendorId:  { type: String, required: true, index: true },
  patientId: { type: String, required: true },
  patient:   { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  testResults: [testResultSchema],
  status: {
    type: String,
    enum: ["pending", "partial", "completed", "verified"],
    default: "pending",
  },
  enteredBy:  { type: String, default: "" },
  verifiedBy: { type: String, default: "" },
  verifiedAt: { type: Date,   default: null },
  reportDate: { type: Date,   default: Date.now },
  labDoctor:  { type: String, default: "" },
  labDegree:  { type: String, default: "" },
  notes:      { type: String, default: "" },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────
reportEntrySchema.index({ vendorId: 1, status: 1 });
reportEntrySchema.index({ vendorId: 1, reportDate: -1 });
reportEntrySchema.index({ vendorId: 1, createdAt: -1 });
reportEntrySchema.index({ patient: 1, vendorId: 1 });
reportEntrySchema.index({ patientId: 1, vendorId: 1 });
reportEntrySchema.index({ "testResults.status": 1 });
reportEntrySchema.index({ "testResults.testId": 1 });

module.exports = mongoose.model("ReportEntry", reportEntrySchema);