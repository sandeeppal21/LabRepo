const mongoose = require("mongoose");

const testPriceEntrySchema = new mongoose.Schema({
  testId:   { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  price:    { type: Number, required: true, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const vendorTestPriceSchema = new mongoose.Schema({
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",       //  references User model
    required: true, 
    unique: true       // one document per vendor
  },
  prices: [testPriceEntrySchema],
}, { timestamps: true });

vendorTestPriceSchema.index({ vendorId: 1, "prices.testId": 1 }, { unique: true });

module.exports = mongoose.model("VendorTestPrice", vendorTestPriceSchema);