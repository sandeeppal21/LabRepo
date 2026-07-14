// /**
//  * VendorTest.jsx
//  *
//  * Optimizations applied vs. the original:
//  *  1. Search input uses useDeferredValue — typing stays instant, the
//  *     filter/sort pass runs on a lower-priority render React can interrupt.
//  *  2. Row virtualization (@tanstack/react-virtual) — only visible rows are
//  *     mounted, so the table stays fast with hundreds/thousands of tests.
//  *     npm install @tanstack/react-virtual
//  *  3. TestRow, PriceEditor, Toggle, ParamRow, MoveBtn, DelBtn, Toasts are
//  *     all wrapped in React.memo — updating one row's price/toggle no
//  *     longer re-renders every other row.
//  *  4. Toast state is isolated in its own component subtree (via a small
//  *     internal context) so a toast firing doesn't re-render the table.
//  *  5. Logic is split into custom hooks (useToasts, useTests, useTestFilters)
//  *     to separate business logic from presentation, per your usual pattern.
//  *  6. Stats are computed in a single pass over `tests` instead of four
//  *     separate .filter().length calls.
//  *
//  * NOTE on the modal: true code-splitting (React.lazy) requires the modal
//  * to live in its own file/chunk, which isn't possible in a single-file
//  * deliverable. It's kept as a plain component here — since it's still
//  * only mounted when `modal` is truthy, you get most of the runtime
//  * benefit (no state/effects running while closed), just not the separate
//  * network chunk. Split TestFormModal into its own file + React.lazy/
//  * Suspense if you want that too — happy to do that version if you'd
//  * rather have it split back out.
//  */

// import {
//     useState, useEffect, useMemo, useRef, useCallback,
//     useDeferredValue, memo, createContext, useContext,
// } from "react";
// import { useVirtualizer } from "@tanstack/react-virtual";
// import {
//     RiAddLine, RiSearchLine, RiCloseLine, RiTestTubeLine,
//     RiLoader4Line, RiCheckboxCircleLine, RiAlertLine,
//     RiPencilLine, RiSaveLine, RiRefreshLine,
//     RiDeleteBinLine, RiDraggable, RiArrowUpLine, RiArrowDownLine,
//     RiFileTextLine, RiSettings3Line, RiFlaskLine, RiArrowRightLine,
// } from "react-icons/ri";
// import { fetchTests, addTest, updateTest, setPrice, toggleTest, deleteTest } from "../../../services/testServices";

// /* ══════════════════════════════════════════════════════════════════
//    CONSTANTS — module scope, created once
//    ══════════════════════════════════════════════════════════════════ */

// const DEPARTMENTS = [
//     "HAEMATOLOGY", "BIOCHEMISTRY", "IMMUNOASSAY", "MICROBIOLOGY",
//     "PATHOLOGY", "ENDOCRINOLOGY", "COAGULATION", "SEROLOGY",
//     "URINE ANALYSIS", "HORMONES", "OTHER",
// ];

// // fieldType reference:
// //   numeric → number + min/max range
// //   text    → free text
// //   option  → dropdown choices (Positive/Negative etc)
// //   heading → bold section label, no value entry, groups sub-fields
// const FIELD_TYPES = [
//     { value: "numeric", label: "Numeric" },
//     { value: "text", label: "Text" },
//     { value: "option", label: "Option" },
//     { value: "heading", label: "Heading" },
// ];

// const GENDERS = ["both", "male", "female"];
// const STATUS_FILTERS = [["ALL", "All"], ["PRICED", "Priced"], ["UNPRICED", "Unpriced"], ["ACTIVE", "Active"]];
// const ROW_HEIGHT = 78;

// const uid = () => Math.random().toString(36).slice(2, 9);
// const emptyParam = (isHeading = false) => ({
//     _uid: uid(), name: "", fieldType: isHeading ? "heading" : "numeric",
//     unit: "", rangeMin: "", rangeMax: "", rangeText: "",
//     options: [], isSubField: false, showInReport: true,
// });

// /* ══════════════════════════════════════════════════════════════════
//    TOAST — isolated context so toasts don't re-render the table
//    ══════════════════════════════════════════════════════════════════ */

// const ToastContext = createContext(null);
// const useToast = () => {
//     const ctx = useContext(ToastContext);
//     if (!ctx) throw new Error("useToast must be used within ToastProvider");
//     return ctx;
// };

// const ToastItem = memo(function ToastItem({ toast }) {
//     const isSuccess = toast.type === "success";
//     return (
//         <div style={{
//             display: "flex", alignItems: "center", gap: 10,
//             padding: "12px 18px", borderRadius: 12, minWidth: 280,
//             background: isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
//             border: `1px solid ${isSuccess ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
//             color: isSuccess ? "#16a34a" : "#ef4444",
//             fontSize: "0.84rem", fontWeight: 500,
//             boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
//             animation: "toastSlideIn .2s ease",
//         }}>
//             {isSuccess ? <RiCheckboxCircleLine size={16} /> : <RiAlertLine size={16} />}
//             {toast.message}
//         </div>
//     );
// });

// const ToastList = memo(function ToastList({ toasts }) {
//     if (!toasts.length) return null;
//     return (
//         <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8 }}>
//             {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
//         </div>
//     );
// });

// function ToastProvider({ children }) {
//     const [toasts, setToasts] = useState([]);
//     const showToast = useCallback((message, type = "success") => {
//         const id = `${Date.now()}-${Math.random()}`;
//         setToasts(p => [...p, { id, message, type }]);
//         setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
//     }, []);
//     return (
//         <ToastContext.Provider value={showToast}>
//             {children}
//             <ToastList toasts={toasts} />
//         </ToastContext.Provider>
//     );
// }

// /* ══════════════════════════════════════════════════════════════════
//    HOOK — server state: fetching + mutations
//    ══════════════════════════════════════════════════════════════════ */

// function useTests() {
//     const [tests, setTests] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState("");
//     const showToast = useToast();

//     const load = useCallback(async () => {
//         try {
//             setLoading(true); setError("");
//             const r = await fetchTests();
//             setTests(r.data.tests);
//         } catch (err) {
//             setError(err.userMessage || err.response?.data?.message || "Failed to load.");
//         } finally { setLoading(false); }
//     }, []);

//     useEffect(() => { load(); }, [load]);

//     const handleSaved = useCallback((saved, isEdit) => {
//         setTests(ts => isEdit
//             ? ts.map(t => t._id === saved._id
//                 ? { ...saved, vendorPrice: t.vendorPrice, priceSet: t.priceSet, vendorIsActive: t.vendorIsActive }
//                 : t)
//             : [{ ...saved, vendorPrice: null, priceSet: false, vendorIsActive: false }, ...ts]);
//         showToast(isEdit ? "Test updated." : "Test added to library!", "success");
//     }, [showToast]);

//     const handlePriceSaved = useCallback((id, price) => {
//         setTests(ts => ts.map(t => t._id === id ? { ...t, vendorPrice: price, priceSet: true } : t));
//     }, []);

//     const handleToggled = useCallback((id) => {
//         setTests(ts => ts.map(t => t._id === id ? { ...t, vendorIsActive: !t.vendorIsActive } : t));
//     }, []);

//     const handleDeleted = useCallback((id) => {
//         setTests(ts => ts.filter(t => t._id !== id));
//     }, []);

//     return { tests, loading, error, load, handleSaved, handlePriceSaved, handleToggled, handleDeleted };
// }

// /* ══════════════════════════════════════════════════════════════════
//    HOOK — search / filter / sort / stats
//    ══════════════════════════════════════════════════════════════════ */

// function useTestFilters(tests) {
//     const [search, setSearch] = useState("");
//     const deferredSearch = useDeferredValue(search);
//     const [deptFilter, setDeptFilter] = useState("ALL");
//     const [statusFilter, setStatusFilter] = useState("ALL");
//     const [sortKey, setSortKey] = useState("name");
//     const [sortDir, setSortDir] = useState("asc");

//     const handleSort = useCallback((k) => {
//         setSortKey(prevKey => {
//             if (prevKey === k) { setSortDir(d => d === "asc" ? "desc" : "asc"); return prevKey; }
//             setSortDir("asc");
//             return k;
//         });
//     }, []);

//     const departments = useMemo(() => {
//         const s = new Set(tests.map(t => t.department).filter(Boolean));
//         return ["ALL", ...Array.from(s).sort()];
//     }, [tests]);

//     const visible = useMemo(() => {
//         let out = tests;
//         const q = deferredSearch.trim().toLowerCase();
//         if (q) out = out.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q));
//         if (deptFilter !== "ALL") out = out.filter(t => t.department === deptFilter);
//         if (statusFilter === "PRICED") out = out.filter(t => t.priceSet);
//         if (statusFilter === "UNPRICED") out = out.filter(t => !t.priceSet);
//         if (statusFilter === "ACTIVE") out = out.filter(t => t.vendorIsActive && t.priceSet);

//         return [...out].sort((a, b) => {
//             const av = sortKey === "vendorPrice" ? (a.vendorPrice ?? -1) : (a[sortKey] ?? "");
//             const bv = sortKey === "vendorPrice" ? (b.vendorPrice ?? -1) : (b[sortKey] ?? "");
//             const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
//             return sortDir === "asc" ? c : -c;
//         });
//     }, [tests, deferredSearch, deptFilter, statusFilter, sortKey, sortDir]);

//     // Single pass instead of 4 separate .filter().length calls.
//     const stats = useMemo(() => {
//         let priced = 0, active = 0, params = 0;
//         for (const t of tests) {
//             if (t.priceSet) priced++;
//             if (t.vendorIsActive && t.priceSet) active++;
//             if (t.parameters) for (const p of t.parameters) if (p.fieldType !== "heading") params++;
//         }
//         return { total: tests.length, priced, active, params };
//     }, [tests]);

//     const clearFilters = useCallback(() => { setSearch(""); setDeptFilter("ALL"); setStatusFilter("ALL"); }, []);

//     return {
//         search, setSearch, deptFilter, setDeptFilter, statusFilter, setStatusFilter,
//         sortKey, sortDir, handleSort, departments, visible, stats, clearFilters,
//         isFiltering: deferredSearch !== search,
//         hasActiveFilters: !!search || deptFilter !== "ALL" || statusFilter !== "ALL",
//     };
// }

// /* ══════════════════════════════════════════════════════════════════
//    MODAL — parameter row + small buttons (memoized)
//    ══════════════════════════════════════════════════════════════════ */

// const MoveBtn = memo(function MoveBtn({ idx, total, onMove, t }) {
//     return (
//         <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
//             <button type="button" disabled={idx === 0} onClick={() => onMove(idx, -1)}
//                 style={{ width: 22, height: 12, borderRadius: 4, border: `1px solid ${t.border}`, background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", color: t.muted, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1 }}>
//                 <RiArrowUpLine size={10} />
//             </button>
//             <button type="button" disabled={idx === total - 1} onClick={() => onMove(idx, 1)}
//                 style={{ width: 22, height: 12, borderRadius: 4, border: `1px solid ${t.border}`, background: "none", cursor: idx === total - 1 ? "not-allowed" : "pointer", color: t.muted, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === total - 1 ? 0.3 : 1 }}>
//                 <RiArrowDownLine size={10} />
//             </button>
//         </div>
//     );
// });

// const DelBtn = memo(function DelBtn({ onDelete, t }) {
//     return (
//         <button type="button" onClick={onDelete}
//             style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
//             <RiDeleteBinLine size={12} />
//         </button>
//     );
// });

// const ParamRow = memo(function ParamRow({ param, idx, t, total, onChange, onDelete, onMove }) {
//     const inp = (key, extraStyle = {}) => (
//         <input
//             value={param[key]}
//             onChange={e => onChange(idx, key, e.target.value)}
//             style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 9px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", ...extraStyle }}
//         />
//     );

//     if (param.fieldType === "heading") {
//         return (
//             <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: t.accentBg, borderRadius: 8, borderLeft: `3px solid ${t.accent}` }}>
//                 <RiDraggable size={13} style={{ color: t.faint, cursor: "grab", flexShrink: 0 }} />
//                 <span style={{ fontSize: "0.68rem", fontWeight: 700, color: t.accent, letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 56 }}>HEADING</span>
//                 <input
//                     value={param.name}
//                     onChange={e => onChange(idx, "name", e.target.value)}
//                     placeholder="Section heading e.g. RBC Indices"
//                     style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.heading, fontSize: "0.86rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}
//                 />
//                 <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
//                     <MoveBtn idx={idx} total={total} onMove={onMove} t={t} />
//                     <DelBtn onDelete={() => onDelete(idx)} t={t} />
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div style={{
//             display: "grid", gridTemplateColumns: "14px 1.8fr 0.85fr 0.65fr 0.55fr 0.55fr 1fr 80px",
//             gap: 6, alignItems: "center", padding: "7px 12px", borderRadius: 8,
//             borderLeft: param.isSubField ? `3px solid ${t.accentRing}` : "3px solid transparent",
//             marginLeft: param.isSubField ? 18 : 0,
//             background: param.isSubField ? "rgba(56,189,248,0.02)" : "transparent",
//         }}>
//             <RiDraggable size={13} style={{ color: t.faint, cursor: "grab" }} />
//             {inp("name", { placeholder: "Parameter name e.g. Haemoglobin" })}

//             <select value={param.fieldType} onChange={e => onChange(idx, "fieldType", e.target.value)}
//                 style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 7px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
//                 {FIELD_TYPES.filter(f => f.value !== "heading").map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
//             </select>

//             {param.fieldType !== "option" ? inp("unit", { placeholder: "Unit" }) : <span style={{ fontSize: "0.72rem", color: t.faint, textAlign: "center" }}>—</span>}
//             {param.fieldType === "numeric" ? inp("rangeMin", { placeholder: "Min", type: "number" }) : <span />}
//             {param.fieldType === "numeric" ? inp("rangeMax", { placeholder: "Max", type: "number" }) : <span />}

//             {param.fieldType === "option"
//                 ? <input
//                     value={param.options?.join(", ")}
//                     onChange={e => onChange(idx, "options", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
//                     placeholder="Positive, Negative" title="Comma-separated choices"
//                     style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 9px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%" }}
//                 />
//                 : inp("rangeText", { placeholder: param.fieldType === "numeric" ? "Display range" : "Expected value" })
//             }

//             <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
//                 <button type="button" onClick={() => onChange(idx, "isSubField", !param.isSubField)} title={param.isSubField ? "Make top-level" : "Make sub-field (indent)"}
//                     style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", border: `1px solid ${param.isSubField ? t.accent : t.border}`, background: param.isSubField ? t.accentBg : "none", color: param.isSubField ? t.accent : t.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>↳</button>
//                 <MoveBtn idx={idx} total={total} onMove={onMove} t={t} />
//                 <DelBtn onDelete={() => onDelete(idx)} t={t} />
//             </div>
//         </div>
//     );
// });

// /* ══════════════════════════════════════════════════════════════════
//    MODAL — add/edit test
//    ══════════════════════════════════════════════════════════════════ */

// function TestFormModal({ t, editTest, currentVendorId, onClose, onSuccess, onDeleted, onToast }) {
//     const isEdit = !!editTest;
//     const [activeTab, setActiveTab] = useState("info");
//     const [saving, setSaving] = useState(false);
//     const [errors, setErrors] = useState({});
//     const [confirmingDelete, setConfirmingDelete] = useState(false);
//     const [deleting, setDeleting] = useState(false);

//     // createdBy may come back as a raw id string or a populated user object.
//     const ownerId = typeof editTest?.createdBy === "object" ? editTest.createdBy?._id : editTest?.createdBy;
//     const canDelete = isEdit && !!currentVendorId && ownerId === currentVendorId;

//     const handleDelete = async () => {
//         try {
//             setDeleting(true);
//             await deleteTest(editTest._id);
//             onDeleted?.(editTest._id);
//             onToast?.("Test removed.", "success");
//             onClose();
//         } catch (err) {
//             onToast?.(err.userMessage || err.response?.data?.message || "Failed to delete.", "error");
//             setDeleting(false);
//             setConfirmingDelete(false);
//         }
//     };

//     const [info, setInfo] = useState({
//         name: editTest?.name || "", code: editTest?.code || "",
//         department: editTest?.department || "", sampleType: editTest?.sampleType || "",
//         tat: editTest?.tat || "", description: editTest?.description || "",
//         gender: editTest?.gender || "both",
//     });

//     const [params, setParams] = useState(() => {
//         if (editTest?.parameters?.length) {
//             return [...editTest.parameters]
//                 .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
//                 .map(p => ({ ...p, _uid: uid(), options: p.options || [], rangeMin: p.rangeMin ?? "", rangeMax: p.rangeMax ?? "" }));
//         }
//         return [emptyParam()];
//     });

//     const [interpretation, setInterpretation] = useState(editTest?.interpretation || "");

//     const addParam = useCallback((isHeading = false) => setParams(p => [...p, emptyParam(isHeading)]), []);
//     const delParam = useCallback((i) => setParams(p => p.filter((_, j) => j !== i)), []);
//     const changeParam = useCallback((i, k, v) => setParams(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r)), []);
//     const moveParam = useCallback((i, dir) => setParams(p => {
//         const arr = [...p];
//         const to = i + dir;
//         if (to < 0 || to >= arr.length) return arr;
//         [arr[i], arr[to]] = [arr[to], arr[i]];
//         return arr;
//     }), []);

//     const handleSubmit = async () => {
//         setErrors({});
//         const payload = { ...info, parameters: params.map(({ _uid, ...rest }, i) => ({ ...rest, order: i })), interpretation };
//         try {
//             setSaving(true);
//             const res = isEdit ? await updateTest(editTest._id, payload) : await addTest(payload);
//             onSuccess(res.data.test, isEdit);
//             onClose();
//         } catch (err) {
//             const data = err.response?.data;
//             if (data?.errors) setErrors(data.errors);
//             else setErrors({ name: data?.message || "Failed to save." });
//             setActiveTab("info");
//         } finally { setSaving(false); }
//     };

//     const inpStyle = (key) => ({
//         width: "100%", background: t.inputBg,
//         border: `1.5px solid ${errors[key] ? "rgba(239,68,68,0.5)" : t.accentRing}`,
//         borderRadius: 9, padding: "10px 12px", color: t.text, fontSize: "0.86rem",
//         fontFamily: "'DM Sans',sans-serif", outline: "none",
//     });

//     const TabBtn = ({ k, label, Icon }) => (
//         <button type="button" onClick={() => setActiveTab(k)} style={{
//             display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none",
//             background: "none", color: activeTab === k ? t.accent : t.navText,
//             fontWeight: activeTab === k ? 600 : 400, fontSize: "0.84rem", cursor: "pointer",
//             fontFamily: "'DM Sans',sans-serif", borderBottom: `2px solid ${activeTab === k ? t.accent : "transparent"}`, transition: "all .15s",
//         }}><Icon size={14} /> {label}</button>
//     );

//     const paramCounts = useMemo(() => ({
//         heading: params.filter(p => p.fieldType === "heading").length,
//         fields: params.filter(p => p.fieldType !== "heading").length,
//     }), [params]);

//     return (
//         <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
//             <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }} />
//             <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860, background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, boxShadow: "0 28px 70px rgba(0,0,0,0.45)", maxHeight: "93vh", display: "flex", flexDirection: "column" }}>

//                 <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
//                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
//                         <div>
//                             <div className="playfair" style={{ fontSize: "1.12rem", fontWeight: 700, color: t.heading }}>{isEdit ? `Edit: ${editTest.name}` : "Add New Test"}</div>
//                             <p style={{ fontSize: "0.76rem", color: t.muted, marginTop: 3 }}>{isEdit ? "Update test info, parameters and interpretation." : "Adds to global library — all vendors can see and set their own price."}</p>
//                         </div>
//                         <button onClick={onClose} style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}><RiCloseLine size={16} /></button>
//                     </div>
//                     <div style={{ display: "flex", gap: 0 }}>
//                         <TabBtn k="info" label="Test Info" Icon={RiSettings3Line} />
//                         <TabBtn k="parameters" label={`Parameters (${paramCounts.fields} fields, ${paramCounts.heading} headings)`} Icon={RiFlaskLine} />
//                         <TabBtn k="interpretation" label="Interpretation" Icon={RiFileTextLine} />
//                     </div>
//                 </div>

//                 <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
//                     {activeTab === "info" && (
//                         <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
//                                 <div>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Test Name *</label>
//                                     <input value={info.name} onChange={e => setInfo(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Complete Blood Count" style={inpStyle("name")} autoFocus />
//                                     {errors.name && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.name}</p>}
//                                 </div>
//                                 <div>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Test Code *</label>
//                                     <input value={info.code} onChange={e => setInfo(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CBC-001" style={inpStyle("code")} />
//                                     {errors.code && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.code}</p>}
//                                 </div>
//                             </div>

//                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
//                                 <div>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Department *</label>
//                                     <select value={info.department} onChange={e => setInfo(f => ({ ...f, department: e.target.value }))} style={{ ...inpStyle("department"), cursor: "pointer" }}>
//                                         <option value="">Select…</option>
//                                         {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
//                                     </select>
//                                     {errors.department && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.department}</p>}
//                                 </div>
//                                 <div>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Sample Type</label>
//                                     <input value={info.sampleType} onChange={e => setInfo(f => ({ ...f, sampleType: e.target.value }))} placeholder="Blood, Serum, Urine…" style={inpStyle("sampleType")} />
//                                 </div>
//                                 <div>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>TAT</label>
//                                     <input value={info.tat} onChange={e => setInfo(f => ({ ...f, tat: e.target.value }))} placeholder="4 hrs, Same day…" style={inpStyle("tat")} />
//                                 </div>
//                             </div>

//                             <div>
//                                 <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Applicable Gender</label>
//                                 <div style={{ display: "flex", gap: 16 }}>
//                                     {GENDERS.map(g => (
//                                         <label key={g} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.86rem", color: t.text }}>
//                                             <input type="radio" name="gender" value={g} checked={info.gender === g} onChange={() => setInfo(f => ({ ...f, gender: g }))} style={{ accentColor: t.accent }} />
//                                             {g.charAt(0).toUpperCase() + g.slice(1)}
//                                         </label>
//                                     ))}
//                                 </div>
//                             </div>

//                             <div>
//                                 <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Description</label>
//                                 <textarea value={info.description} onChange={e => setInfo(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional brief description" style={{ ...inpStyle("description"), resize: "vertical" }} />
//                             </div>
//                         </div>
//                     )}

//                     {activeTab === "parameters" && (
//                         <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
//                             <div style={{ display: "grid", gridTemplateColumns: "14px 1.8fr 0.85fr 0.65fr 0.55fr 0.55fr 1fr 80px", gap: 6, padding: "0 12px", fontSize: "0.63rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
//                                 <span /><span>Parameter Name</span><span>Type</span><span>Unit</span><span>Min</span><span>Max</span><span>Range / Options</span><span />
//                             </div>

//                             {params.map((p, i) => (
//                                 <ParamRow key={p._uid} param={p} idx={i} total={params.length} t={t} onChange={changeParam} onDelete={delParam} onMove={moveParam} />
//                             ))}

//                             <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
//                                 <button type="button" onClick={() => addParam(false)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1.5px dashed ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
//                                     <RiAddLine size={14} /> Add Parameter
//                                 </button>
//                                 <button type="button" onClick={() => addParam(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1.5px dashed ${t.border}`, background: "none", color: t.muted, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
//                                     <RiAddLine size={14} /> Add Section Heading
//                                 </button>
//                             </div>

//                             <div style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", marginTop: 8 }}>
//                                 <div style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Legend</div>
//                                 <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.78rem", color: t.muted }}>
//                                     <span><strong style={{ color: t.text }}>Heading</strong> — bold section label in report, no value entry</span>
//                                     <span><strong style={{ color: t.text }}>↳ button</strong> — indent parameter under the heading above it</span>
//                                     <span><strong style={{ color: t.text }}>Option type</strong> — comma-separated choices e.g. "Positive, Negative"</span>
//                                     <span><strong style={{ color: t.text }}>↑↓ arrows</strong> — reorder parameters</span>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {activeTab === "interpretation" && (
//                         <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//                             <div>
//                                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//                                     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Interpretation Template</label>
//                                     <span style={{ fontSize: "0.72rem", color: t.faint }}>Shown below results on the printed report</span>
//                                 </div>
//                                 <textarea
//                                     value={interpretation} onChange={e => setInterpretation(e.target.value)} rows={10}
//                                     placeholder={`Enter interpretation text.\n\nExample:\nNormal haemoglobin levels indicate adequate oxygen-carrying capacity.\nLow values may suggest iron deficiency anaemia.\nElevated values may indicate polycythaemia.\n\nNote: Please consult your physician for detailed evaluation.`}
//                                     style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: "0.86rem", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", lineHeight: 1.7 }}
//                                 />
//                             </div>
//                             {interpretation.trim() && (
//                                 <div>
//                                     <div style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
//                                     <div style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "16px", fontSize: "0.84rem", color: t.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{interpretation}</div>
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                 </div>

//                 <div style={{ padding: "14px 24px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
//                         {canDelete && (
//                             confirmingDelete ? (
//                                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                                     <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>Delete this test permanently?</span>
//                                     <button type="button" onClick={handleDelete} disabled={deleting}
//                                         style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: "0.8rem", fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
//                                         {deleting ? <RiLoader4Line size={13} style={{ animation: "spin .7s linear infinite" }} /> : <RiDeleteBinLine size={13} />}
//                                         {deleting ? "Deleting…" : "Yes, delete"}
//                                     </button>
//                                     <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}
//                                         style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${t.border}`, background: "none", color: t.muted, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
//                                         Cancel
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <button type="button" onClick={() => setConfirmingDelete(true)}
//                                     style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
//                                     <RiDeleteBinLine size={13} /> Delete Test
//                                 </button>
//                             )
//                         )}
//                         <div style={{ display: "flex", gap: 6 }}>
//                             {["info", "parameters", "interpretation"].map(k => (
//                                 <div key={k} onClick={() => setActiveTab(k)} style={{ width: 8, height: 8, borderRadius: "50%", cursor: "pointer", background: activeTab === k ? t.accent : t.border, transition: "background .2s" }} />
//                             ))}
//                         </div>
//                     </div>
//                     <div style={{ display: "flex", gap: 10 }}>
//                         <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${t.border}`, background: "none", color: t.muted, fontSize: "0.86rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
//                         {activeTab !== "interpretation" ? (
//                             <button type="button" onClick={() => setActiveTab(activeTab === "info" ? "parameters" : "interpretation")} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: t.accentBg, color: t.accent, fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
//                                 Next <RiArrowRightLine size={14} />
//                             </button>
//                         ) : (
//                             <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: t.accent, color: "#fff", fontSize: "0.86rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans',sans-serif" }}>
//                                 {saving ? <><RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> Saving…</> : <><RiSaveLine size={14} /> {isEdit ? "Save Changes" : "Add Test"}</>}
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* ══════════════════════════════════════════════════════════════════
//    PRICE EDITOR + TOGGLE (memoized)
//    ══════════════════════════════════════════════════════════════════ */

// const PriceEditor = memo(function PriceEditor({ test, t, onSaved, onToast }) {
//     const [editing, setEditing] = useState(false);
//     const [value, setValue] = useState(test.vendorPrice ?? "");
//     const [saving, setSaving] = useState(false);
//     const ref = useRef();
//     useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

//     const save = async () => {
//         if (value === "" || isNaN(value)) { setEditing(false); return; }
//         try {
//             setSaving(true);
//             await setPrice(test._id, Number(value));
//             onSaved(test._id, Number(value));
//             onToast("Price updated.", "success");
//             setEditing(false);
//         } catch (err) {
//             onToast(err.userMessage || err.response?.data?.message || "Failed.", "error");
//         } finally { setSaving(false); }
//     };

//     if (editing) return (
//         <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//             <span style={{ fontSize: "0.8rem", color: t.muted }}>₹</span>
//             <input ref={ref} type="number" min="0" value={value}
//                 onChange={e => setValue(e.target.value)}
//                 onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
//                 style={{ width: 72, background: t.inputBg, border: `1.5px solid ${t.accent}`, borderRadius: 7, padding: "5px 7px", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", outline: "none" }}
//             />
//             <button onClick={save} disabled={saving} style={{ background: t.accent, border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
//                 {saving ? <RiLoader4Line size={12} style={{ animation: "spin .7s linear infinite" }} /> : <RiSaveLine size={12} />}
//             </button>
//             <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
//                 <RiCloseLine size={12} />
//             </button>
//         </div>
//     );

//     return (
//         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <span style={{ fontSize: "0.87rem", fontWeight: 600, color: test.priceSet ? t.heading : t.faint }}>{test.priceSet ? `₹${test.vendorPrice}` : "—"}</span>
//             <button onClick={() => { setValue(test.vendorPrice ?? ""); setEditing(true); }} title={test.priceSet ? "Edit price" : "Set price"}
//                 style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
//                 <RiPencilLine size={12} />
//             </button>
//         </div>
//     );
// });

// const Toggle = memo(function Toggle({ test, t, onToggled, onToast }) {
//     const [loading, setLoading] = useState(false);
//     const isOn = test.vendorIsActive && test.priceSet;

//     const handle = async () => {
//         if (!test.priceSet) { onToast("Set a price first before enabling.", "error"); return; }
//         try {
//             setLoading(true);
//             await toggleTest(test._id);
//             onToggled(test._id);
//         } catch (err) {
//             onToast(err.userMessage || "Failed to toggle.", "error");
//         } finally { setLoading(false); }
//     };

//     return (
//         <button onClick={handle} disabled={loading} title={!test.priceSet ? "Set price first" : (isOn ? "Disable" : "Enable")}
//             style={{ width: 42, height: 24, borderRadius: 12, background: isOn ? t.accent : "rgba(148,163,184,0.25)", border: "none", cursor: loading ? "not-allowed" : "pointer", position: "relative", transition: "background .2s", opacity: loading ? 0.6 : 1 }}>
//             <span style={{ position: "absolute", top: 3, left: isOn ? 20 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
//         </button>
//     );
// });

// /* ══════════════════════════════════════════════════════════════════
//    TEST ROW — memoized; a price/toggle update only rerenders this row
//    ══════════════════════════════════════════════════════════════════ */

// const TestRow = memo(function TestRow({ test, t, style, isLast, onEdit, onPriceSaved, onToggled, onToast }) {
//     const fieldCount = test.parameters?.filter(p => p.fieldType !== "heading").length || 0;

//     return (
//         <div className="cat-row" style={{
//             display: "grid", gridTemplateColumns: "2.2fr 1fr 1.1fr 0.7fr 0.6fr 0.6fr 0.9fr 0.6fr 0.6fr",
//             padding: "12px 20px", borderBottom: isLast ? "none" : `1px solid ${t.border}`,
//             alignItems: "center", transition: "background .12s", boxSizing: "border-box", ...style,
//         }}>
//             <div>
//                 <div style={{ fontWeight: 500, color: t.text, fontSize: "0.86rem" }}>{test.name}</div>
//                 <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
//                     {test.description && <span style={{ fontSize: "0.7rem", color: t.faint, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{test.description}</span>}
//                     {test.interpretation && <span style={{ fontSize: "0.68rem", color: t.accent, display: "flex", alignItems: "center", gap: 2 }}><RiFileTextLine size={10} /> Interpretation</span>}
//                 </div>
//             </div>
//             <span style={{ fontSize: "0.76rem", fontWeight: 600, color: t.accent, background: t.accentBg, padding: "3px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>{test.code}</span>
//             <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.department}</span>
//             <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.sampleType || "—"}</span>
//             <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.tat || "—"}</span>
//             <span style={{ fontSize: "0.82rem", fontWeight: 500, color: fieldCount ? t.text : t.faint }}>{fieldCount}</span>
//             <PriceEditor test={test} t={t} onSaved={onPriceSaved} onToast={onToast} />
//             <Toggle test={test} t={t} onToggled={onToggled} onToast={onToast} />
//             <button onClick={() => onEdit(test)} title="Edit test" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
//                 <RiPencilLine size={13} />
//             </button>
//         </div>
//     );
// });

// /* ══════════════════════════════════════════════════════════════════
//    VIRTUALIZED TABLE BODY
//    ══════════════════════════════════════════════════════════════════ */

// function VirtualTestList({ visible, t, onEdit, onPriceSaved, onToggled, onToast }) {
//     const parentRef = useRef(null);
//     const rowVirtualizer = useVirtualizer({
//         count: visible.length,
//         getScrollElement: () => parentRef.current,
//         estimateSize: () => ROW_HEIGHT,
//         overscan: 8,
//     });

//     return (
//         <div ref={parentRef} style={{ maxHeight: "62vh", overflowY: "auto" }}>
//             <div style={{ position: "relative", height: rowVirtualizer.getTotalSize(), width: "100%" }}>
//                 {rowVirtualizer.getVirtualItems().map(vItem => {
//                     const test = visible[vItem.index];
//                     return (
//                         <TestRow
//                             key={test._id}
//                             test={test} t={t} isLast={vItem.index === visible.length - 1}
//                             onEdit={onEdit} onPriceSaved={onPriceSaved} onToggled={onToggled} onToast={onToast}
//                             style={{ position: "absolute", top: 0, left: 0, width: "100%", height: ROW_HEIGHT, transform: `translateY(${vItem.start}px)` }}
//                         />
//                     );
//                 })}
//             </div>
//         </div>
//     );
// }

// /* ══════════════════════════════════════════════════════════════════
//    MAIN COMPONENT
//    ══════════════════════════════════════════════════════════════════ */

// function VendorTestInner({ t, currentVendorId }) {
//     const showToast = useToast();
//     const { tests, loading, error, load, handleSaved, handlePriceSaved, handleToggled, handleDeleted } = useTests();
//     const {
//         search, setSearch, deptFilter, setDeptFilter, statusFilter, setStatusFilter,
//         sortKey, sortDir, handleSort, departments, visible, stats, clearFilters, hasActiveFilters,
//     } = useTestFilters(tests);

//     const [modal, setModal] = useState(null); // null | "add" | testObj

//     const closeModal = useCallback(() => setModal(null), []);
//     const openAddModal = useCallback(() => setModal("add"), []);
//     const openEditModal = useCallback((test) => setModal(test), []);

//     const SortIcon = ({ k }) => sortKey === k
//         ? (sortDir === "asc" ? <RiArrowUpLine size={11} /> : <RiArrowDownLine size={11} />)
//         : <RiArrowUpLine size={11} style={{ opacity: 0.18 }} />;
//     const ColH = ({ label, k }) => (
//         <span onClick={() => handleSort(k)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, userSelect: "none" }}>
//             {label} <SortIcon k={k} />
//         </span>
//     );

//     return (
//         <div>
//             <style>{`
//         @keyframes spin       { to { transform: rotate(360deg); } }
//         @keyframes toastSlideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
//         .cat-row:hover { background: ${t.rowHover} !important; }
//       `}</style>

//             {modal === "add" && <TestFormModal t={t} editTest={null} onClose={closeModal} onSuccess={handleSaved} />}
//             {modal && modal !== "add" && <TestFormModal t={t} editTest={modal} onClose={closeModal} onSuccess={handleSaved} />}

//             {/* Header */}
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
//                 <div>
//                     <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Test Catalogue</h2>
//                     <p style={{ fontSize: "0.84rem", color: t.muted }}>Global library — add tests with parameters, ranges and interpretation. Set your own prices.</p>
//                 </div>
//                 <div style={{ display: "flex", gap: 8 }}>
//                     <button onClick={load} title="Refresh" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
//                         <RiRefreshLine size={15} />
//                     </button>
//                     <button onClick={openAddModal} style={{ display: "flex", alignItems: "center", gap: 7, background: t.accent, border: "none", borderRadius: 9, padding: "9px 18px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
//                         <RiAddLine size={15} /> Add Test
//                     </button>
//                 </div>
//             </div>

//             {/* Stats */}
//             <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
//                 {[
//                     { label: "Total Tests", value: stats.total, color: t.accent },
//                     { label: "Prices Set", value: stats.priced, color: "#16a34a" },
//                     { label: "Active in Lab", value: stats.active, color: "#0ea5e9" },
//                     { label: "Not Priced", value: stats.total - stats.priced, color: "#d97706" },
//                     { label: "Total Fields", value: stats.params, color: t.muted },
//                 ].map(s => (
//                     <div key={s.label} style={{ flex: 1, minWidth: 110, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "13px 16px" }}>
//                         <div style={{ fontSize: "0.68rem", color: t.muted, marginBottom: 4 }}>{s.label}</div>
//                         <div className="playfair" style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
//                     </div>
//                 ))}
//             </div>

//             {/* Search + Filters */}
//             <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
//                 <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px" }}>
//                     <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
//                     <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, department…"
//                         style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.84rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
//                     {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}><RiCloseLine size={14} /></button>}
//                 </div>
//                 <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
//                     {departments.map(d => <option key={d} value={d}>{d === "ALL" ? "All Departments" : d}</option>)}
//                 </select>
//                 <div style={{ display: "flex", gap: 4 }}>
//                     {STATUS_FILTERS.map(([k, l]) => (
//                         <button key={k} onClick={() => setStatusFilter(k)} style={{ padding: "7px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 500, border: `1px solid ${statusFilter === k ? t.accent : t.border}`, background: statusFilter === k ? t.accentBg : "none", color: statusFilter === k ? t.accent : t.navText, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{l}</button>
//                     ))}
//                 </div>
//             </div>

//             {/* Table */}
//             {loading ? (
//                 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 12, color: t.muted }}>
//                     <RiLoader4Line size={24} style={{ animation: "spin .7s linear infinite" }} /> Loading tests…
//                 </div>
//             ) : error ? (
//                 <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
//                     <RiAlertLine size={32} style={{ marginBottom: 8 }} /><p>{error}</p>
//                     <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
//                 </div>
//             ) : visible.length === 0 ? (
//                 <div style={{ textAlign: "center", padding: 60, color: t.faint }}>
//                     <RiTestTubeLine size={44} style={{ marginBottom: 12 }} />
//                     <p className="playfair" style={{ fontSize: "1.1rem", color: t.muted }}>No tests found</p>
//                     <p style={{ fontSize: "0.82rem", marginTop: 4 }}>{search ? "Try a different search." : "Click \"Add Test\" to get started."}</p>
//                 </div>
//             ) : (
//                 <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
//                     <div style={{ padding: "11px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                         <span style={{ fontSize: "0.78rem", color: t.muted }}>Showing <strong style={{ color: t.text }}>{visible.length}</strong> of <strong style={{ color: t.text }}>{tests.length}</strong> tests</span>
//                         {hasActiveFilters && <button onClick={clearFilters} style={{ fontSize: "0.74rem", color: t.accent, background: "none", border: "none", cursor: "pointer" }}>Clear filters</button>}
//                     </div>

//                     <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1.1fr 0.7fr 0.6fr 0.6fr 0.9fr 0.6fr 0.6fr", padding: "9px 20px", background: t.accentBg, borderBottom: `1px solid ${t.border}`, fontSize: "0.66rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
//                         <ColH label="Test Name" k="name" />
//                         <ColH label="Code" k="code" />
//                         <ColH label="Department" k="department" />
//                         <span>Sample</span>
//                         <span>TAT</span>
//                         <span title="Number of entry fields (excludes headings)">Fields</span>
//                         <ColH label="Your Price" k="vendorPrice" />
//                         <span>Active</span>
//                         <span>Edit</span>
//                     </div>

//                     <VirtualTestList
//                         visible={visible} t={t}
//                         onEdit={openEditModal} onPriceSaved={handlePriceSaved}
//                         onToggled={handleToggled} onToast={showToast}
//                     />
//                 </div>
//             )}

//             {!loading && !error && tests.length > 0 && (
//                 <p style={{ fontSize: "0.72rem", color: t.faint, marginTop: 14, textAlign: "center" }}>
//                     ✏️ Set price · Toggle to enable · Click edit icon to update parameters and interpretation
//                 </p>
//             )}
//         </div>
//     );
// }

// export default function VendorTest({ t, currentVendorId }) {
//     return (
//         <ToastProvider>
//             <VendorTestInner t={t} currentVendorId={currentVendorId} />
//         </ToastProvider>
//     );
// }



/**
 * VendorTest.jsx
 *
 * Optimizations applied vs. the original:
 *  1. Search input uses useDeferredValue — typing stays instant, the
 *     filter/sort pass runs on a lower-priority render React can interrupt.
 *  2. Row virtualization (@tanstack/react-virtual) — only visible rows are
 *     mounted, so the table stays fast with hundreds/thousands of tests.
 *     npm install @tanstack/react-virtual
 *  3. TestRow, PriceEditor, Toggle, ParamRow, MoveBtn, DelBtn, Toasts are
 *     all wrapped in React.memo — updating one row's price/toggle no
 *     longer re-renders every other row.
 *  4. Toast state is isolated in its own component subtree (via a small
 *     internal context) so a toast firing doesn't re-render the table.
 *  5. Logic is split into custom hooks (useToasts, useTests, useTestFilters)
 *     to separate business logic from presentation, per your usual pattern.
 *  6. Stats are computed in a single pass over `tests` instead of four
 *     separate .filter().length calls.
 *
 * NOTE on the modal: true code-splitting (React.lazy) requires the modal
 * to live in its own file/chunk, which isn't possible in a single-file
 * deliverable. It's kept as a plain component here — since it's still
 * only mounted when `modal` is truthy, you get most of the runtime
 * benefit (no state/effects running while closed), just not the separate
 * network chunk. Split TestFormModal into its own file + React.lazy/
 * Suspense if you want that too — happy to do that version if you'd
 * rather have it split back out.
 */

import {
    useState, useEffect, useMemo, useRef, useCallback,
    useDeferredValue, memo, createContext, useContext,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    RiAddLine, RiSearchLine, RiCloseLine, RiTestTubeLine,
    RiLoader4Line, RiCheckboxCircleLine, RiAlertLine,
    RiPencilLine, RiSaveLine, RiRefreshLine,
    RiDeleteBinLine, RiDraggable, RiArrowUpLine, RiArrowDownLine,
    RiFileTextLine, RiSettings3Line, RiFlaskLine, RiArrowRightLine,
} from "react-icons/ri";
import { fetchTests, addTest, updateTest, setPrice, toggleTest, deleteTest } from "../../../services/testServices";
// Adjust this path if your profile service lives elsewhere relative to this file.
import { fetchProfile } from "../../../services/profileService";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS — module scope, created once
   ══════════════════════════════════════════════════════════════════ */

const DEPARTMENTS = [
    "HAEMATOLOGY", "BIOCHEMISTRY", "IMMUNOASSAY", "MICROBIOLOGY",
    "PATHOLOGY", "ENDOCRINOLOGY", "COAGULATION", "SEROLOGY",
    "URINE ANALYSIS", "HORMONES", "OTHER",
];

// fieldType reference:
//   numeric → number + min/max range
//   text    → free text
//   option  → dropdown choices (Positive/Negative etc)
//   heading → bold section label, no value entry, groups sub-fields
const FIELD_TYPES = [
    { value: "numeric", label: "Numeric" },
    { value: "text", label: "Text" },
    { value: "option", label: "Option" },
    { value: "heading", label: "Heading" },
];

const GENDERS = ["both", "male", "female"];
const STATUS_FILTERS = [["ALL", "All"], ["PRICED", "Priced"], ["UNPRICED", "Unpriced"], ["ACTIVE", "Active"]];
const ROW_HEIGHT = 78;

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyParam = (isHeading = false) => ({
    _uid: uid(), name: "", fieldType: isHeading ? "heading" : "numeric",
    unit: "", rangeMin: "", rangeMax: "", rangeText: "",
    options: [], isSubField: false, showInReport: true,
});

/* ══════════════════════════════════════════════════════════════════
   TOAST — isolated context so toasts don't re-render the table
   ══════════════════════════════════════════════════════════════════ */

const ToastContext = createContext(null);
const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
};

const ToastItem = memo(function ToastItem({ toast }) {
    const isSuccess = toast.type === "success";
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderRadius: 12, minWidth: 280,
            background: isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${isSuccess ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: isSuccess ? "#16a34a" : "#ef4444",
            fontSize: "0.84rem", fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            animation: "toastSlideIn .2s ease",
        }}>
            {isSuccess ? <RiCheckboxCircleLine size={16} /> : <RiAlertLine size={16} />}
            {toast.message}
        </div>
    );
});

const ToastList = memo(function ToastList({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8 }}>
            {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
        </div>
    );
});

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = "success") => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
    }, []);
    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <ToastList toasts={toasts} />
        </ToastContext.Provider>
    );
}

/* ══════════════════════════════════════════════════════════════════
   HOOK — server state: fetching + mutations
   ══════════════════════════════════════════════════════════════════ */

function useTests() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const showToast = useToast();

    const load = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const r = await fetchTests();
            setTests(r.data.tests);
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || "Failed to load.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSaved = useCallback((saved, isEdit) => {
        setTests(ts => isEdit
            ? ts.map(t => t._id === saved._id
                ? { ...saved, vendorPrice: t.vendorPrice, priceSet: t.priceSet, vendorIsActive: t.vendorIsActive }
                : t)
            : [{ ...saved, vendorPrice: null, priceSet: false, vendorIsActive: false }, ...ts]);
        showToast(isEdit ? "Test updated." : "Test added to library!", "success");
    }, [showToast]);

    const handlePriceSaved = useCallback((id, price) => {
        setTests(ts => ts.map(t => t._id === id ? { ...t, vendorPrice: price, priceSet: true } : t));
    }, []);

    const handleToggled = useCallback((id) => {
        setTests(ts => ts.map(t => t._id === id ? { ...t, vendorIsActive: !t.vendorIsActive } : t));
    }, []);

    const handleDeleted = useCallback((id) => {
        setTests(ts => ts.filter(t => t._id !== id));
    }, []);

    return { tests, loading, error, load, handleSaved, handlePriceSaved, handleToggled, handleDeleted };
}

/* ══════════════════════════════════════════════════════════════════
   HOOK — search / filter / sort / stats
   ══════════════════════════════════════════════════════════════════ */

function useTestFilters(tests) {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [deptFilter, setDeptFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState("asc");

    const handleSort = useCallback((k) => {
        setSortKey(prevKey => {
            if (prevKey === k) { setSortDir(d => d === "asc" ? "desc" : "asc"); return prevKey; }
            setSortDir("asc");
            return k;
        });
    }, []);

    const departments = useMemo(() => {
        const s = new Set(tests.map(t => t.department).filter(Boolean));
        return ["ALL", ...Array.from(s).sort()];
    }, [tests]);

    const visible = useMemo(() => {
        let out = tests;
        const q = deferredSearch.trim().toLowerCase();
        if (q) out = out.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q));
        if (deptFilter !== "ALL") out = out.filter(t => t.department === deptFilter);
        if (statusFilter === "PRICED") out = out.filter(t => t.priceSet);
        if (statusFilter === "UNPRICED") out = out.filter(t => !t.priceSet);
        if (statusFilter === "ACTIVE") out = out.filter(t => t.vendorIsActive && t.priceSet);

        return [...out].sort((a, b) => {
            const av = sortKey === "vendorPrice" ? (a.vendorPrice ?? -1) : (a[sortKey] ?? "");
            const bv = sortKey === "vendorPrice" ? (b.vendorPrice ?? -1) : (b[sortKey] ?? "");
            const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
            return sortDir === "asc" ? c : -c;
        });
    }, [tests, deferredSearch, deptFilter, statusFilter, sortKey, sortDir]);

    // Single pass instead of 4 separate .filter().length calls.
    const stats = useMemo(() => {
        let priced = 0, active = 0, params = 0;
        for (const t of tests) {
            if (t.priceSet) priced++;
            if (t.vendorIsActive && t.priceSet) active++;
            if (t.parameters) for (const p of t.parameters) if (p.fieldType !== "heading") params++;
        }
        return { total: tests.length, priced, active, params };
    }, [tests]);

    const clearFilters = useCallback(() => { setSearch(""); setDeptFilter("ALL"); setStatusFilter("ALL"); }, []);

    return {
        search, setSearch, deptFilter, setDeptFilter, statusFilter, setStatusFilter,
        sortKey, sortDir, handleSort, departments, visible, stats, clearFilters,
        isFiltering: deferredSearch !== search,
        hasActiveFilters: !!search || deptFilter !== "ALL" || statusFilter !== "ALL",
    };
}

/* ══════════════════════════════════════════════════════════════════
   MODAL — parameter row + small buttons (memoized)
   ══════════════════════════════════════════════════════════════════ */

const MoveBtn = memo(function MoveBtn({ idx, total, onMove, t }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button type="button" disabled={idx === 0} onClick={() => onMove(idx, -1)}
                style={{ width: 22, height: 12, borderRadius: 4, border: `1px solid ${t.border}`, background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", color: t.muted, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1 }}>
                <RiArrowUpLine size={10} />
            </button>
            <button type="button" disabled={idx === total - 1} onClick={() => onMove(idx, 1)}
                style={{ width: 22, height: 12, borderRadius: 4, border: `1px solid ${t.border}`, background: "none", cursor: idx === total - 1 ? "not-allowed" : "pointer", color: t.muted, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === total - 1 ? 0.3 : 1 }}>
                <RiArrowDownLine size={10} />
            </button>
        </div>
    );
});

const DelBtn = memo(function DelBtn({ onDelete, t }) {
    return (
        <button type="button" onClick={onDelete}
            style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RiDeleteBinLine size={12} />
        </button>
    );
});

const ParamRow = memo(function ParamRow({ param, idx, t, total, onChange, onDelete, onMove }) {
    const inp = (key, extraStyle = {}) => (
        <input
            value={param[key]}
            onChange={e => onChange(idx, key, e.target.value)}
            style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 9px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", ...extraStyle }}
        />
    );

    if (param.fieldType === "heading") {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: t.accentBg, borderRadius: 8, borderLeft: `3px solid ${t.accent}` }}>
                <RiDraggable size={13} style={{ color: t.faint, cursor: "grab", flexShrink: 0 }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: t.accent, letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 56 }}>HEADING</span>
                <input
                    value={param.name}
                    onChange={e => onChange(idx, "name", e.target.value)}
                    placeholder="Section heading e.g. RBC Indices"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.heading, fontSize: "0.86rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}
                />
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <MoveBtn idx={idx} total={total} onMove={onMove} t={t} />
                    <DelBtn onDelete={() => onDelete(idx)} t={t} />
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: "grid", gridTemplateColumns: "14px 1.8fr 0.85fr 0.65fr 0.55fr 0.55fr 1fr 80px",
            gap: 6, alignItems: "center", padding: "7px 12px", borderRadius: 8,
            borderLeft: param.isSubField ? `3px solid ${t.accentRing}` : "3px solid transparent",
            marginLeft: param.isSubField ? 18 : 0,
            background: param.isSubField ? "rgba(56,189,248,0.02)" : "transparent",
        }}>
            <RiDraggable size={13} style={{ color: t.faint, cursor: "grab" }} />
            {inp("name", { placeholder: "Parameter name e.g. Haemoglobin" })}

            <select value={param.fieldType} onChange={e => onChange(idx, "fieldType", e.target.value)}
                style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 7px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
                {FIELD_TYPES.filter(f => f.value !== "heading").map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            {param.fieldType !== "option" ? inp("unit", { placeholder: "Unit" }) : <span style={{ fontSize: "0.72rem", color: t.faint, textAlign: "center" }}>—</span>}
            {param.fieldType === "numeric" ? inp("rangeMin", { placeholder: "Min", type: "number" }) : <span />}
            {param.fieldType === "numeric" ? inp("rangeMax", { placeholder: "Max", type: "number" }) : <span />}

            {param.fieldType === "option"
                ? <input
                    value={param.options?.join(", ")}
                    onChange={e => onChange(idx, "options", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="Positive, Negative" title="Comma-separated choices"
                    style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, padding: "6px 9px", color: t.text, fontSize: "0.79rem", fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%" }}
                />
                : inp("rangeText", { placeholder: param.fieldType === "numeric" ? "Display range" : "Expected value" })
            }

            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => onChange(idx, "isSubField", !param.isSubField)} title={param.isSubField ? "Make top-level" : "Make sub-field (indent)"}
                    style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", border: `1px solid ${param.isSubField ? t.accent : t.border}`, background: param.isSubField ? t.accentBg : "none", color: param.isSubField ? t.accent : t.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>↳</button>
                <MoveBtn idx={idx} total={total} onMove={onMove} t={t} />
                <DelBtn onDelete={() => onDelete(idx)} t={t} />
            </div>
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   MODAL — add/edit test
   ══════════════════════════════════════════════════════════════════ */

function TestFormModal({ t, editTest, onClose, onSuccess }) {
    const isEdit = !!editTest;
    const [activeTab, setActiveTab] = useState("info");
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [info, setInfo] = useState({
        name: editTest?.name || "", code: editTest?.code || "",
        department: editTest?.department || "", sampleType: editTest?.sampleType || "",
        tat: editTest?.tat || "", description: editTest?.description || "",
        gender: editTest?.gender || "both",
    });

    const [params, setParams] = useState(() => {
        if (editTest?.parameters?.length) {
            return [...editTest.parameters]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map(p => ({ ...p, _uid: uid(), options: p.options || [], rangeMin: p.rangeMin ?? "", rangeMax: p.rangeMax ?? "" }));
        }
        return [emptyParam()];
    });

    const [interpretation, setInterpretation] = useState(editTest?.interpretation || "");

    const addParam = useCallback((isHeading = false) => setParams(p => [...p, emptyParam(isHeading)]), []);
    const delParam = useCallback((i) => setParams(p => p.filter((_, j) => j !== i)), []);
    const changeParam = useCallback((i, k, v) => setParams(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r)), []);
    const moveParam = useCallback((i, dir) => setParams(p => {
        const arr = [...p];
        const to = i + dir;
        if (to < 0 || to >= arr.length) return arr;
        [arr[i], arr[to]] = [arr[to], arr[i]];
        return arr;
    }), []);

    const handleSubmit = async () => {
        setErrors({});
        const payload = { ...info, parameters: params.map(({ _uid, ...rest }, i) => ({ ...rest, order: i })), interpretation };
        try {
            setSaving(true);
            const res = isEdit ? await updateTest(editTest._id, payload) : await addTest(payload);
            onSuccess(res.data.test, isEdit);
            onClose();
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setErrors(data.errors);
            else setErrors({ name: data?.message || "Failed to save." });
            setActiveTab("info");
        } finally { setSaving(false); }
    };

    const inpStyle = (key) => ({
        width: "100%", background: t.inputBg,
        border: `1.5px solid ${errors[key] ? "rgba(239,68,68,0.5)" : t.accentRing}`,
        borderRadius: 9, padding: "10px 12px", color: t.text, fontSize: "0.86rem",
        fontFamily: "'DM Sans',sans-serif", outline: "none",
    });

    const TabBtn = ({ k, label, Icon }) => (
        <button type="button" onClick={() => setActiveTab(k)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none",
            background: "none", color: activeTab === k ? t.accent : t.navText,
            fontWeight: activeTab === k ? 600 : 400, fontSize: "0.84rem", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", borderBottom: `2px solid ${activeTab === k ? t.accent : "transparent"}`, transition: "all .15s",
        }}><Icon size={14} /> {label}</button>
    );

    const paramCounts = useMemo(() => ({
        heading: params.filter(p => p.fieldType === "heading").length,
        fields: params.filter(p => p.fieldType !== "heading").length,
    }), [params]);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860, background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, boxShadow: "0 28px 70px rgba(0,0,0,0.45)", maxHeight: "93vh", display: "flex", flexDirection: "column" }}>

                <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                            <div className="playfair" style={{ fontSize: "1.12rem", fontWeight: 700, color: t.heading }}>{isEdit ? `Edit: ${editTest.name}` : "Add New Test"}</div>
                            <p style={{ fontSize: "0.76rem", color: t.muted, marginTop: 3 }}>{isEdit ? "Update test info, parameters and interpretation." : "Adds to global library — all vendors can see and set their own price."}</p>
                        </div>
                        <button onClick={onClose} style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}><RiCloseLine size={16} /></button>
                    </div>
                    <div style={{ display: "flex", gap: 0 }}>
                        <TabBtn k="info" label="Test Info" Icon={RiSettings3Line} />
                        <TabBtn k="parameters" label={`Parameters (${paramCounts.fields} fields, ${paramCounts.heading} headings)`} Icon={RiFlaskLine} />
                        <TabBtn k="interpretation" label="Interpretation" Icon={RiFileTextLine} />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                    {activeTab === "info" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Test Name *</label>
                                    <input value={info.name} onChange={e => setInfo(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Complete Blood Count" style={inpStyle("name")} autoFocus />
                                    {errors.name && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.name}</p>}
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Test Code *</label>
                                    <input value={info.code} onChange={e => setInfo(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CBC-001" style={inpStyle("code")} />
                                    {errors.code && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.code}</p>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Department *</label>
                                    <select value={info.department} onChange={e => setInfo(f => ({ ...f, department: e.target.value }))} style={{ ...inpStyle("department"), cursor: "pointer" }}>
                                        <option value="">Select…</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    {errors.department && <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{errors.department}</p>}
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Sample Type</label>
                                    <input value={info.sampleType} onChange={e => setInfo(f => ({ ...f, sampleType: e.target.value }))} placeholder="Blood, Serum, Urine…" style={inpStyle("sampleType")} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>TAT</label>
                                    <input value={info.tat} onChange={e => setInfo(f => ({ ...f, tat: e.target.value }))} placeholder="4 hrs, Same day…" style={inpStyle("tat")} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Applicable Gender</label>
                                <div style={{ display: "flex", gap: 16 }}>
                                    {GENDERS.map(g => (
                                        <label key={g} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.86rem", color: t.text }}>
                                            <input type="radio" name="gender" value={g} checked={info.gender === g} onChange={() => setInfo(f => ({ ...f, gender: g }))} style={{ accentColor: t.accent }} />
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Description</label>
                                <textarea value={info.description} onChange={e => setInfo(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional brief description" style={{ ...inpStyle("description"), resize: "vertical" }} />
                            </div>
                        </div>
                    )}

                    {activeTab === "parameters" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "14px 1.8fr 0.85fr 0.65fr 0.55fr 0.55fr 1fr 80px", gap: 6, padding: "0 12px", fontSize: "0.63rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                                <span /><span>Parameter Name</span><span>Type</span><span>Unit</span><span>Min</span><span>Max</span><span>Range / Options</span><span />
                            </div>

                            {params.map((p, i) => (
                                <ParamRow key={p._uid} param={p} idx={i} total={params.length} t={t} onChange={changeParam} onDelete={delParam} onMove={moveParam} />
                            ))}

                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button type="button" onClick={() => addParam(false)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1.5px dashed ${t.accentRing}`, background: t.accentBg, color: t.accent, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                    <RiAddLine size={14} /> Add Parameter
                                </button>
                                <button type="button" onClick={() => addParam(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: `1.5px dashed ${t.border}`, background: "none", color: t.muted, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                    <RiAddLine size={14} /> Add Section Heading
                                </button>
                            </div>

                            <div style={{ background: t.accentBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", marginTop: 8 }}>
                                <div style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Legend</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.78rem", color: t.muted }}>
                                    <span><strong style={{ color: t.text }}>Heading</strong> — bold section label in report, no value entry</span>
                                    <span><strong style={{ color: t.text }}>↳ button</strong> — indent parameter under the heading above it</span>
                                    <span><strong style={{ color: t.text }}>Option type</strong> — comma-separated choices e.g. "Positive, Negative"</span>
                                    <span><strong style={{ color: t.text }}>↑↓ arrows</strong> — reorder parameters</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "interpretation" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <label style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Interpretation Template</label>
                                    <span style={{ fontSize: "0.72rem", color: t.faint }}>Shown below results on the printed report</span>
                                </div>
                                <textarea
                                    value={interpretation} onChange={e => setInterpretation(e.target.value)} rows={10}
                                    placeholder={`Enter interpretation text.\n\nExample:\nNormal haemoglobin levels indicate adequate oxygen-carrying capacity.\nLow values may suggest iron deficiency anaemia.\nElevated values may indicate polycythaemia.\n\nNote: Please consult your physician for detailed evaluation.`}
                                    style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.accentRing}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: "0.86rem", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", lineHeight: 1.7 }}
                                />
                            </div>
                            {interpretation.trim() && (
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
                                    <div style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "16px", fontSize: "0.84rem", color: t.text, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{interpretation}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: "14px 24px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        {["info", "parameters", "interpretation"].map(k => (
                            <div key={k} onClick={() => setActiveTab(k)} style={{ width: 8, height: 8, borderRadius: "50%", cursor: "pointer", background: activeTab === k ? t.accent : t.border, transition: "background .2s" }} />
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${t.border}`, background: "none", color: t.muted, fontSize: "0.86rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                        {activeTab !== "interpretation" ? (
                            <button type="button" onClick={() => setActiveTab(activeTab === "info" ? "parameters" : "interpretation")} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: t.accentBg, color: t.accent, fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                                Next <RiArrowRightLine size={14} />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: t.accent, color: "#fff", fontSize: "0.86rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans',sans-serif" }}>
                                {saving ? <><RiLoader4Line size={14} style={{ animation: "spin .7s linear infinite" }} /> Saving…</> : <><RiSaveLine size={14} /> {isEdit ? "Save Changes" : "Add Test"}</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   PRICE EDITOR + TOGGLE (memoized)
   ══════════════════════════════════════════════════════════════════ */

const PriceEditor = memo(function PriceEditor({ test, t, onSaved, onToast }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(test.vendorPrice ?? "");
    const [saving, setSaving] = useState(false);
    const ref = useRef();
    useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    const save = async () => {
        if (value === "" || isNaN(value)) { setEditing(false); return; }
        try {
            setSaving(true);
            await setPrice(test._id, Number(value));
            onSaved(test._id, Number(value));
            onToast("Price updated.", "success");
            setEditing(false);
        } catch (err) {
            onToast(err.userMessage || err.response?.data?.message || "Failed.", "error");
        } finally { setSaving(false); }
    };

    if (editing) return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.8rem", color: t.muted }}>₹</span>
            <input ref={ref} type="number" min="0" value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                style={{ width: 72, background: t.inputBg, border: `1.5px solid ${t.accent}`, borderRadius: 7, padding: "5px 7px", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", outline: "none" }}
            />
            <button onClick={save} disabled={saving} style={{ background: t.accent, border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                {saving ? <RiLoader4Line size={12} style={{ animation: "spin .7s linear infinite" }} /> : <RiSaveLine size={12} />}
            </button>
            <button onClick={() => setEditing(false)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.muted }}>
                <RiCloseLine size={12} />
            </button>
        </div>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.87rem", fontWeight: 600, color: test.priceSet ? t.heading : t.faint }}>{test.priceSet ? `₹${test.vendorPrice}` : "—"}</span>
            <button onClick={() => { setValue(test.vendorPrice ?? ""); setEditing(true); }} title={test.priceSet ? "Edit price" : "Set price"}
                style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                <RiPencilLine size={12} />
            </button>
        </div>
    );
});

const Toggle = memo(function Toggle({ test, t, onToggled, onToast }) {
    const [loading, setLoading] = useState(false);
    const isOn = test.vendorIsActive && test.priceSet;

    const handle = async () => {
        if (!test.priceSet) { onToast("Set a price first before enabling.", "error"); return; }
        try {
            setLoading(true);
            await toggleTest(test._id);
            onToggled(test._id);
        } catch (err) {
            onToast(err.userMessage || "Failed to toggle.", "error");
        } finally { setLoading(false); }
    };

    return (
        <button onClick={handle} disabled={loading} title={!test.priceSet ? "Set price first" : (isOn ? "Disable" : "Enable")}
            style={{ width: 42, height: 24, borderRadius: 12, background: isOn ? t.accent : "rgba(148,163,184,0.25)", border: "none", cursor: loading ? "not-allowed" : "pointer", position: "relative", transition: "background .2s", opacity: loading ? 0.6 : 1 }}>
            <span style={{ position: "absolute", top: 3, left: isOn ? 20 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
        </button>
    );
});

/* ══════════════════════════════════════════════════════════════════
   TEST ROW — memoized; a price/toggle update only rerenders this row
   ══════════════════════════════════════════════════════════════════ */

const RowDeleteButton = memo(function RowDeleteButton({ testId, t, onDeleted, onToast }) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await deleteTest(testId);
            onDeleted(testId);
            onToast("Test removed.", "success");
        } catch (err) {
            onToast(err.userMessage || err.response?.data?.message || "Failed to delete.", "error");
            setDeleting(false);
            setConfirming(false);
        }
    };

    if (confirming) {
        return (
            <div style={{ display: "flex", gap: 4 }}>
                <button onClick={handleDelete} disabled={deleting} title="Confirm delete"
                    style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#ef4444", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {deleting ? <RiLoader4Line size={13} style={{ animation: "spin .7s linear infinite" }} /> : <RiCheckboxCircleLine size={13} />}
                </button>
                <button onClick={() => setConfirming(false)} disabled={deleting} title="Cancel"
                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: "none", color: t.muted, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RiCloseLine size={13} />
                </button>
            </div>
        );
    }

    return (
        <button onClick={() => setConfirming(true)} title="Delete test"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}>
            <RiDeleteBinLine size={13} />
        </button>
    );
});

const TestRow = memo(function TestRow({ test, t, style, isLast, currentVendorId, onEdit, onPriceSaved, onToggled, onDeleted, onToast }) {
    const fieldCount = test.parameters?.filter(p => p.fieldType !== "heading").length || 0;
    // createdBy may come back as a raw id string, an ObjectId, or a populated user object.
    // String() both sides so "507f..." (string) and ObjectId("507f...") compare equal.
    const rawOwnerId = typeof test.createdBy === "object" && test.createdBy !== null ? test.createdBy?._id : test.createdBy;
    const isOwner = !!currentVendorId && !!rawOwnerId && String(rawOwnerId) === String(currentVendorId);

    return (
        <div className="cat-row" style={{
            display: "grid", gridTemplateColumns: "2.1fr 1fr 1fr 0.65fr 0.55fr 0.55fr 0.85fr 0.55fr 1.1fr",
            padding: "12px 20px", borderBottom: isLast ? "none" : `1px solid ${t.border}`,
            alignItems: "center", transition: "background .12s", boxSizing: "border-box", ...style,
        }}>
            <div>
                <div style={{ fontWeight: 500, color: t.text, fontSize: "0.86rem" }}>{test.name}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    {test.description && <span style={{ fontSize: "0.7rem", color: t.faint, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{test.description}</span>}
                    {test.interpretation && <span style={{ fontSize: "0.68rem", color: t.accent, display: "flex", alignItems: "center", gap: 2 }}><RiFileTextLine size={10} /> Interpretation</span>}
                </div>
            </div>
            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: t.accent, background: t.accentBg, padding: "3px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>{test.code}</span>
            <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.department}</span>
            <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.sampleType || "—"}</span>
            <span style={{ fontSize: "0.78rem", color: t.muted }}>{test.tat || "—"}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 500, color: fieldCount ? t.text : t.faint }}>{fieldCount}</span>
            <PriceEditor test={test} t={t} onSaved={onPriceSaved} onToast={onToast} />
            <Toggle test={test} t={t} onToggled={onToggled} onToast={onToast} />
            <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onEdit(test)} title="Edit test" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                    <RiPencilLine size={13} />
                </button>
                {isOwner && <RowDeleteButton testId={test._id} t={t} onDeleted={onDeleted} onToast={onToast} />}
            </div>
        </div>
    );
});

/* ══════════════════════════════════════════════════════════════════
   VIRTUALIZED TABLE BODY
   ══════════════════════════════════════════════════════════════════ */

function VirtualTestList({ visible, t, currentVendorId, onEdit, onPriceSaved, onToggled, onDeleted, onToast }) {
    const parentRef = useRef(null);
    const rowVirtualizer = useVirtualizer({
        count: visible.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
    });

    return (
        <div ref={parentRef} style={{ maxHeight: "62vh", overflowY: "auto" }}>
            <div style={{ position: "relative", height: rowVirtualizer.getTotalSize(), width: "100%" }}>
                {rowVirtualizer.getVirtualItems().map(vItem => {
                    const test = visible[vItem.index];
                    return (
                        <TestRow
                            key={test._id}
                            test={test} t={t} isLast={vItem.index === visible.length - 1}
                            currentVendorId={currentVendorId}
                            onEdit={onEdit} onPriceSaved={onPriceSaved} onToggled={onToggled}
                            onDeleted={onDeleted} onToast={onToast}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: ROW_HEIGHT, transform: `translateY(${vItem.start}px)` }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

function VendorTestInner({ t, currentVendorId }) {
    const showToast = useToast();
    const { tests, loading, error, load, handleSaved, handlePriceSaved, handleToggled, handleDeleted } = useTests();
    const {
        search, setSearch, deptFilter, setDeptFilter, statusFilter, setStatusFilter,
        sortKey, sortDir, handleSort, departments, visible, stats, clearFilters, hasActiveFilters,
    } = useTestFilters(tests);

    const [modal, setModal] = useState(null); // null | "add" | testObj

    const closeModal = useCallback(() => setModal(null), []);
    const openAddModal = useCallback(() => setModal("add"), []);
    const openEditModal = useCallback((test) => setModal(test), []);

    const SortIcon = ({ k }) => sortKey === k
        ? (sortDir === "asc" ? <RiArrowUpLine size={11} /> : <RiArrowDownLine size={11} />)
        : <RiArrowUpLine size={11} style={{ opacity: 0.18 }} />;
    const ColH = ({ label, k }) => (
        <span onClick={() => handleSort(k)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, userSelect: "none" }}>
            {label} <SortIcon k={k} />
        </span>
    );

    return (
        <div>
            <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes toastSlideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        .cat-row:hover { background: ${t.rowHover} !important; }
      `}</style>

            {modal === "add" && <TestFormModal t={t} editTest={null} onClose={closeModal} onSuccess={handleSaved} />}
            {modal && modal !== "add" && <TestFormModal t={t} editTest={modal} onClose={closeModal} onSuccess={handleSaved} />}

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 className="playfair" style={{ fontSize: "1.5rem", fontWeight: 800, color: t.heading, marginBottom: 4 }}>Test Catalogue</h2>
                    <p style={{ fontSize: "0.84rem", color: t.muted }}>Global library — add tests with parameters, ranges and interpretation. Set your own prices.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={load} title="Refresh" style={{ background: t.accentBg, border: `1px solid ${t.accentRing}`, borderRadius: 9, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.accent }}>
                        <RiRefreshLine size={15} />
                    </button>
                    <button onClick={openAddModal} style={{ display: "flex", alignItems: "center", gap: 7, background: t.accent, border: "none", borderRadius: 9, padding: "9px 18px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        <RiAddLine size={15} /> Add Test
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                    { label: "Total Tests", value: stats.total, color: t.accent },
                    { label: "Prices Set", value: stats.priced, color: "#16a34a" },
                    { label: "Active in Lab", value: stats.active, color: "#0ea5e9" },
                    { label: "Not Priced", value: stats.total - stats.priced, color: "#d97706" },
                    { label: "Total Fields", value: stats.params, color: t.muted },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: 110, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "13px 16px" }}>
                        <div style={{ fontSize: "0.68rem", color: t.muted, marginBottom: 4 }}>{s.label}</div>
                        <div className="playfair" style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px" }}>
                    <RiSearchLine size={14} style={{ color: t.faint, flexShrink: 0 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, department…"
                        style={{ background: "none", border: "none", outline: "none", color: t.text, fontSize: "0.84rem", fontFamily: "'DM Sans',sans-serif", width: "100%" }} />
                    {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, display: "flex" }}><RiCloseLine size={14} /></button>}
                </div>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ background: t.inputBg, border: `1px solid ${t.accentRing}`, borderRadius: 10, padding: "8px 12px", color: t.text, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
                    {departments.map(d => <option key={d} value={d}>{d === "ALL" ? "All Departments" : d}</option>)}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                    {STATUS_FILTERS.map(([k, l]) => (
                        <button key={k} onClick={() => setStatusFilter(k)} style={{ padding: "7px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 500, border: `1px solid ${statusFilter === k ? t.accent : t.border}`, background: statusFilter === k ? t.accentBg : "none", color: statusFilter === k ? t.accent : t.navText, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{l}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 12, color: t.muted }}>
                    <RiLoader4Line size={24} style={{ animation: "spin .7s linear infinite" }} /> Loading tests…
                </div>
            ) : error ? (
                <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
                    <RiAlertLine size={32} style={{ marginBottom: 8 }} /><p>{error}</p>
                    <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.accentRing}`, background: t.accentBg, color: t.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
                </div>
            ) : visible.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: t.faint }}>
                    <RiTestTubeLine size={44} style={{ marginBottom: 12 }} />
                    <p className="playfair" style={{ fontSize: "1.1rem", color: t.muted }}>No tests found</p>
                    <p style={{ fontSize: "0.82rem", marginTop: 4 }}>{search ? "Try a different search." : "Click \"Add Test\" to get started."}</p>
                </div>
            ) : (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "11px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: t.muted }}>Showing <strong style={{ color: t.text }}>{visible.length}</strong> of <strong style={{ color: t.text }}>{tests.length}</strong> tests</span>
                        {hasActiveFilters && <button onClick={clearFilters} style={{ fontSize: "0.74rem", color: t.accent, background: "none", border: "none", cursor: "pointer" }}>Clear filters</button>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr 1fr 0.65fr 0.55fr 0.55fr 0.85fr 0.55fr 1.1fr", padding: "9px 20px", background: t.accentBg, borderBottom: `1px solid ${t.border}`, fontSize: "0.66rem", fontWeight: 600, color: t.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                        <ColH label="Test Name" k="name" />
                        <ColH label="Code" k="code" />
                        <ColH label="Department" k="department" />
                        <span>Sample</span>
                        <span>TAT</span>
                        <span title="Number of entry fields (excludes headings)">Fields</span>
                        <ColH label="Your Price" k="vendorPrice" />
                        <span>Active</span>
                        <span>Actions</span>
                    </div>

                    <VirtualTestList
                        visible={visible} t={t} currentVendorId={currentVendorId}
                        onEdit={openEditModal} onPriceSaved={handlePriceSaved}
                        onToggled={handleToggled} onDeleted={handleDeleted} onToast={showToast}
                    />
                </div>
            )}

            {!loading && !error && tests.length > 0 && (
                <p style={{ fontSize: "0.72rem", color: t.faint, marginTop: 14, textAlign: "center" }}>
                    ✏️ Set price · Toggle to enable · Click edit icon to update parameters and interpretation
                </p>
            )}
        </div>
    );
}

export default function VendorTest({ t, currentVendorId }) {
    return (
        <ToastProvider>
            <VendorTestInner t={t} currentVendorId={currentVendorId} />
        </ToastProvider>
    );
}