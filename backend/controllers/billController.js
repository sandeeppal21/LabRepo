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
      patientId,
      items,
      discountPct,
      discountAmt,
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

exports.getBills = async (req, res) => {
  try {
    const {
      q,
      status,
      paymentStatus,
      from, to,
      page = 1,
      limit = 20,
    } = req.query;

    const vendorId = req.user.vendorId;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    const match = { vendorId };
    if (status) match.status = status;

    if (from || to) {
      match.billingDate = {};
      if (from) match.billingDate.$gte = new Date(from);
      if (to) match.billingDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    // ── Base pipeline: filter → join patient (for name/phone search) →
    //    derive paymentStatus so it can be filtered/grouped on ────────
    const basePipeline = [
      { $match: match },
      {
        $lookup: {
          from: "patients",
          localField: "patient",
          foreignField: "_id",
          as: "patientDoc",
        },
      },
      { $unwind: { path: "$patientDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          paymentStatus: {
            $cond: [
              { $lte: ["$dueAmount", 0] },
              "paid",
              { $cond: [{ $lte: ["$amountPaid", 0] }, "due", "partial"] },
            ],
          },
        },
      },
    ];

    if (q) {
      const regex = new RegExp(q.trim(), "i");
      basePipeline.push({
        $match: {
          $or: [
            { billNumber: regex },
            { patientId: regex },
            { referringDoctorName: regex },
            { "items.testName": regex },
            { "patientDoc.firstName": regex },
            { "patientDoc.lastName": regex },
            { "patientDoc.phone": regex },
          ],
        },
      });
    }

    const paymentStatusStage = paymentStatus ? [{ $match: { paymentStatus } }] : [];

    const [result] = await Bill.aggregate([
      ...basePipeline,
      {
        $facet: {
          // ── Current page — extra +1 doc fetched to know hasMore cheaply
          data: [
            ...paymentStatusStage,
            { $sort: { createdAt: -1 } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum + 1 },
          ],
          // ── Sums across the FULL filtered set (respects paymentStatus)
          totals: [
            ...paymentStatusStage,
            {
              $group: {
                _id: null,
                amount: { $sum: "$subtotal" },
                paid: { $sum: "$amountPaid" },
                due: { $sum: "$dueAmount" },
                discount: { $sum: "$totalDiscount" },
                net: { $sum: "$grandTotal" },
                count: { $sum: 1 },
              },
            },
          ],
          paymentCounts: [
            {
              $group: {
                _id: null,
                paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
                due: { $sum: { $cond: [{ $eq: ["$paymentStatus", "due"] }, 1, 0] } },
                partial: { $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] } },
                all: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const rawData = result?.data || [];
    const hasMore = rawData.length > limitNum;
    const bills = (hasMore ? rawData.slice(0, limitNum) : rawData).map((b) => {
      const { patientDoc, ...rest } = b;
      return { ...rest, patient: patientDoc || null };
    });

    return res.status(200).json({
      bills,
      hasMore,
      totals: result?.totals?.[0] || { amount: 0, paid: 0, due: 0, discount: 0, net: 0, count: 0 },
      paymentCounts: result?.paymentCounts?.[0] || { paid: 0, due: 0, partial: 0, all: 0 },
    });
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