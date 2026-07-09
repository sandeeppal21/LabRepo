/**
 * VendorAnalysis.jsx
 *
 * Full Analysis dashboard — mirrors Flabs Analysis page exactly:
 *  - Stats row: Registrations, Tests, Billing Amount, Paid, Due
 *  - Referral breakdown table with donut chart
 *  - Income bar chart (Paid vs Due) — daily/weekly/monthly
 *  - Patient chart (New vs Old) — daily/weekly/monthly
 *  - Top 10 Tests table with donut chart
 *  - All charts animated on mount
 *
 * Props: t (theme), isDark (boolean)
 * APIs:  /api/bills  /api/reports  /api/patients
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    RiDownloadLine, RiLoader4Line, RiAlertLine,
    RiRefreshLine, RiCalendarLine,
    RiUserLine, RiTestTubeLine, RiMoneyRupeeCircleLine,
    RiCheckboxCircleLine, RiTimeLine, RiFileList3Line,
} from "react-icons/ri";
import { getBills } from "../../../services/billingService";
import { listReports } from "../../../services/reportService";

// ── Date helpers ───────────────────────────────────────────────────
const toInput = (d) => new Date(d).toISOString().split("T")[0];
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; };
const dayName = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short" });
const dayLabel = (d) => `${String(new Date(d).getDate()).padStart(2, "0")}/${String(new Date(d).getMonth() + 1).padStart(2, "0")}`;
const fmtINR = (n) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

// ── Animated count-up ──────────────────────────────────────────────
function useCountUp(target, duration = 900) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setVal(Math.round(start));
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return val;
}

// ── SVG Donut chart ────────────────────────────────────────────────
function DonutChart({ segments, size = 160, stroke = 28, label, sublabel, animate }) {
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const total = segments.reduce((s, x) => s + x.value, 0);

    const [progress, setProgress] = useState(0);
    useEffect(() => {
        if (!animate) { setProgress(1); return; }
        let f = 0;
        const t = setInterval(() => {
            f = Math.min(f + 0.04, 1);
            setProgress(f);
            if (f >= 1) clearInterval(t);
        }, 16);
        return () => clearInterval(t);
    }, [animate]);

    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
            {/* Track */}
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
            {/* Segments */}
            {total > 0 && segments.map((seg, i) => {
                const segLen = (seg.value / total) * circ * progress;
                const dash = `${segLen} ${circ - segLen}`;
                const rot = (offset / total) * 360 * progress - 90;
                offset += seg.value;
                return (
                    <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke={seg.color} strokeWidth={stroke}
                        strokeDasharray={dash} strokeDashoffset={0}
                        transform={`rotate(${rot} ${size / 2} ${size / 2})`}
                        style={{ transition: "stroke-dasharray .05s" }}
                    />
                );
            })}
            {/* Center text */}
            <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor" fontFamily="'Playfair Display',serif">
                {label}
            </text>
            {sublabel && (
                <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">
                    {sublabel}
                </text>
            )}
        </svg>
    );
}

// ── Animated SVG bar chart ─────────────────────────────────────────
function BarChart({ groups, isDark, t, height = 200 }) {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        let f = 0;
        const tm = setInterval(() => {
            f = Math.min(f + 0.035, 1);
            setProgress(f);
            if (f >= 1) clearInterval(tm);
        }, 16);
        return () => clearInterval(tm);
    }, [groups]);

    if (!groups.length) return (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: t.faint, fontSize: "0.82rem" }}>
            No data for this period
        </div>
    );

    const allVals = groups.flatMap(g => g.bars.map(b => b.value));
    const maxVal = Math.max(...allVals, 1);
    const PAD_L = 36, PAD_R = 8, PAD_T = 16, PAD_B = 28;
    const barW = 12, gap = 4;
    const groupW = groups[0].bars.length * (barW + gap) + 8;
    const totalW = groups.length * groupW;
    const chartH = height - PAD_T - PAD_B;

    // Y-axis labels
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
        y: PAD_T + chartH * (1 - p),
        val: Math.round(maxVal * p),
    }));

    return (
        <svg viewBox={`0 0 ${totalW + PAD_L + PAD_R} ${height}`} style={{ width: "100%", height }}>
            {/* Y-axis grid + labels */}
            {yTicks.map(({ y, val }) => (
                <g key={val}>
                    <line x1={PAD_L} y1={y} x2={totalW + PAD_L} y2={y} stroke={t.border} strokeWidth="0.5" strokeDasharray="3,3" />
                    <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="7" fill={t.faint} fontFamily="'DM Sans',sans-serif">
                        {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                    </text>
                </g>
            ))}

            {/* Bars */}
            {groups.map((group, gi) => {
                const gx = PAD_L + gi * groupW;
                return (
                    <g key={gi}>
                        {group.bars.map((bar, bi) => {
                            const bh = Math.max(2, (bar.value / maxVal) * chartH * progress);
                            const bx = gx + bi * (barW + gap) + 4;
                            const by = PAD_T + chartH - bh;
                            return (
                                <g key={bi}>
                                    <rect x={bx} y={by} width={barW} height={bh} fill={bar.color} rx="3" opacity="0.88" />
                                    {bar.value > 0 && progress > 0.9 && (
                                        <text x={bx + barW / 2} y={by - 3} textAnchor="middle" fontSize="6.5" fill={t.muted} fontFamily="'DM Sans',sans-serif">
                                            {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {/* X-axis label */}
                        <text x={gx + groupW / 2} y={height - 6} textAnchor="middle" fontSize="8" fill={t.faint} fontFamily="'DM Sans',sans-serif">
                            {group.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub1, sub1Val, sub2, sub2Val, Icon, color, prefix = "", t, isDark }) {
    const animated = useCountUp(typeof value === "number" ? value : 0);
    return (
        <div style={{ flex: 1, minWidth: 150, background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: "0.73rem", fontWeight: 600, color: t.muted, letterSpacing: "0.04em" }}>{label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
                    <Icon size={15} />
                </div>
            </div>
            <div className="playfair" style={{ fontSize: "1.9rem", fontWeight: 800, color, lineHeight: 1, marginBottom: 10 }}>
                {prefix}{typeof value === "number" ? animated.toLocaleString("en-IN") : value}
            </div>
            {sub1 && (
                <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ fontSize: "0.72rem", color: t.muted }}>
                        <span style={{ color: t.faint }}>{sub1} </span>
                        <strong style={{ color: sub1Val > 0 ? t.accent : t.faint }}>{prefix}{sub1Val?.toLocaleString("en-IN") || 0}</strong>
                    </div>
                    {sub2 && (
                        <div style={{ fontSize: "0.72rem", color: t.muted }}>
                            <span style={{ color: t.faint }}>{sub2} </span>
                            <strong style={{ color: t.faint }}>{prefix}{sub2Val?.toLocaleString("en-IN") || 0}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Section wrapper ────────────────────────────────────────────────
function Section({ title, children, t, right }) {
    return (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="playfair" style={{ fontSize: "0.96rem", fontWeight: 700, color: t.heading }}>{title}</div>
                {right}
            </div>
            {children}
        </div>
    );
}

// ── Period selector ────────────────────────────────────────────────
function PeriodSel({ value, onChange, t }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 10px", color: t.text, fontSize: "0.76rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
        </select>
    );
}

// ══════════════════════════════════════════════════════════════════
export default function VendorAnalysis({ t, isDark }) {
    const [bills, setBills] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Date range — default today
    const todayStr = toInput(new Date());
    const [fromDate, setFromDate] = useState(todayStr);
    const [toDate, setToDate] = useState(todayStr);
    const [refSearch, setRefSearch] = useState("");
    const [incomePeriod, setIncomePeriod] = useState("daily");
    const [patientPeriod, setPatientPeriod] = useState("daily");

    const load = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const r = await getBills({ limit: 2000 });
            setBills(r.data.bills || []);
        } catch (err) {
            setError(err.userMessage || "Failed to load data.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Filter bills by date range ─────────────────────────────────
    const rangeBills = useMemo(() => bills.filter(b => {
        const bd = toInput(b.billingDate);
        return bd >= fromDate && bd <= toDate;
    }), [bills, fromDate, toDate]);

    // ── Stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const referralBills = rangeBills.filter(b => b.referringDoctorName);
        const selfBills = rangeBills.filter(b => !b.referringDoctorName);
        const totalTests = rangeBills.reduce((s, b) => s + (b.items?.length || 0), 0);
        const refTests = referralBills.reduce((s, b) => s + (b.items?.length || 0), 0);
        const billing = rangeBills.reduce((s, b) => s + b.grandTotal, 0);
        const paid = rangeBills.reduce((s, b) => s + b.amountPaid, 0);
        const due = rangeBills.reduce((s, b) => s + b.dueAmount, 0);
        const refBilling = referralBills.reduce((s, b) => s + b.grandTotal, 0);
        const selfBilling = selfBills.reduce((s, b) => s + b.grandTotal, 0);
        const refPaid = referralBills.reduce((s, b) => s + b.amountPaid, 0);
        const selfPaid = selfBills.reduce((s, b) => s + b.amountPaid, 0);
        const refDue = referralBills.reduce((s, b) => s + b.dueAmount, 0);
        const selfDue = selfBills.reduce((s, b) => s + b.dueAmount, 0);
        return {
            registrations: rangeBills.length, refReg: referralBills.length, selfReg: selfBills.length,
            tests: totalTests, refTests, selfTests: totalTests - refTests,
            billing, refBilling, selfBilling,
            paid, refPaid, selfPaid,
            due, refDue, selfDue,
        };
    }, [rangeBills]);

    // ── Referral breakdown ─────────────────────────────────────────
    const referralData = useMemo(() => {
        const map = {};
        for (const b of rangeBills) {
            const key = b.referringDoctorName || "Self";
            if (!map[key]) map[key] = { name: key, bills: 0, amount: 0, discount: 0, paid: 0, due: 0 };
            map[key].bills++;
            map[key].amount += b.grandTotal;
            map[key].discount += b.totalDiscount;
            map[key].paid += b.amountPaid;
            map[key].due += b.dueAmount;
        }
        return Object.values(map).sort((a, b) => b.amount - a.amount);
    }, [rangeBills]);

    const filteredReferrals = useMemo(() => {
        if (!refSearch.trim()) return referralData;
        const q = refSearch.toLowerCase();
        return referralData.filter(r => r.name.toLowerCase().includes(q));
    }, [referralData, refSearch]);

    const DONUT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#10b981", "#6366f1"];

    const refTotal = referralData.reduce((s, r) => s + r.amount, 0);

    // ── Top 10 tests ───────────────────────────────────────────────
    const topTests = useMemo(() => {
        const map = {};
        for (const b of rangeBills) {
            for (const item of (b.items || [])) {
                if (!map[item.testName]) map[item.testName] = { name: item.testName, count: 0, amount: 0 };
                map[item.testName].count++;
                map[item.testName].amount += item.netPrice;
            }
        }
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [rangeBills]);

    // ── Income chart groups ────────────────────────────────────────
    const incomeGroups = useMemo(() => {
        const days = incomePeriod === "daily" ? 7 : incomePeriod === "weekly" ? 4 : 6;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            if (incomePeriod === "daily") {
                const dt = addDays(new Date(), -i);
                const key = toInput(dt);
                const dayBills = bills.filter(b => toInput(b.billingDate) === key);
                result.push({
                    label: dayName(dt),
                    bars: [
                        { value: dayBills.reduce((s, b) => s + b.amountPaid, 0), color: "#22c55e" },
                        { value: dayBills.reduce((s, b) => s + b.dueAmount, 0), color: "#ef4444" },
                    ],
                });
            } else if (incomePeriod === "weekly") {
                const end = addDays(new Date(), -(i * 7));
                const start = addDays(end, -6);
                const wBills = bills.filter(b => {
                    const bd = toInput(b.billingDate);
                    return bd >= toInput(start) && bd <= toInput(end);
                });
                result.push({
                    label: `W${days - i}`,
                    bars: [
                        { value: wBills.reduce((s, b) => s + b.amountPaid, 0), color: "#22c55e" },
                        { value: wBills.reduce((s, b) => s + b.dueAmount, 0), color: "#ef4444" },
                    ],
                });
            } else {
                const dt = new Date();
                dt.setMonth(dt.getMonth() - i);
                const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
                const mBills = bills.filter(b => toInput(b.billingDate).startsWith(mKey));
                result.push({
                    label: dt.toLocaleDateString("en-IN", { month: "short" }),
                    bars: [
                        { value: mBills.reduce((s, b) => s + b.amountPaid, 0), color: "#22c55e" },
                        { value: mBills.reduce((s, b) => s + b.dueAmount, 0), color: "#ef4444" },
                    ],
                });
            }
        }
        return result;
    }, [bills, incomePeriod]);

    // ── Patient chart — new vs returning ──────────────────────────
    const patientGroups = useMemo(() => {
        // "new" = first bill ever; "old" = has prior bills
        const patientFirstBill = {};
        const sorted = [...bills].sort((a, b) => new Date(a.billingDate) - new Date(b.billingDate));
        for (const b of sorted) {
            if (!patientFirstBill[b.patientId]) patientFirstBill[b.patientId] = toInput(b.billingDate);
        }

        const days = patientPeriod === "daily" ? 7 : patientPeriod === "weekly" ? 4 : 6;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            let label = "", dayBills = [];
            if (patientPeriod === "daily") {
                const dt = addDays(new Date(), -i);
                const key = toInput(dt);
                label = dayName(dt);
                dayBills = bills.filter(b => toInput(b.billingDate) === key);
            } else if (patientPeriod === "weekly") {
                const end = addDays(new Date(), -(i * 7));
                const start = addDays(end, -6);
                label = `W${days - i}`;
                dayBills = bills.filter(b => { const bd = toInput(b.billingDate); return bd >= toInput(start) && bd <= toInput(end); });
            } else {
                const dt = new Date(); dt.setMonth(dt.getMonth() - i);
                const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
                label = dt.toLocaleDateString("en-IN", { month: "short" });
                dayBills = bills.filter(b => toInput(b.billingDate).startsWith(mKey));
            }

            const uniquePatients = [...new Set(dayBills.map(b => b.patientId))];
            const newPats = uniquePatients.filter(pid => {
                const firstDate = patientFirstBill[pid];
                return dayBills.some(b => b.patientId === pid && toInput(b.billingDate) === firstDate);
            });
            result.push({
                label,
                bars: [
                    { value: uniquePatients.length - newPats.length, color: "#94a3b8" },
                    { value: newPats.length, color: "#06b6d4" },
                ],
            });
        }
        return result;
    }, [bills, patientPeriod]);

    const quickRange = (days) => {
        setFromDate(toInput(addDays(new Date(), -(days - 1))));
        setToDate(toInput(new Date()));
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, color: t.muted }}>
            <RiLoader4Line size={24} style={{ animation: "spin .7s linear infinite" }} /> Loading analysis…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error) return (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
            <RiAlertLine size={32} style={{ marginBottom: 8 }} /><p>{error}</p>
            <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
        </div>
    );

    return (
        <div style={{ color: t.text }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Analysis Dashboard</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Financial and operational overview of your lab.</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Quick range */}
                    <div style={{ display: "flex", gap: 4 }}>
                        {[
                            { l: "Today", fn: () => { setFromDate(todayStr); setToDate(todayStr); } },
                            { l: "7d", fn: () => quickRange(7) },
                            { l: "30d", fn: () => quickRange(30) },
                            { l: "90d", fn: () => quickRange(90) },
                        ].map(b => (
                            <button key={b.l} onClick={b.fn} style={{ padding: "6px 11px", borderRadius: 8, border: `1px solid ${t.border}`, background: "none", color: t.navText, fontSize: "0.76rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{b.l}</button>
                        ))}
                    </div>
                    {/* Date range */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", color: t.text, fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                        <span style={{ color: t.faint }}>→</span>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", color: t.text, fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif", outline: "none", colorScheme: isDark ? "dark" : "light" }} />
                    </div>
                    <button onClick={load} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                        <RiRefreshLine size={14} />
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", animation: "fadeUp .4s ease" }}>
                <StatCard t={t} isDark={isDark} label="Registrations" value={stats.registrations}
                    sub1="Referral" sub1Val={stats.refReg} sub2="Self" sub2Val={stats.selfReg}
                    Icon={RiUserLine} color={t.accent} />
                <StatCard t={t} isDark={isDark} label="Tests" value={stats.tests}
                    sub1="Referral" sub1Val={stats.refTests} sub2="Self" sub2Val={stats.selfTests}
                    Icon={RiTestTubeLine} color="#8b5cf6" />
                <StatCard t={t} isDark={isDark} label="Billing Amount" value={stats.billing} prefix="₹"
                    sub1="Referral" sub1Val={stats.refBilling} sub2="Self" sub2Val={stats.selfBilling}
                    Icon={RiFileList3Line} color="#f59e0b" />
                <StatCard t={t} isDark={isDark} label="Paid Amount" value={stats.paid} prefix="₹"
                    sub1="Referral" sub1Val={stats.refPaid} sub2="Self" sub2Val={stats.selfPaid}
                    Icon={RiCheckboxCircleLine} color="#22c55e" />
                <StatCard t={t} isDark={isDark} label="Due Amount" value={stats.due} prefix="₹"
                    sub1="Referral" sub1Val={stats.refDue} sub2="Self" sub2Val={stats.selfDue}
                    Icon={RiTimeLine} color={stats.due > 0 ? "#ef4444" : "#22c55e"} />
            </div>

            {/* ── Referral breakdown ── */}
            <Section t={t} title="Referral Analysis"
                right={
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="Search referral name…"
                            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 12px", color: t.text, fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: 180 }} />
                    </div>
                }
            >
                <div style={{ display: "flex", padding: "16px 20px", gap: 24, alignItems: "flex-start" }}>
                    {/* Donut */}
                    <div style={{ flexShrink: 0 }}>
                        <DonutChart animate
                            size={160} stroke={28}
                            segments={referralData.map((r, i) => ({ value: r.amount, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
                            label={fmtINR(refTotal)} sublabel="Total"
                        />
                        {/* Legend */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                            {referralData.slice(0, 5).map((r, i) => (
                                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.71rem", color: t.muted }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                                    <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ flex: 1, overflow: "auto" }}>
                        {/* Header */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 1.1fr 1fr 1fr 1fr", fontSize: "0.69rem", fontWeight: 700, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", padding: "0 0 8px", borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}>
                            <span>Referral</span><span style={{ textAlign: "right" }}>Bills</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Discount</span><span style={{ textAlign: "right" }}>Paid</span><span style={{ textAlign: "right" }}>Due</span>
                        </div>
                        {filteredReferrals.map((r, i) => (
                            <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 1.1fr 1fr 1fr 1fr", padding: "9px 0", borderBottom: `1px solid ${t.border}`, fontSize: "0.82rem", alignItems: "center" }}
                                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                                    <span style={{ fontWeight: 500, color: t.text }}>{r.name}</span>
                                </div>
                                <span style={{ textAlign: "right", color: t.muted }}>{r.bills}</span>
                                <span style={{ textAlign: "right", color: t.text, fontWeight: 500 }}>₹{r.amount.toLocaleString("en-IN")}</span>
                                <span style={{ textAlign: "right", color: r.discount > 0 ? "#dc2626" : t.faint }}>₹{r.discount.toLocaleString("en-IN")}</span>
                                <span style={{ textAlign: "right", color: "#22c55e", fontWeight: 500 }}>₹{r.paid.toLocaleString("en-IN")}</span>
                                <span style={{ textAlign: "right", color: r.due > 0 ? "#ef4444" : t.faint, fontWeight: r.due > 0 ? 600 : 400 }}>₹{r.due.toLocaleString("en-IN")}</span>
                            </div>
                        ))}
                        {/* Total row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 1.1fr 1fr 1fr 1fr", padding: "9px 0", fontSize: "0.84rem", fontWeight: 700, color: t.heading }}>
                            <span>Total</span>
                            <span style={{ textAlign: "right" }}>{filteredReferrals.reduce((s, r) => s + r.bills, 0)}</span>
                            <span style={{ textAlign: "right" }}>₹{filteredReferrals.reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")}</span>
                            <span style={{ textAlign: "right" }}>₹{filteredReferrals.reduce((s, r) => s + r.discount, 0).toLocaleString("en-IN")}</span>
                            <span style={{ textAlign: "right", color: "#22c55e" }}>₹{filteredReferrals.reduce((s, r) => s + r.paid, 0).toLocaleString("en-IN")}</span>
                            <span style={{ textAlign: "right", color: "#ef4444" }}>₹{filteredReferrals.reduce((s, r) => s + r.due, 0).toLocaleString("en-IN")}</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Income + Patient charts side by side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Income chart */}
                <Section t={t} title="Income" right={<PeriodSel value={incomePeriod} onChange={setIncomePeriod} t={t} />}>
                    <div style={{ padding: "10px 16px 16px" }}>
                        <BarChart groups={incomeGroups} isDark={isDark} t={t} height={200} />
                        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                            {[{ color: "#22c55e", label: "Paid" }, { color: "#ef4444", label: "Due" }].map(l => (
                                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.73rem", color: t.muted }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                                    {l.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Patient chart */}
                <Section t={t} title="Patient" right={<PeriodSel value={patientPeriod} onChange={setPatientPeriod} t={t} />}>
                    <div style={{ padding: "10px 16px 16px" }}>
                        <BarChart groups={patientGroups} isDark={isDark} t={t} height={200} />
                        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                            {[{ color: "#94a3b8", label: "Old" }, { color: "#06b6d4", label: "New" }].map(l => (
                                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.73rem", color: t.muted }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                                    {l.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>
            </div>

            {/* ── Top 10 Tests ── */}
            <Section t={t} title="Top 10 Tests (by frequency)"
                right={<span style={{ fontSize: "0.78rem", color: t.muted }}>{fromDate} → {toDate}</span>}
            >
                <div style={{ display: "flex", padding: "16px 20px", gap: 28, alignItems: "flex-start" }}>
                    {/* Donut */}
                    <div style={{ flexShrink: 0 }}>
                        <DonutChart animate
                            size={160} stroke={28}
                            segments={topTests.map((t2, i) => ({ value: t2.amount, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
                            label={`₹${(topTests.reduce((s, t2) => s + t2.amount, 0) / 1000).toFixed(0)}k`}
                            sublabel="Total"
                        />
                    </div>

                    {/* Table — two columns like Flabs */}
                    <div style={{ flex: 1, overflow: "auto" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                            {[topTests.slice(0, 5), topTests.slice(5, 10)].map((chunk, ci) => (
                                <div key={ci}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.7fr 0.9fr", fontSize: "0.68rem", fontWeight: 700, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", padding: "0 0 7px", borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}>
                                        <span>Tests Name</span><span style={{ textAlign: "right" }}>Freq.</span><span style={{ textAlign: "right" }}>Amount</span>
                                    </div>
                                    {chunk.map((test, j) => {
                                        const idx = ci * 5 + j;
                                        return (
                                            <div key={test.name} style={{ display: "grid", gridTemplateColumns: "1.8fr 0.7fr 0.9fr", padding: "7px 0", borderBottom: `1px solid ${t.border}`, fontSize: "0.81rem", alignItems: "center" }}
                                                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: DONUT_COLORS[idx % DONUT_COLORS.length], flexShrink: 0 }} />
                                                    <span style={{
                                                        color: idx < 3 ? t.accent : t.text, fontWeight: idx < 3 ? 600 : 400,
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140,
                                                    }}>
                                                        {test.name}
                                                    </span>
                                                </div>
                                                <span style={{ textAlign: "right", fontWeight: 500, color: t.text }}>{test.count}</span>
                                                <span style={{ textAlign: "right", color: t.muted }}>₹{test.amount.toLocaleString("en-IN")}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

        </div>
    );
}