/**
 * VendorBilling.jsx
 *
 * Billing page with:
 *  - Summary stat cards (Total, Paid, Due, Bills count)
 *  - Bar chart — revenue by date (last 7 / 14 / 30 days)
 *  - Bills table — Bill Date, Patient, Tests, Ref Doctor, Amount, Paid, Due, Net
 *  - Search, date filter, status filter, exports
 *  - Expandable row — shows test breakdown on + click
 *
 * Props: t (theme), isDark (boolean)
 * File:  src/pages/dashboard/vendor/VendorBilling.jsx
 * API:   src/services/billingService.js → getBills()
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    RiSearchLine, RiFilterLine, RiDownloadLine,
    RiLoader4Line, RiAlertLine, RiCalendarLine,
    RiAddLine, RiSubtractLine, RiMoneyRupeeCircleLine,
    RiFileList3Line, RiCheckboxCircleLine, RiTimeLine,
    RiArrowUpLine, RiArrowDownLine, RiRefreshLine,
    RiCloseLine, RiPrinterLine,
} from "react-icons/ri";
import { getBills } from "../../../services/billingService";

// ── Date helpers ───────────────────────────────────────────────────
const toDateStr = (d) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};
const toTimeStr = (d) => {
    const dt = new Date(d);
    let h = dt.getHours(), m = String(dt.getMinutes()).padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
};
const toInputDate = (d) => new Date(d).toISOString().split("T")[0];
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; };
const dayLabel = (d) => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`; };

// ── Grid column template — used by header, rows, AND totals row ───
// Must be IDENTICAL across all three so columns line up and table fills full width.
const GRID_COLS = "32px 1.05fr 1.4fr 1.7fr 1fr 0.8fr 0.8fr 0.7fr 0.85fr 1fr";

// ── Payment status derived from amountPaid / dueAmount ─────────────
const getPaymentStatus = (bill) => {
    if (bill.dueAmount <= 0) return "paid";     // fully paid, includes zero-amount bills
    if (bill.amountPaid <= 0) return "due";
    return "partial";
};

const PAYMENT_STATUS_CFG = {
    paid: { label: "Paid", bg: "rgba(34,197,94,0.12)", color: "#16a34a", dot: "#22c55e" },
    due: { label: "Due", bg: "rgba(239,68,68,0.12)", color: "#dc2626", dot: "#ef4444" },
    partial: { label: "Partial", bg: "rgba(249,115,22,0.12)", color: "#ea580c", dot: "#f97316" },
};

function PaymentStatusPill({ status }) {
    const s = PAYMENT_STATUS_CFG[status] || PAYMENT_STATUS_CFG.paid;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: s.bg, color: s.color,
            fontSize: "0.71rem", fontWeight: 600,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
            {s.label}
        </span>
    );
}

// ── Simple SVG Bar Chart ───────────────────────────────────────────
function BarChart({ data, t, isDark, height = 160 }) {
    if (!data.length) return null;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const PAD_TOP = 24;
    const PAD_BOT = 28;
    const chartH = height - PAD_TOP - PAD_BOT;

    return (
        <svg viewBox={`0 0 ${data.length * 48} ${height}`} style={{ width: "100%", height, overflow: "visible" }}>
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = PAD_TOP + chartH * (1 - pct);
                return <line key={pct} x1="0" y1={y} x2={data.length * 48} y2={y} stroke={t.border} strokeWidth="0.5" strokeDasharray="3,3" />;
            })}

            {data.map((d, i) => {
                const barH = Math.max(2, (d.value / maxVal) * chartH);
                const x = i * 48 + 6;
                const y = PAD_TOP + chartH - barH;
                const isMax = d.value === maxVal && d.value > 0;
                const barColor = d.due > 0
                    ? (isDark ? "rgba(251,191,36,0.85)" : "#f59e0b")
                    : (isDark ? "#38bdf8" : "#0284c7");

                return (
                    <g key={i}>
                        <rect x={x} y={y} width={36} height={barH} fill={barColor} rx="4" opacity={isMax ? 1 : 0.75} style={{ transition: "all .3s" }} />
                        {d.value > 0 && (
                            <text x={x + 18} y={y - 5} textAnchor="middle" fontSize="8" fill={t.muted} fontFamily="'DM Sans',sans-serif">
                                ₹{d.value >= 1000 ? (d.value / 1000).toFixed(1) + "k" : d.value}
                            </text>
                        )}
                        <text x={x + 18} y={height - 4} textAnchor="middle" fontSize="8" fill={t.faint} fontFamily="'DM Sans',sans-serif">
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ══════════════════════════════════════════════════════════════════
export default function VendorBilling({ t, isDark, onPrintBill }) {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("ALL"); // ALL | paid | due | partial
    const [chartRange, setChartRange] = useState(14);
    const [expanded, setExpanded] = useState({});

    const [fromDate, setFromDate] = useState(() => toInputDate(addDays(new Date(), -13)));
    const [toDate, setToDate] = useState(() => toInputDate(new Date()));

    const load = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const r = await getBills({ from: fromDate, to: toDate, limit: 200 });
            setBills(r.data.bills);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || "Failed to load bills.");
        } finally { setLoading(false); }
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const setRange = (days) => {
        setChartRange(days);
        setFromDate(toInputDate(addDays(new Date(), -(days - 1))));
        setToDate(toInputDate(new Date()));
    };

    const filtered = useMemo(() => {
        let out = [...bills];
        if (search.trim()) {
            const q = search.toLowerCase();
            out = out.filter(b =>
                b.billNumber?.toLowerCase().includes(q) ||
                b.patientId?.toLowerCase().includes(q) ||
                b.patient?.firstName?.toLowerCase().includes(q) ||
                b.patient?.lastName?.toLowerCase().includes(q) ||
                b.patient?.phone?.includes(q) ||
                b.items?.some(i => i.testName?.toLowerCase().includes(q))
            );
        }
        if (paymentFilter !== "ALL") out = out.filter(b => getPaymentStatus(b) === paymentFilter);
        return out;
    }, [bills, search, paymentFilter]);

    const stats = useMemo(() => ({
        total: filtered.reduce((s, b) => s + b.grandTotal, 0),
        paid: filtered.reduce((s, b) => s + b.amountPaid, 0),
        due: filtered.reduce((s, b) => s + b.dueAmount, 0),
        count: filtered.length,
        discount: filtered.reduce((s, b) => s + b.totalDiscount, 0),
    }), [filtered]);

    // ── Payment status counts — based on date-range bills (before payment filter) ──
    const dateFilteredBills = useMemo(() => {
        let out = [...bills];
        if (search.trim()) {
            const q = search.toLowerCase();
            out = out.filter(b =>
                b.billNumber?.toLowerCase().includes(q) ||
                b.patientId?.toLowerCase().includes(q) ||
                b.patient?.firstName?.toLowerCase().includes(q) ||
                b.patient?.lastName?.toLowerCase().includes(q) ||
                b.patient?.phone?.includes(q) ||
                b.items?.some(i => i.testName?.toLowerCase().includes(q))
            );
        }
        return out;
    }, [bills, search]);

    const paymentCounts = useMemo(() => dateFilteredBills.reduce((acc, b) => {
        const s = getPaymentStatus(b);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {}), [dateFilteredBills]);

    const chartData = useMemo(() => {
        const days = chartRange;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const dt = addDays(new Date(), -i);
            const key = toInputDate(dt);
            const dayBills = bills.filter(b => toInputDate(b.billingDate) === key);
            result.push({
                label: dayLabel(dt),
                value: dayBills.reduce((s, b) => s + b.grandTotal, 0),
                paid: dayBills.reduce((s, b) => s + b.amountPaid, 0),
                due: dayBills.reduce((s, b) => s + b.dueAmount, 0),
                count: dayBills.length,
            });
        }
        return result;
    }, [bills, chartRange]);

    const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    const exportCSV = () => {
        const rows = [
            ["Bill No.", "Bill Date", "Patient", "Patient ID", "Phone", "Tests", "Ref Doctor", "Amount", "Paid", "Due", "Net Amount"],
            ...filtered.map(b => [
                b.billNumber,
                `${toDateStr(b.billingDate)} ${toTimeStr(b.billingDate)}`,
                `${b.patient?.firstName || ""} ${b.patient?.lastName || ""}`.trim(),
                b.patientId,
                b.patient?.phone || "",
                b.items?.map(i => i.testName).join("; ") || "",
                b.referringDoctorName || "",
                b.subtotal,
                b.amountPaid,
                b.dueAmount,
                b.grandTotal,
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `bills-${fromDate}-to-${toDate}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const totals = useMemo(() => ({
        amount: filtered.reduce((s, b) => s + b.subtotal, 0),
        paid: filtered.reduce((s, b) => s + b.amountPaid, 0),
        due: filtered.reduce((s, b) => s + b.dueAmount, 0),
        net: filtered.reduce((s, b) => s + b.grandTotal, 0),
    }), [filtered]);

    return (
        <div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Page header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Billing & Payments</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Financial overview and bill history for your lab.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={load} title="Refresh" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                        <RiRefreshLine size={15} />
                    </button>
                    <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiDownloadLine size={14} /> Export
                    </button>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                    { label: "Total Bills", value: stats.count, icon: RiFileList3Line, color: t.accent, fmt: (v) => v },
                    { label: "Total Amount", value: stats.total, icon: RiMoneyRupeeCircleLine, color: t.accent, fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Total Paid", value: stats.paid, icon: RiCheckboxCircleLine, color: "#16a34a", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Total Due", value: stats.due, icon: RiTimeLine, color: stats.due > 0 ? "#dc2626" : "#16a34a", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Discounts", value: stats.discount, icon: RiSubtractLine, color: "#d97706", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: 130, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                                <s.icon size={17} />
                            </div>
                        </div>
                        <div className="playfair" style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.fmt(s.value)}</div>
                        <div style={{ fontSize: "0.72rem", color: t.muted, marginTop: 6 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Chart section ── */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div className="playfair" style={{ fontSize: "0.98rem", fontWeight: 700, color: t.heading }}>Revenue by Date</div>
                        <div style={{ fontSize: "0.76rem", color: t.muted, marginTop: 2 }}>
                            {chartData.filter(d => d.count > 0).length} active days · Total ₹{stats.total.toLocaleString("en-IN")}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {[7, 14, 30].map(d => (
                            <button key={d} onClick={() => setRange(d)}
                                style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${chartRange === d ? t.accent : t.border}`, background: chartRange === d ? t.accentBg : "none", color: chartRange === d ? t.accent : t.navText, fontSize: "0.76rem", fontWeight: chartRange === d ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    {[
                        { color: isDark ? "#38bdf8" : "#0284c7", label: "Fully Paid" },
                        { color: isDark ? "#fbbf24" : "#f59e0b", label: "Has Due" },
                    ].map(l => (
                        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: t.muted }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>

                {loading
                    ? <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}><RiLoader4Line size={22} style={{ color: t.muted, animation: "spin .7s linear infinite" }} /></div>
                    : <BarChart data={chartData} t={t} isDark={isDark} height={160} />
                }
            </div>

            {/* ── Filters row ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px" }}>
                    <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, bill no, test…"
                        style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.84rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                    {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted }}><RiCloseLine size={13} /></button>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 10px", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                    <span style={{ color: t.muted, fontSize: "0.8rem" }}>→</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 10px", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                </div>

                <div style={{ display: "flex", gap: 4 }}>
                    {[
                        { key: "ALL", label: "All Payments", count: dateFilteredBills.length, color: t.accent },
                        { key: "paid", label: "Paid", count: paymentCounts.paid || 0, color: "#22c55e" },
                        { key: "partial", label: "Partial", count: paymentCounts.partial || 0, color: "#f97316" },
                        { key: "due", label: "Due", count: paymentCounts.due || 0, color: "#ef4444" },
                    ].map(p => {
                        const isActive = paymentFilter === p.key;
                        return (
                            <button
                                key={p.key}
                                onClick={() => setPaymentFilter(p.key)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 7,
                                    padding: "7px 14px", borderRadius: 9,
                                    border: `1.5px solid ${isActive ? p.color : t.border}`,
                                    background: isActive ? `${p.color}1a` : "none",
                                    color: isActive ? p.color : t.navText,
                                    fontSize: "0.78rem", fontWeight: isActive ? 700 : 500,
                                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                                    transition: "all .15s", whiteSpace: "nowrap",
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                                {p.label}
                                <span style={{ fontSize: "0.72rem", opacity: 0.75 }}>({p.count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Bills Table ── */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 260, gap: 12, color: t.muted }}>
                    <RiLoader4Line size={24} style={{ animation: "spin .7s linear infinite" }} /> Loading bills…
                </div>
            ) : error ? (
                <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
                    <RiAlertLine size={32} style={{ marginBottom: 8 }} /><p>{error}</p>
                    <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
                </div>
            ) : (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>

                    {/* Table header */}
                    <div style={{ padding: "11px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: t.muted }}>
                            Showing <strong style={{ color: t.text }}>{filtered.length}</strong> bills
                            {search && ` for "${search}"`}
                        </span>
                        {search && (
                            <button onClick={() => setSearch("")} style={{ fontSize: "0.74rem", color: t.accent, background: "none", border: "none", cursor: "pointer" }}>Clear search</button>
                        )}
                    </div>

                    {/* ── Column headers — uses shared GRID_COLS, fills full width ── */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: GRID_COLS,
                        background: t.accentBg, borderBottom: `1px solid ${t.border}`,
                        fontSize: "0.66rem", fontWeight: 600, color: t.muted,
                        letterSpacing: "0.07em", textTransform: "uppercase",
                        alignItems: "center",
                    }}>
                        <span />
                        <span style={{ padding: "9px 10px 9px 0" }}>Bill Date</span>
                        <span style={{ padding: "9px 10px" }}>Patient Info</span>
                        <span style={{ padding: "9px 10px" }}>Tests / Packages</span>
                        <span style={{ padding: "9px 10px" }}>Ref. Doctor</span>
                        <span style={{ padding: "9px 10px" }}>Amount</span>
                        <span style={{ padding: "9px 10px" }}>Paid</span>
                        <span style={{ padding: "9px 10px" }}>Due</span>
                        <span style={{ padding: "9px 10px" }}>Payment Status</span>
                        <span style={{ padding: "9px 20px 9px 10px" }}>Net Amount</span>
                    </div>

                    {/* ── Rows ── */}
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: t.faint }}>
                            <RiFileList3Line size={36} style={{ marginBottom: 8 }} />
                            <p style={{ fontSize: "0.84rem", color: t.muted }}>No bills found for this period</p>
                        </div>
                    ) : (
                        <>
                            {filtered.map((bill, i) => (
                                <div key={bill._id}>
                                    {/* Main row — uses same GRID_COLS */}
                                    <div
                                        style={{
                                            display: "grid", gridTemplateColumns: GRID_COLS,
                                            borderBottom: `1px solid ${t.border}`,
                                            fontSize: "0.83rem", alignItems: "center",
                                            transition: "background .12s", cursor: "default",
                                            padding: "12px 0",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        {/* Expand toggle */}
                                        <div style={{ display: "flex", justifyContent: "center" }}>
                                            <button onClick={() => toggleExpand(bill._id)} style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${t.accentRing}`, background: expanded[bill._id] ? t.accentBg : "none", color: t.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                {expanded[bill._id] ? <RiSubtractLine size={11} /> : <RiAddLine size={11} />}
                                            </button>
                                        </div>

                                        {/* Bill date */}
                                        <div style={{ padding: "0 10px 0 0" }}>
                                            <div style={{ fontSize: "0.82rem", color: t.text, fontWeight: 500 }}>{toDateStr(bill.billingDate)}</div>
                                            <div style={{ fontSize: "0.7rem", color: t.faint, marginTop: 2 }}>{toTimeStr(bill.billingDate)}</div>
                                        </div>

                                        {/* Patient */}
                                        <div style={{ padding: "0 10px" }}>
                                            <div style={{ fontWeight: 600, color: t.text, fontSize: "0.84rem" }}>
                                                {bill.patient?.firstName?.toUpperCase()} {bill.patient?.lastName?.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: t.muted, marginTop: 2 }}>
                                                {bill.patient?.age} yr · {bill.patient?.gender} · {bill.patient?.phone}
                                            </div>
                                            <div style={{ fontSize: "0.68rem", color: t.accent, marginTop: 1 }}>{bill.patientId}</div>
                                        </div>

                                        {/* Tests */}
                                        <div style={{ padding: "0 10px", fontSize: "0.8rem", color: t.muted, lineHeight: 1.5 }}>
                                            {bill.items?.map(i => i.testName).join(", ")}
                                        </div>

                                        {/* Ref Doctor */}
                                        <div style={{ padding: "0 10px", fontSize: "0.8rem", color: t.muted }}>
                                            {bill.referringDoctorName || <span style={{ color: t.faint }}>—</span>}
                                        </div>

                                        {/* Amount */}
                                        <div style={{ padding: "0 10px", fontWeight: 500, color: t.text }}>₹{bill.subtotal.toLocaleString("en-IN")}</div>

                                        {/* Paid */}
                                        <div style={{ padding: "0 10px", fontWeight: 500, color: "#16a34a" }}>₹{bill.amountPaid.toLocaleString("en-IN")}</div>

                                        {/* Due */}
                                        <div style={{ padding: "0 10px", fontWeight: bill.dueAmount > 0 ? 600 : 400, color: bill.dueAmount > 0 ? "#dc2626" : t.muted }}>
                                            ₹{bill.dueAmount.toLocaleString("en-IN")}
                                        </div>

                                        {/* Payment Status */}
                                        <div style={{ padding: "0 10px" }}>
                                            <PaymentStatusPill status={getPaymentStatus(bill)} />
                                        </div>

                                        {/* Net Amount */}
                                        <div style={{ padding: "0 20px 0 10px", fontWeight: 700, color: t.heading }}>₹{bill.grandTotal.toLocaleString("en-IN")}</div>
                                    </div>

                                    {/* Expanded test breakdown */}
                                    {expanded[bill._id] && (
                                        <div style={{ background: t.accentBg, borderBottom: `1px solid ${t.border}`, padding: "10px 20px 10px 42px" }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1fr 0.8fr", gap: 8, fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
                                                <span>Sr.</span><span>Test</span><span>Code</span><span>Price</span><span>Discount</span><span>Net</span>
                                            </div>
                                            {bill.items?.map((item, j) => (
                                                <div key={j} style={{ display: "grid", gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1fr 0.8fr", gap: 8, fontSize: "0.8rem", padding: "5px 0", borderTop: j > 0 ? `1px solid ${t.border}` : "none", alignItems: "center" }}>
                                                    <span style={{ color: t.faint }}>{j + 1}</span>
                                                    <span style={{ fontWeight: 500, color: t.text }}>
                                                        {item.testName}
                                                        {item.isUrgent && <span style={{ fontSize: "0.65rem", color: "#dc2626", fontWeight: 700, marginLeft: 6, background: "rgba(239,68,68,0.1)", padding: "1px 5px", borderRadius: 4 }}>URGENT</span>}
                                                    </span>
                                                    <span style={{ color: t.accent, fontSize: "0.74rem", fontWeight: 600 }}>{item.testCode}</span>
                                                    <span style={{ color: t.text }}>₹{item.price}</span>
                                                    <span style={{ color: item.discount > 0 ? "#dc2626" : t.faint }}>
                                                        {item.discount > 0 ? `-₹${item.discount}` : "—"}
                                                    </span>
                                                    <span style={{ fontWeight: 600, color: t.heading }}>₹{item.netPrice}</span>
                                                </div>
                                            ))}
                                            {bill.notes && (
                                                <div style={{ marginTop: 8, fontSize: "0.76rem", color: t.muted, fontStyle: "italic" }}>
                                                    Note: {bill.notes}
                                                </div>
                                            )}

                                            {/* Bottom row — bill meta info + Print button */}
                                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                                <div style={{ display: "flex", gap: 16, fontSize: "0.72rem", color: t.muted, flexWrap: "wrap" }}>
                                                    <span>Bill No: <strong style={{ color: t.text }}>{bill.billNumber}</strong></span>
                                                    <span>Payment: <strong style={{ color: t.text, textTransform: "capitalize" }}>{bill.paymentMode}</strong></span>
                                                    <span>Dispatch: <strong style={{ color: t.text, textTransform: "capitalize" }}>{bill.dispatchMethod}</strong></span>
                                                </div>
                                                <button
                                                    onClick={() => onPrintBill?.(bill)}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: 6,
                                                        padding: "7px 14px", borderRadius: 8,
                                                        border: `1px solid ${t.accentRing}`,
                                                        background: t.accentBg, color: t.accent,
                                                        fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                                                        fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <RiPrinterLine size={13} /> Print Bill
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* ── Totals footer row — same GRID_COLS ── */}
                            <div style={{
                                display: "grid", gridTemplateColumns: GRID_COLS,
                                background: t.accentBg, fontSize: "0.84rem", fontWeight: 700,
                                alignItems: "center", borderTop: `2px solid ${t.border}`,
                                padding: "12px 0",
                            }}>
                                <span />
                                <span style={{ padding: "0 10px 0 0", color: t.heading }}>Total</span>
                                <span />
                                <span />
                                <span />
                                <span style={{ padding: "0 10px", color: t.text }}>₹{totals.amount.toLocaleString("en-IN")}</span>
                                <span style={{ padding: "0 10px", color: "#16a34a" }}>₹{totals.paid.toLocaleString("en-IN")}</span>
                                <span style={{ padding: "0 10px", color: totals.due > 0 ? "#dc2626" : t.muted }}>₹{totals.due.toLocaleString("en-IN")}</span>
                                <span />
                                <span style={{ padding: "0 20px 0 10px", color: t.heading }}>₹{totals.net.toLocaleString("en-IN")}</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}