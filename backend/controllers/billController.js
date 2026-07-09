// backend/controllers/billController.js

const Bill = require("../models/billModel");
const Patient = require("../models/patientModel");
const VendorTestPrice = require("../models/vendorTestPriceModel");
const Test = require("../models/testModel");

// ═══════════════════════════════════════════════
// POST /api/bills  — Create bill
// ═══════════════════════════════════════════════
exports.createBill = async (req, res) => {
  try {
    const {
      patientId,          // Patient _id (MongoDB ObjectId)
      items,              // [{ testId, isUrgent, discount }]
      discountPct,        // overall % discount
      discountAmt,        // overall flat ₹ discount
      discountReason,
      discountedBy,
      paymentMode,
      amountPaid,
      isDuePayment,
      isZeroAmount,
      dispatchMethod,
      notes,
      referringDoctorId,
      referringDoctorName,
    } = req.body;

    // ── Validate patient belongs to this vendor ───────────
    const patient = await Patient.findOne({ _id: patientId, vendorId: req.user.vendorId });
    if (!patient) return res.status(404).json({ message: "Patient not found." });

    if (!items || items.length === 0)
      return res.status(422).json({ message: "At least one test is required." });

    // ── Resolve test info and vendor prices ───────────────
    const billItems = [];
    let subtotal = 0;

    for (const item of items) {
      const test = await Test.findById(item.testId);
      if (!test) return res.status(404).json({ message: `Test ${item.testId} not found.` });

      // Get vendor's price for this test
      //  const priceRecord = await VendorTestPrice.findOne({
      //     vendorId: req.user.objectId,   // ← real MongoDB ObjectId 
      //     testId:   item.testId,
      //     isActive: true,
      //   });

      //   const price = priceRecord?.price ?? 0;


      const vendorPriceDoc = await VendorTestPrice.findOne({
        vendorId: req.user.objectId,   // ← real ObjectId (from updated authMiddleware)
      });

      const priceEntry = vendorPriceDoc?.prices?.find(
        p => p.testId.toString() === item.testId.toString() && p.isActive
      );

      const price = priceEntry?.price ?? 0;


      const itemDiscount = Number(item.discount ?? 0);
      const netPrice = Math.max(0, price - itemDiscount);

      billItems.push({
        testId: test._id,
        testName: test.name,
        testCode: test.code,
        price,
        discount: itemDiscount,
        netPrice,
        isUrgent: item.isUrgent ?? false,
      });

      subtotal += netPrice;
    }

    // ── Calculate overall discount ─────────────────────────
    const pct = Number(discountPct ?? 0);
    const flat = Number(discountAmt ?? 0);
    const pctValue = Math.round(subtotal * pct / 100);
    const totalDiscount = pctValue + flat;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const paid = isZeroAmount ? 0 : Number(amountPaid ?? grandTotal);
    const due = Math.max(0, grandTotal - paid);

    // ── Create bill ────────────────────────────────────────
    const bill = await Bill.create({
      vendorId: req.user.vendorId,
      vendor: req.user.id,
      patientId: patient.patientId,
      patient: patient._id,
      items: billItems,
      subtotal,
      discountPct: pct,
      discountAmt: flat,
      totalDiscount,
      grandTotal,
      amountPaid: paid,
      dueAmount: due,
      paymentMode: paymentMode || "cash",
      isDuePayment: isDuePayment ?? false,
      isZeroAmount: isZeroAmount ?? false,
      discountReason: discountReason || "",
      discountedBy: discountedBy || "",
      dispatchMethod: dispatchMethod || "hardcopy",
      notes: notes || "",
      referringDoctorId: referringDoctorId || null,
      referringDoctorName: referringDoctorName || "",
      status: "pending",
    });

    // ── Populate for response ─────────────────────────────
    const populated = await Bill.findById(bill._id).populate("patient");

    return res.status(201).json({
      message: "Bill created successfully.",
      bill: populated,
    });
  } catch (err) {
    console.error("createBill error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════════════════════════
// GET /api/bills  — List bills for vendor
// ═══════════════════════════════════════════════
exports.getBills = async (req, res) => {
  try {
    const { q, status, from, to, page = 1, limit = 20 } = req.query;
    const filter = { vendorId: req.user.vendorId };

    if (status) filter.status = status;

    if (from || to) {
      filter.billingDate = {};
      if (from) filter.billingDate.$gte = new Date(from);
      if (to) filter.billingDate.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    if (q) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ billNumber: regex }, { patientId: regex }];
    }

    const bills = await Bill.find(filter)
      .populate("patient", "firstName lastName phone age gender designation ageType patientId referringDoctor")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Bill.countDocuments(filter);

    return res.status(200).json({ bills, total });
  } catch (err) {
    console.error("getBills error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════════════════════════
// GET /api/bills/:id  — Single bill (for printing)
// ═══════════════════════════════════════════════
exports.getBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    }).populate("patient").populate("vendor", "name businessName phone email logoUrl");

    if (!bill) return res.status(404).json({ message: "Bill not found." });
    return res.status(200).json({ bill });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════════════════════════
// PATCH /api/bills/:id/status  — Update status
// ═══════════════════════════════════════════════
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "processing", "completed", "cancelled"];
    if (!valid.includes(status))
      return res.status(422).json({ message: "Invalid status." });

    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.user.vendorId },
      { status },
      { new: true }
    );
    if (!bill) return res.status(404).json({ message: "Bill not found." });
    return res.status(200).json({ message: "Status updated.", bill });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};