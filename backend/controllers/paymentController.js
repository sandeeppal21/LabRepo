const crypto = require("crypto");
const User = require("../models/userModel");

// ═════════════════════════════════════════════════════════
// GET /api/payment/status
// Returns the caller's current subscription state.
// Auto-flips "active" → "expired" if expiresAt has passed.
// ═════════════════════════════════════════════════════════
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("subscription role");
        if (!user) return res.status(404).json({ message: "User not found." });

        const sub = user.subscription || {};
        let status = sub.status || "inactive";

        if (status === "active" && sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
            user.subscription.status = "expired";
            await user.save();
            status = "expired";
        }

        return res.status(200).json({
            subscription: {
                status,
                plan: sub.plan || "",
                startedAt: sub.startedAt || null,
                expiresAt: sub.expiresAt || null,
                transactionId: sub.transactionId || "",
                amount: sub.amount || 0,
                method: sub.method || "",
            },
        });
    } catch (err) {
        console.error("getSubscriptionStatus error:", err);
        return res.status(500).json({ message: "Server error." });
    }
};

exports.bypassPayment = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });


        if (
            user.subscription?.status === "active" &&
            user.subscription.expiresAt &&
            new Date(user.subscription.expiresAt) > new Date()
        ) {
            return res.status(400).json({ message: "An active subscription already exists." });
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 3);

        const dummyTransactionId =
            `BYPASS-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        user.subscription = {
            status: "active",
            plan: "3-month-bypass",
            startedAt: now,
            expiresAt,
            transactionId: dummyTransactionId,
            amount: 0,
            method: "bypass",
        };

        await user.save();

        return res.status(200).json({
            message: "Payment bypassed successfully. 3-month access granted.",
            subscription: user.subscription,
        });
    } catch (err) {
        console.error("bypassPayment error:", err);
        return res.status(500).json({ message: "Server error." });
    }
};