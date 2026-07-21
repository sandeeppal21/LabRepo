import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
    RiCheckboxCircleLine, RiTimeLine, RiLoader4Line,
    RiAlertLine, RiFlaskLine, RiFileTextLine,
    RiQrCodeLine, RiPhoneLine, RiMailLine, RiPrinterLine
} from "react-icons/ri";
import api from "../../../services/api";
import ReportPrint from "../vendor/ReportPrint";

// ── Status config ──────────────────────────────────────────────────
const STATUS = {
    not_found: {
        icon: RiAlertLine,
        color: "#ef4444",
        bg: "rgba(239,68,68,0.08)",
        border: "rgba(239,68,68,0.2)",
        label: "Report Not Found",
        msg: "No report found for this bill. Please contact the lab.",
    },
    pending: {
        icon: RiTimeLine,
        color: "#d97706",
        bg: "rgba(251,191,36,0.08)",
        border: "rgba(251,191,36,0.25)",
        label: "Report Pending",
        msg: "Your report is being processed. Please check back later.",
    },
    partial: {
        icon: RiTimeLine,
        color: "#f97316",
        bg: "rgba(249,115,22,0.08)",
        border: "rgba(249,115,22,0.25)",
        label: "Report In Progress",
        msg: "Your report is partially entered. Results will be available soon.",
    },
    completed: {
        icon: RiTimeLine,
        color: "#2563eb",
        bg: "rgba(59,130,246,0.08)",
        border: "rgba(59,130,246,0.25)",
        label: "Report Ready",
        msg: "Your report is complete and awaiting doctor verification.",
    },
    verified: {
        icon: RiCheckboxCircleLine,
        color: "#16a34a",
        bg: "rgba(34,197,94,0.08)",
        border: "rgba(34,197,94,0.25)",
        label: "Report Verified ✓",
        msg: "Your report has been verified by the doctor and is ready.",
    },
};

export default function PublicReport() {
    const { billId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [printing, setPrinting] = useState(false);
    const [printError, setPrintError] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [fullReport, setFullReport] = useState(null);

    useEffect(() => {
        (async () => {
            try {

                const res = await api.get(`/public/report/${billId}`);
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load report.");
            } finally {
                setLoading(false);
            }
        })();
    }, [billId]);

    const passCode = billId?.slice(-8).toUpperCase() || "";


    const handlePrintReport = async () => {
        try {
            setPrinting(true);
            setPrintError("");
            const res = await api.get(`/public/report/${billId}/full`);
            setFullReport(res.data);
            setShowReport(true);
        } catch (err) {
            setPrintError(
                err.response?.data?.message || "Failed to load report."
            );
        } finally {
            setPrinting(false);
        }
    };

    if (loading) return (
        <div style={styles.page}>
            <div style={styles.card}>
                <RiLoader4Line size={32} style={{ color: "#38bdf8", animation: "spin .7s linear infinite", marginBottom: 16 }} />
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading report status…</p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error) return (
        <div style={styles.page}>
            <div style={styles.card}>
                <RiAlertLine size={40} style={{ color: "#ef4444", marginBottom: 12 }} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                    Unable to Load Report
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.84rem", textAlign: "center" }}>{error}</p>
            </div>
        </div>
    );

    const { bill, report, vendor } = data || {};
    const patient = bill?.patient || {};
    const status = report?.status || "not_found";
    const statusCfg = STATUS[status] || STATUS.not_found;
    const StatusIcon = statusCfg.icon;
    const patName = `${patient.designation || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    return (
        <div style={styles.page}>
            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }
      `}</style>

            <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp .4s ease" }}>

                {/* ── Lab Header ── */}
                <div style={{ background: "#fff", borderRadius: "18px 18px 0 0", padding: "24px 28px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
                    {vendor?.logoUrl ? (
                        <img src={vendor.logoUrl} alt="Lab" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "contain", border: "1px solid #e2e8f0", padding: 3, background: "#f8fafc" }} />
                    ) : (
                        <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg,#38bdf8,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <RiFlaskLine size={24} color="#fff" />
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.3px" }}>
                            {vendor?.businessName || vendor?.name || "Lab"}
                        </div>
                        {(vendor?.address || vendor?.city) && (
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
                                {vendor.address}{vendor.city ? `, ${vendor.city}` : ""}
                            </div>
                        )}
                        {vendor?.phone && (
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                                <RiPhoneLine size={10} /> {vendor.phone}
                            </div>
                        )}
                    </div>
                </div>

                {showReport && fullReport && (
                    <ReportPrint
                        report={fullReport.report}
                        bill={fullReport.bill}
                        patient={fullReport.patient}
                        vendor={fullReport.vendor}
                        t={{ heading: "#0f172a", muted: "#64748b", faint: "#94a3b8", text: "#1e293b", card: "#fff", border: "#e2e8f0", accent: "#2563eb", accentBg: "rgba(59,130,246,0.08)", accentRing: "rgba(59,130,246,0.2)", inputBg: "#f8fafc", rowHover: "#f1f5f9", header: "rgba(255,255,255,0.9)" }}
                        isDark={false}
                        onClose={() => setShowReport(false)}
                    />
                )}

                {/* ── Status banner ── */}
                <div style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, borderTop: "none", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <StatusIcon size={36} style={{ color: statusCfg.color, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: statusCfg.color }}>{statusCfg.label}</div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 3 }}>{statusCfg.msg}</div>
                        </div>
                    </div>

                    {/*  Print button — only shows when verified */}
                    {status === "verified" && (
                        <div style={{ flexShrink: 0 }}>
                            <button
                                onClick={handlePrintReport}
                                disabled={printing}
                                style={{
                                    display: "flex", alignItems: "center", gap: 7,
                                    padding: "10px 18px", borderRadius: 10,
                                    border: "none",
                                    background: printing ? "#94a3b8" : "#16a34a",
                                    color: "#fff",
                                    fontSize: "0.84rem", fontWeight: 700,
                                    cursor: printing ? "not-allowed" : "pointer",
                                    fontFamily: "'DM Sans',sans-serif",
                                    boxShadow: "0 4px 14px rgba(34,197,94,0.35)",
                                    transition: "all .2s",
                                }}
                            >
                                {printing
                                    ? <><RiLoader4Line size={15} style={{ animation: "spin .7s linear infinite" }} /> Loading…</>
                                    : <><RiPrinterLine size={15} /> Print Report</>
                                }
                            </button>
                            {printError && (
                                <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 6, textAlign: "right" }}>
                                    {printError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Patient & Bill info ── */}
                <div style={{ background: "#fff", padding: "18px 28px", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Patient Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 0" }}>
                        {[
                            { label: "Name", value: patName || "—" },
                            { label: "Patient ID", value: patient.patientId || bill?.patientId || "—" },
                            { label: "Age / Sex", value: patient.age ? `${patient.age} yr / ${patient.gender?.charAt(0).toUpperCase() || ""}` : "—" },
                            { label: "Mobile", value: patient.phone || "—" },
                        ].map(r => (
                            <div key={r.label}>
                                <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{r.label}</div>
                                <div style={{ fontSize: "0.84rem", fontWeight: 500, color: "#0f172a", marginTop: 1 }}>{r.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Tests ordered ── */}
                {bill?.items?.length > 0 && (
                    <div style={{ background: "#f8fafc", padding: "16px 28px", borderTop: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Tests Ordered</div>
                        {bill.items.map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < bill.items.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", flexShrink: 0 }} />
                                    <span style={{ fontSize: "0.84rem", color: "#0f172a", fontWeight: 500 }}>{item.testName}</span>
                                </div>
                                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{item.testCode}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Net ID / Pass ── */}
                <div style={{ background: "#fff", padding: "14px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Net ID / Pass</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginTop: 2, letterSpacing: "1px" }}>
                            {patient.patientId || bill?.patientId} / {passCode}
                        </div>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "right" }}>
                        <div>Bill No.</div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{bill?.billNumber}</div>
                    </div>
                </div>

                {/* ── Progress steps ── */}
                <div style={{ background: "#f8fafc", padding: "16px 28px", borderTop: "1px solid #e2e8f0", borderRadius: "0 0 18px 18px" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 12 }}>Report Progress</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        {[
                            { key: "pending", label: "Processing" },
                            { key: "completed", label: "Ready" },
                            { key: "verified", label: "Verified" },
                        ].map((step, i) => {
                            const ORDER = { pending: 0, partial: 1, completed: 2, verified: 3 };
                            const curOrder = ORDER[status] ?? -1;
                            const stepOrder = ORDER[step.key] ?? 0;
                            const done = curOrder >= stepOrder;
                            const active = status === step.key || (step.key === "pending" && (status === "pending" || status === "partial"));
                            return (
                                <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: "50%",
                                            background: done ? "#16a34a" : "#e2e8f0",
                                            border: `2px solid ${done ? "#16a34a" : active ? "#38bdf8" : "#e2e8f0"}`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            transition: "all .3s",
                                        }}>
                                            {done
                                                ? <RiCheckboxCircleLine size={14} color="#fff" />
                                                : <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#38bdf8" : "#cbd5e1" }} />
                                            }
                                        </div>
                                        <div style={{ fontSize: "0.66rem", color: done ? "#16a34a" : "#94a3b8", marginTop: 5, fontWeight: done ? 600 : 400 }}>
                                            {step.label}
                                        </div>
                                    </div>
                                    {i < 2 && (
                                        <div style={{ height: 2, flex: 1, background: done && curOrder > stepOrder ? "#16a34a" : "#e2e8f0", marginTop: -14, transition: "background .3s" }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Powered by */}
            <div style={{ marginTop: 20, fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>
                Powered by <strong style={{ color: "#38bdf8" }}>LabRepo</strong>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 20,
    },
    card: {
        background: "#fff", borderRadius: 18, padding: "40px 32px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column", alignItems: "center",
    },
};