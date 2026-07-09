import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiMicroscopeLine,
  RiDashboardLine,
  RiUserLine,
  RiFileList3Line,
  RiBillLine,
  RiSettings4Line,
  RiUserSettingsLine,
  RiLogoutBoxLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiNotification3Line,
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFlaskLine,
  RiTimeLine,
  RiSunLine,
  RiMoonLine,
} from "react-icons/ri";
import { T } from "../../utils/theme"; // ← same shared theme file VendorDashboard uses
import AdminProfile from "./admin/AdminProfile";
import AdminVendors from "./admin/AdminVendors";

// ── Nav config ─────────────────────────────────────────────
// `tab` matches the :tab URL param. Dashboard has tab="" (default route).
const NAV = [
  { tab: "", label: "Dashboard", icon: RiDashboardLine },
  { tab: "vendors", label: "Vendors", icon: RiUserLine },
  { tab: "reports", label: "Reports", icon: RiFileList3Line },
  { tab: "billing", label: "Billing", icon: RiBillLine },
  { tab: "settings", label: "Settings", icon: RiSettings4Line },
  { tab: "profile", label: "My Profile", icon: RiUserSettingsLine },
];

// ── Dummy data for the overview tab — swap for real API data as you build each section ──
const STATS = [
  { label: "Total Vendors", value: "48", delta: "+4", up: true, Icon: RiUserLine },
  { label: "Reports Today", value: "312", delta: "+18", up: true, Icon: RiFileList3Line },
  { label: "Pending Approvals", value: "7", delta: "-2", up: false, Icon: RiTimeLine },
  { label: "Revenue (₹)", value: "1.2L", delta: "+9%", up: true, Icon: RiBillLine },
];

const RECENT_VENDORS = [
  { name: "Apex Diagnostics", email: "apex@lab.in", status: "approved", date: "10 May" },
  { name: "MediScan Labs", email: "mediscan@lab.in", status: "pending", date: "09 May" },
  { name: "HealthFirst Centre", email: "hfc@lab.in", status: "approved", date: "08 May" },
  { name: "BioTrack Pathology", email: "bio@lab.in", status: "rejected", date: "07 May" },
  { name: "CityLab Network", email: "city@lab.in", status: "pending", date: "06 May" },
];

const STATUS = {
  approved: { pill: "bg-emerald-500/10 text-emerald-600", label: "Approved" },
  pending: { pill: "bg-amber-500/10 text-amber-600", label: "Pending" },
  rejected: { pill: "bg-red-500/10 text-red-600", label: "Rejected" },
};

// ── Shared sub-components (same pattern as VendorDashboard) ──
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

const PlaceholderPage = ({ label, t }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", gap: 14, color: t.muted }}>
    <RiFlaskLine size={48} style={{ opacity: 0.35 }} />
    <p className="playfair" style={{ fontSize: "1.05rem", fontWeight: 700, opacity: 0.5 }}>{label} — coming soon</p>
  </div>
);

// ══════════════════════════════════════════════════════════
export default function AdminDashboard() {
  // Kept as a cheap first paint before AdminProfile's real fetch resolves —
  // AdminProfile overwrites these localStorage keys once the API responds.
  const name = localStorage.getItem("name") || "Admin";
  const businessName = localStorage.getItem("businessName") || "LabRepo";
  const logoUrl = localStorage.getItem("logoUrl") || "";
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const navigate = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || "";

  const t = isDark ? T.dark : T.light;
  const activeLabel = NAV.find(n => n.tab === activeTab)?.label || "Dashboard";

  const goTo = (tabKey) => {
    if (tabKey === "") navigate("/dashboard/admin");
    else navigate(`/dashboard/admin/${tabKey}`);
  };

  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  return (
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

        {/* Admin chip */}
        {!collapsed && (
          <div style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "9px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: "linear-gradient(135deg,#38bdf8,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.7rem", color: t.muted, lineHeight: 1 }}>Admin</div>
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

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setCollapsed(c => !c)} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, color: t.accent, borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {collapsed ? <RiMenuUnfoldLine size={15} /> : <RiMenuFoldLine size={15} />}
            </button>
            <h1 className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading, transition: "opacity .2s" }}>
              {activeLabel}
            </h1>
          </div>

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
            <div
              onClick={() => goTo("profile")}
              style={{ display: "flex", alignItems: "center", gap: 9, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "5px 11px 5px 5px", cursor: "pointer" }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${t.border}` }}
                  onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                />
              ) : null}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg,#38bdf8,#06b6d4)",
                display: logoUrl ? "none" : "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", fontWeight: 700, color: "#fff",
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: "0.81rem", fontWeight: 600, color: t.heading, lineHeight: 1.2 }}>{name}</div>
                <div style={{ fontSize: "0.67rem", color: t.accent }}>Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* ══════ CONTENT AREA — only this part changes ══════ */}
        <main style={{ padding: "26px 28px", flex: 1 }}>

          {/* ── DASHBOARD OVERVIEW (dummy data — wire up real stats when ready) ── */}
          {activeTab === "" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 className="playfair" style={{ fontSize: "1.65rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>
                  Good morning, {name.split(" ")[0]} 👋
                </h2>
                <p style={{ fontSize: "0.84rem", color: t.muted }}>Here's what's happening across LabRepo today.</p>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                {STATS.map(({ label, value, delta, up, Icon }) => (
                  <div key={label} className="stat-card" style={{ flex: 1, minWidth: 175, borderRadius: 16, padding: 22, background: t.card, border: `1px solid ${t.border}`, boxShadow: isDark ? "none" : "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}>
                        <Icon size={19} />
                      </div>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: up ? "#16a34a" : "#dc2626", background: up ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "3px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 3 }}>
                        {up ? <RiArrowUpLine size={10} /> : <RiArrowDownLine size={10} />}
                        {delta}
                      </span>
                    </div>
                    <div className="playfair" style={{ fontSize: "1.75rem", fontWeight: 800, color: t.heading, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: "0.76rem", color: t.muted, marginTop: 6 }}>{label}</div>
                  </div>
                ))}
              </div>

              <Card t={t}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="playfair" style={{ fontSize: "0.98rem", fontWeight: 700, color: t.heading }}>Recent Vendor Registrations</span>
                  <button onClick={() => goTo("vendors")} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 8, color: t.accent, fontSize: "0.73rem", fontWeight: 600, padding: "4px 11px", cursor: "pointer" }}>
                    View All →
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 0.8fr", padding: "10px 20px", borderBottom: `1px solid ${t.border}`, background: t.accentBg, fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  <span>Vendor</span><span>Email</span><span>Status</span><span>Date</span>
                </div>

                {RECENT_VENDORS.map((v, i) => {
                  const s = STATUS[v.status];
                  return (
                    <div key={v.email} className="t-row" style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 0.8fr", padding: "12px 20px", borderBottom: i < RECENT_VENDORS.length - 1 ? `1px solid ${t.border}` : "none", fontSize: "0.84rem" }}
                      onMouseEnter={e => e.currentTarget.style.background = t.accentBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontWeight: 500, color: t.text }}>{v.name}</span>
                      <span style={{ color: t.muted }}>{v.email}</span>
                      <span><span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.pill}`}>{s.label}</span></span>
                      <span style={{ color: t.faint, fontSize: "0.78rem" }}>{v.date}</span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {/* ── VENDORS / REPORTS / BILLING / SETTINGS — build one by one ── */}
          {/* {activeTab === "vendors" && <PlaceholderPage label="Vendors" t={t} />} */}
          {activeTab === "vendors" && <AdminVendors t={t} />}
          {activeTab === "reports" && <PlaceholderPage label="Reports" t={t} />}
          {activeTab === "billing" && <PlaceholderPage label="Billing" t={t} />}
          {activeTab === "settings" && <PlaceholderPage label="Settings" t={t} />}

          {/* ── PROFILE — properly fetched, not just localStorage ── */}
          {activeTab === "profile" && <AdminProfile t={t} />}

        </main>
      </div>
    </div>
  );
}