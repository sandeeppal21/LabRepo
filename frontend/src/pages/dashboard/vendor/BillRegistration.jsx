/**
 * BillRegistration.jsx
 * Changes from previous version:
 *  ✅ Referring Doctor is now a searchable dropdown
 *  ✅ Fetches doctors from /api/referrals?category=doctor on mount
 *  ✅ Saves referringDoctorId (ObjectId) + referringDoctorName to patient
 *  ✅ Dropdown shows name + degree + commission info
 *  ✅ Clears on reset
 */

import { useState, useEffect, useRef } from "react";
import {
    RiUserAddLine, RiCloseLine, RiSearchLine,
    RiDeleteBinLine, RiPrinterLine, RiLoader4Line,
    RiCheckboxCircleLine, RiAlertLine, RiArrowRightLine,
    RiResetLeftLine, RiPhoneLine, RiMailLine, RiMapPinLine,
    RiStethoscopeLine, RiFileTextLine, RiArrowDownSLine, RiAddLine,
} from "react-icons/ri";
import {
    createPatient,
    searchPatients,
    createBill,
    fetchVendorTests,
} from "../../../services/billingService";
import { fetchReferrals, createReferral } from "../../../services/referralService";
import BillReceipt from "./BillReceipt";
import CustomSelect from "../../../components/common/CustomSelect";
import { fetchProfile } from "../../../services/profileService"; // adjust path/name

// ── Constants ──────────────────────────────────────────────────
const DESIGNATIONS = ["MR.", "MRS.", "MS.", "DR.", "MASTER", "BABY"];
const GENDERS = ["male", "female", "other"];
const AGE_TYPES = ["year", "month", "day"];
const DISPATCH_OPTS = ["hardcopy", "email", "whatsapp", "online"];
const PAYMENT_MODES = ["cash", "upi", "card", "due"];

// ── Shared helpers ─────────────────────────────────────────────
const inpCls = (t, err) => ({
    width: "100%", background: t.inputBg,
    border: `1.5px solid ${err ? "rgba(239,68,68,0.5)" : t.accentRing}`,
    borderRadius: 9, padding: "9px 12px",
    color: t.text, fontSize: "0.86rem",
    fontFamily: "'DM Sans',sans-serif", outline: "none",
});

const Label = ({ text, t, required }) => (
    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
        {text}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
);

const FieldErr = ({ msg }) => msg
    ? <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{msg}</p>
    : null;

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
    if (!msg) return null;
    const ok = type === "success";
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", borderRadius: 12, minWidth: 300, background: ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`, color: ok ? "#16a34a" : "#ef4444", fontSize: "0.84rem", fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            {ok ? <RiCheckboxCircleLine size={16} /> : <RiAlertLine size={16} />}
            <span style={{ flex: 1 }}>{msg}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <RiCloseLine size={14} />
            </button>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// QUICK ADD DOCTOR MODAL
// Opens inline when doctor not found in dropdown
// ══════════════════════════════════════════════════════════════
function QuickAddDoctorModal({ t, onClose, onAdded }) {
    const [form, setForm] = useState({ name: "", phone: "", degree: "", commission: "" });
    const [errs, setErrs] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveErr, setSaveErr] = useState("");

    const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: "" })); };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Name is required";
        if (!form.phone.trim()) e.phone = "Phone is required";
        else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Must be 10 digits";
        if (form.commission !== "" && (isNaN(form.commission) || +form.commission < 0 || +form.commission > 100))
            e.commission = "Must be 0–100";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrs(e); return; }
        setSaving(true);
        setSaveErr("");
        try {
            const res = await createReferral({
                category: "doctor",
                name: form.name.trim().toUpperCase(),
                phone: form.phone.trim(),
                degree: form.degree.trim(),
                commission: form.commission !== "" ? Number(form.commission) : 0,
                email: "",
                b2b: "",
            });
            // Pass newly created doctor back to dropdown
            const newDoc = res.data.data;
            onAdded({ id: newDoc._id.toString(), name: newDoc.name, degree: newDoc.degree || "" });
        } catch (err) {
            setSaveErr(err.response?.data?.message || err.message);
        } finally {
            setSaving(false);
        }
    };

    const inp = (hasErr) => ({
        width: "100%", background: t.inputBg,
        border: `1.5px solid ${hasErr ? "#ef4444" : t.accentRing}`,
        borderRadius: 9, padding: "9px 12px", color: t.text,
        fontSize: "0.85rem", fontFamily: "'DM Sans',sans-serif", outline: "none",
    });

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
            <div style={{ position: "relative", zIndex: 1, background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                        <h3 className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading }}>
                            Add Referring Doctor
                        </h3>
                        <p style={{ fontSize: "0.73rem", color: t.muted, marginTop: 2 }}>
                            Quick add — doctor will be saved to your list
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, color: t.muted, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <RiCloseLine size={15} />
                    </button>
                </div>

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

                    {/* Name */}
                    <div>
                        <Label text="Doctor / Clinic Name" t={t} required />
                        <input value={form.name} onChange={e => setF("name", e.target.value)}
                            placeholder="e.g. DR. AMIT SINGH" style={inp(errs.name)} />
                        {errs.name && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errs.name}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <Label text="Phone Number" t={t} required />
                        <div style={{ position: "relative" }}>
                            <RiPhoneLine size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                            <input type="tel" maxLength={10} value={form.phone}
                                onChange={e => setF("phone", e.target.value)}
                                placeholder="10-digit number"
                                style={{ ...inp(errs.phone), paddingLeft: 32 }} />
                        </div>
                        {errs.phone && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errs.phone}</p>}
                    </div>

                    {/* Degree + Commission side by side */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <Label text="Degree" t={t} />
                            <input value={form.degree} onChange={e => setF("degree", e.target.value)}
                                placeholder="MBBS, MD…" style={inp(false)} />
                        </div>
                        <div>
                            <Label text="Commission %" t={t} />
                            <input type="number" min="0" max="100" value={form.commission}
                                onChange={e => setF("commission", e.target.value)}
                                placeholder="0–100" style={inp(errs.commission)} />
                            {errs.commission && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errs.commission}</p>}
                        </div>
                    </div>
                </div>

                {/* API error */}
                {saveErr && (
                    <div style={{ marginTop: 12, padding: "9px 13px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.22)", color: "#ef4444", fontSize: "0.79rem" }}>
                        {saveErr}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                    <button onClick={onClose}
                        style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: t.accent, color: "#fff", fontSize: "0.83rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.72 : 1, display: "flex", alignItems: "center", gap: 7, boxShadow: `0 0 16px ${t.accent}44` }}>
                        {saving
                            ? <><RiLoader4Line size={13} style={{ animation: "spin .7s linear infinite" }} /> Saving…</>
                            : <><RiCheckboxCircleLine size={13} /> Add Doctor</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// REFERRAL DOCTOR DROPDOWN
// Fetches all doctors for this vendor, shows searchable list
// ══════════════════════════════════════════════════════════════
function ReferralDoctorDropdown({ t, value, onChange, error, onQuickAdd }) {
    // value = { id, name, degree } | null
    const [allDoctors, setAllDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef();

    // Load all referring doctors once
    useEffect(() => {
        (async () => {
            try {
                // Fetch all pages (up to 100) — doctors list is typically small
                const res = await fetchReferrals({ category: "doctor", page: 1, search: "" });
                // axios: res.data = { success, data: [...], pagination: {...} }
                setAllDoctors(res.data.data || []);
            } catch {
                setAllDoctors([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = allDoctors.filter(d =>
        !query.trim() ||
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.phone.includes(query) ||
        (d.degree && d.degree.toLowerCase().includes(query.toLowerCase()))
    );

    // const select = (doc) => {
    //     // onChange({ id: doc._id, name: doc.name, degree: doc.degree || "" });

    //     setOpen(false);
    //     setQuery("");
    // };

    const select = (doc) => {
        onChange({ id: doc._id.toString(), name: doc.name, degree: doc.degree || "" });
        setOpen(false);
        setQuery("");
    }

    const clear = (e) => {
        e.stopPropagation();
        onChange(null);
    };


    // ── REPLACE the entire ReferralDoctorDropdown return() with this ──

    return (
        <div ref={wrapperRef} style={{ position: "relative" }}>

            <Label text="Referring Doctor" t={t} />

            {/* Trigger + Quick Add button — side by side */}
            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>

                {/* Trigger */}
                <div
                    onClick={() => setOpen(o => !o)}
                    style={{
                        flex: 1,
                        display: "flex", alignItems: "center", gap: 8,
                        background: t.inputBg,
                        border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : open ? t.accent : t.accentRing}`,
                        borderRadius: 9, padding: "9px 12px",
                        cursor: "pointer", userSelect: "none",
                        transition: "border-color .15s",
                    }}>
                    <RiStethoscopeLine size={14} style={{ color: value ? t.accent : t.faint, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        {value ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: "0.86rem", fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {value.name}
                                </span>
                                {value.degree && (
                                    <span style={{ fontSize: "0.7rem", color: t.accent, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>
                                        {value.degree}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span style={{ fontSize: "0.86rem", color: t.faint }}>
                                {loading ? "Loading doctors…" : "Select referring doctor"}
                            </span>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {value && (
                            <button onClick={clear} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex", alignItems: "center", padding: 2 }}>
                                <RiCloseLine size={13} />
                            </button>
                        )}
                        <RiArrowDownSLine size={16} style={{ color: t.faint, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
                    </div>
                </div>

                {/* Quick add + button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onQuickAdd?.(); }}
                    title="Add new doctor"
                    style={{ background: t.accentBg, border: `1.5px solid ${t.accentRing}`, color: t.accent, borderRadius: 9, width: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = t.accentBg; e.currentTarget.style.color = t.accent; }}>
                    <RiAddLine size={16} />
                </button>

            </div>{/* end flex row */}

            {/* Dropdown — position: absolute, inside ref wrapper */}
            {open && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>

                    {/* Search inside dropdown */}
                    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${t.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 10px" }}>
                            <RiSearchLine size={12} style={{ color: t.faint, flexShrink: 0 }} />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by name, phone, degree…"
                                onClick={e => e.stopPropagation()}
                                style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }}
                            />
                            {query && (
                                <button onClick={e => { e.stopPropagation(); setQuery(""); }}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}>
                                    <RiCloseLine size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                        {loading && (
                            <div style={{ padding: "16px", textAlign: "center", color: t.muted, fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> Loading…
                            </div>
                        )}

                        {!loading && filtered.length === 0 && (
                            <div style={{ padding: "16px", textAlign: "center", color: t.muted, fontSize: "0.82rem" }}>
                                {allDoctors.length === 0
                                    ? "No referring doctors found. Add them in Referral Management."
                                    : `No match for "${query}"`
                                }
                            </div>
                        )}

                        {!loading && filtered.map((doc, i) => {
                            const isSelected = value?.id === doc._id.toString();
                            return (
                                <div
                                    key={doc._id}
                                    onClick={() => select(doc)}
                                    style={{
                                        padding: "10px 14px",
                                        cursor: "pointer",
                                        borderBottom: i < filtered.length - 1 ? `1px solid ${t.border}` : "none",
                                        background: isSelected ? t.accentBg : "transparent",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        transition: "background .12s",
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = t.rowHover; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: "0.86rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? t.accent : t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {doc.name}
                                        </div>
                                        <div style={{ fontSize: "0.71rem", color: t.muted, marginTop: 2 }}>
                                            {doc.phone}
                                            {doc.degree && <> &nbsp;·&nbsp; <span style={{ color: t.accent }}>{doc.degree}</span></>}
                                            {doc.commission > 0 && <> &nbsp;·&nbsp; {doc.commission}% commission</>}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <RiCheckboxCircleLine size={15} style={{ color: t.accent, flexShrink: 0, marginLeft: 8 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>  // ← closes ref wrapper — everything is inside
    );
}

// ══════════════════════════════════════════════════════════════
// BILLING MODAL
// ══════════════════════════════════════════════════════════════
function BillingModal({ patient, t, isDark, onClose, onBillCreated, initialDoctor }) {
    const [allTests, setAllTests] = useState([]);
    const [testSearch, setTestSearch] = useState("");
    const [testResults, setTestResults] = useState([]);
    const [selectedTests, setSelectedTests] = useState([]);
    const [loadingTests, setLoadingTests] = useState(true);

    const [discountPct, setDiscountPct] = useState(0);
    const [discountAmt, setDiscountAmt] = useState(0);
    const [discountReason, setDiscountReason] = useState("");
    const [isDue, setIsDue] = useState(false);
    const [isZero, setIsZero] = useState(false);
    const [paymentMode, setPaymentMode] = useState("cash");
    const [amountPaid, setAmountPaid] = useState(0);
    const [transactionId, setTransactionId] = useState("");
    const [dispatch, setDispatch] = useState("hardcopy");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const searchRef = useRef();
    const [referringDoctor, setReferringDoctor] = useState(initialDoctor || null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetchVendorTests();
                setAllTests(r.data.tests.filter(t => t.priceSet && t.vendorIsActive));
            } catch { }
            finally { setLoadingTests(false); }
        })();
    }, []);

    useEffect(() => {
        if (!testSearch.trim()) { setTestResults([]); return; }
        const q = testSearch.toLowerCase();
        setTestResults(allTests.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.department?.toLowerCase().includes(q)
        ).slice(0, 8));
    }, [testSearch, allTests]);

    const addTest = (test) => {
        if (selectedTests.find(i => i.testId === test._id)) return;
        setSelectedTests(p => [...p, { testId: test._id, testName: test.name, testCode: test.code, price: test.vendorPrice, discount: 0, isUrgent: false }]);
        setTestSearch(""); setTestResults([]);
        searchRef.current?.focus();
    };

    const removeTest = (id) => setSelectedTests(p => p.filter(i => i.testId !== id));
    const updateItem = (id, k, v) => setSelectedTests(p => p.map(i => i.testId === id ? { ...i, [k]: v } : i));

    const subtotal = selectedTests.reduce((s, i) => s + Math.max(0, i.price - (i.discount || 0)), 0);
    const pctValue = Math.round(subtotal * (Number(discountPct) || 0) / 100);
    const totalDiscount = pctValue + (Number(discountAmt) || 0);
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const due = isZero ? 0 : Math.max(0, grandTotal - (Number(amountPaid) || 0));

    useEffect(() => { if (!isDue && !isZero) setAmountPaid(grandTotal); }, [grandTotal, isDue, isZero]);

    const handleCreateBill = async () => {
        if (selectedTests.length === 0) return;
        try {
            setSaving(true);
            const res = await createBill({
                patientId: patient._id,
                items: selectedTests.map(i => ({ testId: i.testId, discount: i.discount, isUrgent: i.isUrgent })),
                discountPct: Number(discountPct) || 0,
                discountAmt: Number(discountAmt) || 0,
                discountReason,
                paymentMode,
                amountPaid: isZero ? 0 : Number(amountPaid),
                isDuePayment: isDue,
                isZeroAmount: isZero,
                dispatchMethod: dispatch,
                referringDoctorId: referringDoctor?.id || null,
                referringDoctorName: referringDoctor?.name || "",
                notes,
            });
            onBillCreated({
                ...res.data.bill,
                patient: { ...patient, ...res.data.bill.patient },
            });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create bill.");
        } finally { setSaving(false); }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            {showQuickAdd && (
                <QuickAddDoctorModal
                    t={t}
                    onClose={() => setShowQuickAdd(false)}
                    onAdded={(doc) => { setReferringDoctor(doc); setShowQuickAdd(false); }}
                />
            )}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }} />

            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 920, background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, boxShadow: "0 28px 70px rgba(0,0,0,0.45)", maxHeight: "94vh", display: "flex", flexDirection: "column" }}>

                {/* Header */}
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                        <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading }}>Billing</div>
                        <div style={{ fontSize: "0.76rem", color: t.muted, marginTop: 2 }}>
                            {patient.designation} {patient.firstName} {patient.lastName} &nbsp;·&nbsp;
                            ID: <strong style={{ color: t.accent }}>{patient.patientId}</strong> &nbsp;·&nbsp;
                            {patient.age} {patient.ageType} · {patient.gender} &nbsp;·&nbsp; {patient.phone}
                            {patient.referringDoctorName && (
                                <> &nbsp;·&nbsp; Ref: <strong style={{ color: t.accent }}>{patient.referringDoctorName}</strong></>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
                        <RiCloseLine size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 320px" }}>

                    {/* LEFT */}
                    <div style={{ padding: "20px 24px", borderRight: `1px solid ${t.border}` }}>
                        <div style={{ position: "relative", marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "9px 12px" }}>
                                <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
                                <input ref={searchRef} value={testSearch} onChange={e => setTestSearch(e.target.value)} placeholder="Search by test name or code…" autoFocus
                                    style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.86rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                                {loadingTests && <RiLoader4Line size={14} style={{ color: t.faint, animation: "spin .7s linear infinite" }} />}
                            </div>
                            {testResults.length > 0 && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                                    {testResults.map(test => (
                                        <div key={test._id} onClick={() => addTest(test)}
                                            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                            onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <div>
                                                <div style={{ fontSize: "0.86rem", fontWeight: 500, color: t.text }}>{test.name}</div>
                                                <div style={{ fontSize: "0.72rem", color: t.muted, marginTop: 2 }}>{test.code} · {test.department}</div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: t.accent }}>₹{test.vendorPrice}</div>
                                                <div style={{ fontSize: "0.68rem", color: t.faint }}>{test.tat}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {testSearch && testResults.length === 0 && !loadingTests && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, marginTop: 4, padding: "12px 14px", color: t.muted, fontSize: "0.82rem" }}>
                                    No active priced tests found. Set prices in Test Catalogue.
                                </div>
                            )}
                        </div>

                        {selectedTests.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 20px", color: t.faint }}>
                                <RiFileTextLine size={36} style={{ marginBottom: 8 }} />
                                <p style={{ fontSize: "0.84rem", color: t.muted }}>No tests added yet</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "0.4fr 2.5fr 1fr 1fr 0.8fr 0.4fr", gap: 8, padding: "8px 0", fontSize: "0.66rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${t.border}` }}>
                                    <span>Sr.</span><span>Test</span><span>Price</span><span>Discount</span><span>Urgent</span><span />
                                </div>
                                {selectedTests.map((item, i) => (
                                    <div key={item.testId} style={{ display: "grid", gridTemplateColumns: "0.4fr 2.5fr 1fr 1fr 0.8fr 0.4fr", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                                        <span style={{ fontSize: "0.78rem", color: t.muted }}>{i + 1}</span>
                                        <div>
                                            <div style={{ fontSize: "0.84rem", fontWeight: 500, color: t.text }}>{item.testName}</div>
                                            <div style={{ fontSize: "0.7rem", color: t.faint }}>{item.testCode}</div>
                                        </div>
                                        <span style={{ fontSize: "0.86rem", fontWeight: 600, color: t.heading }}>₹{item.price}</span>
                                        <input type="number" min="0" max={item.price} value={item.discount} onChange={e => updateItem(item.testId, "discount", Number(e.target.value))}
                                            style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "5px 8px", color: t.text, fontSize: "0.82rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%" }} />
                                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: "0.78rem", color: t.muted }}>
                                            <input type="checkbox" checked={item.isUrgent} onChange={e => updateItem(item.testId, "isUrgent", e.target.checked)} style={{ accentColor: t.accent }} />
                                            Urgent
                                        </label>
                                        <button onClick={() => removeTest(item.testId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                                            <RiDeleteBinLine size={14} />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
                            <div><Label text="Discount %" t={t} /><input type="number" min="0" max="100" value={discountPct} onChange={e => setDiscountPct(e.target.value)} style={inpCls(t)} /></div>
                            <div><Label text="Discount ₹" t={t} /><input type="number" min="0" value={discountAmt} onChange={e => setDiscountAmt(e.target.value)} style={inpCls(t)} /></div>
                            <div style={{ gridColumn: "1/-1" }}>
                                <Label text="Reason of Discount" t={t} />
                                <input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Optional" style={inpCls(t)} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[["isDue", isDue, setIsDue, "Due Payment"], ["isZero", isZero, setIsZero, "Zero Amount"]].map(([key, val, setter, label]) => (
                                <label key={key} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: val ? t.accentBg : t.inputBg, border: `1px solid ${val ? t.accent : t.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontSize: "0.78rem", color: val ? t.accent : t.navText, fontWeight: val ? 600 : 400 }}>
                                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} style={{ accentColor: t.accent }} />{label}
                                </label>
                            ))}
                        </div>

                        <div>
                            <ReferralDoctorDropdown
                                t={t}
                                value={referringDoctor}
                                onChange={setReferringDoctor}
                                onQuickAdd={() => setShowQuickAdd(true)}
                            />
                        </div>

                        <div>
                            <Label text="Payment Mode" t={t} />
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {PAYMENT_MODES.map(m => (
                                    <button key={m} type="button" onClick={() => setPaymentMode(m)}
                                        style={{ padding: "6px 11px", borderRadius: 8, border: `1px solid ${paymentMode === m ? t.accent : t.border}`, background: paymentMode === m ? t.accentBg : "none", color: paymentMode === m ? t.accent : t.navText, fontSize: "0.76rem", fontWeight: paymentMode === m ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                        {m.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!isDue && !isZero && (
                            <div><Label text="Amount Paid (₹)" t={t} /><input type="number" min="0" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={inpCls(t)} /></div>
                        )}

                        {paymentMode !== "cash" && paymentMode !== "due" && (
                            <div><Label text="Transaction ID" t={t} /><input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Optional" style={inpCls(t)} /></div>
                        )}

                        <div>
                            <Label text="Dispatch Method" t={t} />
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {DISPATCH_OPTS.map(d => (
                                    <button key={d} type="button" onClick={() => setDispatch(d)}
                                        style={{ padding: "6px 11px", borderRadius: 8, border: `1px solid ${dispatch === d ? t.accent : t.border}`, background: dispatch === d ? t.accentBg : "none", color: dispatch === d ? t.accent : t.navText, fontSize: "0.76rem", fontWeight: dispatch === d ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div><Label text="Notes" t={t} /><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note…" style={{ ...inpCls(t), resize: "none" }} /></div>

                        <div style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginTop: "auto" }}>
                            <div className="playfair" style={{ fontSize: "0.88rem", fontWeight: 700, color: t.heading, marginBottom: 10 }}>Summary</div>
                            {[
                                { label: "Amount", value: `₹${subtotal}` },
                                { label: "Discount", value: `-₹${totalDiscount}`, color: "#dc2626" },
                                { label: "Total Amount", value: `₹${grandTotal}`, bold: true },
                                { label: "Amount Paid", value: `₹${isZero ? 0 : (Number(amountPaid) || 0)}` },
                                { label: "Due Amount", value: `₹${due}`, color: due > 0 ? "#dc2626" : "#16a34a" },
                            ].map(r => (
                                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: r.bold ? "0.9rem" : "0.82rem", fontWeight: r.bold ? 700 : 400 }}>
                                    <span style={{ color: t.muted }}>{r.label}</span>
                                    <span style={{ color: r.color || (r.bold ? t.heading : t.text), fontWeight: r.bold ? 700 : 500 }}>{r.value}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleCreateBill} disabled={saving || selectedTests.length === 0}
                            style={{ padding: "12px", borderRadius: 10, border: "none", background: selectedTests.length === 0 ? t.border : t.accent, color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: selectedTests.length === 0 ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}>
                            {saving
                                ? <><RiLoader4Line size={15} style={{ animation: "spin .7s linear infinite" }} /> Creating…</>
                                : <><RiPrinterLine size={15} /> Register and Print Bill</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// MAIN — NEW REGISTRATION
// ══════════════════════════════════════════════════════════════
export default function BillRegistration({ t, isDark }) {
    const [form, setForm] = useState({
        designation: "MR.", firstName: "", lastName: "",
        gender: "male", age: "", ageType: "year",
        phone: "", email: "", address: "",
        ownerName: "",
    });
    // ✅ Referring doctor stored separately as {id, name, degree} | null
    const [referringDoctor, setReferringDoctor] = useState(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [patient, setPatient] = useState(null);
    const [showBilling, setShowBilling] = useState(false);
    const [billDone, setBillDone] = useState(null);
    const [toast, setToast] = useState({ msg: "", type: "" });

    const [vendor, setVendor] = useState({
        name: localStorage.getItem("name") || "",
        businessName: localStorage.getItem("businessName") || "",
        logoUrl: localStorage.getItem("logoUrl") || "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchProfile();
                setVendor(v => ({ ...v, ...res.data.user }));
            } catch {
                console.log("PROFILE FETCH ERROR:", err);
            }
        })();
    }, []);
    // Patient search
    const [patientSearch, setPatientSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef();

    useEffect(() => {
        if (!patientSearch.trim()) { setSearchResults([]); return; }
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            try {
                setSearching(true);
                const r = await searchPatients(patientSearch);
                setSearchResults(r.data.patients);
            } catch { } finally { setSearching(false); }
        }, 400);
    }, [patientSearch]);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

    const resetForm = () => {
        setForm({ designation: "MR.", firstName: "", lastName: "", gender: "male", age: "", ageType: "year", phone: "", email: "", address: "", ownerName: "" });
        setReferringDoctor(null);
        setErrors({});
        setPatient(null);
        setPatientSearch("");
        setSearchResults([]);
        setBillDone(null);
    };

    const handleRegister = async () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = "First name is required.";
        if (!form.age || isNaN(form.age)) errs.age = "Valid age is required.";
        if (!form.phone.trim()) errs.phone = "Mobile number is required.";
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        try {
            setSaving(true);
            // ✅ Send referringDoctorId + referringDoctorName to backend
            const payload = {
                ...form,
                referringDoctorId: referringDoctor?.id || null,
                referringDoctorName: referringDoctor?.name || "",
            };
            const res = await createPatient(payload);
            setPatient(res.data.patient);
            setToast({ msg: `Patient registered — ID: ${res.data.patient.patientId}`, type: "success" });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setErrors(data.errors);
            setToast({ msg: data?.message || "Registration failed.", type: "error" });
        } finally { setSaving(false); }
    };

    const handleGoToBilling = () => {
        if (!patient) { setToast({ msg: "Register patient first.", type: "error" }); return; }
        setShowBilling(true);
    };

    const handleBillCreated = (bill) => {
        setShowBilling(false);
        setBillDone(bill);
        setToast({ msg: `Bill ${bill.billNumber} created!`, type: "success" });
    };

    const selectExistingPatient = (p) => {
        setPatient(p);
        // Pre-fill referring doctor if patient already has one
        if (p.referringDoctorId) {
            setReferringDoctor({
                id: p.referringDoctorId.toString(),   // ← normalize
                name: p.referringDoctorName || "",
                degree: ""
            });
        }
        setPatientSearch(""); setSearchResults([]);
        setToast({ msg: `Patient ${p.patientId} loaded.`, type: "success" });
    };

    return (
        <div>

            <style>{`
    @keyframes spin { to { transform: rotate(360deg); } }
    select option { background: #0f172a !important; color: #e2e8f0 !important; }
    select:focus { outline: none; }
`}</style>

            <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />

            {showBilling && patient && (
                <>
                    <BillingModal patient={patient} t={t} isDark={isDark}
                        onClose={() => setShowBilling(false)}
                        onBillCreated={handleBillCreated}
                        initialDoctor={referringDoctor} />
                </>
            )}

            {showQuickAdd && (
                <QuickAddDoctorModal
                    t={t}
                    onClose={() => setShowQuickAdd(false)}
                    onAdded={(doc) => { setReferringDoctor(doc); setShowQuickAdd(false); }}
                />
            )}

            {billDone && (
                <BillReceipt
                    bill={billDone}
                    vendor={{ ...vendor, ...billDone.vendor }}
                    onClose={() => { setBillDone(null); resetForm(); }} />
            )}

            {/* Page header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>New Registration</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Register a new patient and generate a bill.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={resetForm} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.accentBg2, color: t.muted, fontSize: "0.84rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiResetLeftLine size={14} /> Reset Form
                    </button>
                    <button onClick={handleGoToBilling} disabled={!patient}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: "none", background: patient ? t.accent : t.border, color: "#fff", fontSize: "0.86rem", fontWeight: 600, cursor: patient ? "pointer" : "not-allowed", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiArrowRightLine size={14} /> Go to Billing
                    </button>
                </div>
            </div>

            {/* Search existing patient */}
            <div style={{ marginBottom: 20, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "9px 14px" }}>
                    <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
                    <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                        placeholder="Search existing patient by phone, name or ID…"
                        style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.86rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                    {searching && <RiLoader4Line size={14} style={{ color: t.faint, animation: "spin .7s linear infinite" }} />}
                </div>
                {searchResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                        {searchResults.map(p => (
                            <div key={p._id} onClick={() => selectExistingPatient(p)}
                                style={{ padding: "10px 16px", cursor: "pointer", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <div>
                                    <div style={{ fontSize: "0.86rem", fontWeight: 500, color: t.text }}>{p.firstName} {p.lastName}</div>
                                    <div style={{ fontSize: "0.72rem", color: t.muted }}>{p.patientId} · {p.phone} · {p.age} yr · {p.gender}</div>
                                </div>
                                <RiArrowRightLine size={14} style={{ color: t.faint }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registered banner */}
            {patient && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                    <RiCheckboxCircleLine size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#16a34a" }}>Patient Registered</div>
                        <div style={{ fontSize: "0.78rem", color: t.muted, marginTop: 2 }}>
                            ID: <strong>{patient.patientId}</strong> · {patient.firstName} {patient.lastName} · {patient.age} {patient.ageType} · {patient.phone}
                            {referringDoctor && <> · Ref: <strong style={{ color: t.accent }}>{referringDoctor.name}</strong></>}
                        </div>
                    </div>
                    <button onClick={handleGoToBilling} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "none", background: "#16a34a", color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiArrowRightLine size={13} /> Go to Billing
                    </button>
                </div>
            )}

            {/* Registration Form */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28 }}>

                {/* Row 1: Designation + Name + Age */}
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 100px 100px", gap: 14, marginBottom: 16 }}>
                    <div>
                        <Label text="Designation" t={t} />
                        <CustomSelect
                            t={t}
                            value={form.designation}
                            onChange={val => set("designation", val)}
                            options={DESIGNATIONS}
                        // label="Designation"
                        />
                    </div>
                    <div>
                        <Label text="First Name" t={t} required />
                        <input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="First name" style={inpCls(t, errors.firstName)} />
                        <FieldErr msg={errors.firstName} />
                    </div>
                    <div>
                        <Label text="Last Name" t={t} />
                        <input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Last name" style={inpCls(t)} />
                    </div>
                    <div>
                        <Label text="Age" t={t} required />
                        <input type="number" min="0" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Age" style={inpCls(t, errors.age)} />
                        <FieldErr msg={errors.age} />
                    </div>
                    <div>
                        <Label text="Age Type" t={t} />
                        <CustomSelect
                            t={t}
                            value={form.ageType}
                            onChange={val => set("ageType", val)}
                            options={AGE_TYPES.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
                        // label="Age Type"y
                        />
                    </div>
                </div>

                {/* Row 2: Gender */}
                <div style={{ marginBottom: 16 }}>
                    <Label text="Gender" t={t} required />
                    <div style={{ display: "flex", gap: 20 }}>
                        {GENDERS.map(g => (
                            <label key={g} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.88rem", color: t.text }}>
                                <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set("gender", g)} style={{ accentColor: t.accent }} />
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Row 3: Phone + Email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    <div>
                        <Label text="Phone Number" t={t} required />
                        <div style={{ position: "relative" }}>
                            <RiPhoneLine size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.phone ? "#ef4444" : t.accent }} />
                            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" style={{ ...inpCls(t, errors.phone), paddingLeft: 34 }} />
                        </div>
                        <FieldErr msg={errors.phone} />
                    </div>
                    <div>
                        <Label text="Email" t={t} />
                        <div style={{ position: "relative" }}>
                            <RiMailLine size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.accent }} />
                            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="patient@email.com" style={{ ...inpCls(t), paddingLeft: 34 }} />
                        </div>
                    </div>
                </div>

                {/* Row 4: Owner Name + Referring Doctor Dropdown */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    <div>
                        <Label text="Owner Name" t={t} />
                        <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="Enter owner name" style={inpCls(t)} />
                    </div>
                    <div>
                        {/* ✅ Referral Doctor Dropdown */}
                        <ReferralDoctorDropdown
                            t={t}
                            value={referringDoctor}
                            onChange={setReferringDoctor}
                            error={errors.referringDoctor}
                            onQuickAdd={() => setShowQuickAdd(true)}
                        />
                    </div>
                </div>

                {/* Row 5: Address */}
                <div style={{ marginBottom: 20 }}>
                    <Label text="Address" t={t} />
                    <div style={{ position: "relative" }}>
                        <RiMapPinLine size={14} style={{ position: "absolute", left: 12, top: 13, color: t.accent }} />
                        <textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Enter address" style={{ ...inpCls(t), paddingLeft: 34, resize: "none" }} />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.78rem", color: t.muted }}>
                        Patient ID: <strong style={{ color: t.heading }}>{patient?.patientId || "Auto-generated"}</strong>
                    </div>
                    <button onClick={handleRegister} disabled={saving || !!patient}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 10, border: "none", background: patient ? t.border : t.accent, color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: (saving || patient) ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.7 : 1 }}>
                        {saving
                            ? <><RiLoader4Line size={15} style={{ animation: "spin .7s linear infinite" }} /> Registering…</>
                            : <><RiUserAddLine size={15} /> Register Patient</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}