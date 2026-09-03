"use client";

import { Check, Download, Printer, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

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
  paymentType: string;
  paymentMethod: string;
  referenceNo?: string;
  amount: number;
  totalPackage?: number;
  totalPaid?: number;
  officerName?: string;
};

// Convert number to English words
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if ((num = num.valueOf()) === 0) return "Zero Taka Only";
  const str = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!str) return `${num} Taka Only`;
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
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const totalPackage = receipt.totalPackage || 350000;
  const totalPaid = receipt.totalPaid || receipt.amount;
  const balanceRemaining = Math.max(0, totalPackage - totalPaid);

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Action bar (Hidden when printing) */}
        <div className="receipt-modal-actions no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">Official Money Receipt Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="button primary sm" onClick={handlePrint}>
              <Printer size={15} /> Print / Save PDF
            </button>
            <button className="receipt-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="money-receipt-paper printable-area" id="printable-receipt">
          {/* Header */}
          <div className="receipt-header">
            <div className="agency-branding">
              <h1>ORBIT OVERSEAS RECRUITMENT</h1>
              <p className="agency-license">Govt. Approved Overseas Employment Recruiting Agency | <b>RL-1284</b></p>
              <p className="agency-contact">
                Head Office: Orbit Tower, Level 6, Dhaka, Bangladesh · Tel: +880 1700-000000 · Email: accounts@orbitoverseas.com
              </p>
            </div>
            <div className="receipt-badge-box">
              <span className="receipt-tag">MONEY RECEIPT</span>
              <b className="receipt-no">{receipt.receiptNo}</b>
              <small className="receipt-date">Date: {receipt.date}</small>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Candidate Meta Details Grid */}
          <div className="receipt-meta-grid">
            <div className="meta-item">
              <span>Candidate Name:</span>
              <b>{receipt.candidateName}</b>
            </div>
            <div className="meta-item">
              <span>File Number:</span>
              <b>{receipt.fileNo}</b>
            </div>
            <div className="meta-item">
              <span>Passport Number:</span>
              <b>{receipt.passportNo || "N/A"}</b>
            </div>
            <div className="meta-item">
              <span>Candidate ID:</span>
              <b>{receipt.candidateNo || "—"}</b>
            </div>
            <div className="meta-item">
              <span>Destination Country:</span>
              <b>{receipt.country}</b>
            </div>
            <div className="meta-item">
              <span>Profession:</span>
              <b>{receipt.profession || "General Worker"}</b>
            </div>
          </div>

          {/* Payment Statement Table */}
          <table className="receipt-payment-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Payment Description / Purpose</th>
                <th>Payment Mode</th>
                <th>Reference / Trx ID</th>
                <th className="text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  <b>{receipt.paymentType}</b>
                  <small className="block text-slate-500">Overseas Employment Processing &amp; Visa Fee</small>
                </td>
                <td>{receipt.paymentMethod}</td>
                <td>{receipt.referenceNo || "OFFICE-CASH"}</td>
                <td className="text-right font-bold">{receipt.amount.toLocaleString()}.00 ৳</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-bold">Total Received Amount:</td>
                <td className="text-right font-extrabold text-emerald-700 text-base">
                  {receipt.amount.toLocaleString()}.00 BDT
                </td>
              </tr>
            </tfoot>
          </table>

          {/* In Words */}
          <div className="receipt-in-words">
            <span>In Words (Taka):</span>
            <b>{numberToWords(receipt.amount)}</b>
          </div>

          {/* Ledger Summary Strip */}
          <div className="receipt-ledger-strip">
            <div className="ledger-cell">
              <span>Total Contract Package:</span>
              <b>{totalPackage.toLocaleString()} BDT</b>
            </div>
            <div className="ledger-cell highlight">
              <span>Total Paid to Date:</span>
              <b>{totalPaid.toLocaleString()} BDT</b>
            </div>
            <div className="ledger-cell">
              <span>Remaining Due Balance:</span>
              <b className={balanceRemaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                {balanceRemaining.toLocaleString()} BDT
              </b>
            </div>
          </div>

          {/* Terms & Notice */}
          <div className="receipt-terms">
            <p>
              * <b>Note:</b> This is an official computer-generated money receipt from Orbit Overseas Recruitment. Please preserve this receipt for all future references, visa stamping, and BMET smart card verification.
            </p>
          </div>

          {/* Signatures */}
          <div className="receipt-signatures">
            <div className="signature-box">
              <div className="sig-line" />
              <span>Depositor / Candidate Signature</span>
            </div>
            <div className="signature-box">
              <div className="sig-line" />
              <span>Authorized Officer Signature &amp; Seal</span>
              <small className="text-xs text-slate-500">{receipt.officerName || "Accounts Department"}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
