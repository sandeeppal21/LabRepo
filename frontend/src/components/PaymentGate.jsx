import { useEffect, useState, useCallback } from "react";
import { RiShieldCheckLine, RiLockLine, RiLoader4Line, RiCheckboxCircleFill } from "react-icons/ri";
import { FiAlertCircle } from "react-icons/fi";
import { getSubscriptionStatus, bypassPayment } from "../services/paymentService";

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaymentGate({ children }) {
    const [checking, setChecking] = useState(true);
    const [sub, setSub] = useState(null);
    const [bypassing, setBypassing] = useState(false);
    const [error, setError] = useState("");
    const [justUnlocked, setJustUnlocked] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await getSubscriptionStatus();
            setSub(res.data.subscription);
        } catch {
            setError("Could not verify your subscription. Please refresh.");
            setSub({ status: "inactive" });
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleBypass = async () => {
        setBypassing(true);
        setError("");
        try {
            const res = await bypassPayment();
            setSub(res.data.subscription);
            setJustUnlocked(true);
            setTimeout(() => setJustUnlocked(false), 2600);
        } catch (err) {
            setError(err.response?.data?.message || "Bypass failed. Please try again.");
        } finally {
            setBypassing(false);
        }
    };

    const isBlocked = !checking && sub && sub.status !== "active";

    return (
        <>
            {children}

            {checking && (
                <div style={overlayStyle}>
                    <RiLoader4Line size={26} color="#38bdf8" style={{ animation: "pg-spin 0.9s linear infinite" }} />
                </div>
            )}

            {isBlocked && (
                <div style={overlayStyle}>
                    <style>{`
            @keyframes pg-spin { to { transform: rotate(360deg); } }
            @keyframes pg-pop { 0% { transform: scale(.9); opacity:0 } 100% { transform: scale(1); opacity:1 } }
          `}</style>

                    <div style={{
                        width: "100%", maxWidth: 440, borderRadius: 18,
                        border: "1px solid rgba(56,189,248,0.18)",
                        background: "rgba(7,20,40,0.92)",
                        boxShadow: "0 0 60px rgba(56,189,248,0.12)",
                        padding: "34px 30px",
                        animation: "pg-pop .25s ease",
                        fontFamily: "'DM Sans', sans-serif",
                    }}>

                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                background: "linear-gradient(135deg,#38bdf8,#06b6d4)",
                                boxShadow: "0 0 16px rgba(56,189,248,.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <RiLockLine color="#fff" size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif" }}>
                                    {sub?.status === "expired" ? "Your access has expired" : "Activate access to continue"}
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "rgba(125,211,252,0.6)", marginTop: 2 }}>
                                    Payment required to unlock the dashboard
                                </div>
                            </div>
                        </div>

                        {sub?.status === "expired" && (
                            <div style={{ fontSize: "0.8rem", color: "rgba(226,232,240,0.6)", marginBottom: 14 }}>
                                Your previous plan expired on <strong style={{ color: "#7dd3fc" }}>{formatDate(sub.expiresAt)}</strong>.
                            </div>
                        )}

                        <div style={{
                            border: "1px solid rgba(56,189,248,0.18)", borderRadius: 12,
                            padding: "16px 18px", marginBottom: 18, background: "rgba(56,189,248,0.04)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>3-Month Access Plan</span>
                                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>₹0.00</span>
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "rgba(148,163,184,0.75)", marginTop: 4 }}>
                                Dev mode — real payment gateway not yet wired up. Bypass grants full dashboard access for 3 months.
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                display: "flex", gap: 8, alignItems: "flex-start",
                                background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)",
                                borderRadius: 10, padding: "10px 12px", marginBottom: 14,
                                fontSize: "0.78rem", color: "#f87171",
                            }}>
                                <FiAlertCircle style={{ flexShrink: 0, marginTop: 1 }} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleBypass}
                            disabled={bypassing}
                            style={{
                                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                                background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff",
                                fontWeight: 700, fontSize: "0.92rem", fontFamily: "'Syne',sans-serif",
                                cursor: bypassing ? "not-allowed" : "pointer", opacity: bypassing ? 0.7 : 1,
                                boxShadow: "0 0 22px rgba(56,189,248,.3)",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            }}
                        >
                            {bypassing
                                ? <><RiLoader4Line style={{ animation: "pg-spin .7s linear infinite" }} /> Processing payment…</>
                                : <><RiShieldCheckLine size={16} /> Bypass Payment (Dev)</>
                            }
                        </button>

                        <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.5)", marginTop: 12, textAlign: "center" }}>
                            A dummy transaction ID will be generated and stored on your account.
                        </div>
                    </div>
                </div>
            )}

            {justUnlocked && sub?.status === "active" && (
                <div style={{
                    position: "fixed", top: 20, right: 20, zIndex: 300,
                    background: "rgba(7,20,40,0.95)", border: "1px solid rgba(34,197,94,0.35)",
                    borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,.35)", animation: "pg-pop .2s ease",
                }}>
                    <RiCheckboxCircleFill color="#22c55e" size={18} />
                    <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>Payment successful</div>
                        <div style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.8)" }}>
                            Txn: {sub.transactionId} · Valid till {formatDate(sub.expiresAt)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(2,6,16,0.72)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
};