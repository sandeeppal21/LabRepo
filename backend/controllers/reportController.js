// backend/controllers/reportController.js

const ReportEntry = require("../models/reportEntryModel");
const Bill = require("../models/billModel");
const Test = require("../models/testModel");

// ── Auto-flag helper ──────────────────────────────────────
function computeFlag(value, rangeMin, rangeMax, fieldType) {
  if (fieldType !== "numeric" || value === "" || value === null) return "";
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  if (rangeMin !== null && num < rangeMin) return "L";
  if (rangeMax !== null && num > rangeMax) return "H";
  return "N";
}



exports.initReport = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, vendorId: req.user.vendorId })
      .populate("patient");

    if (!bill) return res.status(404).json({ message: "Bill not found." });

    // Check if already initialized
    const existing = await ReportEntry.findOne({ billId: bill._id });
    if (existing) return res.status(200).json({ message: "Already initialized.", report: existing });


    const testIds = bill.items.map(item => item.testId);
    const tests = await Test.find({ _id: { $in: testIds } });
    const testMap = Object.fromEntries(tests.map(t => [t._id.toString(), t]));

    const testResults = [];

    for (const item of bill.items) {
      const test = testMap[item.testId?.toString()];
      if (!test) continue;

      const paramResults = (test.parameters || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(param => ({
          parameterId: param._id,
          name: param.name,
          fieldType: param.fieldType,
          value: "",
          unit: param.unit || "",
          rangeMin: param.rangeMin ?? null,
          rangeMax: param.rangeMax ?? null,
          rangeText: param.rangeText || "",
          options: param.options || [],
          isSubField: param.isSubField || false,
          showInReport: param.showInReport !== false,
          order: param.order || 0,
          flag: "",
          isAbnormal: false,
        }));

      testResults.push({
        testId: test._id,
        testName: test.name,
        testCode: test.code,
        department: test.department || "",
        sampleType: test.sampleType || "",
        interpretation: test.interpretation || "",
        paramResults,
        status: "pending",
      });
    }

    let report;
    try {
      report = await ReportEntry.create({
        billId: bill._id,
        vendorId: req.user.vendorId,
        patientId: bill.patientId,
        patient: bill.patient._id,
        testResults,
        status: "pending",
        enteredBy: req.user.name || "",
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        report = await ReportEntry.findOne({ billId: bill._id });
        return res.status(200).json({ message: "Already initialized.", report });
      }
      throw createErr;
    }


    return res.status(201).json({ message: "Report initialized.", report });
  } catch (err) {
    console.error("initReport error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.getReport = async (req, res) => {
  try {
    const report = await ReportEntry
      .findOne({ billId: req.params.billId, vendorId: req.user.vendorId })
      .populate("patient")
      .populate({
        path: "billId",
        populate: { path: "vendor", select: "name businessName phone email address city state logo" },
      });

    if (!report) return res.status(404).json({ message: "Report not found. Initialize first." });
    return res.status(200).json({ report });
  } catch (err) {
    console.error("getReport error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.saveValues = async (req, res) => {
  try {
    const report = await ReportEntry.findOne({ billId: req.params.billId, vendorId: req.user.vendorId });
    if (!report) return res.status(404).json({ message: "Report not found." });

    const { testResults, notes, labDoctor, labDegree } = req.body;

    if (Array.isArray(testResults)) {
      for (const incoming of testResults) {
        const testResult = report.testResults.id(incoming._id);
        if (!testResult) continue;

        if (incoming.interpretation !== undefined) {
          testResult.interpretation = incoming.interpretation;
        }

        if (Array.isArray(incoming.paramResults)) {
          for (const inParam of incoming.paramResults) {
            const param = testResult.paramResults.id(inParam._id);
            if (!param) continue;

            param.value = inParam.value ?? "";
            param.flag = computeFlag(inParam.value, param.rangeMin, param.rangeMax, param.fieldType);
            param.isAbnormal = param.flag === "H" || param.flag === "L";
          }
        }

        // Update test-level status
        const totalParams = testResult.paramResults.filter(p => p.fieldType !== "heading");
        const filledParams = totalParams.filter(p => p.value !== "" && p.value !== null);
        testResult.status = filledParams.length === 0 ? "pending"
          : filledParams.length < totalParams.length ? "entered"
            : "entered";
      }
    }

    // Overall report status
    const allEntered = report.testResults.every(t => t.status === "entered" || t.status === "verified");
    const anyEntered = report.testResults.some(t => t.status === "entered");
    report.status = allEntered ? "completed" : anyEntered ? "partial" : "pending";

    if (notes !== undefined) report.notes = notes;
    if (labDoctor !== undefined) report.labDoctor = labDoctor;
    if (labDegree !== undefined) report.labDegree = labDegree;
    report.enteredBy = req.user.name || "";

    await report.save();
    return res.status(200).json({ message: "Values saved.", report });
  } catch (err) {
    console.error("saveValues error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.verifyReport = async (req, res) => {
  try {
    const report = await ReportEntry.findOne({ billId: req.params.billId, vendorId: req.user.vendorId });
    if (!report) return res.status(404).json({ message: "Report not found." });

    report.status = "verified";
    report.verifiedBy = req.user.name || "";
    report.verifiedAt = new Date();
    report.testResults.forEach(t => { if (t.status === "entered") t.status = "verified"; });

    await report.save();
    return res.status(200).json({ message: "Report verified.", report });
  } catch (err) {
    console.error("verifyReport error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.listReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;


    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const filter = { vendorId: req.user.vendorId };
    if (status) filter.status = status;

    const [reports, total] = await Promise.all([
      ReportEntry.find(filter)
        .populate("patient", "firstName lastName age gender phone patientId")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ReportEntry.countDocuments(filter),
    ]);

    return res.status(200).json({ reports, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("listReports error:", err);
    res.status(500).json({ message: "Server error." });
  }
};