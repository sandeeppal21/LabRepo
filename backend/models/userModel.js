const mongoose = require("mongoose");

// ── Staff sub-schema (doctors, pathologists, lab technicians) ──
const staffSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: [true, "Name is required"] },
    degree: { type: String, trim: true, default: "" },      // e.g. "MBBS, MD (Pathology)"
    role: {
      type: String,
      enum: ["doctor", "technician"],
      default: "doctor",
    },
    notes: { type: String, trim: true, default: "" },       // e.g. "Consultant Pathologist"
    signature: {
      path: { type: String, default: "" },
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

staffSchema.virtual("signatureUrl").get(function () {
  if (!this.signature?.path) return null;
  return `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${this.signature.path}`;
});

const userSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      default: () => "VND-" + require("crypto").randomBytes(4).toString("hex").toUpperCase(),
    },

    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6 },
    role: { type: String, enum: ["admin", "vendor"], default: "vendor" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    businessName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },

    subscription: {
      status: {
        type: String,
        enum: ["inactive", "active", "expired"],
        default: "inactive",
      },
      plan: { type: String, default: "" },          // e.g. "3-month-bypass"
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      transactionId: { type: String, default: "" }, // dummy txn id for now
      amount: { type: Number, default: 0 },
      method: { type: String, default: "" },        // "bypass" for now, "razorpay" etc later
    },

    staff: [staffSchema],

    logo: {
      path: { type: String, default: "" },
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
    },

    rejectionReason: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }


);



userSchema.virtual("logoUrl").get(function () {
  if (!this.logo?.path) return null;
  return `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${this.logo.path}`;
});

userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);