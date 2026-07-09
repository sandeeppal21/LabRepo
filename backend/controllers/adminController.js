// const User = require("../models/userModel");

// // ═════════════════════════════════════════════════════════
// // GET /api/admin/vendors
// // Query params: search, status, page, limit
// // ═════════════════════════════════════════════════════════
// exports.getAllVendors = async (req, res) => {
//     try {
//         const { search = "", status = "", page = 1, limit = 10 } = req.query;

//         const filter = { role: "vendor" };

//         if (["pending", "approved", "rejected"].includes(status)) {
//             filter.status = status;
//         }

//         if (search.trim()) {
//             const re = new RegExp(search.trim(), "i");
//             filter.$or = [
//                 { name: re },
//                 { email: re },
//                 { businessName: re },
//                 { vendorId: re },
//             ];
//         }

//         const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//         const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
//         const skip = (pageNum - 1) * limitNum;

//         const [vendors, total] = await Promise.all([
//             User.find(filter)
//                 .select("-password -__v")
//                 .sort({ createdAt: -1 })
//                 .skip(skip)
//                 .limit(limitNum),
//             User.countDocuments(filter),
//         ]);

//         return res.status(200).json({
//             vendors: vendors.map((v) => v.toJSON()),
//             total,
//             page: pageNum,
//             totalPages: Math.ceil(total / limitNum) || 1,
//         });
//     } catch (err) {
//         console.error("getAllVendors error:", err);
//         return res.status(500).json({ message: "Server error." });
//     }
// };

// // ═════════════════════════════════════════════════════════
// // GET /api/admin/vendors/:id
// // ═════════════════════════════════════════════════════════
// exports.getVendorById = async (req, res) => {
//     try {
//         const vendor = await User.findOne({ _id: req.params.id, role: "vendor" }).select(
//             "-password -__v"
//         );
//         if (!vendor) return res.status(404).json({ message: "Vendor not found." });
//         return res.status(200).json({ vendor: vendor.toJSON() });
//     } catch (err) {
//         console.error("getVendorById error:", err);
//         return res.status(500).json({ message: "Server error." });
//     }
// };


const User = require("../models/userModel");

// ═════════════════════════════════════════════════════════
// GET /api/admin/vendors
// Query params: search, subStatus, page, limit
// ═════════════════════════════════════════════════════════
exports.getAllVendors = async (req, res) => {
    try {
        const { search = "", subStatus = "", page = 1, limit = 10 } = req.query;

        const filter = { role: "vendor" };

        if (search.trim()) {
            const re = new RegExp(search.trim(), "i");
            filter.$or = [
                { name: re },
                { email: re },
                { businessName: re },
                { vendorId: re },
            ];
        }

        // ── Subscription / access filter ───────────────────
        // Note: "active" in the DB only means active if it hasn't
        // passed expiresAt yet — the field is lazily flipped to
        // "expired" only when the vendor hits /payment/status, so
        // we compute the real state here instead of trusting the
        // stored string alone.
        const now = new Date();

        if (subStatus === "active") {
            filter["subscription.status"] = "active";
            filter["subscription.expiresAt"] = { $gt: now };
        } else if (subStatus === "expired") {
            filter.$and = [
                ...(filter.$and || []),
                {
                    $or: [
                        { "subscription.status": "expired" },
                        {
                            "subscription.status": "active",
                            "subscription.expiresAt": { $lte: now },
                        },
                    ],
                },
            ];
        } else if (subStatus === "none") {
            filter.$and = [
                ...(filter.$and || []),
                {
                    $or: [
                        { subscription: { $exists: false } },
                        { "subscription.status": "inactive" },
                        { "subscription.status": { $exists: false } },
                    ],
                },
            ];
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        const [vendors, total] = await Promise.all([
            User.find(filter)
                .select("-password -__v")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            vendors: vendors.map((v) => v.toJSON()),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum) || 1,
        });
    } catch (err) {
        console.error("getAllVendors error:", err);
        return res.status(500).json({ message: "Server error." });
    }
};

// ═════════════════════════════════════════════════════════
// GET /api/admin/vendors/:id
// ═════════════════════════════════════════════════════════
exports.getVendorById = async (req, res) => {
    try {
        const vendor = await User.findOne({ _id: req.params.id, role: "vendor" }).select(
            "-password -__v"
        );
        if (!vendor) return res.status(404).json({ message: "Vendor not found." });
        return res.status(200).json({ vendor: vendor.toJSON() });
    } catch (err) {
        console.error("getVendorById error:", err);
        return res.status(500).json({ message: "Server error." });
    }
};