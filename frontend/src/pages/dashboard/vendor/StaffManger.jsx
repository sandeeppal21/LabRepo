import { useState, useRef } from "react";
import {
    RiStethoscopeLine, RiGraduationCapLine, RiAlertLine,
    RiSaveLine, RiLoader4Line, RiUploadCloud2Line, RiImageLine,
    RiDeleteBinLine, RiAddLine, RiCloseLine, RiPencilLine,
    RiCheckboxCircleLine, RiUserHeartLine,
} from "react-icons/ri";
import { addStaffMember, updateStaffMember, deleteStaffMember } from "../../../services/profileService";

// ── Shared input style (mirrors VendorProfile's inp()) ──────
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

function Label({ text, required }) {
    return (
        <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            {text}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
        </label>
    );
}

function FieldError({ msg }) {
    if (!msg) return null;
    return <p style={{ fontSize: "0.71rem", color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><RiAlertLine size={11} /> {msg}</p>;
}

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

// ── One staff card in the list (view mode) ───────────────────
function StaffCard({ member, t, isDark, onEdit, onDelete, deleting }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 12, padding: "12px 14px" }}>
            {/* <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${t.accentRing}`, background: member.signatureUrl ? "#fff" : t.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {member.signatureUrl
                    ? <img src={member.signatureUrl} alt="Signature" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                    : (member.role === "technician" ? <RiUserHeartLine size={18} style={{ color: t.faint }} /> : <RiStethoscopeLine size={18} style={{ color: t.faint }} />)
                }
            </div> */}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {member.role === "technician" ? "" : "Dr. "}{member.name}
                </div>
                <div style={{ fontSize: "0.73rem", color: t.muted, marginTop: 2 }}>
                    {member.degree || (member.role === "technician" ? "Lab Technician" : "—")}
                    {member.notes && <span> · {member.notes}</span>}
                </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={() => onEdit(member)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: t.card, border: `1px solid ${t.accentRing}`, color: t.accent, cursor: "pointer" }}>
                    <RiPencilLine size={13} />
                </button>
                <button type="button" onClick={() => onDelete(member._id)} disabled={deleting}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                    {deleting ? <RiLoader4Line size={13} style={{ animation: "spin .7s linear infinite" }} /> : <RiDeleteBinLine size={13} />}
                </button>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
export default function StaffManager({ staff = [], t, isDark, onStaffUpdated }) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = adding new
    const [deletingId, setDeletingId] = useState(null);

    const [form, setForm] = useState({ name: "", degree: "", role: "doctor", notes: "" });
    const [sigFile, setSigFile] = useState(null);
    const [sigPreview, setSigPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({ msg: "", type: "" });
    const sigRef = useRef();

    const resetForm = () => {
        setForm({ name: "", degree: "", role: "doctor", notes: "" });
        setSigFile(null);
        setSigPreview(null);
        setErrors({});
        setEditingId(null);
    };

    const openAdd = () => {
        resetForm();
        setFormOpen(true);
    };

    const openEdit = (member) => {
        setForm({ name: member.name || "", degree: member.degree || "", role: member.role || "doctor", notes: member.notes || "" });
        setSigPreview(member.signatureUrl || null);
        setSigFile(null);
        setErrors({});
        setEditingId(member._id);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        resetForm();
    };

    const handleSigChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 50 * 1024) {
            setToast({ msg: "Signature must be under 50 KB. Please compress and retry.", type: "error" });
            e.target.value = ""; return;
        }
        setSigFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setSigPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); setToast({ msg: "", type: "" });

        const errs = {};
        if (!form.name.trim()) errs.name = "Name is required.";
        if (Object.keys(errs).length) { setErrors(errs); return; }

        try {
            setSaving(true);
            const res = editingId
                ? await updateStaffMember(editingId, form, sigFile)
                : await addStaffMember(form, sigFile);
            onStaffUpdated(res.data.user.staff || []);
            setToast({ msg: editingId ? "Staff member updated." : "Staff member added.", type: "success" });
            closeForm();
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setErrors(data.errors);
            setToast({ msg: data?.message || "Save failed.", type: "error" });
        } finally { setSaving(false); }
    };

    const handleDelete = async (staffId) => {
        if (!window.confirm("Remove this staff member? Their signature file will also be deleted.")) return;
        try {
            setDeletingId(staffId);
            const res = await deleteStaffMember(staffId);
            onStaffUpdated(res.data.user.staff || []);
            setToast({ msg: "Staff member removed.", type: "success" });
        } catch (err) {
            setToast({ msg: err.response?.data?.message || "Delete failed.", type: "error" });
        } finally { setDeletingId(null); }
    };

    return (
        <div>
            <Toast msg={toast.msg} type={toast.type} />

            {/* ── Existing staff list ─────────────────────────── */}
            {staff.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {staff.map((member) => (
                        <StaffCard
                            key={member._id}
                            member={member}
                            t={t}
                            isDark={isDark}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            deleting={deletingId === member._id}
                        />
                    ))}
                </div>
            )}

            {staff.length === 0 && !formOpen && (
                <div style={{ textAlign: "center", padding: "20px 10px", color: t.muted, fontSize: "0.83rem" }}>
                    No doctors or technicians added yet.
                </div>
            )}

            {/* ── Add button / inline form ────────────────────── */}
            {!formOpen ? (
                <button type="button" onClick={openAdd}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", background: t.accentBg, border: `1.5px dashed ${t.accentRing}`, borderRadius: 10, padding: "11px 15px", color: t.accent, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    <RiAddLine size={16} /> Add Doctor / Technician
                </button>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: t.heading }}>
                            {editingId ? "Edit Staff Member" : "New Staff Member"}
                        </span>
                        <button type="button" onClick={closeForm}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, background: t.card, border: `1px solid ${t.accentRing}`, color: t.muted, cursor: "pointer" }}>
                            <RiCloseLine size={14} />
                        </button>
                    </div>

                    {/* Role toggle */}
                    <div>
                        <Label text="Role" />
                        <div style={{ display: "flex", gap: 8 }}>
                            {["doctor", "technician"].map((r) => (
                                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                                    style={{
                                        flex: 1, padding: "8px 12px", borderRadius: 9, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                                        fontFamily: "'DM Sans',sans-serif",
                                        background: form.role === r ? t.accent : t.card,
                                        color: form.role === r ? "#fff" : t.muted,
                                        border: `1.5px solid ${form.role === r ? t.accent : t.accentRing}`,
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    }}>
                                    {r === "doctor" ? <RiStethoscopeLine size={13} /> : <RiUserHeartLine size={13} />}
                                    {r === "doctor" ? "Doctor" : "Technician"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label text="Name" required />
                        <div style={{ position: "relative" }}>
                            <RiStethoscopeLine size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.name ? "#ef4444" : t.accent }} />
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder={form.role === "technician" ? "Ravi Kumar" : "Dr. Anil Kumar"}
                                style={{ ...inp(t, errors.name), paddingLeft: 34 }} />
                        </div>
                        <FieldError msg={errors.name} />
                    </div>

                    <div>
                        <Label text="Degree / Qualification" />
                        <div style={{ position: "relative" }}>
                            <RiGraduationCapLine size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: errors.degree ? "#ef4444" : t.accent }} />
                            <input value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}
                                placeholder={form.role === "technician" ? "DMLT, BMLT" : "MBBS, MD (Pathology)"}
                                style={{ ...inp(t, errors.degree), paddingLeft: 34 }} />
                        </div>
                        <FieldError msg={errors.degree} />
                    </div>

                    <div>
                        <Label text="Designation (optional)" />
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="e.g. Consultant Pathologist, Lab Director"
                            style={inp(t, errors.notes)} />
                        <FieldError msg={errors.notes} />
                    </div>

                    {/* Signature upload */}
                    <div>
                        <Label text="Signature" />
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", border: `2px solid ${t.accentRing}`, background: sigPreview ? "#fff" : t.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {sigPreview
                                    ? <img src={sigPreview} alt="Signature" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }} />
                                    : <RiImageLine size={18} style={{ color: t.faint }} />
                                }
                            </div>
                            <input ref={sigRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleSigChange} />
                            <button type="button" onClick={() => sigRef.current?.click()}
                                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: t.card, border: `1.5px dashed ${t.accentRing}`, borderRadius: 9, padding: "8px 15px", color: t.accent, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                <RiUploadCloud2Line size={13} /> {sigFile?.name || "Upload"}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: t.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                        {saving
                            ? <><RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> Saving…</>
                            : <><RiSaveLine size={14} /> {editingId ? "Update Member" : "Add Member"}</>
                        }
                    </button>
                </form>
            )}
        </div>
    );
}