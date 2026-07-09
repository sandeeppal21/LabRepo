// controllers/referral.controller.js


const ReferralList = require("../models/referralListmodel");

const PAGE_SIZE = 10;

// ── Resolve category string → document field name ─────────────
const getField = (category) => ReferralList.FIELD_MAP[category];

// ── Format errors ─────────────────────────────────────────────
const formatError = (err) => {
    if (err.name === "ValidationError") {
        return Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }
    return err.message || "Something went wrong";
};

// ── Ensure vendor document exists (upsert on first access) ───
const ensureDoc = async (vendorId) =>
    ReferralList.findOneAndUpdate(
        { vendorId },
        { $setOnInsert: { vendorId } },
        { upsert: true, new: true }
    );

// ─────────────────────────────────────────────────────────────
// GET /api/referrals?category=doctor&page=1&search=
// Returns paginated entries from the chosen array field
// ─────────────────────────────────────────────────────────────
exports.getEntries = async (req, res) => {
    try {
        const { category, page = 1, search = "" } = req.query;
        const field = getField(category);
        const vendorId = req.user.id;

        const doc = await ReferralList.findOne({ vendorId }).lean();

        if (!doc || !doc[field]) {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { total: 0, page: 1, pages: 1, pageSize: PAGE_SIZE },
            });
        }

        // Filter active entries + optional search on name / phone
        let entries = doc[field].filter((e) => e.isActive !== false);

        if (search.trim()) {
            const re = new RegExp(search.trim(), "i");
            entries = entries.filter(
                (e) => re.test(e.name) || re.test(e.phone)
            );
        }

        // Sort newest first (sub-doc createdAt)
        entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = entries.length;
        const pages = Math.ceil(total / PAGE_SIZE) || 1;
        const skip  = (Number(page) - 1) * PAGE_SIZE;
        const data  = entries.slice(skip, skip + PAGE_SIZE);

        res.status(200).json({
            success: true,
            data,
            pagination: { total, page: Number(page), pages, pageSize: PAGE_SIZE },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: formatError(err) });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/referrals
// Body: { category, name, phone, degree?, commission?, email?, b2b? }
// Pushes a new entry into the correct array
// ─────────────────────────────────────────────────────────────
exports.createEntry = async (req, res) => {
    try {
        const { category, name, phone, degree, commission, email, b2b } = req.body;
        const field    = getField(category);
        const vendorId = req.user.id;

        // Check duplicate phone within same category for this vendor
        const existing = await ReferralList.findOne({
            vendorId,
            [`${field}.phone`]: phone.trim(),
            [`${field}.isActive`]: { $ne: false },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "This phone number already exists in this category.",
            });
        }

        const newEntry = {
            name:       name.trim().toUpperCase(),
            phone:      phone.trim(),
            degree:     degree?.trim() || "",
            commission: commission != null ? Number(commission) : 0,
            email:      email?.trim().toLowerCase() || "",
            b2b:        b2b?.trim() || "",
            isActive:   true,
        };

        // Upsert vendor doc; push new entry
        const doc = await ReferralList.findOneAndUpdate(
            { vendorId },
            { $push: { [field]: newEntry } },
            { upsert: true, new: true, runValidators: true }
        );

        // Return just the newly pushed entry
        const saved = doc[field][doc[field].length - 1];

        res.status(201).json({
            success: true,
            message: "Entry added successfully",
            data: saved,
        });
    } catch (err) {
        res.status(400).json({ success: false, message: formatError(err) });
    }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/referrals/:entryId
// Body: { category, name?, phone?, degree?, commission?, email?, b2b? }
// Updates a single sub-document by its _id
// ─────────────────────────────────────────────────────────────
exports.updateEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        const { category, name, phone, degree, commission, email, b2b } = req.body;
        const field    = getField(category);
        const vendorId = req.user.id;

        // If phone is being changed, check for duplicates
        if (phone) {
            const conflict = await ReferralList.findOne({
                vendorId,
                [`${field}.phone`]:    phone.trim(),
                [`${field}.isActive`]: { $ne: false },
                [`${field}._id`]:      { $ne: entryId },
            });
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message: "This phone number already exists in this category.",
                });
            }
        }

        // Build $set payload targeting the matched array element
        const setFields = {};
        if (name       != null) setFields[`${field}.$.name`]       = name.trim().toUpperCase();
        if (phone      != null) setFields[`${field}.$.phone`]      = phone.trim();
        if (degree     != null) setFields[`${field}.$.degree`]     = degree.trim();
        if (commission != null) setFields[`${field}.$.commission`]  = Number(commission);
        if (email      != null) setFields[`${field}.$.email`]      = email.trim().toLowerCase();
        if (b2b        != null) setFields[`${field}.$.b2b`]        = b2b.trim();
        setFields[`${field}.$.updatedAt`] = new Date();

        if (Object.keys(setFields).length === 1) {
            return res.status(400).json({ success: false, message: "No valid fields to update" });
        }

        const doc = await ReferralList.findOneAndUpdate(
            { vendorId, [`${field}._id`]: entryId },
            { $set: setFields },
            { new: true, runValidators: true }
        );

        if (!doc) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        const updated = doc[field].id(entryId);
        res.status(200).json({ success: true, message: "Entry updated", data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: formatError(err) });
    }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/referrals/:entryId
// Body: { category }
// Soft-delete: sets isActive = false on the sub-document
// ─────────────────────────────────────────────────────────────
exports.deleteEntry = async (req, res) => {
    try {
        const { entryId } = req.params;
        const { category } = req.body;
        const field    = getField(category);
        const vendorId = req.user.id;

        const doc = await ReferralList.findOneAndUpdate(
            { vendorId, [`${field}._id`]: entryId },
            { $set: { [`${field}.$.isActive`]: false, [`${field}.$.updatedAt`]: new Date() } },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ success: false, message: "Entry not found" });
        }

        res.status(200).json({ success: true, message: "Entry deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: formatError(err) });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/referrals/stats
// Returns count of active entries per category for this vendor
// ─────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const doc = await ReferralList.findOne({ vendorId }).lean();

        if (!doc) {
            return res.status(200).json({
                success: true,
                data: {
                    doctor: 0, hospital: 0, second_referral: 0,
                    tpa: 0, government: 0, phlebotomist: 0,
                },
            });
        }

        const count = (arr) => (arr || []).filter((e) => e.isActive !== false).length;

        res.status(200).json({
            success: true,
            data: {
                doctor:          count(doc.doctors),
                hospital:        count(doc.hospitals),
                second_referral: count(doc.secondReferrals),
                tpa:             count(doc.tpa),
                government:      count(doc.governmentPanels),
                phlebotomist:    count(doc.phlebotomists),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: formatError(err) });
    }
};