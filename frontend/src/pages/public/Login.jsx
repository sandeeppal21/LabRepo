import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiMicroscopeLine } from "react-icons/ri";
import { FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [data, setData] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) =>
    setData(d => ({ ...d, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!data.email || !data.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", data);
      const { token, role, status, vendorId, name, businessName, logoUrl } = res.data;

      // ── Persist auth info ────────────────────────────────
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("vendorId", vendorId || "");
      localStorage.setItem("name", name || "");
      localStorage.setItem("businessName", businessName || "");
      localStorage.setItem("logoUrl", logoUrl || "");
      localStorage.setItem("address", res.data.address || "");
      localStorage.setItem("city", res.data.city || "");
      localStorage.setItem("state", res.data.state || "");
      localStorage.setItem("phone", res.data.phone || "");
      localStorage.setItem("email", res.data.email || "");

      // ── Route by role ────────────────────────────────────
      if (role === "admin") return navigate("/dashboard/admin");
      if (role === "vendor") return navigate("/dashboard/vendor");
      navigate("/dashboard");

    } catch (err) {
      const msg = err.response?.data?.message;
      const sts = err.response?.data?.status;

      if (sts === "pending") {
        setError("Your account is pending admin approval. You'll be notified by email.");
      } else if (sts === "rejected") {
        setError(msg || "Your vendor request was rejected. Contact support.");
      } else {
        setError(msg || "Invalid email or password.");
      }
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
      padding: "40px 20px",
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
          padding: 12px 14px;
          color: #fff;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .lr-input::placeholder { color: rgba(56,189,248,0.28); }
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
      `}</style>

      {/* Grid background */}
      <div className="grid-bg" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(56,189,248,0.07), transparent 70%)"
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>

        {/* ── Brand ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "20px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "11px",
              background: "linear-gradient(135deg,#38bdf8,#06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(56,189,248,0.45)",
            }}>
              <RiMicroscopeLine color="#fff" size={20} />
            </div>
            <span className="syne" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff" }}>
              Lab<span style={{ color: "#38bdf8" }}>Repo</span>
            </span>
          </Link>

          <h1 className="syne" style={{ fontWeight: 800, fontSize: "1.6rem", color: "#fff", marginBottom: "6px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: ".85rem", color: "rgba(56,189,248,0.45)" }}>
            Login to your vendor or admin account
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{
          borderRadius: "18px",
          border: "1px solid rgba(56,189,248,0.18)",
          background: "rgba(7,20,40,0.8)",
          backdropFilter: "blur(16px)",
          padding: "32px",
        }}>

          {/* Error banner */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "rgba(226,75,74,0.1)",
              border: "1px solid rgba(226,75,74,0.3)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "20px",
              fontSize: ".84rem",
              color: "#f87171",
              lineHeight: 1.5,
            }}>
              <FiAlertCircle style={{ flexShrink: 0, marginTop: "2px" }} />
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Email */}
            <div>
              <label className="lr-label">Email address</label>
              <input
                className="lr-input"
                type="email"
                name="email"
                value={data.email}
                onChange={onChange}
                placeholder="admin@labrepo.in"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="lr-label" style={{ margin: 0 }}>Password</label>
                <a href="#" style={{ fontSize: ".72rem", color: "rgba(56,189,248,0.5)", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = "#38bdf8"}
                  onMouseLeave={e => e.target.style.color = "rgba(56,189,248,0.5)"}>
                  Forgot password?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  className="lr-input"
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={data.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: "44px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: "rgba(56,189,248,0.45)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    padding: "4px",
                  }}
                >
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="gbtn"
              style={{
                marginTop: "4px",
                padding: "13px",
                borderRadius: "12px",
                background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {loading
                ? <><span className="spinner" /> Logging in…</>
                : "Login to Dashboard →"
              }
            </button>

          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            margin: "22px 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(56,189,248,0.1)" }} />
            <span style={{ fontSize: ".72rem", color: "rgba(56,189,248,0.3)" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(56,189,248,0.1)" }} />
          </div>

          {/* Register link */}
          <Link to="/register" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              textAlign: "center",
              padding: "12px",
              borderRadius: "12px",
              border: "1.5px solid rgba(56,189,248,0.2)",
              color: "rgba(125,211,252,0.75)",
              fontSize: "0.88rem",
              fontWeight: 500,
              transition: "border-color 0.2s, background 0.2s",
              cursor: "pointer",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.background = "rgba(56,189,248,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)"; e.currentTarget.style.background = "transparent"; }}
            >
              New vendor? <strong style={{ color: "#38bdf8" }}>Register your lab →</strong>
            </div>
          </Link>

        </div>

        {/* Footer note */}
        <p style={{
          textAlign: "center",
          fontSize: ".72rem",
          color: "rgba(56,189,248,0.25)",
          marginTop: "20px",
          lineHeight: 1.6,
        }}>
          By logging in you agree to our{" "}
          <a href="#" style={{ color: "rgba(56,189,248,0.45)", textDecoration: "none" }}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" style={{ color: "rgba(56,189,248,0.45)", textDecoration: "none" }}>Privacy Policy</a>
        </p>

      </div>
    </div>
  );
}