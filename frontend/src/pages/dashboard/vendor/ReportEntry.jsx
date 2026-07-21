import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import {
    RiArrowLeftLine, RiSaveLine, RiCheckboxCircleLine,
    RiPrinterLine, RiLoader4Line, RiAlertLine,
    RiFileTextLine, RiFlaskLine, RiEditLine, RiSearchLine,
    RiRefreshLine, RiCloseLine, RiTimeLine,
} from "react-icons/ri";
import { initReport, getReport, saveValues, verifyReport, listReports } from "../../../services/reportService";
import { getBills } from "../../../services/billingService";
import { fetchProfile } from "../../../services/profileService";
import ReportPrint from "./ReportPrint";

// ── Status config ──────────────────────────────────────────────────
const REPORT_STATUS = {
    not_started: { label: "Not Started", bg: "rgba(148,163,184,0.12)", color: "#64748b", dot: "#94a3b8" },
    pending: { label: "Pending", bg: "rgba(251,191,36,0.12)", color: "#d97706", dot: "#fbbf24" },
    partial: { label: "Partial", bg: "rgba(249,115,22,0.12)", color: "#ea580c", dot: "#f97316" },
    completed: { label: "Completed", bg: "rgba(59,130,246,0.12)", color: "#2563eb", dot: "#3b82f6" },
    verified: { label: "Verified", bg: "rgba(34,197,94,0.12)", color: "#16a34a", dot: "#22c55e" },
};

// ── Status pill (memoized — only re-renders when `status` changes) ─
const StatusPill = memo(function StatusPill({ status }) {
    const s = REPORT_STATUS[status] || REPORT_STATUS.not_started;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: s.bg, color: s.color,
            fontSize: "0.72rem", fontWeight: 600,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
            {s.label}
        </span>
    );
});

// ── Flag badge (memoized) ───────────────────────────────────────────
const FlagBadge = memo(function FlagBadge({ flag }) {
    if (!flag || flag === "N") return null;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            background: flag === "H" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
            color: flag === "H" ? "#dc2626" : "#2563eb",
            fontSize: "0.65rem", fontWeight: 800, flexShrink: 0,
        }}>
            {flag}
        </span>
    );
});

const ParamRow = memo(function ParamRow({ param, testResultId, onChange, t, isDark }) {
    const isHeading = param.fieldType === "heading";
    const isAbnormal = param.flag === "H" || param.flag === "L";

    if (isHeading) return (
        <tr style={{ background: isDark ? "rgba(56,189,248,0.05)" : "rgba(2,132,199,0.04)" }}>
            <td colSpan={5} style={{ padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", color: isDark ? "#e2e8f0" : "#0f172a" }}>
                {param.name}
            </td>
        </tr>
    );

    const range = param.rangeText ||
        (param.rangeMin !== null && param.rangeMax !== null ? `${param.rangeMin} - ${param.rangeMax}`
            : param.rangeMin !== null ? `> ${param.rangeMin}`
                : param.rangeMax !== null ? `< ${param.rangeMax}` : "");

    const valueColor = param.flag === "H" ? "#dc2626" : param.flag === "L" ? "#2563eb" : (isDark ? "#e2e8f0" : "#0f172a");

    const handleValue = (e) => onChange(testResultId, param._id, e.target.value);

    return (
        <tr style={{ borderTop: `1px solid ${t.border}`, background: isAbnormal ? (isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)") : "transparent" }}>
            <td style={{ padding: "8px 16px", paddingLeft: param.isSubField ? 32 : 16, fontSize: "0.82rem", color: isDark ? "#e2e8f0" : "#0f172a", fontWeight: isAbnormal ? 600 : 400, width: "34%", verticalAlign: "middle" }}>
                {param.name}
            </td>
            <td style={{ padding: "6px 8px", width: "22%", verticalAlign: "middle" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FlagBadge flag={param.flag} />
                    {param.fieldType === "option" ? (
                        <select value={param.value} onChange={handleValue}
                            style={{ flex: 1, background: t.inputBg, border: `1.5px solid ${isAbnormal ? (param.flag === "H" ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)") : t.accentRing}`, borderRadius: 7, padding: "5px 8px", color: valueColor, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
                            <option value="">— Select —</option>
                            {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : param.fieldType === "text" ? (
                        <input value={param.value} onChange={handleValue} placeholder="Enter value"
                            style={{ flex: 1, background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 7, padding: "5px 8px", color: valueColor, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                    ) : (
                        <input type="number" value={param.value} onChange={handleValue} placeholder="Value"
                            style={{ flex: 1, background: t.inputBg, border: `1.5px solid ${isAbnormal ? (param.flag === "H" ? "rgba(239,68,68,0.6)" : "rgba(59,130,246,0.6)") : t.accentRing}`, borderRadius: 7, padding: "5px 8px", color: valueColor, fontSize: "0.86rem", fontWeight: isAbnormal ? 700 : 400, fontFamily: "'DM Sans',sans-serif", outline: "none", width: 90 }} />
                    )}
                </div>
            </td>
            <td style={{ padding: "6px 8px", textAlign: "center", width: "8%", verticalAlign: "middle" }}>
                {param.flag && param.flag !== "N" && (
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: param.flag === "H" ? "#dc2626" : "#2563eb" }}>{param.flag}</span>
                )}
            </td>
            <td style={{ padding: "6px 16px", fontSize: "0.78rem", color: t.muted, width: "14%", verticalAlign: "middle" }}>{param.unit || "—"}</td>
            <td style={{ padding: "6px 16px", fontSize: "0.76rem", color: t.muted, width: "22%", verticalAlign: "middle", lineHeight: 1.4 }}>{range || "—"}</td>
        </tr>
    );
});

// ── Test section (memoized) ─────────────────────────────────────────
const TestSection = memo(function TestSection({ testResult, t, isDark, onParamChange, onInterpretChange, isActive, onSelect }) {
    const [showInterp, setShowInterp] = useState(false);

    const { filled, total, abnormal, pct, sortedParams } = useMemo(() => {
        let filled = 0, total = 0, abnormal = 0;
        for (const p of testResult.paramResults) {
            if (p.fieldType === "heading") continue;
            total++;
            if (p.value !== "") filled++;
            if (p.isAbnormal) abnormal++;
        }
        const sortedParams = [...testResult.paramResults].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return { filled, total, abnormal, pct: total > 0 ? Math.round((filled / total) * 100) : 0, sortedParams };
    }, [testResult.paramResults]);

    return (
        <div style={{ marginBottom: 20, border: `1.5px solid ${isActive ? t.accent : t.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color .2s" }}>
            <div onClick={onSelect} style={{ padding: "13px 18px", background: isActive ? (isDark ? "rgba(56,189,248,0.08)" : "rgba(2,132,199,0.06)") : t.card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isActive ? `1px solid ${t.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: t.accent }}>
                        <RiFlaskLine size={17} />
                    </div>
                    <div>
                        <div className="playfair" style={{ fontSize: "0.95rem", fontWeight: 700, color: t.heading }}>{testResult.testName}</div>
                        <div style={{ fontSize: "0.72rem", color: t.muted, marginTop: 2 }}>
                            {testResult.department}{testResult.sampleType && ` · ${testResult.sampleType}`}
                            <span style={{ marginLeft: 10, color: t.accent }}>{testResult.testCode}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {abnormal > 0 && (
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#dc2626", background: "rgba(239,68,68,0.1)", padding: "3px 9px", borderRadius: 20 }}>
                            {abnormal} Abnormal
                        </span>
                    )}
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", color: t.muted, marginBottom: 4 }}>{filled}/{total} filled</div>
                        <div style={{ width: 80, height: 5, background: t.border, borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : t.accent, borderRadius: 3, transition: "width .3s" }} />
                        </div>
                    </div>
                    <StatusPill status={testResult.status === "entered" || testResult.status === "verified" ? testResult.status === "verified" ? "verified" : "completed" : "pending"} />
                    <span style={{ color: t.faint }}>{isActive ? "▲" : "▼"}</span>
                </div>
            </div>

            {isActive && (
                <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: t.accentBg }}>
                                {["TEST", "VALUE", "FLAG", "UNIT", "REFERENCE"].map((h, i) => (
                                    <th key={h} style={{ padding: "8px 16px", textAlign: i === 2 ? "center" : "left", fontSize: "0.66rem", fontWeight: 700, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", width: ["34%", "22%", "8%", "14%", "22%"][i] }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedParams.map(param => (
                                <ParamRow key={param._id} param={param} t={t} isDark={isDark}
                                    testResultId={testResult._id} onChange={onParamChange} />
                            ))}
                        </tbody>
                    </table>

                    <div style={{ padding: "14px 18px", borderTop: `1px solid ${t.border}`, background: isDark ? "rgba(56,189,248,0.02)" : "rgba(2,132,199,0.02)" }}>
                        <button onClick={() => setShowInterp(s => !s)}
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: t.accent, fontSize: "0.78rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", marginBottom: showInterp ? 10 : 0 }}>
                            <RiEditLine size={13} /> {showInterp ? "Hide" : "Edit"} Interpretation / Clinical Notes
                        </button>
                        {showInterp && (
                            <textarea value={testResult.interpretation} onChange={e => onInterpretChange(testResult._id, e.target.value)}
                                rows={5} placeholder="Clinical interpretation for this test…"
                                style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 9, padding: "10px 13px", color: t.text, fontSize: "0.84rem", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

// ── Action button config per status ───────────────────────────────
const ACTION_CFG = {
    not_started: { label: "Start Entry", Icon: RiFlaskLine, bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.3)", color: "#38bdf8" },
    pending: { label: "Enter Results", Icon: RiFlaskLine, bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.3)", color: "#38bdf8" },
    partial: { label: "Continue", Icon: RiEditLine, bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", color: "#f97316" },
    completed: { label: "Verify Now", Icon: RiCheckboxCircleLine, bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", color: "#3b82f6" },
    verified: { label: "Print Report", Icon: RiPrinterLine, bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", color: "#22c55e" },
};

// ── toInputDate helper ─────────────────────────────────────────────
const toDateInput = (d) => new Date(d).toISOString().split("T")[0];

const BILL_GRID_COLS = "4px 1.4fr 1.7fr 2.6fr 1fr 160px 170px";
const ROW_HEIGHT = 88;
const VIRTUALIZE_THRESHOLD = 40; // only pay react-window's overhead once lists actually get big

// ── Bill row (memoized, used both in plain map and in react-window) ─
const BillRow = memo(function BillRow({ bill, reportMap, onSelect, t, style, isLast }) {
    const rStatus = reportMap[bill._id?.toString()] || "not_started";
    const statusCfg = REPORT_STATUS[rStatus] || REPORT_STATUS.not_started;
    const actionCfg = ACTION_CFG[rStatus] || ACTION_CFG.not_started;
    const ActionIcon = actionCfg.Icon;

    return (
        <div
            className="bp-row"
            style={{
                ...style,
                display: "grid",
                gridTemplateColumns: BILL_GRID_COLS,
                borderBottom: isLast ? "none" : `1px solid ${t.border}`,
                alignItems: "center",
                "--row-hover": t.rowHover,
            }}
        >
            {/* Status bar left edge */}
            <div style={{ height: "100%", minHeight: 64, background: statusCfg.dot, borderRadius: "0 2px 2px 0" }} />

            {/* Bill no + date */}
            <div style={{ padding: "16px 12px 16px 18px" }}>
                <div style={{ fontWeight: 700, color: t.accent, fontSize: "0.82rem", letterSpacing: "0.01em" }}>
                    {bill.billNumber}
                </div>
                <div style={{ fontSize: "0.7rem", color: t.faint, marginTop: 3 }}>
                    {new Date(bill.billingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div style={{ fontSize: "0.69rem", color: t.faint, marginTop: 1 }}>
                    {new Date(bill.billingDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }).toLowerCase()}
                </div>
            </div>

            {/* Patient */}
            <div style={{ padding: "16px 12px" }}>
                <div style={{ fontWeight: 600, color: t.text, fontSize: "0.85rem" }}>
                    {bill.patient?.firstName} {bill.patient?.lastName}
                </div>
                <div style={{ fontSize: "0.71rem", color: t.muted, marginTop: 3 }}>
                    {bill.patientId} · {bill.patient?.age} yr · {bill.patient?.gender}
                </div>
                {bill.patient?.phone && (
                    <div style={{ fontSize: "0.69rem", color: t.faint, marginTop: 2 }}>{bill.patient.phone}</div>
                )}
            </div>

            {/* Tests */}
            <div style={{ padding: "16px 12px", fontSize: "0.8rem", color: t.muted, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis" }}>
                {bill.items?.map(i => i.testName).join(", ")}
            </div>

            {/* Amount */}
            <div style={{ padding: "16px 12px" }}>
                <div style={{ fontWeight: 700, color: t.heading, fontSize: "0.88rem" }}>
                    ₹{bill.grandTotal?.toLocaleString("en-IN")}
                </div>
                {bill.dueAmount > 0 && (
                    <div style={{ fontSize: "0.69rem", color: "#dc2626", marginTop: 3, fontWeight: 600 }}>
                        Due ₹{bill.dueAmount?.toLocaleString("en-IN")}
                    </div>
                )}
            </div>

            {/* Report status */}
            <div style={{ padding: "16px 12px" }}>
                <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20,
                    background: statusCfg.bg, color: statusCfg.color,
                    fontSize: "0.75rem", fontWeight: 600,
                    border: `1px solid ${statusCfg.dot}44`,
                    whiteSpace: "nowrap",
                }}>
                    <span style={{
                        width: 7, height: 7, borderRadius: "50%", background: statusCfg.dot, flexShrink: 0,
                        boxShadow: `0 0 5px ${statusCfg.dot}`,
                    }} />
                    {statusCfg.label}
                </span>
            </div>

            {/* Action button */}
            <div style={{ padding: "16px 16px 16px 8px", display: "flex" }}>
                <button
                    onClick={() => onSelect(bill)}
                    className="bp-action-btn"
                    style={{
                        width: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 12px", borderRadius: 9,
                        border: `1.5px solid ${actionCfg.border}`,
                        background: actionCfg.bg,
                        color: actionCfg.color,
                        fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
                    }}
                >
                    <ActionIcon size={13} /> {actionCfg.label}
                </button>
            </div>
        </div>
    );
});

// ══════════════════════════════════════════════════════════════════
// BILL PICKER — with report status column
// ══════════════════════════════════════════════════════════════════
function BillPicker({ t, isDark, onSelect }) {
    const [bills, setBills] = useState([]);
    const [reportMap, setReportMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Default date range: today only
    const todayStr = toDateInput(new Date());
    const [fromDate, setFromDate] = useState(todayStr);
    const [toDate, setToDate] = useState(todayStr);

    const load = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const [billsRes, reportsRes] = await Promise.all([
                getBills({ limit: 500 }),         // get all, we filter client-side by date
                listReports({ limit: 500 }),
            ]);
            setBills(billsRes.data.bills || []);
            const map = {};
            for (const r of (reportsRes.data.reports || [])) {
                const bId = r.billId?._id || r.billId?.toString?.() || r.billId;
                if (bId) map[bId.toString()] = r.status;
            }
            setReportMap(map);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || "Failed to load.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── dateBills: bills within the selected range (memoized) ──────
    const dateBills = useMemo(() => bills.filter(b => {
        const bd = toDateInput(b.billingDate);
        return bd >= fromDate && bd <= toDate;
    }), [bills, fromDate, toDate]);

    // ── filtered: dateBills + search + status (memoized, single pass) ─
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return dateBills.filter(b => {
            if (q) {
                const matchSearch =
                    b.billNumber?.toLowerCase().includes(q) ||
                    b.patientId?.toLowerCase().includes(q) ||
                    b.patient?.firstName?.toLowerCase().includes(q) ||
                    b.patient?.lastName?.toLowerCase().includes(q) ||
                    b.patient?.phone?.includes(q) ||
                    b.items?.some(i => i.testName?.toLowerCase().includes(q));
                if (!matchSearch) return false;
            }
            const rStatus = reportMap[b._id?.toString()] || "not_started";
            if (statusFilter !== "ALL" && rStatus !== statusFilter) return false;
            return true;
        });
    }, [dateBills, search, statusFilter, reportMap]);

    // ── Counts — only within current date range (memoized, single pass) ─
    const counts = useMemo(() => dateBills.reduce((acc, b) => {
        const s = reportMap[b._id?.toString()] || "not_started";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {}), [dateBills, reportMap]);

    // Quick range helpers
    const setToday = () => { setFromDate(todayStr); setToDate(todayStr); };
    const setYesterday = () => { const y = toDateInput(new Date(Date.now() - 86400000)); setFromDate(y); setToDate(y); };
    const setLast7 = () => { setFromDate(toDateInput(new Date(Date.now() - 6 * 86400000))); setToDate(todayStr); };
    const setLast30 = () => { setFromDate(toDateInput(new Date(Date.now() - 29 * 86400000))); setToDate(todayStr); };

    const { isToday, isYesterday, isLast7, isLast30 } = useMemo(() => ({
        isToday: fromDate === todayStr && toDate === todayStr,
        isYesterday: fromDate === toDate && fromDate === toDateInput(new Date(Date.now() - 86400000)),
        isLast7: fromDate === toDateInput(new Date(Date.now() - 6 * 86400000)) && toDate === todayStr,
        isLast30: fromDate === toDateInput(new Date(Date.now() - 29 * 86400000)) && toDate === todayStr,
    }), [fromDate, toDate, todayStr]);

    return (
        <div>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                /* CSS hover instead of onMouseEnter/onMouseLeave JS handlers */
                .bp-row { transition: background .12s; cursor: default; }
                .bp-row:hover { background: var(--row-hover); }
                .bp-action-btn { transition: opacity .15s; }
                .bp-action-btn:hover { opacity: 0.8; }
            `}</style>

            {/* ── Page header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Enter & Verify</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Select a bill to enter or update test results.</p>
                </div>
                <button onClick={load} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                    <RiRefreshLine size={15} />
                </button>
            </div>

            {/* ── Status summary cards ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                    { key: "ALL", label: "All", value: dateBills.length, color: t.accent, activeBg: t.accent },
                    { key: "not_started", label: "Not Started", value: counts.not_started || 0, color: "#64748b", activeBg: "#64748b" },
                    { key: "partial", label: "Partial", value: counts.partial || 0, color: "#f97316", activeBg: "#f97316" },
                    { key: "completed", label: "Completed", value: counts.completed || 0, color: "#3b82f6", activeBg: "#3b82f6" },
                    { key: "verified", label: "Verified", value: counts.verified || 0, color: "#22c55e", activeBg: "#22c55e" },
                ].map(s => {
                    const isActive = statusFilter === s.key;
                    return (
                        <div key={s.key} onClick={() => setStatusFilter(s.key)} style={{
                            flex: 1, minWidth: 110, padding: "14px 18px", borderRadius: 14, cursor: "pointer",
                            background: isActive ? s.activeBg : t.card,
                            border: `1.5px solid ${isActive ? s.activeBg : t.border}`,
                            transition: "all .18s",
                            boxShadow: isActive ? `0 4px 16px ${s.activeBg}44` : "none",
                        }}>
                            <div className="playfair" style={{ fontSize: "1.6rem", fontWeight: 800, color: isActive ? "#fff" : s.color, lineHeight: 1 }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: "0.71rem", fontWeight: 500, color: isActive ? "rgba(255,255,255,0.82)" : t.muted, marginTop: 5 }}>
                                {s.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Filters bar ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>

                {/* Search */}
                <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 13px" }}>
                    <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, bill no, test name…"
                        style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.84rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                    {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}><RiCloseLine size={13} /></button>}
                </div>

                {/* Date inputs */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 10px", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                    <span style={{ color: t.faint, fontSize: "0.8rem" }}>→</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 10px", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                </div>

                {/* Quick range buttons */}
                <div style={{ display: "flex", gap: 4 }}>
                    {[
                        { label: "Today", fn: setToday, active: isToday },
                        { label: "Yest.", fn: setYesterday, active: isYesterday },
                        { label: "7d", fn: setLast7, active: isLast7 },
                        { label: "30d", fn: setLast30, active: isLast30 },
                    ].map(r => (
                        <button key={r.label} onClick={r.fn} style={{
                            padding: "7px 11px", borderRadius: 8, fontSize: "0.76rem", fontWeight: r.active ? 600 : 400,
                            border: `1px solid ${r.active ? t.accent : t.border}`,
                            background: r.active ? t.accentBg : "none",
                            color: r.active ? t.accent : t.navText,
                            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                        }}>{r.label}</button>
                    ))}
                </div>
            </div>

            {/* Loading / Error */}
            {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: t.muted, padding: "40px 0" }}>
                    <RiLoader4Line size={22} style={{ animation: "spin .7s linear infinite" }} /> Loading bills…
                </div>
            )}
            {error && !loading && (
                <div style={{ color: "#ef4444", padding: "40px 0", textAlign: "center" }}>
                    <RiAlertLine size={28} style={{ marginBottom: 8 }} /><p>{error}</p>
                    <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
                </div>
            )}

            {/* ── Bills Table ── */}
            {!loading && !error && (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>

                    {/* Results bar */}
                    <div style={{ padding: "11px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: t.muted }}>
                            Showing <strong style={{ color: t.text }}>{filtered.length}</strong> of <strong style={{ color: t.text }}>{dateBills.length}</strong> bills for selected range
                        </span>
                        {(search || statusFilter !== "ALL") && (
                            <button onClick={() => { setSearch(""); setStatusFilter("ALL"); }} style={{ fontSize: "0.73rem", color: t.accent, background: "none", border: "none", cursor: "pointer" }}>
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* ── Column headers ── */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: BILL_GRID_COLS,
                        background: t.accentBg, borderBottom: `1px solid ${t.border}`,
                        fontSize: "0.65rem", fontWeight: 700, color: t.muted,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        alignItems: "center",
                    }}>
                        <span />
                        <span style={{ padding: "10px 12px 10px 18px" }}>Bill No. / Date</span>
                        <span style={{ padding: "10px 12px" }}>Patient</span>
                        <span style={{ padding: "10px 12px" }}>Tests</span>
                        <span style={{ padding: "10px 12px" }}>Amount</span>
                        <span style={{ padding: "10px 12px" }}>Report Status</span>
                        <span style={{ padding: "10px 16px 10px 8px" }}>Action</span>
                    </div>

                    {/* ── Rows ── */}
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 20px", color: t.faint }}>
                            <RiFileTextLine size={38} style={{ marginBottom: 10, opacity: 0.5 }} />
                            <p className="playfair" style={{ fontSize: "1rem", color: t.muted, marginBottom: 4 }}>No bills found</p>
                            <p style={{ fontSize: "0.78rem", color: t.faint }}>
                                {search ? `No match for "${search}"` : "Try changing the date range or status filter."}
                            </p>
                        </div>
                    ) : filtered.length > VIRTUALIZE_THRESHOLD ? (
                        <List
                            height={Math.min(filtered.length * ROW_HEIGHT, 640)}
                            itemCount={filtered.length}
                            itemSize={ROW_HEIGHT}
                            width="100%"
                        >
                            {({ index, style }) => (
                                <BillRow
                                    bill={filtered[index]}
                                    reportMap={reportMap}
                                    onSelect={onSelect}
                                    t={t}
                                    style={style}
                                    isLast={index === filtered.length - 1}
                                />
                            )}
                        </List>
                    ) : (
                        filtered.map((bill, i) => (
                            <BillRow
                                key={bill._id}
                                bill={bill}
                                reportMap={reportMap}
                                onSelect={onSelect}
                                t={t}
                                isLast={i === filtered.length - 1}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}


function ReportEntryForm({ t, isDark, billId, bill, patient, onBack }) {
    const [report, setReport] = useState(null);
    const [localData, setLocalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTest, setActiveTest] = useState(0);
    const [showPrint, setShowPrint] = useState(false);
    const [labDoctor, setLabDoctor] = useState("");
    const [labDegree, setLabDegree] = useState("");
    const [notes, setNotes] = useState("");
    const [toast, setToast] = useState({ msg: "", type: "" });

    // ── Vendor profile (lab name, logo, staff/doctors) ─────────────
    const [vendorProfile, setVendorProfile] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchProfile();
                setVendorProfile(res.data.user);
            } catch (err) {
                console.error("Failed to load vendor profile:", err);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                let r;
                try {
                    r = await getReport(billId);
                } catch (e) {
                    if (e.response?.status === 404) r = await initReport(billId);
                    else throw e;
                }
                const rep = r.data.report;
                setReport(rep);
                // structuredClone: faster + safer deep clone than JSON.parse(JSON.stringify())
                setLocalData(structuredClone(rep.testResults));
                setLabDoctor(rep.labDoctor || "");
                setLabDegree(rep.labDegree || "");
                setNotes(rep.notes || "");
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load report.");
            } finally { setLoading(false); }
        })();
    }, [billId]);

    const handleParamChange = useCallback((testResultId, paramId, value) => {
        setLocalData(prev => prev.map(tr => {
            if (tr._id !== testResultId) return tr;
            return {
                ...tr,
                paramResults: tr.paramResults.map(p => {
                    if (p._id !== paramId) return p;
                    let flag = "";
                    if (p.fieldType === "numeric" && value !== "") {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            if (p.rangeMin !== null && num < p.rangeMin) flag = "L";
                            else if (p.rangeMax !== null && num > p.rangeMax) flag = "H";
                            else flag = "N";
                        }
                    }
                    return { ...p, value, flag, isAbnormal: flag === "H" || flag === "L" };
                }),
                status: "entered",
            };
        }));
    }, []);

    const handleInterpretChange = useCallback((testResultId, value) => {
        setLocalData(prev => prev.map(tr =>
            tr._id === testResultId ? { ...tr, interpretation: value } : tr
        ));
    }, []);

    const handleSave = useCallback(async (verify = false) => {
        try {
            setSaving(true);
            await saveValues(billId, { testResults: localData, labDoctor, labDegree, notes });
            if (verify) await verifyReport(billId);
            setToast({ msg: verify ? "Report verified!" : "Values saved successfully.", type: "success" });
            setTimeout(() => setToast({ msg: "", type: "" }), 3000);
        } catch (err) {
            setToast({ msg: err.response?.data?.message || "Failed to save.", type: "error" });
        } finally { setSaving(false); }
    }, [billId, localData, labDoctor, labDegree, notes]);

    const { totalParams, filledParams, abnormalCount, pct } = useMemo(() => {
        let totalParams = 0, filledParams = 0, abnormalCount = 0;
        for (const tr of localData) {
            for (const p of tr.paramResults) {
                if (p.fieldType === "heading") continue;
                totalParams++;
                if (p.value !== "") filledParams++;
                if (p.isAbnormal) abnormalCount++;
            }
        }
        return {
            totalParams, filledParams, abnormalCount,
            pct: totalParams > 0 ? Math.round((filledParams / totalParams) * 100) : 0,
        };
    }, [localData]);

    const overallStatus = report?.status || "pending";
    const reportForPrint = useMemo(
        () => report ? { ...report, testResults: localData, labDoctor, labDegree, notes } : null,
        [report, localData, labDoctor, labDegree, notes]
    );

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, color: t.muted }}>
            <RiLoader4Line size={26} style={{ animation: "spin .7s linear infinite" }} /> Loading report…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (error) return (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
            <RiAlertLine size={32} style={{ marginBottom: 8 }} /><p>{error}</p>
        </div>
    );

    return (
        <div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {showPrint && reportForPrint && (
                <ReportPrint report={reportForPrint} bill={bill} patient={patient} vendor={vendorProfile || {}} t={t} isDark={isDark} onClose={() => setShowPrint(false)} />
            )}

            {toast.msg && (
                <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 20px", borderRadius: 12, background: toast.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`, color: toast.type === "success" ? "#16a34a" : "#ef4444", fontSize: "0.84rem", fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                    {toast.type === "success" ? <RiCheckboxCircleLine size={16} /> : <RiAlertLine size={16} />} {toast.msg}
                </div>
            )}

            {/* Top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.accentBg, color: t.muted, fontSize: "0.84rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiArrowLeftLine size={14} /> Back
                    </button>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading }}>Report Entry</div>
                            <StatusPill status={overallStatus} />
                        </div>
                        <div style={{ fontSize: "0.76rem", color: t.muted, marginTop: 2 }}>
                            {patient?.firstName} {patient?.lastName} · {patient?.patientId} · {patient?.age} yr · {patient?.gender}
                            {bill?.billNumber && <span style={{ color: t.accent, marginLeft: 8 }}>{bill.billNumber}</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowPrint(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiPrinterLine size={14} /> Preview
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.84rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                        {saving ? <RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> : <RiSaveLine size={14} />} Save
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving || pct < 100} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: pct === 100 ? "#16a34a" : t.border, color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: (saving || pct < 100) ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiCheckboxCircleLine size={14} /> Verify & Complete
                    </button>
                </div>
            </div>

            {/* Progress */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.78rem", color: t.muted }}>Overall Progress</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: t.heading }}>{filledParams}/{totalParams} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: t.border, borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : t.accent, borderRadius: 4, transition: "width .4s" }} />
                    </div>
                </div>
                {[
                    { label: "Tests", value: localData.length, color: t.accent },
                    { label: "Filled", value: filledParams, color: "#16a34a" },
                    { label: "Remaining", value: totalParams - filledParams, color: "#d97706" },
                    { label: "Abnormal", value: abnormalCount, color: abnormalCount > 0 ? "#dc2626" : t.muted },
                ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", minWidth: 60 }}>
                        <div className="playfair" style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: "0.68rem", color: t.muted, marginTop: 3 }}>{s.label}</div>
                    </div>
                ))}
            </div>


            {/* Test navigator */}
            {localData.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                    {localData.map((tr, i) => {
                        const filled = tr.paramResults.filter(p => p.fieldType !== "heading" && p.value !== "").length;
                        const total = tr.paramResults.filter(p => p.fieldType !== "heading").length;
                        const done = total > 0 && filled === total;
                        return (
                            <button key={tr._id} onClick={() => setActiveTest(i)}
                                style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${activeTest === i ? t.accent : t.border}`, background: activeTest === i ? t.accentBg : "none", color: activeTest === i ? t.accent : t.navText, fontSize: "0.78rem", fontWeight: activeTest === i ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                                {done && <RiCheckboxCircleLine size={12} style={{ color: "#16a34a" }} />}
                                {tr.testName.length > 20 ? tr.testName.slice(0, 20) + "…" : tr.testName}
                                <span style={{ fontSize: "0.68rem", color: t.faint }}>({filled}/{total})</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Test sections */}
            {localData.map((testResult, i) => (
                <TestSection key={testResult._id} testResult={testResult} t={t} isDark={isDark}
                    onParamChange={handleParamChange} onInterpretChange={handleInterpretChange}
                    isActive={activeTest === i} onSelect={() => setActiveTest(activeTest === i ? -1 : i)} />
            ))}

            {/* Notes */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 20px", marginTop: 8 }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Report Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any additional notes…"
                    style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 9, padding: "10px 13px", color: t.text, fontSize: "0.86rem", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "none" }} />
            </div>

            {/* Sticky bottom bar */}
            <div style={{ position: "sticky", bottom: 0, background: t.header, backdropFilter: "blur(12px)", borderTop: `1px solid ${t.border}`, padding: "12px 0", marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10, zIndex: 40 }}>
                <button onClick={() => setShowPrint(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    <RiPrinterLine size={14} /> Preview & Print
                </button>
                <button onClick={() => handleSave(false)} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.86rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.7 : 1 }}>
                    {saving ? <RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> : <RiSaveLine size={14} />} Save Progress
                </button>
                <button onClick={() => handleSave(true)} disabled={saving || pct < 100} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: "none", background: pct === 100 ? "#16a34a" : t.border, color: "#fff", fontSize: "0.86rem", fontWeight: 700, cursor: (saving || pct < 100) ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    <RiCheckboxCircleLine size={14} /> {pct < 100 ? `Fill all values (${pct}%)` : "Verify & Complete"}
                </button>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════════════
export default function ReportEntry({ t, isDark }) {
    const [selectedBill, setSelectedBill] = useState(null);

    const handleBack = useCallback(() => setSelectedBill(null), []);

    if (selectedBill) {
        return (
            <ReportEntryForm
                t={t} isDark={isDark}
                billId={selectedBill._id}
                bill={selectedBill}
                patient={selectedBill.patient}
                onBack={handleBack}
            />
        );
    }

    return <BillPicker t={t} isDark={isDark} onSelect={setSelectedBill} />;
}