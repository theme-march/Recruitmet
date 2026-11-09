"use client";

import { CheckCircle2, FileText, Printer, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ReceiptItem = {
  sl?: number;
  date: string;
  type: string;
  method?: string;
  reference?: string;
  amount: number;
  notes?: string;
};

export type ReceiptData = {
  receiptNo: string;
  date: string;
  candidateName: string;
  candidateNo?: string;
  fileNo: string;
  passportNo?: string;
  phone?: string;
  country: string;
  profession?: string;
  agent?: string;
  company?: string;
  currentStage?: string;
  paymentType: string;
  paymentMethod: string;
  referenceNo?: string;
  amount: number;
  totalPackage?: number;
  grossPackage?: number;
  discount?: number;
  previouslyPaid?: number;
  totalPaid?: number;
  officerName?: string;
  notes?: string;
  isMasterReceipt?: boolean;
  items?: ReceiptItem[];
  dob?: string;
};

export function cleanPaymentType(rawType?: string): string {
  if (!rawType || !rawType.trim()) return "Candidate Deposit";
  const trimmed = rawType.trim();
  const upper = trimmed.toUpperCase();

  // Expand internal technical short codes ONLY:
  if (upper === "MAD") return "Final Settlement & BMET Clearance Deposit";
  if (upper === "DEP") return "Candidate Deposit";

  // If user entered all lowercase (e.g. "visa apply fee"), capitalize first letter of each word: "Visa Apply Fee"
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }

  // Preserve the exact payment title/purpose entered by user
  return trimmed;
}

// Convert number to English words
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.round(Math.abs(num));
  if (n === 0) return "Zero Taka Only";
  const str = ("000000000" + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!str) return `${n} Taka Only`;
  let words = "";
  words += str[1] !== "00" ? (a[Number(str[1])] || b[Number(str[1][0])] + " " + a[Number(str[1][1])]) + "Crore " : "";
  words += str[2] !== "00" ? (a[Number(str[2])] || b[Number(str[2][0])] + " " + a[Number(str[2][1])]) + "Lakh " : "";
  words += str[3] !== "00" ? (a[Number(str[3])] || b[Number(str[3][0])] + " " + a[Number(str[3][1])]) + "Thousand " : "";
  words += str[4] !== "0" ? (a[Number(str[4])] || b[Number(str[4][0])] + " " + a[Number(str[4][1])]) + "Hundred " : "";
  words += str[5] !== "00" ? (words !== "" ? "and " : "") + (a[Number(str[5])] || b[Number(str[5][0])] + " " + a[Number(str[5][1])]) : "";
  return words.trim() + " Bangladeshi Taka Only";
}

export function MoneyReceiptModal({
  receipt,
  receipts,
  initialIndex,
  onClose,
}: {
  receipt?: ReceiptData;
  receipts?: ReceiptData[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  const receiptsList = receipts && receipts.length > 0 ? receipts : receipt ? [receipt] : [];
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex !== undefined && initialIndex >= 0 && initialIndex < receiptsList.length) {
      return initialIndex;
    }
    return 0;
  });

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("printing-money-receipt");
    return () => {
      document.body.classList.remove("printing-money-receipt");
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const active = receiptsList[currentIndex] || receipt;
  if (!active) return null;

  const totalPackage = active.totalPackage || 350000;
  const hasDiscount = Boolean(active.discount && active.discount > 0);
  const grossPackage = active.grossPackage || (hasDiscount ? totalPackage + (active.discount || 0) : totalPackage);

  const isMaster = Boolean(active.isMasterReceipt || (active.items && active.items.length > 1));

  const previouslyPaid =
    active.previouslyPaid !== undefined
      ? active.previouslyPaid
      : Math.max(0, (active.totalPaid ?? active.amount) - active.amount);

  const totalPaidAtThisReceipt = isMaster
    ? (active.totalPaid ?? active.amount)
    : previouslyPaid + active.amount;

  const balanceRemaining = Math.max(0, totalPackage - totalPaidAtThisReceipt);
  const advanceAmount = Math.max(0, totalPaidAtThisReceipt - totalPackage);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Official Money Receipt"
      className="receipt-modal-overlay master-modal-overlay"
      onClick={onClose}
    >
      <div
        className="receipt-modal-container master-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100dvh - 32px)",
          maxWidth: "880px",
          width: "100%",
          overflow: "hidden",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.28)",
          position: "relative",
          padding: 0,
        }}
      >
        {/* Sticky Action Bar (Hidden when printing) */}
        <div
          className="receipt-modal-actions no-print"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                display: "grid",
                placeItems: "center",
                color: "#059669",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  {isMaster ? "Master Money Receipt / Statement" : "Official Money Receipt Voucher"}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: isMaster ? "#059669" : "#007aff",
                    background: isMaster ? "#ecfdf5" : "#eff6ff",
                    border: `1px solid ${isMaster ? "#a7f3d0" : "#bfdbfe"}`,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                  }}
                >
                  {isMaster ? "MASTER STATEMENT" : active.receiptNo}
                </span>
              </div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                {active.candidateName} · {active.fileNo} · {active.country}
              </span>
            </div>
          </div>

          {/* Multiple Voucher / Master Switcher Tabs */}
          {receiptsList.length > 1 && (
            <div
              className="portal-scroll"
              style={{
                display: "flex",
                gap: "4px",
                background: "#f1f5f9",
                padding: "3px",
                borderRadius: "8px",
                overflowX: "auto",
                maxWidth: "100%",
              }}
            >
              {receiptsList.map((r, idx) => {
                const isItemMaster = Boolean(r.isMasterReceipt);
                const label = isItemMaster
                  ? "Master Statement"
                  : `Voucher #${r.receiptNo ? r.receiptNo.slice(-6) : idx + 1} (৳${r.amount.toLocaleString()})`;

                return (
                  <button
                    key={r.receiptNo + idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      border: "none",
                      background: currentIndex === idx ? (isItemMaster ? "#059669" : "#007aff") : "transparent",
                      color: currentIndex === idx ? "#ffffff" : "#475569",
                      fontWeight: currentIndex === idx ? 700 : 500,
                      fontSize: "12px",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isItemMaster ? "📑 " : ""}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="portal-print-btn portal-print-btn-blue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: "#475569",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "8px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Paper Area */}
        <div
          className="portal-scroll"
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "28px 32px",
            background: "#ffffff",
          }}
        >
          {/* Printable Paper - Minimalist Design matching user invoice reference */}
          <div
            className="money-receipt-paper printable-area"
            id="printable-receipt"
            style={{
              padding: "24px 28px",
              background: "#ffffff",
              color: "#0f172a",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {/* Top Header Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "24px",
              }}
            >
              {/* Left Column: Invoice No, Must Read, Date */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.4px",
                    marginBottom: "16px",
                  }}
                >
                  {isMaster ? "Statement No:" : "Invoice / Receipt No:"} #{active.receiptNo}
                </div>

                <div style={{ marginBottom: "14px", maxWidth: "420px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: "4px",
                    }}
                  >
                    Must Read:
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11.5px",
                      color: "#64748b",
                      lineHeight: "1.5",
                    }}
                  >
                    Official computer-generated payment voucher from Orbit Overseas Recruitment. Preserved for embassy visa stamping, GAMCA medical clearance, and BMET smart card issuance.
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: "2px",
                    }}
                  >
                    Date Of Services / Issue:
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155" }}>
                    {active.date}
                  </div>
                </div>
              </div>

              {/* Right Column: Agency Branding & Contact (Matching reference invoice header) */}
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <img
                    src="/logo.png"
                    alt="Orbit Logo"
                    width={38}
                    height={38}
                    style={{ objectFit: "contain" }}
                  />
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#007aff",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ORBIT
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  ORBIT OVERSEAS RECRUITMENT
                </div>
                <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "2px" }}>
                  Govt. Approved RL-1284 · BMET Reg.
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Orbit Tower, Level 6, Dhaka, Bangladesh
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  accounts@orbitoverseas.com
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  +880 1700-000000
                </div>
              </div>
            </div>

            {/* Subtle Divider Line */}
            <div
              style={{
                height: "1px",
                background: "#e2e8f0",
                margin: "22px 0 18px 0",
              }}
            />

            {/* Section Title */}
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "16px",
              }}
            >
              Candidate Information
            </div>

            {/* 3-Column Key-Value Layout (Exact Match to User Reference) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "14px 24px",
                marginBottom: "24px",
              }}
            >
              {/* Column 1 */}
              <div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Candidate Name:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.candidateName}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Candidate Birth Date:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.dob || "20/08/1999 (27 yrs)"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Payment Mode:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Candidate ID:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#007aff", fontFamily: "monospace" }}>
                    {active.candidateNo || "CAN-260002"}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Profession / Trade:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.profession || "General Worker"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    File Number:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.fileNo}
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Passport Number:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.passportNo || "—"}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Destination Country:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#334155" }}>
                    {active.country}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>
                    Agent / Partner Source:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#007aff" }}>
                    {active.agent || "Al-Ameen Travels & Tours (AGT-001)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table - Clean Minimal Style (matching user reference) */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "16px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    borderBottom: "1px solid #e2e8f0",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "10px 12px", width: "45px", fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
                    SL
                  </th>
                  <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
                    Details / Purpose
                  </th>
                  <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: 700, color: "#334155", width: "160px" }}>
                    Payment Mode
                  </th>
                  <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: 700, color: "#334155", width: "150px" }}>
                    {isMaster ? "Date" : "Reference No"}
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11.5px", fontWeight: 700, color: "#334155", width: "150px" }}>
                    Amount (BDT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {isMaster && active.items && active.items.length > 0 ? (
                  active.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "11px 12px", color: "#64748b", fontSize: "12px" }}>
                        {item.sl || idx + 1}
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                          {cleanPaymentType(item.type)}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "11px 12px", color: "#334155", fontSize: "12px" }}>
                        <div>{item.method || "Cash at Office"}</div>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                          {item.reference || "OFFICE-REC"}
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", color: "#334155", fontSize: "12px" }}>
                        {item.date}
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        ৳ {item.amount.toLocaleString()}.00
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 12px", color: "#64748b", fontSize: "12px" }}>
                      1
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                        {cleanPaymentType(active.paymentType)}
                      </div>
                      {active.notes && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {active.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "11px 12px", color: "#334155", fontSize: "12.5px" }}>
                      {active.paymentMethod}
                    </td>
                    <td style={{ padding: "11px 12px", fontFamily: "monospace", color: "#475569", fontSize: "12px" }}>
                      {active.referenceNo || "OFFICE-CASH"}
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                      ৳ {active.amount.toLocaleString()}.00
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Bottom Summary Section (Pay By on left, Totals on right matching user reference) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "16px 4px 14px 4px",
                borderBottom: "1px solid #e2e8f0",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              {/* Left Column: Pay By & Status */}
              <div style={{ flex: 1, minWidth: "260px" }}>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Pay By
                </div>
                <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                  <div>
                    {active.paymentMethod} · Ref:{" "}
                    <span style={{ fontFamily: "monospace", color: "#0f172a" }}>
                      {active.referenceNo || "OFFICE-REC"}
                    </span>
                  </div>
                  <div>
                    Agreed Package: <b>৳ {totalPackage.toLocaleString()} BDT</b>
                    {hasDiscount && (
                      <span style={{ color: "#059669", marginLeft: "6px" }}>
                        (Disc: -৳{active.discount?.toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div>
                    Payment Status:{" "}
                    <b style={{ color: balanceRemaining > 0 ? "#dc2626" : "#059669" }}>
                      {balanceRemaining > 0
                        ? `৳ ${balanceRemaining.toLocaleString()} Due Remaining`
                        : "100% Settled (No Due)"}
                    </b>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial Totals Table */}
              <div style={{ width: "320px", maxWidth: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#475569",
                    padding: "3px 0",
                  }}
                >
                  <span>Total Contract Package:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    ৳ {totalPackage.toLocaleString()}.00
                  </span>
                </div>

                {!isMaster && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "#475569",
                        padding: "3px 0",
                      }}
                    >
                      <span>Previously Paid:</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        ৳ {previouslyPaid.toLocaleString()}.00
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "#475569",
                        padding: "3px 0",
                      }}
                    >
                      <span>This Voucher Deposit:</span>
                      <span style={{ fontWeight: 600, color: "#059669" }}>
                        ৳ {active.amount.toLocaleString()}.00
                      </span>
                    </div>
                  </>
                )}

                <div style={{ height: "1px", background: "#e2e8f0", margin: "6px 0" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {isMaster ? "Total Amount Received:" : "Total Received to Date:"}
                  </span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    ৳ {totalPaidAtThisReceipt.toLocaleString()}.00
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    padding: "3px 0",
                  }}
                >
                  <span style={{ color: "#475569" }}>Remaining Balance Due:</span>
                  {balanceRemaining > 0 ? (
                    <span style={{ fontWeight: 700, color: "#dc2626" }}>
                      ৳ {balanceRemaining.toLocaleString()}.00
                    </span>
                  ) : advanceAmount > 0 ? (
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>
                      +৳ {advanceAmount.toLocaleString()}.00 (Advance)
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, color: "#059669" }}>
                      ৳ 0.00 (Fully Settled)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* In Words Section */}
            <div
              style={{
                padding: "12px 4px 6px 4px",
                fontSize: "11.5px",
                color: "#475569",
              }}
            >
              <span style={{ fontWeight: 700, color: "#0f172a", marginRight: "6px" }}>
                In Words:
              </span>
              <span>
                {numberToWords(isMaster ? totalPaidAtThisReceipt : active.amount)}
              </span>
            </div>

            {/* Note Section (Matching the icon + note in user reference) */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginTop: "16px",
                padding: "10px 14px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #f1f5f9",
              }}
            >
              <FileText size={17} style={{ color: "#64748b", marginTop: "2px", flexShrink: 0 }} />
              <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.5" }}>
                <b style={{ color: "#0f172a", display: "block", marginBottom: "2px" }}>Note:</b>
                This is an authentic computer-generated money receipt from Orbit Overseas Recruitment (RL-1284). All transactions are recorded in the central database. Please preserve this receipt for all future references, visa stamping, and BMET smart card clearance.
              </div>
            </div>

            {/* Official Signatures */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: "36px",
                padding: "0 10px",
              }}
            >
              <div style={{ textAlign: "center", width: "230px" }}>
                <div style={{ width: "100%", borderTop: "1px solid #94a3b8", marginBottom: "6px" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block" }}>
                  Candidate / Depositor Signature
                </span>
                <small style={{ fontSize: "10px", color: "#64748b" }}>Physical Copy Verified</small>
              </div>

              <div style={{ textAlign: "center", width: "230px" }}>
                <div style={{ width: "100%", borderTop: "1px solid #94a3b8", marginBottom: "6px" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block" }}>
                  Prepared &amp; Received By: Central Accounts
                </span>
                <small style={{ fontSize: "10px", color: "#64748b" }}>
                  {active.officerName || "Central Accounts Department"} · RL-1284
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Footer (Hidden when printing) */}
        <div
          className="no-print"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 40,
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            boxShadow: "0 -2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            ✓ Verified Computer-Generated Money Receipt · RL-1284 Central Vault
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="portal-print-btn portal-print-btn-blue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={13} /> {isMaster ? "Print Master Receipt" : "Print Voucher"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="portal-toolbar-btn"
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
