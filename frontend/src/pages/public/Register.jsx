import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiMicroscopeLine } from "react-icons/ri";
import { FiUpload, FiX, FiCheckCircle, FiEye, FiEyeOff } from "react-icons/fi";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Register() {
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPass: "",
        businessName: "",
        phone: "",
        address: "",
        city: "",
        state: "",
    });

    const [logo, setLogo] = useState(null);   // File object
    const [logoPreview, setLogoPreview] = useState(null);   // data URL for preview
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ── Field change ──────────────────────────────────────────
    const onChange = (e) =>
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    // ── Logo pick ─────────────────────────────────────────────
    const onLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
        if (!allowed.includes(file.type)) {
            setError("Logo must be JPEG, PNG, WEBP, or SVG.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Logo file size must be under 2 MB.");
            return;
        }

        setError("");
        setLogo(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setLogo(null);
        setLogoPreview(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    // ── Submit ────────────────────────────────────────────────
    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.password !== form.confirmPass) {
            setError("Passwords do not match.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        // Build FormData — needed because we're sending a file
        const fd = new FormData();
        fd.append("name", form.name.trim());
        fd.append("email", form.email.trim());
        fd.append("password", form.password);
        fd.append("businessName", form.businessName.trim());
        fd.append("phone", form.phone.trim());
        fd.append("address", form.address.trim());
        fd.append("city", form.city.trim());
        fd.append("state", form.state.trim());
        if (logo) fd.append("logo", logo); // field name must match upload.single("logo")

        try {
            setLoading(true);
            const res = await axios.post(`${API}/auth/register`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSuccess(`Registration submitted! Your Vendor ID is ${res.data.vendorId}. Awaiting admin approval.`);
            // Optionally redirect to a "pending" page after 3s
            setTimeout(() => navigate("/login"), 3500);
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#040d1c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            fontFamily: "'DM Sans', sans-serif",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .syne { font-family: 'Syne', sans-serif; }
        .lr-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(56,189,248,0.2);
          border-radius: 10px;
          padding: 11px 14px;
          color: #fff;
          font-size: 0.88rem;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .lr-input::placeholder { color: rgba(56,189,248,0.3); }
        .lr-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.1);
        }
        .lr-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(125,211,252,0.7);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .gbtn {
          box-shadow: 0 0 22px rgba(56,189,248,0.3), 0 4px 14px rgba(6,182,212,0.18);
          transition: box-shadow 0.3s, transform 0.22s, opacity 0.2s;
        }
        .gbtn:hover:not(:disabled) {
          box-shadow: 0 0 44px rgba(56,189,248,0.5), 0 8px 26px rgba(6,182,212,0.28);
          transform: translateY(-2px);
        }
        .gbtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .logo-drop {
          border: 2px dashed rgba(56,189,248,0.25);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: rgba(56,189,248,0.03);
        }
        .logo-drop:hover {
          border-color: rgba(56,189,248,0.5);
          background: rgba(56,189,248,0.06);
        }
      `}</style>

            <div style={{ width: "100%", maxWidth: "560px" }}>

                {/* Brand */}
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#38bdf8,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(56,189,248,0.4)" }}>
                            <RiMicroscopeLine color="#fff" size={18} />
                        </div>
                        <span className="syne" style={{ fontWeight: 800, fontSize: "1.3rem", color: "#fff" }}>
                            Lab<span style={{ color: "#38bdf8" }}>Repo</span>
                        </span>
                    </Link>
                    <h1 className="syne" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", marginTop: "14px", marginBottom: "4px" }}>
                        Register as Vendor
                    </h1>
                    <p style={{ fontSize: ".83rem", color: "rgba(56,189,248,0.45)" }}>
                        Submit your details. Admin reviews and approves your account.
                    </p>
                </div>

                {/* Card */}
                <div style={{ borderRadius: "18px", border: "1px solid rgba(56,189,248,0.18)", background: "rgba(7,20,40,0.75)", backdropFilter: "blur(14px)", padding: "32px" }}>

                    {/* Error / Success banners */}
                    {error && (
                        <div style={{ background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.35)", borderRadius: "10px", padding: "11px 14px", marginBottom: "18px", fontSize: ".84rem", color: "#f87171" }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.35)", borderRadius: "10px", padding: "11px 14px", marginBottom: "18px", fontSize: ".84rem", color: "#34d399", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <FiCheckCircle style={{ flexShrink: 0, marginTop: "2px" }} /> {success}
                        </div>
                    )}

                    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* ── Logo upload ── */}
                        <div>
                            <label className="lr-label">Lab / Business Logo <span style={{ color: "rgba(56,189,248,0.4)", fontWeight: 400 }}>(shown on reports)</span></label>

                            {logoPreview ? (
                                <div style={{ position: "relative", display: "inline-block" }}>
                                    <img src={logoPreview} alt="Logo preview"
                                        style={{ height: "80px", maxWidth: "200px", objectFit: "contain", borderRadius: "10px", border: "1.5px solid rgba(56,189,248,0.3)", background: "rgba(255,255,255,0.05)", padding: "8px" }} />
                                    <button type="button" onClick={removeLogo}
                                        style={{ position: "absolute", top: "-8px", right: "-8px", width: "22px", height: "22px", borderRadius: "50%", background: "#e24b4a", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>
                                        <FiX />
                                    </button>
                                    <div style={{ fontSize: ".72rem", color: "rgba(56,189,248,0.45)", marginTop: "6px" }}>{logo?.name}</div>
                                </div>
                            ) : (
                                <div className="logo-drop" onClick={() => fileRef.current?.click()}>
                                    <FiUpload style={{ color: "rgba(56,189,248,0.5)", fontSize: "1.4rem", marginBottom: "8px" }} />
                                    <div style={{ fontSize: ".84rem", color: "rgba(186,230,255,0.6)", marginBottom: "4px" }}>
                                        Click to upload logo
                                    </div>
                                    <div style={{ fontSize: ".72rem", color: "rgba(56,189,248,0.35)" }}>
                                        PNG, JPG, WEBP or SVG · Max 2 MB
                                    </div>
                                </div>
                            )}

                            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} style={{ display: "none" }} />
                        </div>

                        {/* ── Two columns: name + business ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label className="lr-label">Full Name *</label>
                                <input className="lr-input" name="name" value={form.name} onChange={onChange} placeholder="Rahul Sharma" required />
                            </div>
                            <div>
                                <label className="lr-label">Business Name</label>
                                <input className="lr-input" name="businessName" value={form.businessName} onChange={onChange} placeholder="Sharma Diagnostics" />
                            </div>
                        </div>

                        {/* ── Email ── */}
                        <div>
                            <label className="lr-label">Email *</label>
                            <input className="lr-input" type="email" name="email" value={form.email} onChange={onChange} placeholder="you@business.com" required />
                        </div>

                        {/* ── Phone + City ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label className="lr-label">Phone</label>
                                <input className="lr-input" name="phone" value={form.phone} onChange={onChange} placeholder="+91 98765 43210" />
                            </div>
                            <div>
                                <label className="lr-label">City</label>
                                <input className="lr-input" name="city" value={form.city} onChange={onChange} placeholder="Lucknow" />
                            </div>
                        </div>

                        {/* ── State ── */}
                        <div>
                            <label className="lr-label">State</label>
                            <input className="lr-input" name="state" value={form.state} onChange={onChange} placeholder="Uttar Pradesh" />
                        </div>

                        {/* ── Password ── */}
                        <div>
                            <label className="lr-label">Password *</label>
                            <div style={{ position: "relative" }}>
                                <input className="lr-input" type={showPass ? "text" : "password"} name="password" value={form.password} onChange={onChange} placeholder="Min. 6 characters" required style={{ paddingRight: "42px" }} />
                                <button type="button" onClick={() => setShowPass(p => !p)}
                                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(56,189,248,0.5)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    {showPass ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* ── Confirm password ── */}
                        <div>
                            <label className="lr-label">Confirm Password *</label>
                            <input className="lr-input" type={showPass ? "text" : "password"} name="confirmPass" value={form.confirmPass} onChange={onChange} placeholder="Re-enter password" required />
                        </div>

                        {/* ── Submit ── */}
                        <button type="submit" disabled={loading} className="gbtn"
                            style={{ marginTop: "4px", padding: "13px", borderRadius: "12px", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", fontWeight: 700, fontSize: ".95rem", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
                            {loading ? "Submitting…" : "Submit Registration →"}
                        </button>

                        <p style={{ textAlign: "center", fontSize: ".78rem", color: "rgba(56,189,248,0.35)", marginTop: "4px" }}>
                            Already have an account?{" "}
                            <Link to="/login" style={{ color: "#38bdf8" }}>Login</Link>
                        </p>

                    </form>
                </div>

                {/* Info note */}
                <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "10px", background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.12)", fontSize: ".78rem", color: "rgba(56,189,248,0.5)", lineHeight: 1.6 }}>
                    ℹ️  After submission your request goes to the LabRepo admin for review. You'll receive an email once approved. Your logo will appear on all lab reports generated under your account.
                </div>

            </div>
        </div>
    );
}