import { useEffect, useState, useCallback } from "react";
import {
    RiSearchLine,
    RiRefreshLine,
    RiArrowLeftSLine,
    RiArrowRightSLine,
    RiUserLine,
} from "react-icons/ri";
import { fetchVendors } from "../../../services/adminService";

const STATUS = {
    approved: { pill: "bg-emerald-500/10 text-emerald-600", label: "Approved" },
    pending: { pill: "bg-amber-500/10 text-amber-600", label: "Pending" },
    rejected: { pill: "bg-red-500/10 text-red-600", label: "Rejected" },
};

// ── Subscription / access filter tabs ──────────────────────
const SUB_TABS = [
    { key: "", label: "All" },
    { key: "active", label: "Active" },
    { key: "expired", label: "Expired" },
    { key: "none", label: "No Plan" },
];

// ── Subscription status pill ───────────────────────────────
const SUB_STATUS = {
    active: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.28)", color: "#16a34a", label: "Active" },
    expired: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.28)", color: "#ef4444", label: "Expired" },
    inactive: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.28)", color: "#94a3b8", label: "No Plan" },
};

function SubPill({ status }) {
    const s = SUB_STATUS[status] || SUB_STATUS.inactive;
    return (
        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
            {s.label}
        </span>
    );
}

function daysRemaining(expiresAt) {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const GRID_COLS = "1.6fr 1.9fr 1.2fr 0.85fr 1.3fr 0.9fr";

export default function AdminVendors({ t }) {
    const [vendors, setVendors] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [subFilter, setSubFilter] = useState(""); // "" | "active" | "expired" | "none"
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const limit = 10;

    // ── Debounce search input ──────────────────────────────
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(id);
    }, [search]);

    // ── Reset to page 1 whenever filters change ────────────
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, subFilter]);

    const loadVendors = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await fetchVendors({
                search: debouncedSearch,
                subStatus: subFilter, // "" | "active" | "expired" | "none"
                page,
                limit,
            });
            setVendors(data.vendors || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error("fetchVendors error:", err);
            setError(
                err.response?.data?.message || "Failed to load vendors. Please try again."
            );
            setVendors([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, subFilter, page]);

    useEffect(() => {
        loadVendors();
    }, [loadVendors]);

    return (
        <div>
            {/* ── Header row ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>
                        Vendors
                    </h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>
                        {total} vendor{total !== 1 ? "s" : ""} total
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px" }}>
                        <RiSearchLine size={14} style={{ color: t.faint }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, email, business…"
                            style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", width: 200 }}
                        />
                    </div>
                    <button
                        onClick={loadVendors}
                        title="Refresh"
                        style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, color: t.accent, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                        <RiRefreshLine size={15} />
                    </button>
                </div>
            </div>

            {/* ── Access (subscription) filter tabs ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 600, color: t.faint, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 2 }}>
                    Access
                </span>
                {SUB_TABS.map(({ key, label }) => {
                    const active = subFilter === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setSubFilter(key)}
                            style={{
                                padding: "7px 14px",
                                borderRadius: 20,
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                border: `1px solid ${active ? t.accent : t.border}`,
                                background: active ? t.accentBg : "transparent",
                                color: active ? t.accent : t.muted,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Table card ── */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, padding: "10px 20px", borderBottom: `1px solid ${t.border}`, background: t.accentBg, fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    <span>Vendor</span>
                    <span>Email</span>
                    <span>Business</span>
                    <span>Status</span>
                    <span>Access</span>
                    <span>Joined</span>
                </div>

                {loading && (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: t.muted, fontSize: "0.85rem" }}>
                        Loading vendors…
                    </div>
                )}

                {!loading && error && (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#dc2626", fontSize: "0.85rem" }}>
                        {error}
                    </div>
                )}

                {!loading && !error && vendors.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 20px", color: t.muted }}>
                        <RiUserLine size={34} style={{ opacity: 0.35 }} />
                        <span style={{ fontSize: "0.88rem" }}>No vendors found.</span>
                    </div>
                )}

                {!loading &&
                    !error &&
                    vendors.map((v, i) => {
                        const s = STATUS[v.status] || STATUS.pending;
                        const subStatus = v.subscription?.status || "inactive";
                        const daysLeft = daysRemaining(v.subscription?.expiresAt);
                        return (
                            <div
                                key={v._id}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: GRID_COLS,
                                    padding: "13px 20px",
                                    borderBottom: i < vendors.length - 1 ? `1px solid ${t.border}` : "none",
                                    fontSize: "0.84rem",
                                    alignItems: "center",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, color: t.text }}>{v.name}</div>
                                    <div style={{ fontSize: "0.72rem", color: t.faint }}>{v.vendorId}</div>
                                </div>
                                <span style={{ color: t.muted, overflow: "hidden", textOverflow: "ellipsis" }}>{v.email}</span>
                                <span style={{ color: t.muted }}>{v.businessName || "—"}</span>
                                <span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.pill}`}>{s.label}</span>
                                </span>
                                <div>
                                    <SubPill status={subStatus} />
                                    {subStatus === "active" && (
                                        <div style={{ fontSize: "0.68rem", color: t.faint, marginTop: 3 }}>
                                            {daysLeft}d left · till {formatDate(v.subscription.expiresAt)}
                                        </div>
                                    )}
                                    {subStatus === "expired" && (
                                        <div style={{ fontSize: "0.68rem", color: t.faint, marginTop: 3 }}>
                                            expired {formatDate(v.subscription.expiresAt)}
                                        </div>
                                    )}
                                </div>
                                <span style={{ color: t.faint, fontSize: "0.78rem" }}>
                                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                                </span>
                            </div>
                        );
                    })}

                {/* ── Pagination ── */}
                {!loading && !error && vendors.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${t.border}` }}>
                        <span style={{ fontSize: "0.76rem", color: t.muted }}>
                            Page {page} of {totalPages}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 8, color: t.accent, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
                            >
                                <RiArrowLeftSLine size={16} />
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 8, color: t.accent, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}
                            >
                                <RiArrowRightSLine size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}