
import { useState, useEffect, useRef } from "react";
import { RiArrowDownSLine, RiCheckboxCircleLine } from "react-icons/ri";

export default function CustomSelect({
    t,
    value,
    onChange,
    options = [],        // string[] OR { value, label }[]
    label,
    placeholder = "Select...",
    error,
    required,
    disabled,
    width,               // optional fixed width
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef();

    // ── Normalize options to { value, label } ─────────────────────
    const normalized = options.map(o =>
        typeof o === "string" ? { value: o, label: o } : o
    );

    const selected = normalized.find(o => o.value === value);

    // ── Close on outside click ─────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setOpen(false);
    };

    return (
        <div ref={wrapRef} style={{ position: "relative", width: width || "100%" }}>

            {/* Label */}
            {label && (
                <label style={{
                    fontSize: "0.68rem", fontWeight: 600, color: t.muted,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    display: "block", marginBottom: 5,
                }}>
                    {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                </label>
            )}

            {/* Trigger */}
            <div
                onClick={() => !disabled && setOpen(o => !o)}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, padding: "9px 12px",
                    background: t.inputBg,
                    border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : open ? t.accent : t.accentRing}`,
                    borderRadius: 9,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    userSelect: "none",
                    transition: "border-color .15s",
                }}
            >
                <span style={{
                    fontSize: "0.86rem",
                    color: selected ? t.text : t.faint,
                    fontWeight: selected ? 500 : 400,
                    fontFamily: "'DM Sans',sans-serif",
                    flex: 1,
                }}>
                    {selected ? selected.label : placeholder}
                </span>
                <RiArrowDownSLine
                    size={16}
                    style={{
                        color: t.faint, flexShrink: 0,
                        transition: "transform .2s",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                />
            </div>

            {/* Error */}
            {error && (
                <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 3 }}>{error}</p>
            )}

            {/* Dropdown panel — slides down */}
            {open && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: t.card,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: 11,
                    overflow: "hidden",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
                    animation: "dropDown .18s ease",
                }}>
                    {normalized.map((opt, i) => {
                        const isSelected = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "10px 14px",
                                    fontSize: "0.86rem",
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? t.accent : t.text,
                                    background: isSelected ? t.accentBg : "transparent",
                                    borderBottom: i < normalized.length - 1 ? `1px solid ${t.border}` : "none",
                                    cursor: "pointer",
                                    fontFamily: "'DM Sans',sans-serif",
                                    transition: "background .12s",
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) e.currentTarget.style.background = t.rowHover;
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {opt.label}
                                {isSelected && <RiCheckboxCircleLine size={14} style={{ color: t.accent, flexShrink: 0 }} />}
                            </div>
                        );
                    })}
                </div>
            )}

            <style>{`
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}