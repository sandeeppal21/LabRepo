// components/vendor/VendorReferrals.jsx
// Referral Doctor / Hospital / TPA etc. management
// Uses referralService.js — zero dummy data

import { useState, useEffect, useCallback } from "react";
import {
    RiUserHeartLine, RiAddLine, RiSearchLine,
    RiDownloadLine, RiUploadCloud2Line, RiEditLine,
    RiDeleteBinLine, RiPhoneLine, RiPercentLine,
    RiBuilding2Line, RiCloseLine, RiCheckLine,
    RiArrowLeftLine, RiArrowRightLine, RiStethoscopeLine,
    RiHospitalLine, RiGroupLine, RiGovernmentLine,
    RiDropLine, RiErrorWarningLine, RiLoader4Line,
    RiGraduationCapLine, RiMailLine,
} from "react-icons/ri";

import {
    fetchReferrals,
    createReferral,
    updateReferral,
    deleteReferral,
} from "../../../services/referralService";

// ── Tab config ────────────────────────────────────────────────
const TABS = [
    { key: "doctor", label: "Referring Doctor", Icon: RiStethoscopeLine },
    { key: "hospital", label: "Referring Hospital", Icon: RiHospitalLine },
    // { key: "second_referral", label: "Second Referral", Icon: RiGroupLine },
    { key: "tpa", label: "TPA", Icon: RiBuilding2Line },
    { key: "government", label: "Government Panel", Icon: RiGovernmentLine },
    { key: "phlebotomist", label: "Phlebotomist", Icon: RiDropLine },
];

const EMPTY_FORM = {
    name: "", phone: "", degree: "",
    commission: "", email: "", b2b: "",
};

// ── Validation ────────────────────────────────────────────────
const validateForm = (f) => {
    const e = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!f.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(f.phone.trim())) e.phone = "Must be exactly 10 digits";
    if (f.commission !== "" && f.commission !== null) {
        const c = Number(f.commission);
        if (isNaN(c) || c < 0 || c > 100) e.commission = "Must be between 0 and 100";
    }
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        e.email = "Invalid email address";
    return e;
};

// ════════════════════════════════════════════════════════════
export default function VendorReferrals({ t, isDark }) {
    const [activeTab, setActiveTab] = useState("doctor");
    const [entries, setEntries] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, pageSize: 10 });
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    // Modal
    const [modal, setModal] = useState(null); // null | "add" | "edit"
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErr, setFormErr] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [deleting, setDeleting] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Search debounce 350 ms ───────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Reset page on tab/search change
    useEffect(() => { setPage(1); }, [activeTab, search]);

    // ── Fetch ────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setApiError("");
        try {
            const res = await fetchReferrals({ category: activeTab, page, search });
            setEntries(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            setApiError(err.response?.data?.message || err.message);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, search]);

    useEffect(() => { load(); }, [load]);

    // ── Modal helpers ────────────────────────────────────────
    const openAdd = () => {
        setForm(EMPTY_FORM);
        setFormErr({});
        setSaveError("");
        setModal("add");
    };

    const openEdit = (entry) => {
        setEditTarget(entry);
        setForm({
            name: entry.name || "",
            phone: entry.phone || "",
            degree: entry.degree || "",
            commission: entry.commission ?? "",
            email: entry.email || "",
            b2b: entry.b2b || "",
        });
        setFormErr({});
        setSaveError("");
        setModal("edit");
    };

    const closeModal = () => { setModal(null); setEditTarget(null); };

    const setField = (key, val) => {
        setForm(f => ({ ...f, [key]: val }));
        setFormErr(e => ({ ...e, [key]: undefined }));
    };

    // ── Save ─────────────────────────────────────────────────
    const handleSave = async () => {
        const errs = validateForm(form);
        if (Object.keys(errs).length) { setFormErr(errs); return; }

        setSaving(true);
        setSaveError("");
        try {
            const payload = {
                category: activeTab,
                name: form.name.trim().toUpperCase(),
                phone: form.phone.trim(),
                degree: form.degree.trim(),
                commission: form.commission !== "" ? Number(form.commission) : 0,
                email: form.email.trim().toLowerCase(),
                b2b: form.b2b.trim(),
            };

            if (modal === "add") {
                await createReferral(payload);
                showToast("Entry added successfully");
            } else {
                await updateReferral(editTarget._id, payload);
                showToast("Entry updated successfully");
            }
            closeModal();
            load();
        } catch (err) {
            setSaveError(err.response?.data?.message || err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteReferral(deleteTarget.id, activeTab);
            showToast("Entry deleted", "error");
            setDeleteTarget(null);
            load();
        } catch (err) {
            showToast(err.response?.data?.message || err.message, "error");
        } finally {
            setDeleting(false);
        }
    };

    // ── Styles ───────────────────────────────────────────────
    const inputStyle = (hasErr) => ({
        width: "100%", background: t.inputBg,
        border: `1.5px solid ${hasErr ? "#ef4444" : t.accentRing}`,
        borderRadius: 10, padding: "10px 13px", color: t.text,
        fontSize: "0.87rem", fontFamily: "'DM Sans',sans-serif",
        outline: "none", transition: "border-color .15s",
    });

    const ghostBtn = {
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 9,
        border: `1px solid ${t.accentRing}`, background: t.accentBg,
        color: t.accent, fontSize: "0.78rem", fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
    };

    const activeCatLabel = TABS.find(tb => tb.key === activeTab)?.label || "";

    // ════════════════════════════════════════════════════════
    return (
        <div style={{ position: "relative" }}>

            {/* ── Toast ── */}
            {toast && (
                <div style={{ position: "fixed", top: 80, right: 28, zIndex: 999, backdropFilter: "blur(14px)", borderRadius: 12, padding: "12px 20px", fontSize: "0.84rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.22)", background: toast.type === "error" ? "rgba(239,68,68,.1)" : "rgba(56,189,248,.1)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,.3)" : t.accentRing}`, color: toast.type === "error" ? "#ef4444" : t.accent }}>
                    {toast.type === "error" ? <RiDeleteBinLine size={14} /> : <RiCheckLine size={14} />}
                    {toast.msg}
                </div>
            )}

            {/* ── Page heading ── */}
            <div style={{ marginBottom: 22 }}>
                <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>
                    Referral Management
                </h2>
                <p style={{ fontSize: "0.84rem", color: t.muted }}>
                    Manage all referring doctors, hospitals, TPA panels and phlebotomists.
                </p>
            </div>

            {/* ── Category tabs ── */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 12, padding: 5, width: "fit-content", flexWrap: "wrap" }}>
                {TABS.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", transition: "all .18s", background: activeTab === key ? t.accent : "transparent", color: activeTab === key ? "#fff" : t.muted }}>
                        <Icon size={14} />{label}
                    </button>
                ))}
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 13px", minWidth: 260 }}>
                    <RiSearchLine size={14} style={{ color: t.faint }} />
                    <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by name or phone…" style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                    {searchInput && (
                        <button onClick={() => setSearchInput("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}>
                            <RiCloseLine size={14} />
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                    <button style={ghostBtn}><RiDownloadLine size={14} /> Export</button>
                    <button style={ghostBtn}><RiUploadCloud2Line size={14} /> Bulk Upload</button>
                    <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 9, border: "none", background: t.accent, color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: `0 0 18px ${t.accent}44` }}>
                        <RiAddLine size={15} /> Add
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>

                {/* Header row */}
                <div style={{ display: "grid", gridTemplateColumns: "52px 2fr 1.3fr 1.4fr 1fr 1.6fr 1.1fr 100px", padding: "10px 20px", background: t.accentBg, borderBottom: `1px solid ${t.border}`, fontSize: "0.67rem", fontWeight: 700, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    <span>Sr.</span>
                    <span>Name</span>
                    <span>Phone</span>
                    <span>Degree</span>
                    <span>Comm %</span>
                    <span>Email</span>
                    <span>B2B</span>
                    <span>Actions</span>
                </div>

                {/* Error state */}
                {apiError && (
                    <div style={{ padding: "28px 20px", textAlign: "center", color: "#ef4444", fontSize: "0.84rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <RiErrorWarningLine size={16} /> {apiError}
                    </div>
                )}

                {/* Loading */}
                {loading && !apiError && (
                    <div style={{ padding: "44px 20px", textAlign: "center", color: t.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: "0.88rem" }}>
                        <RiLoader4Line size={20} style={{ color: t.accent, animation: "spin 1s linear infinite" }} />
                        Loading records…
                        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}

                {/* Empty */}
                {!loading && !apiError && entries.length === 0 && (
                    <div style={{ padding: "56px 20px", textAlign: "center" }}>
                        <RiUserHeartLine size={40} style={{ color: t.accent, opacity: 0.3, margin: "0 auto 14px", display: "block" }} />
                        <p style={{ fontWeight: 700, color: t.heading, fontSize: "0.96rem", marginBottom: 6 }}>No records found</p>
                        <p style={{ fontSize: "0.8rem", color: t.muted }}>
                            {search ? `No results for "${search}"` : `Add your first ${activeCatLabel} using the + Add button.`}
                        </p>
                    </div>
                )}

                {/* Data rows */}
                {!loading && !apiError && entries.map((entry, i) => (
                    <div key={entry._id}
                        onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        style={{ display: "grid", gridTemplateColumns: "52px 2fr 1.3fr 1.4fr 1fr 1.6fr 1.1fr 100px", padding: "13px 20px", borderBottom: i < entries.length - 1 ? `1px solid ${t.border}` : "none", fontSize: "0.84rem", alignItems: "center", transition: "background .12s" }}>

                        {/* Sr */}
                        <span style={{ fontSize: "0.74rem", color: t.faint, fontWeight: 600 }}>
                            {(pagination.page - 1) * pagination.pageSize + i + 1}
                        </span>

                        {/* Name */}
                        <span style={{ fontWeight: 700, color: t.heading, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.name}
                        </span>

                        {/* Phone */}
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: t.text, fontSize: "0.82rem" }}>
                            <RiPhoneLine size={12} style={{ color: t.accent, flexShrink: 0 }} />
                            {entry.phone}
                        </span>

                        {/* Degree */}
                        <span style={{ color: t.muted, fontSize: "0.79rem" }}>
                            {entry.degree
                                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: t.accentBg, color: t.accent, fontWeight: 600, fontSize: "0.75rem" }}>
                                    <RiGraduationCapLine size={11} />{entry.degree}
                                </span>
                                : <span style={{ color: t.faint, fontStyle: "italic" }}>—</span>
                            }
                        </span>

                        {/* Commission */}
                        <span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: entry.commission > 0 ? "rgba(56,189,248,.12)" : t.accentBg, color: entry.commission > 0 ? t.accent : t.muted }}>
                                <RiPercentLine size={10} />{entry.commission}
                            </span>
                        </span>

                        {/* Email */}
                        <span style={{ color: t.muted, fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.email || <span style={{ color: t.faint, fontStyle: "italic" }}>—</span>}
                        </span>

                        {/* B2B */}
                        <span style={{ color: t.muted, fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.b2b || <span style={{ color: t.faint, fontStyle: "italic" }}>—</span>}
                        </span>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEdit(entry)} title="Edit"
                                style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, color: t.accent, borderRadius: 8, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                                onMouseEnter={e => e.currentTarget.style.opacity = ".7"}
                                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                                <RiEditLine size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget({ id: entry._id, name: entry.name })} title="Delete"
                                style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", borderRadius: 8, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                                onMouseEnter={e => e.currentTarget.style.opacity = ".7"}
                                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                                <RiDeleteBinLine size={13} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Pagination */}
                {!loading && pagination.pages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${t.border}`, background: t.accentBg }}>
                        <span style={{ fontSize: "0.75rem", color: t.muted }}>
                            Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                        </span>
                        <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ background: "transparent", border: `1px solid ${t.border}`, color: page === 1 ? t.faint : t.accent, borderRadius: 7, padding: "5px 9px", cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
                                <RiArrowLeftLine size={13} />
                            </button>
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ background: page === p ? t.accent : "transparent", border: `1px solid ${page === p ? t.accent : t.border}`, color: page === p ? "#fff" : t.muted, borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: "0.77rem", fontWeight: 600 }}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                                style={{ background: "transparent", border: `1px solid ${t.border}`, color: page === pagination.pages ? t.faint : t.accent, borderRadius: 7, padding: "5px 9px", cursor: page === pagination.pages ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
                                <RiArrowRightLine size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ══ ADD / EDIT MODAL ════════════════════════════════ */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 520, padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,0.4)", maxHeight: "90vh", overflowY: "auto" }}>

                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <div>
                                <h3 className="playfair" style={{ fontSize: "1.2rem", fontWeight: 700, color: t.heading }}>
                                    {modal === "add" ? "Add" : "Edit"} {activeCatLabel}
                                </h3>
                                <p style={{ fontSize: "0.74rem", color: t.muted, marginTop: 3 }}>
                                    <span style={{ color: "#ef4444" }}>*</span> required fields
                                </p>
                            </div>
                            <button onClick={closeModal} style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, color: t.muted, borderRadius: 9, width: 33, height: 33, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <RiCloseLine size={16} />
                            </button>
                        </div>

                        {/* Form fields */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

                            {/* Name */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    Full Name / Clinic Name <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. DR. AMIT SINGH" style={inputStyle(formErr.name)} />
                                {formErr.name && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4 }}><RiErrorWarningLine size={11} style={{ verticalAlign: "middle" }} /> {formErr.name}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    Phone Number <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <div style={{ position: "relative" }}>
                                    <RiPhoneLine size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                                    <input type="tel" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="10-digit number" maxLength={10} style={{ ...inputStyle(formErr.phone), paddingLeft: 34 }} />
                                </div>
                                {formErr.phone && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4 }}><RiErrorWarningLine size={11} style={{ verticalAlign: "middle" }} /> {formErr.phone}</p>}
                            </div>

                            {/* Degree */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    Degree / Qualification
                                </label>
                                <div style={{ position: "relative" }}>
                                    <RiGraduationCapLine size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                                    <input value={form.degree} onChange={e => setField("degree", e.target.value)} placeholder="e.g. MBBS, MD, BDS" style={{ ...inputStyle(false), paddingLeft: 34 }} />
                                </div>
                            </div>

                            {/* Commission */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    Commission (%)
                                </label>
                                <div style={{ position: "relative" }}>
                                    <RiPercentLine size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                                    <input type="number" min="0" max="100" value={form.commission} onChange={e => setField("commission", e.target.value)} placeholder="0 – 100" style={{ ...inputStyle(formErr.commission), paddingLeft: 34 }} />
                                </div>
                                {formErr.commission && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4 }}><RiErrorWarningLine size={11} style={{ verticalAlign: "middle" }} /> {formErr.commission}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    Email Address
                                </label>
                                <div style={{ position: "relative" }}>
                                    <RiMailLine size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                                    <input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="doctor@clinic.in" style={{ ...inputStyle(formErr.email), paddingLeft: 34 }} />
                                </div>
                                {formErr.email && <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4 }}><RiErrorWarningLine size={11} style={{ verticalAlign: "middle" }} /> {formErr.email}</p>}
                            </div>

                            {/* B2B */}
                            <div>
                                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                                    B2B Center
                                </label>
                                <div style={{ position: "relative" }}>
                                    <RiBuilding2Line size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.faint }} />
                                    <input value={form.b2b} onChange={e => setField("b2b", e.target.value)} placeholder="B2B center name" style={{ ...inputStyle(false), paddingLeft: 34 }} />
                                </div>
                            </div>
                        </div>

                        {/* API error */}
                        {saveError && (
                            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 9, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.22)", color: "#ef4444", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 8 }}>
                                <RiErrorWarningLine size={14} /> {saveError}
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                            <button onClick={closeModal} style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ padding: "9px 26px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: saving ? 0.72 : 1, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 0 20px ${t.accent}44` }}>
                                {saving
                                    ? <><RiLoader4Line size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                                    : <><RiCheckLine size={14} /> {modal === "add" ? "Add Entry" : "Save Changes"}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ DELETE CONFIRM ══════════════════════════════════ */}
            {deleteTarget && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
                    <div style={{ background: t.card, border: "1px solid rgba(239,68,68,.28)", borderRadius: 18, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(239,68,68,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#ef4444" }}>
                            <RiDeleteBinLine size={26} />
                        </div>
                        <h3 className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: t.heading, marginBottom: 8 }}>
                            Delete Entry?
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: t.muted, marginBottom: 4 }}>
                            <strong style={{ color: t.heading }}>{deleteTarget.name}</strong>
                        </p>
                        <p style={{ fontSize: "0.78rem", color: t.faint, marginBottom: 28 }}>
                            This entry will be removed from the referral list.
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <button onClick={() => setDeleteTarget(null)}
                                style={{ padding: "9px 22px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", opacity: deleting ? 0.72 : 1 }}>
                                {deleting ? "Deleting…" : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}