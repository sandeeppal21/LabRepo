// backend/models/billModel.js

const mongoose = require("mongoose");

// Auto-generate Bill Number: INV-VENDORID-SEQUENCE e.g. INV-VND0FF3-0042
async function generateBillNumber(vendorId) {
  const shortId = vendorId.replace("VND-", "").slice(0, 6);
  const count = await mongoose.model("Bill").countDocuments({ vendorId });
  const seq = String(count + 1).padStart(4, "0");
  return `INV-${shortId}-${seq}`;
}

const billItemSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  testName: { type: String, required: true },
  testCode: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  netPrice: { type: Number, required: true },
  isUrgent: { type: Boolean, default: false },
}, { _id: true });

const billSchema = new mongoose.Schema({
  // ── Identity ───────────────────────────────────────────
  billNumber: { type: String, unique: true },
  vendorId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },

  // ── References ─────────────────────────────────────────
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ── Bill items (tests) ─────────────────────────────────
  items: [billItemSchema],

  // ── Financials ─────────────────────────────────────────
  subtotal: { type: Number, default: 0 },   // sum of all prices
  discountPct: { type: Number, default: 0 },   // overall % discount
  discountAmt: { type: Number, default: 0 },   // overall flat discount
  totalDiscount: { type: Number, default: 0 },   // total discount applied
  grandTotal: { type: Number, default: 0 },   // final payable
  amountPaid: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },

  // ── Payment ────────────────────────────────────────────
  paymentMode: { type: String, enum: ["cash", "upi", "card", "multiple", "due"], default: "cash" },
  transactionId: { type: String, default: "" },
  isDuePayment: { type: Boolean, default: false },
  isZeroAmount: { type: Boolean, default: false },

  // ── Dispatch ───────────────────────────────────────────
  dispatchMethod: { type: String, enum: ["hardcopy", "email", "whatsapp", "online"], default: "hardcopy" },

  // ── Status ─────────────────────────────────────────────
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "cancelled"],
    default: "pending",
  },

  // ── Notes ──────────────────────────────────────────────
  notes: { type: String, default: "" },
  discountReason: { type: String, default: "" },
  discountedBy: { type: String, default: "" },


  referringDoctorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referringDoctorName: { type: String, trim: true, default: "" },

  billingDate: { type: Date, default: Date.now },

}, { timestamps: true });

// Auto-generate billNumber before save
billSchema.pre("save", async function (next) {
  if (!this.billNumber) {
    this.billNumber = await generateBillNumber(this.vendorId);
  }
  next();
});

module.exports = mongoose.model("Bill", billSchema);