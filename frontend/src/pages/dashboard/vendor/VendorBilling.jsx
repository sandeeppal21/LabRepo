import { useState, useEffect, useCallback, useRef, memo, forwardRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    RiSearchLine, RiDownloadLine,
    RiLoader4Line, RiAlertLine,
    RiAddLine, RiSubtractLine, RiMoneyRupeeCircleLine,
    RiFileList3Line, RiCheckboxCircleLine, RiTimeLine,
    RiRefreshLine, RiCloseLine, RiPrinterLine,
} from "react-icons/ri";
import { getBills } from "../../../services/billingService";

const GRID_COLS = "32px 1.05fr 1.4fr 1.7fr 1fr 0.8fr 0.8fr 0.7fr 0.85fr 1fr";
const PAGE_LIMIT = 100;
const ROW_LIST_HEIGHT = 620;

const PAYMENT_STATUS_CFG = {
    paid: { label: "Paid", bg: "rgba(34,197,94,0.12)", color: "#16a34a", dot: "#22c55e" },
    due: { label: "Due", bg: "rgba(239,68,68,0.12)", color: "#dc2626", dot: "#ef4444" },
    partial: { label: "Partial", bg: "rgba(249,115,22,0.12)", color: "#ea580c", dot: "#f97316" },
};
const getPaymentStatus = (bill) => {
    if (bill.dueAmount <= 0) return "paid";
    if (bill.amountPaid <= 0) return "due";
    return "partial";
};

const EMPTY_TOTALS = { amount: 0, paid: 0, due: 0, discount: 0, net: 0, count: 0 };
const EMPTY_COUNTS = { paid: 0, due: 0, partial: 0, all: 0 };


const dateCache = new Map();
const MAX_DATE_CACHE = 1000;
function formatBillDate(rawDate) {
    const key = typeof rawDate === "string" ? rawDate : String(rawDate);
    const cached = dateCache.get(key);
    if (cached) return cached;

    const dt = new Date(rawDate);
    const dateStr = `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
    let h = dt.getHours();
    const m = String(dt.getMinutes()).padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const timeStr = `${h}:${m} ${ap}`;

    const result = { dateStr, timeStr };
    if (dateCache.size >= MAX_DATE_CACHE) dateCache.delete(dateCache.keys().next().value);
    dateCache.set(key, result);
    return result;
}

const toInputDate = (d) => new Date(d).toISOString().split("T")[0];
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; };

function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// ── PaymentStatusPill — pure, memoized ──────────────────────────────
const PaymentStatusPill = memo(function PaymentStatusPill({ status }) {
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
});

// ── PatientInfo — memoized ──────────────────────────────────────────
const PatientInfo = memo(function PatientInfo({ patient, patientId, t }) {
    return (
        <div style={{ padding: "0 10px" }}>
            <div style={{ fontWeight: 600, color: t.text, fontSize: "0.84rem" }}>
                {patient?.firstName?.toUpperCase()} {patient?.lastName?.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.7rem", color: t.muted, marginTop: 2 }}>
                {patient?.age} yr · {patient?.gender} · {patient?.phone}
            </div>
            <div style={{ fontSize: "0.68rem", color: t.accent, marginTop: 1 }}>{patientId}</div>
        </div>
    );
});

// ── TestRow — memoized, one line item in the expanded breakdown ────
const TestRow = memo(function TestRow({ item, index, t }) {
    return (
        <div style={{
            display: "grid", gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1fr 0.8fr", gap: 8,
            fontSize: "0.8rem", padding: "5px 0",
            borderTop: index > 0 ? `1px solid ${t.border}` : "none",
            alignItems: "center",
        }}>
            <span style={{ color: t.faint }}>{index + 1}</span>
            <span style={{ fontWeight: 500, color: t.text }}>
                {item.testName}
                {item.isUrgent && (
                    <span style={{ fontSize: "0.65rem", color: "#dc2626", fontWeight: 700, marginLeft: 6, background: "rgba(239,68,68,0.1)", padding: "1px 5px", borderRadius: 4 }}>
                        URGENT
                    </span>
                )}
            </span>
            <span style={{ color: t.accent, fontSize: "0.74rem", fontWeight: 600 }}>{item.testCode}</span>
            <span style={{ color: t.text }}>₹{item.price}</span>
            <span style={{ color: item.discount > 0 ? "#dc2626" : t.faint }}>
                {item.discount > 0 ? `-₹${item.discount}` : "—"}
            </span>
            <span style={{ fontWeight: 600, color: t.heading }}>₹{item.netPrice}</span>
        </div>
    );
});

// ── ExpandedBillDetails — memoized, test breakdown + notes + print ──
const ExpandedBillDetails = memo(function ExpandedBillDetails({ bill, t, onPrintBill }) {
    return (
        <div style={{ background: t.accentBg, borderBottom: `1px solid ${t.border}`, padding: "10px 20px 10px 42px" }}>
            <div style={{
                display: "grid", gridTemplateColumns: "0.4fr 2fr 1fr 1fr 1fr 0.8fr", gap: 8,
                fontSize: "0.68rem", fontWeight: 600, color: t.muted,
                letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6,
            }}>
                <span>Sr.</span><span>Test</span><span>Code</span><span>Price</span><span>Discount</span><span>Net</span>
            </div>

            {bill.items?.map((item, j) => (
                <TestRow key={item._id || j} item={item} index={j} t={t} />
            ))}

            {bill.notes && (
                <div style={{ marginTop: 8, fontSize: "0.76rem", color: t.muted, fontStyle: "italic" }}>
                    Note: {bill.notes}
                </div>
            )}

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
    );
});

const BillRow = memo(forwardRef(function BillRow(
    { bill, t, isExpanded, onToggleExpand, onPrintBill, style, ...rest },
    ref
) {
    const { dateStr, timeStr } = formatBillDate(bill.billingDate);

    return (
        <div ref={ref} style={style} {...rest}>
            <div
                className="vb-row"
                style={{
                    display: "grid", gridTemplateColumns: GRID_COLS,
                    borderBottom: `1px solid ${t.border}`,
                    fontSize: "0.83rem", alignItems: "center",
                    cursor: "default", padding: "12px 0",
                    "--vb-row-hover": t.rowHover,
                }}
            >
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                        onClick={() => onToggleExpand(bill._id)}
                        style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${t.accentRing}`, background: isExpanded ? t.accentBg : "none", color: t.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                        {isExpanded ? <RiSubtractLine size={11} /> : <RiAddLine size={11} />}
                    </button>
                </div>

                <div style={{ padding: "0 10px 0 0" }}>
                    <div style={{ fontSize: "0.82rem", color: t.text, fontWeight: 500 }}>{dateStr}</div>
                    <div style={{ fontSize: "0.7rem", color: t.faint, marginTop: 2 }}>{timeStr}</div>
                </div>

                <PatientInfo patient={bill.patient} patientId={bill.patientId} t={t} />

                <div style={{ padding: "0 10px", fontSize: "0.8rem", color: t.muted, lineHeight: 1.5 }}>
                    {bill.items?.map(i => i.testName).join(", ")}
                </div>

                <div style={{ padding: "0 10px", fontSize: "0.8rem", color: t.muted }}>
                    {bill.referringDoctorName || <span style={{ color: t.faint }}>—</span>}
                </div>

                <div style={{ padding: "0 10px", fontWeight: 500, color: t.text }}>₹{bill.subtotal.toLocaleString("en-IN")}</div>
                <div style={{ padding: "0 10px", fontWeight: 500, color: "#16a34a" }}>₹{bill.amountPaid.toLocaleString("en-IN")}</div>
                <div style={{ padding: "0 10px", fontWeight: bill.dueAmount > 0 ? 600 : 400, color: bill.dueAmount > 0 ? "#dc2626" : t.muted }}>
                    ₹{bill.dueAmount.toLocaleString("en-IN")}
                </div>
                <div style={{ padding: "0 10px" }}>
                    <PaymentStatusPill status={getPaymentStatus(bill)} />
                </div>
                <div style={{ padding: "0 20px 0 10px", fontWeight: 700, color: t.heading }}>₹{bill.grandTotal.toLocaleString("en-IN")}</div>
            </div>

            {isExpanded && (
                <ExpandedBillDetails bill={bill} t={t} onPrintBill={onPrintBill} />
            )}
        </div>
    );
}));

// ══════════════════════════════════════════════════════════════════
export default function VendorBilling({ t, isDark, onPrintBill }) {
    const [bills, setBills] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totals, setTotals] = useState(EMPTY_TOTALS);
    const [paymentCounts, setPaymentCounts] = useState(EMPTY_COUNTS);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("ALL");
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    const [fromDate, setFromDate] = useState(() => toInputDate(addDays(new Date(), -13)));
    const [toDate, setToDate] = useState(() => toInputDate(new Date()));

    const debouncedSearch = useDebouncedValue(search, 300);

    const loadFirstPage = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const r = await getBills({
                from: fromDate, to: toDate,
                search: debouncedSearch.trim() || undefined,
                paymentStatus: paymentFilter === "ALL" ? undefined : paymentFilter,
                page: 1, limit: PAGE_LIMIT,
            });
            setBills(r.data.bills);
            setHasMore(!!r.data.hasMore);
            setTotals(r.data.totals || EMPTY_TOTALS);
            setPaymentCounts(r.data.paymentCounts || EMPTY_COUNTS);
            setPage(1);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || "Failed to load bills.");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, debouncedSearch, paymentFilter]);

    useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const nextPage = page + 1;
            const r = await getBills({
                from: fromDate, to: toDate,
                search: debouncedSearch.trim() || undefined,
                status: paymentFilter === "ALL" ? undefined : paymentFilter,
                page: nextPage, limit: PAGE_LIMIT,
            });
            setBills(prev => [...prev, ...r.data.bills]);
            setHasMore(!!r.data.hasMore);
            setPage(nextPage);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || "Failed to load more bills.");
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, page, fromDate, toDate, debouncedSearch, paymentFilter]);

    const toggleExpand = useCallback((id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const exportCSV = () => {
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
        const rows = [
            ["Bill No.", "Bill Date", "Patient", "Patient ID", "Phone", "Tests", "Ref Doctor", "Amount", "Paid", "Due", "Net Amount"],
            ...bills.map(b => [
                b.billNumber,
                `${toDateStr(b.billingDate)} ${toTimeStr(b.billingDate)}`,
                `${b.patient?.firstName || ""} ${b.patient?.lastName || ""}`.trim(),
                b.patientId,
                b.patient?.phone || "",
                b.items?.map(i => i.testName).join("; ") || "",
                b.referringDoctorName || "",
                b.subtotal, b.amountPaid, b.dueAmount, b.grandTotal,
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `bills-${fromDate}-to-${toDate}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const scrollRef = useRef(null);
    const rowVirtualizer = useVirtualizer({
        count: bills.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 64,
        overscan: 8,
    });

    return (
        <div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .vb-row { transition: background .12s; }
                .vb-row:hover { background: var(--vb-row-hover); }
            `}</style>

            {/* ── Page header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Billing & Payments</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Financial overview and bill history for your lab.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={loadFirstPage} title="Refresh" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                        <RiRefreshLine size={15} />
                    </button>
                    <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiDownloadLine size={14} /> Export{bills.length < totals.count ? " (loaded)" : ""}
                    </button>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                    { label: "Total Bills", value: totals.count, icon: RiFileList3Line, color: t.accent, fmt: (v) => v },
                    { label: "Total Amount", value: totals.net, icon: RiMoneyRupeeCircleLine, color: t.accent, fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Total Paid", value: totals.paid, icon: RiCheckboxCircleLine, color: "#16a34a", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Total Due", value: totals.due, icon: RiTimeLine, color: totals.due > 0 ? "#dc2626" : "#16a34a", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
                    { label: "Discounts", value: totals.discount, icon: RiSubtractLine, color: "#d97706", fmt: (v) => `₹${v.toLocaleString("en-IN")}` },
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
                        { key: "ALL", label: "All Payments", count: paymentCounts.all, color: t.accent },
                        { key: "paid", label: "Paid", count: paymentCounts.paid, color: "#22c55e" },
                        { key: "partial", label: "Partial", count: paymentCounts.partial, color: "#f97316" },
                        { key: "due", label: "Due", count: paymentCounts.due, color: "#ef4444" },
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
                    <button onClick={loadFirstPage} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
                </div>
            ) : (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>

                    <div style={{ padding: "11px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: t.muted }}>
                            Showing <strong style={{ color: t.text }}>{bills.length}</strong> of <strong style={{ color: t.text }}>{totals.count}</strong> bills
                            {search && ` for "${search}"`}
                        </span>
                        {search && (
                            <button onClick={() => setSearch("")} style={{ fontSize: "0.74rem", color: t.accent, background: "none", border: "none", cursor: "pointer" }}>Clear search</button>
                        )}
                    </div>

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

                    {bills.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: t.faint }}>
                            <RiFileList3Line size={36} style={{ marginBottom: 8 }} />
                            <p style={{ fontSize: "0.84rem", color: t.muted }}>No bills found for this period</p>
                        </div>
                    ) : (
                        <>
                            <div ref={scrollRef} style={{ height: ROW_LIST_HEIGHT, overflow: "auto", position: "relative" }}>
                                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const bill = bills[virtualRow.index];
                                        return (
                                            <BillRow
                                                key={bill._id}
                                                ref={rowVirtualizer.measureElement}
                                                data-index={virtualRow.index}
                                                bill={bill}
                                                t={t}
                                                isExpanded={expandedIds.has(bill._id)}
                                                onToggleExpand={toggleExpand}
                                                onPrintBill={onPrintBill}
                                                style={{
                                                    position: "absolute", top: 0, left: 0, width: "100%",
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {hasMore && (
                                <div style={{ display: "flex", justifyContent: "center", padding: "14px 0", borderTop: `1px solid ${t.border}` }}>
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 8,
                                            padding: "9px 20px", borderRadius: 9,
                                            border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent,
                                            fontSize: "0.82rem", fontWeight: 600,
                                            cursor: loadingMore ? "default" : "pointer",
                                            opacity: loadingMore ? 0.7 : 1,
                                            fontFamily: "'DM Sans',sans-serif",
                                        }}
                                    >
                                        {loadingMore && <RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} />}
                                        {loadingMore ? "Loading…" : `Load more (${totals.count - bills.length} remaining)`}
                                    </button>
                                </div>
                            )}

                            <div style={{
                                display: "grid", gridTemplateColumns: GRID_COLS,
                                background: t.accentBg, fontSize: "0.84rem", fontWeight: 700,
                                alignItems: "center", borderTop: `2px solid ${t.border}`,
                                padding: "12px 0",
                            }}>
                                <span />
                                <span style={{ padding: "0 10px 0 0", color: t.heading }}>Total</span>
                                <span /><span /><span />
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