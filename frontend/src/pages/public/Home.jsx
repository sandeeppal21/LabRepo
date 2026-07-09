import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// ─── Floating particle background ───────────────────────────────────────────
function Particles() {
  return (
    <div className="particles-bg" aria-hidden="true">
      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} className={`particle p-${i % 5}`} style={{
          left: `${(i * 4.7 + 3) % 100}%`,
          animationDelay: `${(i * 0.41) % 7}s`,
          animationDuration: `${8 + (i * 0.6) % 8}s`,
          width: `${3 + (i % 4) * 2}px`,
          height: `${3 + (i % 4) * 2}px`,
          opacity: 0.18 + (i % 5) * 0.06,
        }} />
      ))}
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 24);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>

      <Particles />


      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-content">
          <div className="hero-badge">
            <div className="dot" />
            Next-Gen Pathology Lab Management System
          </div>
          <h1>
            Smarter Labs.<br />
            <span className="highlight">Faster Reports.</span><br />
            Happier Patients.
          </h1>
          <p>
            LabSmart is a complete Laboratory Information System (LIS) — manage patients, generate reports with QR codes, create bills, and let patients download their reports in seconds.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn-hero">
              🚀 Start Free Trial
            </Link>
            <a href="#report" className="btn-hero-ghost">
              📄 Download Report
            </a>
          </div>
        </div>
        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          Scroll
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        {[
          { n: 5000, s: "+", l: "Reports Generated" },
          { n: 1200, s: "+", l: "Patients Registered" },
          { n: 99, s: "%", l: "Uptime SLA" },
          { n: 3, s: " sec", l: "Avg Report Download" },
        ].map((s, i) => (
          <div className="stat-item" key={i}>
            <div className="stat-num"><Counter target={s.n} suffix={s.s} /></div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="features-header">
          <div className="section-tag">Core Features</div>
          <h2 className="section-title">Everything Your Lab Needs</h2>
          <p className="section-sub">From patient registration to report download — streamlined in one powerful platform.</p>
        </div>
        <div className="features-grid">
          {[
            { icon: "🧾", cls: "blue", title: "Smart Billing", desc: "Generate detailed bills with auto-calculated costs, discount management, and print-ready invoice format. Retrieve any bill instantly." },
            { icon: "📋", cls: "cyan", title: "Report Generation", desc: "Create professional pathology reports with doctor references, test values, normal ranges, and interpretation notes — all in one click." },
            { icon: "🔖", cls: "teal", title: "Barcode Labels", desc: "Auto-generate barcodes for each sample tube. Scan to retrieve any patient record, sample, or report without manual entry." },
            { icon: "📱", cls: "blue", title: "QR Code Reports", desc: "Every report gets a unique QR code. Patients scan it to download their report instantly — no login, no delay." },
            { icon: "⬇️", cls: "cyan", title: "Report Download", desc: "Patients download reports using their bill number or QR code. Secure, fast, and available 24/7 from the homepage." },
            { icon: "📊", cls: "teal", title: "Lab Dashboard", desc: "Monitor daily workload, pending tests, billing summary, and patient trends — all in a real-time analytics dashboard." },
            { icon: "👨‍⚕️", cls: "blue", title: "Doctor Referrals", desc: "Track which doctors referred patients, view commission structures, and generate monthly referral summaries with ease." },
            { icon: "🔐", cls: "cyan", title: "Secure Access", desc: "Role-based login for admin, lab technicians, and reception. Each role sees only what they need — nothing more." },
            { icon: "🖨️", cls: "teal", title: "Print Ready", desc: "All reports, bills, and labels are formatted for direct printing. Thermal label printers and standard A4 both supported." },
          ].map((f, i) => (
            <div className="feat-card" key={i}>
              <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how" id="how">
        <div className="how-inner">
          <div className="how-header">
            <div className="section-tag">Workflow</div>
            <h2 className="section-title">From Sample to Report in Minutes</h2>
          </div>
          <div className="steps">
            {[
              { n: "01", t: "Register Patient", d: "Enter patient details with doctor referral and prescribed tests." },
              { n: "02", t: "Generate Bill", d: "System creates itemized bill. Print or share via WhatsApp." },
              { n: "03", t: "Label Sample", d: "Print barcode label for the sample tube. Scan to track status." },
              { n: "04", t: "Enter Results", d: "Lab technician enters test values with normal range comparison." },
              { n: "05", t: "Download Report", d: "Patient scans QR or enters bill number to download PDF instantly." },
            ].map((s, i) => (
              <div className="step" key={i}>
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.t}</div>
                <p className="step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD REPORT CTA ── */}
      <section className="report-cta" id="report">
        <div className="report-cta-inner">
          <div className="report-cta-text">
            <div className="section-tag">Report Portal</div>
            <h2 className="section-title">Download Your Report</h2>
            <p className="section-sub">
              Enter your Bill Number or scan the QR code from your receipt to download your lab report as a PDF — no account needed.
            </p>
          </div>
          <div className="report-cta-form">
            <div className="input-group">
              <input className="ls-input" placeholder="Enter Bill Number (e.g. BL-2024-0012)" />
              <button className="btn-search">Search →</button>
            </div>
            <p className="report-hint">🔒 Your report is encrypted and only accessible to you.</p>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing" id="pricing">
        <div className="pricing-header">
          <div className="section-tag">Pricing Plans</div>
          <h2 className="section-title">Simple, Honest Pricing</h2>
          <p className="section-sub" style={{ margin: "12px auto 0", maxWidth: 460 }}>No hidden fees. Pick a plan that fits your lab's size. Upgrade anytime.</p>
        </div>
        <div className="pricing-grid">
          {/* Starter */}
          <div className="price-card">
            <div className="plan-name">Starter</div>
            <div className="plan-price">₹999 <span>/mo</span></div>
            <div className="plan-period">Per month, billed monthly</div>
            <div className="plan-divider" />
            <ul className="plan-features">
              {["Up to 200 patients/month", "Report generation & PDF", "Basic billing", "QR code per report", "1 user account"].map((f, i) => (
                <li key={i}><span className="check">✓</span>{f}</li>
              ))}
              {["Doctor referral tracking", "Barcode labels", "Priority support"].map((f, i) => (
                <li key={i} style={{ opacity: 0.45 }}><span className="cross">✕</span>{f}</li>
              ))}
            </ul>
            <Link to="/login" className="btn-plan btn-plan-ghost">Get Started</Link>
          </div>

          {/* Professional — popular */}
          <div className="price-card popular">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-name">Professional</div>
            <div className="plan-price">₹2,499 <span>/mo</span></div>
            <div className="plan-period">Per month, billed monthly</div>
            <div className="plan-divider" />
            <ul className="plan-features">
              {["Up to 1,000 patients/month", "All report types + templates", "Full billing & invoicing", "QR + Barcode generation", "5 user accounts", "Doctor referral tracking", "Barcode label printing"].map((f, i) => (
                <li key={i}><span className="check">✓</span>{f}</li>
              ))}
              {["Dedicated support"].map((f, i) => (
                <li key={i} style={{ opacity: 0.45 }}><span className="cross">✕</span>{f}</li>
              ))}
            </ul>
            <Link to="/login" className="btn-plan btn-plan-solid">Start Free Trial</Link>
          </div>

          {/* Enterprise */}
          <div className="price-card">
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">₹5,999 <span>/mo</span></div>
            <div className="plan-period">Per month, billed monthly</div>
            <div className="plan-divider" />
            <ul className="plan-features">
              {["Unlimited patients", "Custom report templates", "Advanced billing & GST", "QR + Barcode + SMS alerts", "Unlimited users", "Doctor referral + commission", "Barcode thermal printer support", "Priority dedicated support"].map((f, i) => (
                <li key={i}><span className="check">✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/login" className="btn-plan btn-plan-ghost">Contact Sales</Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials" id="testimonials">
        <div className="testimonials-header">
          <div className="section-tag">Testimonials</div>
          <h2 className="section-title">Trusted by Labs Across India</h2>
        </div>
        <div className="testi-grid" style={{ maxWidth: 1100, margin: "0 auto" }}>
          {[
            { text: "LabSmart completely transformed how we handle reports. Patients love the QR code download feature — zero calls for report dispatch now.", name: "Dr. Priya Sharma", role: "Pathologist, MedCare Diagnostics, Delhi", init: "PS" },
            { text: "Billing used to take 30 minutes per session. Now it's done in under 2 minutes. The barcode system for samples is brilliant.", name: "Ramesh Gupta", role: "Lab Manager, CityScan Labs, Mumbai", init: "RG" },
            { text: "We integrated LabSmart in our small city lab and saw patient trust increase dramatically. The professional PDF reports make a huge difference.", name: "Dr. Anil Mehta", role: "Owner, Mehta Path Lab, Jaipur", init: "AM" },
          ].map((t, i) => (
            <div className="testi-card" key={i}>
              <div className="testi-stars">★★★★★</div>
              <p className="testi-text">"{t.text}"</p>
              <div className="testi-author">
                <div className="testi-avatar">{t.init}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta">
        <div className="section-tag">Get Started Today</div>
        <h2>Ready to Modernize<br />Your Pathology Lab?</h2>
        <p>Join hundreds of labs already using LabSmart. Setup takes less than 10 minutes.</p>
        <div className="final-actions">
          <Link to="/login" className="btn-hero">🚀 Start Free Trial</Link>
          <a href="mailto:support@labsmart.in" className="btn-hero-ghost">📞 Talk to Us</a>
        </div>
      </section>

    </>
  );
}
