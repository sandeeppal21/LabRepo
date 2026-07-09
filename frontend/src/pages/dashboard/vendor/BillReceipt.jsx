/**
 * BillReceipt.jsx
 *
 * Printable bill receipt — matches the sample image style.
 * Shows: lab header, patient info, test list, totals, QR code, Net ID/Pass.
 *
 * Usage:
 *   <BillReceipt bill={billObj} vendor={vendorObj} onClose={() => ...} />
 *
 * Print: Renders a hidden print-only div that appears on window.print()
 * QR code: Uses qrcode.react library  →  npm install qrcode.react
 */

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RiPrinterLine, RiCloseLine, RiDownloadLine } from "react-icons/ri";

// ── Generate a short pass code from bill ID ───────────────────────
const passCode = (billId = "") =>
    billId.toString().slice(-8).toUpperCase();

// ── Format date ────────────────────────────────────────────────────
const fmtDate = (d) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

const fmtTime = (d) => {
    const dt = new Date(d);
    let h = dt.getHours(), m = String(dt.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
};

export default function BillReceipt({ bill, vendor, onClose }) {
    const printRef = useRef();

    if (!bill || !vendor) return null;

    const patient = bill.patient;
    const netId = patient?.patientId || bill.patientId;
    const pass = passCode(bill._id);
    const reportUrl = `${window.location.origin}/report/${bill._id}`;

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open("", "_blank", "width=794,height=1123");
        win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.billNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
            img { max-width: 100%; display: block; }
            .receipt { width: 100%; max-width: 720px; margin: 0 auto; padding: 20px 28px; }
            .lab-name { font-size: 18px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
            .lab-addr { font-size: 10px; text-align: center; margin-top: 4px; }
            .barcode-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; }
            .title-row { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-decoration: underline; margin: 10px 0 6px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 20px; margin: 6px 0; }
            .info-row { display: flex; gap: 8px; font-size: 10.5px; padding: 2px 0; }
            .info-label { font-weight: 700; min-width: 80px; }
            hr { border: none; border-top: 1px solid #000; margin: 8px 0; }
            .received-line { font-size: 10.5px; margin: 6px 0 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { font-weight: 700; text-align: left; padding: 4px 6px; border-bottom: 1px solid #000; }
            th.right, td.right { text-align: right; }
            td { padding: 4px 6px; }
            .totals-section { margin-top: 16px; float: right; min-width: 240px; }
            .total-row { display: flex; justify-content: space-between; gap: 40px; font-size: 10.5px; padding: 2px 0; }
            .total-row.bold { font-weight: 700; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
            .footer { margin-top: 40px; border-top: 1px solid #000; padding-top: 10px; font-size: 9.5px; }
            .footer-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
            .net-id-box { border: 1.5px solid #000; padding: 5px 12px; font-size: 11px; font-weight: 700; }
            .qr-section { text-align: center; }
            .clearfix::after { content:""; display:table; clear:both; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
        win.document.close();
    };

    return (
        <>
            {/* ── Preview modal ── */}
            <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />

                <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 760, background: "#fff", borderRadius: 12, boxShadow: "0 28px 70px rgba(0,0,0,0.5)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

                    {/* Modal top bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: "12px 12px 0 0" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1f2937", fontFamily: "'DM Sans',sans-serif" }}>
                            Receipt — {bill.billNumber}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                <RiPrinterLine size={14} /> Print
                            </button>
                            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: "0.84rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                <RiCloseLine size={15} /> Close
                            </button>
                        </div>
                    </div>

                    {/* Scrollable receipt preview */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#f3f4f6" }}>
                        <div ref={printRef} style={{ background: "#fff", padding: "28px 32px", fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#000", boxShadow: "0 2px 16px rgba(0,0,0,0.1)", borderRadius: 6 }}>
                            <ReceiptContent bill={bill} vendor={vendor} netId={netId} pass={pass} reportUrl={reportUrl} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Receipt content (rendered both in preview + print window) ─────
function ReceiptContent({ bill, vendor, netId, pass, reportUrl }) {
    const patient = bill.patient;
    const patientName = `${patient?.designation || ""} ${patient?.firstName || ""} ${patient?.lastName || ""}`.trim().toUpperCase();

    return (
        <div className="receipt" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#000" }}>

            {/* ── LAB HEADER ── */}
            <div className="barcode-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

                {/* Logo (if available) + Lab name + address */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
                    {vendor?.logoUrl && (
                        <img
                            src={vendor.logoUrl}
                            alt={vendor.businessName || vendor.name || "Lab"}
                            style={{
                                width: 64, height: 64,
                                objectFit: "contain",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                padding: 3,
                                flexShrink: 0,
                            }}
                        />
                    )}
                    <div>
                        <div className="lab-name" style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                            {vendor.businessName || vendor.name}
                        </div>
                        <div style={{ fontSize: "10px", textAlign: "left", marginTop: 4, lineHeight: 1.6, color: "#222" }}>
                            {vendor.address && <span>{vendor.address}</span>}
                            {vendor.city && <span>{`, ${vendor.city}`}</span>}
                            {vendor.state && <span>{`, ${vendor.state}`}</span>}
                            {(vendor.phone || vendor.email) && (
                                <div style={{ marginTop: 2 }}>
                                    {vendor.phone && `Tel: ${vendor.phone}`}
                                    {vendor.phone && vendor.email && " | "}
                                    {vendor.email && vendor.email}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* QR code top-right */}
                <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 20 }}>
                    <QRCodeSVG value={reportUrl} size={60} level="M" />
                    <div style={{ fontSize: "9px", marginTop: 3, color: "#555" }}>{netId}</div>
                </div>
            </div>

            {/* ── RECEIPT title ── */}
            <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, letterSpacing: "3px", textDecoration: "underline", margin: "10px 0 6px", textTransform: "uppercase" }}>
                RECEIPT
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #000", margin: "4px 0 8px" }} />

            {/* ── PATIENT INFO GRID ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 0", marginBottom: 4 }}>
                {/* Left column */}
                <div>
                    <InfoRow label="Name" value={patientName} bold />
                    <InfoRow label="Patient Id" value={netId} />
                    <InfoRow label="Gender / Age" value={`${patient?.gender?.charAt(0).toUpperCase() + patient?.gender?.slice(1) || ""} / ${patient?.age} ${patient?.ageType}`} />
                    {patient?.phone && <InfoRow label="Mobile" value={patient.phone} />}
                </div>
                {/* Right column */}
                <div>
                    <InfoRow label="Receipt No." value={bill.billNumber} />
                    <InfoRow label="Registration Date" value={`${fmtDate(bill.billingDate)} ${fmtTime(bill.billingDate)}`} />
                    <InfoRow label="PID" value={netId} />
                    {/* {patient?.referringDoctor && <InfoRow label="Ref. Dr." value={patient.referringDoctor} />} */}
                    {bill.referringDoctorName && <InfoRow label="Ref. Dr." value={bill.referringDoctorName} />}
                </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #000", margin: "6px 0" }} />

            {/* ── RECEIVED LINE ── */}
            <div style={{ fontSize: "10.5px", margin: "6px 0 12px" }}>
                Received with thanks a sum of{" "}
                <strong>Rs. {bill.amountPaid}</strong>{" "}
                from <strong>{patientName}</strong>{" "}
                By : <strong>{bill.paymentMode?.toUpperCase()}</strong>
                {bill.transactionId ? ` (Txn: ${bill.transactionId})` : ""}
                {vendor.businessName ? ` on a/c of : ${vendor.businessName}` : ""}
            </div>

            {/* ── TEST TABLE ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
                <thead>
                    <tr>
                        <th style={{ fontWeight: 700, textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #000" }}>Sr.</th>
                        <th style={{ fontWeight: 700, textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #000" }}>Service Name</th>
                        <th style={{ fontWeight: 700, textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #000" }}>Code</th>
                        {bill.items?.some(i => i.isUrgent) && (
                            <th style={{ fontWeight: 700, textAlign: "center", padding: "4px 6px", borderBottom: "1px solid #000" }}>Urgent</th>
                        )}
                        {bill.items?.some(i => i.discount > 0) && (
                            <th style={{ fontWeight: 700, textAlign: "right", padding: "4px 6px", borderBottom: "1px solid #000" }}>Discount</th>
                        )}
                        <th style={{ fontWeight: 700, textAlign: "right", padding: "4px 6px", borderBottom: "1px solid #000" }}>Charge (Rs.)</th>
                    </tr>
                </thead>
                <tbody>
                    {bill.items?.map((item, i) => (
                        <tr key={item._id || i}>
                            <td style={{ padding: "4px 6px", verticalAlign: "top" }}>{i + 1}</td>
                            <td style={{ padding: "4px 6px", verticalAlign: "top" }}>
                                {item.testName}
                                {item.isUrgent && <span style={{ fontSize: "9px", color: "#dc2626", fontWeight: 700, marginLeft: 6 }}>URGENT</span>}
                            </td>
                            <td style={{ padding: "4px 6px", verticalAlign: "top", color: "#555" }}>{item.testCode}</td>
                            {bill.items?.some(i => i.isUrgent) && (
                                <td style={{ padding: "4px 6px", textAlign: "center" }}>{item.isUrgent ? "✓" : ""}</td>
                            )}
                            {bill.items?.some(i => i.discount > 0) && (
                                <td style={{ padding: "4px 6px", textAlign: "right" }}>{item.discount > 0 ? `-${item.discount}` : ""}</td>
                            )}
                            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 500 }}>{item.netPrice}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── TOTALS ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <div style={{ minWidth: 260 }}>
                    <TotalRow label="Total Amount" value={`Rs.    ${bill.subtotal}`} />
                    {bill.totalDiscount > 0 && <TotalRow label="Discount" value={`Rs.    -${bill.totalDiscount}`} />}
                    {bill.totalDiscount > 0 && <TotalRow label="Net Amount" value={`Rs.    ${bill.grandTotal}`} bold />}
                    <TotalRow label="Received" value={`Rs.    ${bill.amountPaid}`} />
                    <TotalRow label="Balance" value={`Rs.    ${bill.dueAmount}`} bold last />
                </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ marginTop: 40, borderTop: "1px solid #000", paddingTop: 10 }}>
                <div style={{ fontSize: "9.5px", lineHeight: 1.6, marginBottom: 8, color: "#222" }}>
                    Please check your report Online at the following address:-<br />
                    <strong>{window.location.origin}/view-reports</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "9px", color: "#444", maxWidth: "55%" }}>
                        * Hard Copy of Reports available as per lab schedule.<br />
                        * This is a computer generated receipt and does not require signature.
                    </div>

                    {/* Net ID / Pass box */}
                    <div style={{ border: "2px solid #000", padding: "6px 14px", fontSize: "11px", fontWeight: 700, textAlign: "center" }}>
                        Net Id / Pass :&nbsp;&nbsp;
                        <span style={{ letterSpacing: "2px" }}>{netId} / {passCode(bill._id)}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

// ── Small helpers ─────────────────────────────────────────────────
function InfoRow({ label, value, bold }) {
    return (
        <div style={{ display: "flex", gap: 6, fontSize: "10.5px", padding: "2px 0" }}>
            <span style={{ fontWeight: 700, minWidth: 100 }}>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
        </div>
    );
}

function TotalRow({ label, value, bold, last }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between",
            gap: 40, fontSize: "10.5px", padding: "2px 0",
            fontWeight: bold ? 700 : 400,
            borderTop: last ? "1px solid #000" : "none",
            paddingTop: last ? 4 : 2,
            marginTop: last ? 2 : 0,
        }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}