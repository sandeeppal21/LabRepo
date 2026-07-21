const Bill = require("../models/billModel");
const ReportEntry = require("../models/reportEntryModel");


exports.getPublicReport = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId)
            .populate("patient", "firstName lastName designation age gender phone patientId")
            .populate("vendor", "name businessName address city state phone email logo vendorId");

        if (!bill) return res.status(404).json({ message: "Bill not found." });

        const report = await ReportEntry.findOne({ billId: bill._id }, "status verifiedAt");

        return res.status(200).json({
            bill: {
                _id: bill._id,
                billNumber: bill.billNumber,
                patientId: bill.patientId,
                billingDate: bill.billingDate,
                items: bill.items.map(i => ({ testName: i.testName, testCode: i.testCode })),
                patient: bill.patient,
            },
            report: report
                ? { status: report.status, verifiedAt: report.verifiedAt }
                : { status: "not_found" },
            vendor: {
                name: bill.vendor?.name || "",
                businessName: bill.vendor?.businessName || "",
                address: bill.vendor?.address || "",
                city: bill.vendor?.city || "",
                state: bill.vendor?.state || "",
                phone: bill.vendor?.phone || "",
                email: bill.vendor?.email || "",
                logoUrl: bill.vendor?.logoUrl || "",
                vendorId: bill.vendor?.vendorId || "",
            },
        });
    } catch (err) {
        console.error("getPublicReport error:", err);
        res.status(500).json({ message: "Server error." });
    }
};

// ═══════════════════════════════════════════════════════════
// GET /api/public/report/:billId/full
// Returns FULL report data (only if status === "verified")
// Used by patient to view/print the report
// ═══════════════════════════════════════════════════════════
exports.getFullReport = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId)
            .populate("patient")
            .populate("vendor", "name businessName address city state phone email logo vendorId staff"); // ← added staff

        if (!bill) return res.status(404).json({ message: "Bill not found." });

        const report = await ReportEntry.findOne({ billId: bill._id })
            .populate("patient");

        if (!report) return res.status(404).json({ message: "Report not found." });

        if (report.status !== "verified") {
            return res.status(403).json({
                message: "Report is not yet verified. Please check back later.",
                status: report.status,
            });
        }

        return res.status(200).json({
            report,
            bill,
            patient: bill.patient,
            vendor: {
                name: bill.vendor?.name || "",
                businessName: bill.vendor?.businessName || "",
                address: bill.vendor?.address || "",
                city: bill.vendor?.city || "",
                state: bill.vendor?.state || "",
                phone: bill.vendor?.phone || "",
                email: bill.vendor?.email || "",
                logoUrl: bill.vendor?.logoUrl || "",
                staff: bill.vendor?.staff || [], // ← added: doctors/technicians for tfoot signatures
            },
        });
    } catch (err) {
        console.error("getFullReport error:", err);
        res.status(500).json({ message: "Server error." });
    }
};