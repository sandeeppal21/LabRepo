import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    RiMicroscopeLine,
    RiDashboardLine,
    RiFileList3Line,
    RiUploadCloud2Line,
    RiBillLine,
    RiUserSettingsLine,
    RiCustomerService2Line,
    RiLogoutBoxLine,
    RiMenuFoldLine,
    RiMenuUnfoldLine,
    RiNotification3Line,
    RiSearchLine,
    RiSunLine,
    RiMoonLine,
    RiArrowUpLine,
    RiArrowDownLine,
    RiTimeLine,
    RiCheckboxCircleLine,
    RiTestTubeLine,
    RiAddLine,
    RiEyeLine,
    RiDownloadLine,
    RiPhoneLine,
    RiMailLine,
    RiBuilding2Line,
    RiUserAddLine,
    RiStethoscopeLine,
} from "react-icons/ri";
import { T } from "../../utils/theme";
import VendorProfile from "./vendor/VendorProfile";
import VendorTest from "./vendor/VendorTest";
import BillRegistration from "./vendor/BillRegistration";
import VendorBilling from "./vendor/VendorBilling";
import ReportEntry from "./vendor/ReportEntry";
import VendorReferrals from "./vendor/VendorReferrals";
import BillReceipt from "./vendor/BillReceipt";
import VendorAnalysis from "./vendor/VendorAnalysis";
import PaymentGate from "../../components/PaymentGate";

const NAV = [
    { tab: "", label: "Analysis", icon: RiDashboardLine },
    { tab: "billregistration", label: "Bill/Registration", icon: RiUserAddLine },
    { tab: "vendorbilling", label: "Billing", icon: RiBillLine },
    { tab: "reportEntry", label: "Report Entry", icon: RiFileList3Line },
    { tab: "catalogue", label: "Test Catalogue", icon: RiTestTubeLine },
    { tab: "doctorreferral", label: "Doctor", icon: RiStethoscopeLine },
    { tab: "profile", label: "My Profile", icon: RiUserSettingsLine },
    { tab: "support", label: "Support", icon: RiCustomerService2Line },
];


const BILL_STATUS = {
    paid: { pill: "bg-emerald-500/10 text-emerald-600", label: "Paid" },
    overdue: { pill: "bg-red-500/10 text-red-600", label: "Overdue" },
};

// ── Shared sub-components ──────────────────────────────────
const SectionHeading = ({ title, sub, t }) => (
    <div style={{ marginBottom: 24 }}>
        <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>{title}</h2>
        {sub && <p style={{ fontSize: "0.84rem", color: t.muted }}>{sub}</p>}
    </div>
);

const Card = ({ children, t, style = {} }) => (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", ...style }}>
        {children}
    </div>
);

const Btn = ({ children, onClick, t, variant = "primary", style = {} }) => (
    <button onClick={onClick} style={{ background: variant === "primary" ? t.accent : t.accentBg, border: `1px solid ${variant === "primary" ? t.accent : t.accentRing}`, color: variant === "primary" ? "#fff" : t.accent, borderRadius: 9, fontSize: "0.78rem", fontWeight: 600, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity .18s", ...style }}
        onMouseEnter={e => e.currentTarget.style.opacity = ".82"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
);

// ══════════════════════════════════════════════════════════
export default function VendorDashboard() {
    const name = localStorage.getItem("name") || "Vendor";
    const businessName = localStorage.getItem("businessName") || "My Lab";
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    const [collapsed, setCollapsed] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [printBill, setPrintBill] = useState(null);


    const navigate = useNavigate();
    const { tab } = useParams();
    const activeTab = tab || "";

    const t = isDark ? T.dark : T.light;
    const activeLabel = NAV.find(n => n.tab === activeTab)?.label || "Overview";

    //  ADD THIS — vendorInfo was never defined before
    const vendorInfo = {
        vendorId: localStorage.getItem("userId") || "",
        vendorCode: localStorage.getItem("vendorId") || "",
        name: localStorage.getItem("name") || "",
        businessName: localStorage.getItem("businessName") || "",
        address: localStorage.getItem("address") || "",
        city: localStorage.getItem("city") || "",
        state: localStorage.getItem("state") || "",
        phone: localStorage.getItem("phone") || "",
        email: localStorage.getItem("email") || "",
        logoUrl: localStorage.getItem("logoUrl") || "",
    };

    // Navigate to tab — changes URL, only content re-renders
    const goTo = (tabKey) => {
        if (tabKey === "") navigate("/dashboard/vendor");
        else navigate(`/dashboard/vendor/${tabKey}`);
    };

    const logout = () => { localStorage.clear(); window.location.href = "/login"; };

    return (
        <PaymentGate>
            <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans',sans-serif", transition: "background .3s,color .3s" }}>

                <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .playfair { font-family:'Playfair Display',serif; }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(56,189,248,.18); border-radius:4px; }
        .nav-btn { display:flex; align-items:center; gap:11px; padding:10px 13px; border-radius:10px; font-size:.87rem; font-weight:500; border:none; background:none; width:100%; text-align:left; cursor:pointer; white-space:nowrap; overflow:hidden; transition:background .18s,color .18s; }
        .stat-card { transition:transform .2s; }
        .stat-card:hover { transform:translateY(-3px); }
        .t-row { transition:background .12s; }
      `}</style>

                {/* Grid overlay */}
                <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px)`, backgroundSize: "48px 48px" }} />

                {/* ══════ SIDEBAR — never remounts ══════ */}
                <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: collapsed ? 68 : 224, background: t.sidebar, borderRight: `1px solid ${t.border}`, boxShadow: isDark ? "none" : "2px 0 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", padding: "18px 10px", transition: "width .25s ease,background .3s", zIndex: 100, overflow: "hidden" }}>

                    {/* Brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 4 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#38bdf8,#06b6d4)", boxShadow: "0 0 14px rgba(56,189,248,.38)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <RiMicroscopeLine color="#fff" size={18} />
                        </div>
                        {!collapsed && <span className="playfair" style={{ fontSize: "1.18rem", fontWeight: 700, color: t.heading, whiteSpace: "nowrap" }}>Lab<span style={{ color: t.accent }}>Repo</span></span>}
                    </div>

                    {/* Business chip */}
                    {!collapsed && (
                        <div style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "9px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>

                            {vendorInfo.logoUrl ? (
                                <img
                                    src={vendorInfo.logoUrl}
                                    alt={businessName}
                                    style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover", flexShrink: 0, border: `1px solid ${t.border}` }}
                                    onError={e => { e.target.style.display = "none"; }}
                                />
                            ) : (
                                <RiBuilding2Line size={15} style={{ color: t.accent, flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.7rem", color: t.muted, lineHeight: 1 }}>Vendor</div>
                                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: t.heading, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {businessName}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nav items */}
                    <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                        {NAV.map(({ tab: navTab, label, icon: Icon }) => {
                            const isActive = activeTab === navTab;
                            return (
                                <button key={navTab} className="nav-btn"
                                    onClick={() => goTo(navTab)}
                                    title={collapsed ? label : ""}
                                    style={{ color: isActive ? t.accent : t.navText, background: isActive ? t.navActive : "none", fontWeight: isActive ? 600 : 500 }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = t.accentBg; e.currentTarget.style.color = t.accent; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = t.navText; } }}
                                >
                                    <Icon size={18} style={{ flexShrink: 0 }} />
                                    {!collapsed && label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <button className="nav-btn" onClick={logout} title={collapsed ? "Logout" : ""}
                        style={{ color: isDark ? "rgba(248,113,113,.75)" : "#ef4444", marginTop: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                        <RiLogoutBoxLine size={18} style={{ flexShrink: 0 }} />
                        {!collapsed && "Logout"}
                    </button>
                </aside>

                {/* ══════ MAIN AREA ══════ */}
                <div style={{ marginLeft: collapsed ? 68 : 224, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "margin-left .25s ease", position: "relative", zIndex: 1 }}>

                    {/* ── HEADER — never remounts, title updates with activeLabel ── */}
                    <header style={{ position: "sticky", top: 0, background: t.header, boxShadow: t.headShadow, backdropFilter: "blur(14px)", height: 64, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 50, transition: "background .3s" }}>

                        {/* Left: collapse toggle + page title (auto-updates) */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <button onClick={() => setCollapsed(c => !c)} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, color: t.accent, borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                {collapsed ? <RiMenuUnfoldLine size={15} /> : <RiMenuFoldLine size={15} />}
                            </button>
                            {/* ← This title updates every time the URL tab changes */}
                            <h1 className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading, transition: "opacity .2s" }}>
                                {activeLabel}
                            </h1>
                        </div>

                        {/* Right: search, bell, theme, profile chip */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "7px 11px" }}>
                                <RiSearchLine size={13} style={{ color: t.faint }} />
                                <input placeholder="Search…" style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.81rem", fontFamily: "'DM Sans',sans-serif", width: 110 }} />
                            </div>
                            <button style={{ position: "relative", background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
                                <RiNotification3Line size={16} />
                                <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: t.accent }} />
                            </button>
                            <button onClick={() => setIsDark(d => !d)} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, color: t.accent, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform .25s" }}
                                onMouseEnter={e => e.currentTarget.style.transform = "rotate(20deg) scale(1.1)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "rotate(0) scale(1)"}
                            >
                                {isDark ? <RiSunLine size={15} /> : <RiMoonLine size={15} />}
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "5px 11px 5px 5px" }}>
                                {/* Logo if available, else initials avatar */}
                                {vendorInfo.logoUrl ? (
                                    <img
                                        src={vendorInfo.logoUrl}
                                        alt={businessName}
                                        style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${t.border}` }}
                                        onError={e => {
                                            // Fallback to initials on broken image
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display = "flex";
                                        }}
                                    />
                                ) : null}

                                <div style={{
                                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                    background: "linear-gradient(135deg,#38bdf8,#06b6d4)",
                                    display: vendorInfo.logoUrl ? "none" : "flex",
                                    alignItems: "center", justifyContent: "center",
                                    fontSize: "0.7rem", fontWeight: 700, color: "#fff",
                                }}>
                                    {initials}
                                </div>
                                <div>

                                    <div style={{ fontSize: "0.67rem", color: t.muted }}>{name}</div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* ══════ CONTENT AREA — only this part changes ══════ */}
                    <main style={{ padding: "26px 28px", flex: 1 }}>



                        {activeTab === "" && <VendorAnalysis t={t} isDark={isDark} />}



                        {activeTab === "billregistration" && <BillRegistration t={t} isDark={isDark} />}




                        {activeTab === "vendorbilling" && (
                            <VendorBilling t={t} isDark={isDark} onPrintBill={setPrintBill} />
                        )}

                        {printBill && (
                            <BillReceipt
                                bill={printBill}
                                vendor={{ ...vendorInfo, ...(printBill.vendor || {}) }}
                                onClose={() => setPrintBill(null)}
                            />
                        )}

                        {activeTab === "reportEntry" && <ReportEntry t={t} isDark={isDark} />}





                        {activeTab === "catalogue" && <VendorTest t={t} currentVendorId={vendorInfo.vendorId} />}


                        {activeTab === "doctorreferral" && <VendorReferrals t={t} isDark={isDark} />}



                        {activeTab === "profile" && <VendorProfile t={t} isDark={isDark} />}

                        {/* ── SUPPORT ── */}
                        {activeTab === "support" && (
                            <>
                                <SectionHeading t={t} title="Support" sub="Need help? Reach out to the LabRepo team." />
                                <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
                                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                        {[
                                            { label: "Email Support", val: "support@labrepo.in", Icon: RiMailLine },
                                            { label: "Phone", val: "+91 11 4567 8900", Icon: RiPhoneLine },
                                        ].map(c => (
                                            <div key={c.label} style={{ flex: 1, minWidth: 220, borderRadius: 14, padding: "18px 20px", background: t.card, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent, flexShrink: 0 }}><c.Icon size={18} /></div>
                                                <div>
                                                    <div style={{ fontSize: "0.72rem", color: t.muted }}>{c.label}</div>
                                                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: t.heading, marginTop: 3 }}>{c.val}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Card t={t} style={{ padding: 26 }}>
                                        <div className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: t.heading, marginBottom: 20 }}>Send a Message</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                            {["Subject", "Message"].map(label => (
                                                <div key={label}>
                                                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
                                                    {label === "Message"
                                                        ? <textarea rows={5} placeholder="Describe your issue in detail…" style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "11px 13px", color: t.text, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical" }} />
                                                        : <input placeholder="Brief description of your issue" style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "11px 13px", color: t.text, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                                                    }
                                                </div>
                                            ))}
                                            <Btn t={t} style={{ alignSelf: "flex-start", padding: "10px 24px", fontSize: "0.88rem" }}>
                                                <RiMailLine size={14} /> Send Message
                                            </Btn>
                                        </div>
                                    </Card>
                                </div>
                            </>
                        )}

                    </main>
                </div>
            </div>
        </PaymentGate>
    );
}
