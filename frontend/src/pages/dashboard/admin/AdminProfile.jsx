import { useState, useEffect, useRef } from "react";
import {
    RiUserLine, RiBuilding2Line, RiMailLine, RiPhoneLine,
    RiMapPinLine, RiMapPin2Line, RiShieldCheckLine,
    RiLockPasswordLine, RiSaveLine, RiLoader4Line,
    RiCheckboxCircleLine, RiAlertLine, RiEyeLine, RiEyeOffLine,
    RiUploadCloud2Line, RiImageLine, RiDeleteBinLine,
    RiShieldUserLine, RiMicroscopeLine,
} from "react-icons/ri";
import { fetchProfile, saveLabDetails, updatePassword } from "../../../services/profileService";

// ── Shared input style ────────────────────────────────────
const inp = (t, err) => ({
    width: "100%",
    background: t.inputBg,
    border: `1.5px solid ${err ? "rgba(239,68,68,0.5)" : t.accentRing}`,
    borderRadius: 10,
    padding: "10px 13px",
    color: t.text,
    fontSize: "0.87rem",
    fontFamily: "'DM Sans',sans-serif",
    outline: "none",
});

// ── Section heading ───────────────────────────────────────
function SectionHead({ icon: Icon, title, sub, t }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: t.accentBg, border: `1px solid ${t.accentRing}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent, flexShrink: 0 }}>
                <Icon size={17} />
            </div>
            <div>
                <div className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: t.heading, lineHeight: 1.2 }}>{title}</div>
                {sub && <div style={{ fontSize: "0.75rem", color: t.muted, marginTop: 3 }}>{sub}</div>}
            </div>
        </div>
    );
}

// ── Label ─────────────────────────────────────────────────
function Label({ text, required }) {
    return (
        <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            {text}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
        </label>
    );
}

// ── Field ─────────────────────────────────────────────────
function Field({ label, value, onChange, icon: Icon, t, error, type = "text", disabled = false, placeholder = "", required = false }) {
    return (
        <div>
            <Label text={label} required={required} />
            <div style={{ position: "relative" }}>
                {Icon && <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: error ? "#ef4444" : t.accent }} />}
                <input
                    type={type} value={value} onChange={onChange}
                    disabled={disabled} placeholder={placeholder}
                    style={{
                        ...inp(t, error),
                        paddingLeft: Icon ? 34 : 13,
                        background: disabled ? t.accentBg : t.inputBg,
                        color: disabled ? t.muted : t.text,
                        cursor: disabled ? "not-allowed" : "text",
                    }}
                />
            </div>
            {error && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><RiAlertLine size={11} /> {error}</p>}
        </div>
    );
}

// ── Password Field ────────────────────────────────────────
function PasswordField({ label, value, onChange, t, error, placeholder }) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <Label text={label} required />
            <div style={{ position: "relative" }}>
                <RiLockPasswordLine size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: error ? "#ef4444" : t.accent }} />
                <input
                    type={show ? "text" : "password"} value={value}
                    onChange={onChange} placeholder={placeholder || "••••••••"}
                    style={{ ...inp(t, error), paddingLeft: 34, paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                    style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.muted, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {show ? <RiEyeOffLine size={15} /> : <RiEyeLine size={15} />}
                </button>
            </div>
            {error && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><RiAlertLine size={11} /> {error}</p>}
        </div>
    );
}

// ── Inline Toast ──────────────────────────────────────────
function Toast({ msg, type }) {
    if (!msg) return null;
    const isErr = type === "error";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 15px", borderRadius: 10, marginBottom: 18, background: isErr ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${isErr ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, color: isErr ? "#ef4444" : "#16a34a", fontSize: "0.83rem" }}>
            {isErr ? <RiAlertLine size={15} /> : <RiCheckboxCircleLine size={15} />}
            {msg}
        </div>
    );
}

// ── Save Button ───────────────────────────────────────────
function SaveBtn({ loading, t, label = "Save Changes" }) {
    return (
        <button type="submit" disabled={loading}
            style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, background: t.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: "0.87rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif", boxShadow: `0 0 18px ${t.accent}44` }}>
            {loading
                ? <><RiLoader4Line size={15} style={{ animation: "spin .7s linear infinite" }} /> Saving…</>
                : <><RiSaveLine size={15} /> {label}</>
            }
        </button>
    );
}

// ── Card wrapper ──────────────────────────────────────────
function Card({ children, t, style = {} }) {
    return (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28, ...style }}>
            {children}
        </div>
    );
}

// ── Image Upload Box ──────────────────────────────────────
function ImageUploadBox({ label, hint, preview, onFileChange, onClear, inputRef, maxKB, t, fileName }) {
    return (
        <div>
            <Label text={label} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", border: `2px solid ${t.accentRing}`, background: t.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {preview
                        ? <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <RiImageLine size={22} style={{ color: t.faint }} />
                    }
                </div>

                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={onFileChange} />

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <button type="button" onClick={() => inputRef.current?.click()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, background: t.accentBg, border: `1.5px dashed ${t.accentRing}`, borderRadius: 9, padding: "8px 15px", color: t.accent, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiUploadCloud2Line size={14} />
                        {fileName || "Upload Image"}
                    </button>
                    <span style={{ fontSize: "0.69rem", color: t.faint }}>{hint} · Max {maxKB} KB</span>
                </div>

                {fileName && (
                    <button type="button" onClick={onClear}
                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.74rem", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiDeleteBinLine size={12} /> Remove
                    </button>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
export default function AdminProfile({ t }) {
    // ── Profile data ──────────────────────────────────────
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchErr, setFetchErr] = useState("");

    // ── Account info form ──────────────────────────────────
    const [form, setForm] = useState({ name: "", businessName: "", phone: "", address: "", city: "", state: "" });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [infoSaving, setInfoSaving] = useState(false);
    const [infoToast, setInfoToast] = useState({ msg: "", type: "" });
    const [infoErrors, setInfoErrors] = useState({});
    const logoRef = useRef();

    // ── Password form ─────────────────────────────────────
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwToast, setPwToast] = useState({ msg: "", type: "" });
    const [pwErrors, setPwErrors] = useState({});

    // ── Fetch profile ─────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchProfile();
                const u = res.data.user;
                setProfile(u);
                setForm({ name: u.name || "", businessName: u.businessName || "", phone: u.phone || "", address: u.address || "", city: u.city || "", state: u.state || "" });
            } catch (err) {
                setFetchErr(err.response?.data?.message || "Failed to load profile.");
            } finally { setLoading(false); }
        })();
    }, []);

    // ── File pick helpers ─────────────────────────────────
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 100 * 1024) {
            setInfoToast({ msg: "Logo must be under 100 KB. Please compress and retry.", type: "error" });
            e.target.value = ""; return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    // ── Submit account info ───────────────────────────────
    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        setInfoErrors({}); setInfoToast({ msg: "", type: "" });
        try {
            setInfoSaving(true);
            const res = await saveLabDetails(form, logoFile);
            setProfile(res.data.user);
            setLogoFile(null); setLogoPreview(null);
            localStorage.setItem("name", res.data.user.name || "");
            localStorage.setItem("businessName", res.data.user.businessName || "");
            localStorage.setItem("logoUrl", res.data.user.logoUrl || "");
            setInfoToast({ msg: "Account details saved successfully.", type: "success" });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setInfoErrors(data.errors);
            setInfoToast({ msg: data?.message || "Update failed.", type: "error" });
        } finally { setInfoSaving(false); }
    };

    // ── Submit password ───────────────────────────────────
    const handlePwSubmit = async (e) => {
        e.preventDefault();
        setPwErrors({}); setPwToast({ msg: "", type: "" });
        try {
            setPwSaving(true);
            await updatePassword(pwForm);
            setPwToast({ msg: "Password changed successfully.", type: "success" });
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setPwErrors(data.errors);
            setPwToast({ msg: data?.message || "Password change failed.", type: "error" });
        } finally { setPwSaving(false); }
    };

    // ── Loading / error ───────────────────────────────────
    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 12, color: t.muted }}>
            <RiLoader4Line size={22} style={{ animation: "spin .7s linear infinite" }} />
            <span>Loading profile…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (fetchErr) return <Toast msg={fetchErr} type="error" />;

    const displayImage = logoPreview || profile.logoUrl;
    const initials = (profile.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div style={{ width: "100%", maxWidth: "100%", padding: "0 4px" }}>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                .ap-grid{
                    display:grid;
                    grid-template-columns: repeat(auto-fit, minmax(340px, 400px));
                    gap:20px;
                    align-items:start;
                    justify-content:start;
                    width:100%;
                }
            `}</style>

            {/* ══ IDENTITY HERO — full width strip ══ */}
            <Card t={t} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>

                    <div style={{ position: "relative", flexShrink: 0 }}>
                        {displayImage ? (
                            <img src={displayImage} alt="Admin Logo"
                                style={{ width: 78, height: 78, borderRadius: 20, objectFit: "cover", border: `2px solid ${t.accentRing}`, boxShadow: `0 0 24px ${t.accent}44` }} />
                        ) : (
                            <div style={{ width: 78, height: 78, borderRadius: 20, background: "linear-gradient(135deg,#38bdf8,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 800, color: "#fff", boxShadow: "0 0 24px rgba(56,189,248,.35)" }}>
                                {initials}
                            </div>
                        )}
                        <div style={{ position: "absolute", bottom: -6, right: -6, width: 24, height: 24, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${t.card}` }}>
                            <RiMicroscopeLine size={12} color="#fff" />
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 180 }}>
                        <div className="playfair" style={{ fontSize: "1.3rem", fontWeight: 800, color: t.heading, lineHeight: 1.2 }}>
                            {profile.businessName || profile.name}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: t.muted, marginTop: 4 }}>{profile.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.7rem", color: "#16a34a", display: "flex", alignItems: "center", gap: 4, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", padding: "3px 9px", borderRadius: 20 }}>
                                <RiShieldUserLine size={11} /> Administrator
                            </span>
                            <span style={{ fontSize: "0.7rem", color: t.muted }}>ID: <strong style={{ color: t.accent }}>{profile.vendorId}</strong></span>
                            <span style={{ fontSize: "0.7rem", color: t.muted }}>Since: <strong style={{ color: t.text }}>{new Date(profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</strong></span>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <div style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 13px", display: "flex", alignItems: "center", gap: 7 }}>
                            <RiMailLine size={13} style={{ color: t.accent }} />
                            <span style={{ fontSize: "0.79rem", color: t.text }}>{profile.email}</span>
                        </div>
                        <div style={{ background: "rgba(56,189,248,0.06)", border: `1px solid ${t.accentRing}`, borderRadius: 9, padding: "7px 13px", display: "flex", alignItems: "center", gap: 7 }}>
                            <RiShieldCheckLine size={13} style={{ color: t.accent }} />
                            <span style={{ fontSize: "0.79rem", color: t.muted }}>Full platform access</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ══ HORIZONTAL GRID — Account / Password side-by-side ══ */}
            <div className="ap-grid">

                {/* Account & Contact Details */}
                <Card t={t}>
                    <SectionHead icon={RiBuilding2Line} title="Account & Contact Details" sub="Your admin identity across LabRepo" t={t} />
                    <Toast msg={infoToast.msg} type={infoToast.type} />
                    <form onSubmit={handleInfoSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Field label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} icon={RiUserLine} t={t} error={infoErrors.name} required />
                        <Field label="Business / Organisation Name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} icon={RiBuilding2Line} t={t} error={infoErrors.businessName} required />
                        <Field label="Email" value={profile.email} icon={RiMailLine} t={t} disabled placeholder="Read-only" />
                        <Field label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} icon={RiPhoneLine} t={t} error={infoErrors.phone} placeholder="+91 98765 43210" />
                        <Field label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} icon={RiMapPinLine} t={t} error={infoErrors.address} placeholder="Street / Colony / Area" />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <Field label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} icon={RiMapPin2Line} t={t} error={infoErrors.city} />
                            <Field label="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} icon={RiMapPin2Line} t={t} error={infoErrors.state} />
                        </div>

                        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginTop: 4 }}>
                            <ImageUploadBox
                                label="Admin Logo" hint="PNG, JPG, WEBP" maxKB={100}
                                preview={logoPreview || profile.logoUrl}
                                onFileChange={handleLogoChange}
                                onClear={() => { setLogoFile(null); setLogoPreview(null); }}
                                inputRef={logoRef} fileName={logoFile?.name} t={t}
                            />
                        </div>

                        <SaveBtn loading={infoSaving} t={t} label="Save Account Details" />
                    </form>
                </Card>

                {/* Change Password */}
                <Card t={t}>
                    <SectionHead icon={RiLockPasswordLine} title="Change Password" sub="Min 8 chars · One uppercase · One number" t={t} />
                    <Toast msg={pwToast.msg} type={pwToast.type} />
                    <form onSubmit={handlePwSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <PasswordField label="Current Password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} t={t} error={pwErrors.currentPassword} />
                        <PasswordField label="New Password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} t={t} error={pwErrors.newPassword} placeholder="Min 8 chars" />
                        <PasswordField label="Confirm New Password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} t={t} error={pwErrors.confirmPassword} />
                        <SaveBtn loading={pwSaving} t={t} label="Update Password" />
                    </form>
                </Card>

            </div>
        </div>
    );
}