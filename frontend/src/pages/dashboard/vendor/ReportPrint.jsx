/**
 * ReportPrint.jsx
 *
 * Printable lab report using the native <thead>/<tfoot> repeating-header trick:
 *  - <thead> = letterhead + patient info box — repeats identically on every printed page
 *  - <tfoot> = signatures — always pinned to bottom of page, repeats on every printed page
 *  - <tbody> = test results, one <tr> per logical block — browser naturally flows/breaks
 *    between rows, so long content (like Clinical Notes) continues onto the next page
 *    instead of being visually clipped.
 *  - A trailing spacer <tr height:100%> in <tbody> absorbs any leftover vertical space
 *    on the last page, so <tfoot> (signatures) always sits flush at the bottom of the
 *    page — whether the report has 1 test or 20.
 *
 * Props:
 *   report  — ReportEntry document (with testResults + paramResults)
 *   bill    — Bill document
 *   patient — Patient document
 *   vendor  — Vendor/User document (full profile: logo, businessName, staff[], etc.)
 *   onClose — close handler
 *
 * Install: npm install qrcode.react
 */

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RiPrinterLine, RiCloseLine, RiDownloadLine } from "react-icons/ri";

// ── Helpers ───────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => {
    const dt = new Date(d);
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())} ${dt.getHours() >= 12 ? "PM" : "AM"}`;
};
const fmtDateShort = (d) => {
    const dt = new Date(d);
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

// ── Resolve a staff signature image URL from various possible shapes ──
// Uploads (signatures, logos, etc.) are served as static files from the
// backend's origin — NOT through the /api-prefixed axios baseURL. So this
// needs its own env var, same pattern as api.js but without the /api suffix.
//
// Add to your .env files (Vite):
//   .env.development → VITE_UPLOADS_BASE_URL=http://localhost:5000
//   .env.production  → VITE_UPLOADS_BASE_URL=https://your-deployed-backend.com
//
// (If you're on Create React App instead of Vite, use
//  process.env.REACT_APP_UPLOADS_BASE_URL and prefix env vars with REACT_APP_.)
const API_BASE = import.meta.env.VITE_UPLOADS_BASE_URL || "http://localhost:5000";
const resolveSignatureUrl = (doc) => {
    if (!doc) return "";
    if (doc.signatureUrl) return doc.signatureUrl;
    if (typeof doc.signature === "string") return doc.signature;
    if (doc.signature?.url) return doc.signature.url;
    if (doc.signature?.path) return `${API_BASE}/uploads/${doc.signature.path}`;
    return "";
};

// ── Print trigger ─────────────────────────────────────────────────
// NOTE: We deliberately do NOT rely on CSS (e.g. table height:100vh) to push
// the signature tfoot to the bottom of the page — Chromium's print engine
// does not reliably distribute a table's specified height down into an
// auto-height tbody row, so that approach leaves the signature floating
// right under the content instead of flush at the page bottom.
//
// Instead, right before printing, we MEASURE the actual rendered heights of
// thead/tfoot/tbody in pixels and set the spacer row's height explicitly,
// so the signature block is mathematically guaranteed to land at the exact
// bottom of the last page — whether the report has 1 test or 20.
function doPrint(html) {
    const win = window.open("", "_blank", "width=850,height=1100");
    win.document.write(`<!DOCTYPE html><html><head>
    <title>Lab Report</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;-webkit-print-color-adjust:exact;}
      @page{size:A4;margin:0;}

      /* ── Master table drives pagination ── */
      table.report-doc{width:100%;border-collapse:collapse;}
      thead.report-thead{display:table-header-group;}
      tfoot.report-tfoot{display:table-footer-group;}

      /* Rows that should NOT split mid-content (small, self-contained blocks) */
      tr.row-atomic{break-inside:avoid;page-break-inside:avoid;}
      /* Rows that MAY split across pages if too long (e.g. long interpretation text) */
      tr.row-flow{break-inside:auto;page-break-inside:auto;}

      /* Spacer row — its height is set in px by JS below, right before printing,
         to exactly the leftover space needed to push tfoot to the page bottom. */
      tr.row-spacer td{padding:0;border:none;height:0;}

      @media print{
        html,body{height:auto;}
        .no-print{display:none!important;}
        .page-wrap{width:auto!important;min-height:auto!important;box-shadow:none!important;}
      }
    </style>
  </head><body>${html}<script>
    window.onload = function () {
      try {
        // A4 page height in px at 96dpi — matches the page-wrap minHeight
        // used in the on-screen preview, and @page{size:A4;margin:0}.
        //
        // IMPORTANT — why a SAFETY_BUFFER is subtracted below:
        // There is no reliable way to ask the browser, via JS, for the exact
        // pixel height of a printed page before window.print() actually runs.
        // Print layout is a separate rendering pass not exposed to script
        // ahead of time, so PAGE_HEIGHT here is always an approximation —
        // real print engines (browser build, OS print driver, "save as PDF"
        // vs. a physical printer, sub-pixel/DPI rounding) can differ from
        // this constant by anywhere from a few to a few dozen px.
        //
        // If we fill the spacer to EXACTLY fit our assumed PAGE_HEIGHT and
        // the real usable page height turns out to be even slightly smaller,
        // the table overflows the real page by that small difference. That
        // sliver has nowhere to go but page 2 — and because thead/tfoot are
        // CSS repeating groups (table-header-group / table-footer-group),
        // the browser faithfully reprints the ENTIRE header and footer on
        // that new page even though the only thing pushed onto it is a few
        // invisible px of empty spacer. That's what produced the "extra
        // page with no entries or tests": not duplicated content, just
        // spillover from a spacer that was calculated to fill too precisely.
        //
        // Subtracting a safety buffer means we deliberately underfill by a
        // small, imperceptible margin instead of risking an exact-or-over
        // fill. A signature sitting ~20px short of the literal page edge is
        // invisible in practice; a fabricated blank page is not.
        var PAGE_HEIGHT = 1123;
        var SAFETY_BUFFER = 24;
        var EFFECTIVE_PAGE_HEIGHT = PAGE_HEIGHT - SAFETY_BUFFER;
        // Small additional tolerance so a few px of sub-pixel measurement
        // rounding never tips the "does this fit on one page?" check.
        var TOLERANCE = 4;

        // IMPORTANT: a single print job can contain MORE THAN ONE report
        // table (e.g. printing several reports/bills together). Each table
        // needs its own thead/tfoot/tbody measured and its own spacer set —
        // querySelector() only ever returns the FIRST match in the whole
        // document, which was silently leaving every report after the first
        // one un-padded (its signature landing right under the header with
        // no gap). querySelectorAll + a loop, scoped per table, fixes that.
        var tables = document.querySelectorAll("table.report-doc");

        Array.prototype.forEach.call(tables, function (table) {
          var thead = table.querySelector(".report-thead");
          var tfoot = table.querySelector(".report-tfoot");
          var tbody = table.querySelector("tbody");
          var spacerRow = table.querySelector("tr.row-spacer");
          var spacerTd = spacerRow ? spacerRow.querySelector("td") : null;

          // Reset this table's spacer to 0 first so the tbody measurement
          // below reflects real content only.
          if (spacerTd) spacerTd.style.height = "0px";

          var theadH = thead ? thead.getBoundingClientRect().height : 0;
          var tfootH = tfoot ? tfoot.getBoundingClientRect().height : 0;

          // Measure tbody as ONE block, not by summing individual row
          // heights (avoids double-counting collapsed borders between rows).
          var bodyH = tbody ? tbody.getBoundingClientRect().height : 0;

          // Usable space for body content on this table's first/only page,
          // using the buffered page height so we never risk overfilling.
          var perPageCapacity = EFFECTIVE_PAGE_HEIGHT - theadH - tfootH;
          if (perPageCapacity < 50) perPageCapacity = EFFECTIVE_PAGE_HEIGHT; // safety fallback

          // Only pad with a spacer when confident the real content fits on
          // a single page. For longer, possibly-multi-page content we leave
          // the spacer at 0 and let native pagination flow naturally —
          // forcing exact multi-page math risks fabricating extra pages
          // when atomic (unsplittable) rows get pushed whole to the next page.
          var spacerH = 0;
          if (bodyH <= perPageCapacity + TOLERANCE) {
            spacerH = Math.max(0, perPageCapacity - bodyH);
          }

          if (spacerTd) spacerTd.style.height = spacerH + "px";
        });
      } catch (e) {
        // If measurement fails for any reason, fall back to printing as-is
        // rather than blocking the print entirely.
      }

      // Small delay lets the spacer height changes reflow before print.
      setTimeout(function () {
        window.print();
        setTimeout(function () { window.close(); }, 500);
      }, 50);
    };
  <\/script></body></html>`);
    win.document.close();
}

// ══════════════════════════════════════════════════════════════════
export default function ReportPrint({ report, bill, patient, vendor, onClose }) {
    const contentRef = useRef();

    if (!report || !patient) return null;

    const patientName = `${patient.designation || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim().toUpperCase();
    const reportUrl = `${window.location.origin}/report/${bill?._id || report.billId}`;
    const passCode = (report.billId || bill?._id || "").toString().slice(-8).toUpperCase();

    const handlePrint = () => doPrint(contentRef.current.innerHTML);

    return (
        <>
            {/* ── Preview overlay ── */}
            <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />

                <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 820, background: "#fff", borderRadius: 12, boxShadow: "0 28px 70px rgba(0,0,0,0.5)", maxHeight: "95vh", display: "flex", flexDirection: "column" }}>

                    {/* Top bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: "12px 12px 0 0", flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1f2937", fontFamily: "'DM Sans',sans-serif" }}>
                            Lab Report — {patient.patientId}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                <RiPrinterLine size={14} /> Print Report
                            </button>
                            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: "0.84rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                <RiCloseLine size={15} /> Close
                            </button>
                        </div>
                    </div>

                    {/* Scrollable preview */}
                    <div style={{ flex: 1, overflowY: "auto", background: "#f3f4f6", padding: 20 }}>
                        <div ref={contentRef}>
                            <ReportDocument
                                report={report} bill={bill} patient={patient}
                                vendor={vendor} patientName={patientName}
                                reportUrl={reportUrl} passCode={passCode}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════════════════════
// REPORT DOCUMENT — a single master <table> so thead/tfoot repeat
// natively on every printed page, and tbody rows flow/break normally.
// ══════════════════════════════════════════════════════════════════
function ReportDocument({ report, bill, patient, vendor, patientName, reportUrl, passCode }) {
    // Group testResults by department
    const byDept = {};
    for (const tr of report.testResults) {
        const dept = tr.department || "GENERAL";
        if (!byDept[dept]) byDept[dept] = [];
        byDept[dept].push(tr);
    }

    // ── All active staff ─────────────────────────────────────────
    const doctors = (vendor?.staff || []).filter(s => s.role === "doctor");
    const technicians = (vendor?.staff || []).filter(s => s.role === "technician");

    return (
        <div className="page-wrap" style={{ width: "794px", minHeight: "1123px", margin: "0 auto", background: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.12)" }}>
            <table className="report-doc" style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#000" }}>

                {/* ═══ THEAD — letterhead + patient info — repeats on every printed page ═══ */}
                <thead className="report-thead">
                    <tr>
                        <td style={{ padding: "24px 36px 10px" }}>

                            {/* Letterhead */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottom: "2.5px solid #1d4ed8" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    {vendor?.logoUrl ? (
                                        <img src={vendor.logoUrl} alt="Lab Logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }} />
                                    ) : (
                                        <div style={{ width: 52, height: 52, background: "#1d4ed8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                                                <path d="M8 4h6v12l8 12H10L2 16V4h6z" fill="#fff" opacity="0.8" />
                                                <circle cx="24" cy="8" r="5" fill="#fff" opacity="0.6" />
                                            </svg>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: "19px", fontWeight: 900, color: "#1d4ed8", letterSpacing: "0.5px", lineHeight: 1.1 }}>
                                            {vendor?.businessName || vendor?.name || "Lab Name"}
                                        </div>
                                        <div style={{ fontSize: "10.5px", color: "#374151", marginTop: 2, lineHeight: 1.5 }}>
                                            {vendor?.address && <span>{vendor.address}</span>}
                                            {vendor?.city && <span>{`, ${vendor.city}`}</span>}
                                            {vendor?.state && <span>{`, ${vendor.state}`}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: 5 }}>
                                        Regd. No.: {patient?.patientId || vendor?.vendorId || "XXXX"}
                                    </div>
                                    {vendor?.phone && (
                                        <div style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 2 }}>
                                            <span style={{ color: "#1d4ed8" }}>✆</span> {vendor.phone}
                                        </div>
                                    )}
                                    {vendor?.email && (
                                        <div style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 2 }}>
                                            <span style={{ color: "#1d4ed8" }}>✉</span> {vendor.email}
                                        </div>
                                    )}
                                    {vendor?.website && (
                                        <div style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                                            <span style={{ color: "#1d4ed8" }}>🌐</span> {vendor.website}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Patient info box — part of the repeating header */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, padding: "10px 0 8px", borderBottom: "1px solid #d1d5db" }}>
                                <div>
                                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#000", marginBottom: 2 }}>{patientName}</div>
                                    <PatInfo label="Age / Sex" value={`${patient.age} YRS / ${patient.gender?.charAt(0).toUpperCase()}`} />
                                    <PatInfo label="Referred by" value={patient.referringDoctor || "Self"} />
                                    <PatInfo label="Reg. no." value={patient.patientId} />
                                    {patient.phone && <PatInfo label="Mobile" value={patient.phone} />}
                                </div>
                                <div style={{ fontSize: "9.5px", lineHeight: 1.7, color: "#374151" }}>
                                    <div><strong>Registered on</strong> : {fmtDate(bill?.billingDate || report.createdAt)}</div>
                                    <div><strong>Collected on</strong>  : {fmtDateShort(bill?.billingDate || report.createdAt)}</div>
                                    <div><strong>Received on</strong>   : {fmtDateShort(bill?.billingDate || report.createdAt)}</div>
                                    <div><strong>Reported on</strong>   : {fmtDate(report.updatedAt || report.createdAt)}</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <QRCodeSVG value={reportUrl} size={62} level="M" />
                                    <div style={{ fontSize: "8.5px", marginTop: 3, color: "#6b7280" }}>Scan to download</div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </thead>

                {/* ═══ TFOOT — signatures — always at bottom, repeats on every printed page ═══ */}
                <tfoot className="report-tfoot">
                    <tr>
                        <td style={{ padding: "10px 36px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 14, borderTop: "1px solid #d1d5db", flexWrap: "wrap", gap: 16 }}>
                                {technicians.map(tech => (
                                    <SignatoryBlock key={tech._id} doc={tech} />
                                ))}
                                {(doctors.length + technicians.length) <= 1 && (
                                    <div style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
                                        Page 1 of 1
                                    </div>
                                )}
                                {doctors.map(doc => (
                                    <SignatoryBlock key={doc._id} doc={doc} />
                                ))}
                            </div>
                            {(doctors.length + technicians.length) > 1 && (
                                <div style={{ textAlign: "center", fontSize: "10px", color: "#9ca3af", marginTop: 6 }}>
                                    Page 1 of 1
                                </div>
                            )}
                        </td>
                    </tr>
                </tfoot>

                {/* ═══ TBODY — test results, one <tr> per block so pages break between rows ═══ */}
                <tbody>
                    {Object.entries(byDept).map(([dept, tests]) => (
                        <React.Fragment key={dept}>

                            {/* Department heading — its own row, atomic */}
                            <tr className="row-atomic">
                                <td style={{ padding: "10px 36px 0" }}>
                                    <div style={{ textAlign: "center", fontWeight: 800, fontSize: "12px", letterSpacing: "1px", color: "#000", textTransform: "uppercase" }}>
                                        {dept}
                                    </div>
                                </td>
                            </tr>

                            {tests.map(testResult => (
                                <React.Fragment key={testResult._id}>

                                    {/* Test name + parameters table — atomic (kept together if reasonably sized) */}
                                    <tr className="row-atomic">
                                        <td style={{ padding: "6px 36px" }}>
                                            <div style={{ textAlign: "center", fontWeight: 700, fontSize: "11.5px", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", color: "#111" }}>
                                                {testResult.testName}
                                            </div>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
                                                <thead>
                                                    <tr style={{ background: "#e8f0fe" }}>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, border: "1px solid #c7d2e0", width: "38%" }}>TEST</th>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, border: "1px solid #c7d2e0", width: "18%" }}>VALUE</th>
                                                        <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, border: "1px solid #c7d2e0", width: "6%" }}>FLAG</th>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, border: "1px solid #c7d2e0", width: "14%" }}>UNIT</th>
                                                        <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, border: "1px solid #c7d2e0", width: "24%" }}>REFERENCE</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {testResult.paramResults
                                                        .filter(p => p.showInReport !== false)
                                                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                                        .map((param, idx) => (
                                                            <PrintParamRow key={param._id || idx} param={param} />
                                                        ))}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>

                                    {/* Interpretation / Clinical Notes — its own row, allowed to FLOW across pages
                                        if too long (this is what fixes the visible clipping bug) */}
                                    {testResult.interpretation && testResult.interpretation.trim() && (
                                        <tr className="row-flow">
                                            <td style={{ padding: "0 36px 10px" }}>
                                                <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "10px", lineHeight: 1.7, color: "#374151" }}>
                                                    <div style={{ fontWeight: 700, fontSize: "10.5px", marginBottom: 5, color: "#1d4ed8" }}>Clinical Notes</div>
                                                    <div style={{ whiteSpace: "pre-wrap" }}>{testResult.interpretation}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Report-level notes — its own row, atomic (usually short) */}
                    {report.notes && report.notes.trim() && (
                        <tr className="row-atomic">
                            <td style={{ padding: "0 36px 16px" }}>
                                <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, fontSize: "10px", color: "#92400e" }}>
                                    <strong>Note: </strong>{report.notes}
                                </div>
                            </td>
                        </tr>
                    )}

                    {/* Spacer row — height is calculated and set in px by JS in doPrint(),
                        right before window.print() is called, based on the actual measured
                        height of thead/tfoot/tbody. This pushes tfoot (signatures) flush to
                        the bottom of the last page, no matter how few or many test results
                        are above it. Renders as an empty, borderless cell in print preview
                        until the script sets its height. */}
                    <tr className="row-spacer" aria-hidden="true">
                        <td />
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ── Patient info row ──────────────────────────────────────────────
function PatInfo({ label, value }) {
    return (
        <div style={{ display: "flex", gap: 8, fontSize: "10px", padding: "1px 0" }}>
            <span style={{ fontWeight: 700, minWidth: 82, color: "#374151" }}>{label}</span>
            <span style={{ color: "#000" }}>: {value}</span>
        </div>
    );
}

// ── Single staff signatory block (doctor or technician) ───────────
function SignatoryBlock({ doc }) {
    const sigUrl = resolveSignatureUrl(doc);
    return (
        <div style={{ textAlign: "center", minWidth: 140 }}>
            <div style={{ height: 40, marginBottom: 4, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {sigUrl ? (
                    <img src={sigUrl} alt="Signature" style={{ maxHeight: 38, maxWidth: 140, objectFit: "contain" }} />
                ) : (
                    <div style={{ fontStyle: "italic", fontSize: "16px", fontFamily: "cursive", color: "#374151", lineHeight: "40px" }}>
                        {doc.name?.split(" ").slice(-1)[0]}
                    </div>
                )}
            </div>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 4, fontSize: "10.5px", fontWeight: 700 }}>
                {doc.name}
            </div>
            <div style={{ fontSize: "9.5px", color: "#6b7280" }}>{doc.degree || ""}</div>
        </div>
    );
}

// ── Single parameter print row ────────────────────────────────────
function PrintParamRow({ param }) {
    const isHeading = param.fieldType === "heading";
    const isAbnormal = param.flag === "H" || param.flag === "L";
    const isHigh = param.flag === "H";
    const isLow = param.flag === "L";

    if (isHeading) {
        return (
            <tr style={{ background: "#f1f5f9" }}>
                <td colSpan={5} style={{ padding: "6px 10px", fontWeight: 700, fontSize: "10.5px", border: "1px solid #c7d2e0", letterSpacing: "0.3px" }}>
                    {param.name}
                </td>
            </tr>
        );
    }

    const range = param.rangeText ||
        (param.rangeMin !== null && param.rangeMax !== null ? `${param.rangeMin} - ${param.rangeMax}`
            : param.rangeMin !== null ? `> ${param.rangeMin}`
                : param.rangeMax !== null ? `< ${param.rangeMax}` : "");

    const valueColor = isHigh ? "#dc2626" : isLow ? "#2563eb" : "#000";

    return (
        <tr style={{ background: isAbnormal ? (isHigh ? "rgba(239,68,68,0.04)" : "rgba(37,99,235,0.04)") : "transparent" }}>
            <td style={{
                padding: `5px 10px`,
                paddingLeft: param.isSubField ? 24 : 10,
                border: "1px solid #e2e8f0",
                fontWeight: isAbnormal ? 700 : 400,
                fontSize: "10.5px",
                color: "#111",
            }}>
                {param.name}
            </td>
            <td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", fontWeight: isAbnormal ? 800 : 500, color: valueColor, fontSize: "10.5px" }}>
                {param.value || "—"}
            </td>
            <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 800, color: valueColor, fontSize: "10.5px" }}>
                {param.flag && param.flag !== "N" ? param.flag : ""}
            </td>
            <td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#374151", fontSize: "10px" }}>
                {param.unit || ""}
            </td>
            <td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#374151", fontSize: "10px" }}>
                {range}
                {isAbnormal && range && (
                    <span style={{ marginLeft: 6, color: valueColor, fontWeight: 700 }}>
                        {isHigh ? "↑" : "↓"}
                    </span>
                )}
            </td>
        </tr>
    );
}