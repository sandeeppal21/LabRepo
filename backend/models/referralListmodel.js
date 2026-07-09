// models/ReferralList.model.js
//
// One document per vendor.
// Structure:
// {
//   vendorId: ObjectId,
//   doctors:        [ ReferralEntrySchema ],
//   hospitals:      [ ReferralEntrySchema ],
//   secondReferrals:[ ReferralEntrySchema ],
//   tpa:            [ ReferralEntrySchema ],
//   governmentPanels:[ ReferralEntrySchema ],
//   phlebotomists:  [ ReferralEntrySchema ],
// }

const mongoose = require("mongoose");

// ── Sub-document schema (one referral entry) ─────────────────
const ReferralEntrySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            uppercase: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
            match: [/^\d{10}$/, "Phone must be exactly 10 digits"],
        },
        degree: {
            type: String,
            default: "",
            trim: true,
            // e.g. MBBS, MD, BDS, BHMS, Pharm.D
        },
        commission: {
            type: Number,
            default: 0,
            min: [0, "Commission cannot be negative"],
            max: [100, "Commission cannot exceed 100%"],
        },
        email: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
            match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
        },
        b2b: {
            type: String,
            default: "",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // each sub-doc gets createdAt + updatedAt
        _id: true,        // keep _id so we can target entries with $elemMatch
    }
);

// ── Root schema: one document per vendor ─────────────────────
const ReferralListSchema = new mongoose.Schema(
    {
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,   // exactly one ReferralList per vendor
            index: true,
        },

        doctors: {
            type: [ReferralEntrySchema],
            default: [],
        },
        hospitals: {
            type: [ReferralEntrySchema],
            default: [],
        },
        // secondReferrals: {
        //     type: [ReferralEntrySchema],
        //     default: [],
        // },
        tpa: {
            type: [ReferralEntrySchema],
            default: [],
        },
        governmentPanels: {
            type: [ReferralEntrySchema],
            default: [],
        },
        phlebotomists: {
            type: [ReferralEntrySchema],
            default: [],
        },
    },
    {
        timestamps: true, // document-level createdAt / updatedAt
    }
);

// ── Sparse index: fast lookup of a phone within each category ─
// We can't enforce uniqueness inside an array at DB level easily,
// so we handle duplicate-phone check in the controller.
ReferralListSchema.index({ vendorId: 1 });
ReferralListSchema.index({ "doctors.phone": 1 });
ReferralListSchema.index({ "hospitals.phone": 1 });
ReferralListSchema.index({ "tpa.phone": 1 });
ReferralListSchema.index({ "phlebotomists.phone": 1 });
// ReferralListSchema.index({ "secondReferrals.phone": 1 });
ReferralListSchema.index({ "governmentPanels.phone": 1 });

// ── Map: category key → document field name ───────────────────
ReferralListSchema.statics.FIELD_MAP = {
    doctor:          "doctors",
    hospital:        "hospitals",
    // second_referral: "secondReferrals",
    tpa:             "tpa",
    government:      "governmentPanels",
    phlebotomist:    "phlebotomists",
};

module.exports =
    mongoose.models.ReferralList ||
    mongoose.model("ReferralList", ReferralListSchema);