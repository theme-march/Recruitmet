"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Layers,
  Paperclip,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Sparkles,
  UploadCloud,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import { MoneyReceiptModal, type ReceiptData } from "@/components/money-receipt-modal";

type PaymentEntry = {
  id: string;
  paymentNo: string;
  amount: number;
  type: string;
  method: string;
  reference: string;
  createdAt: string;
};

type Row = {
  id: string;
  fileNo: string;
  candidateId?: string;
  candidateNo: string;
  name: string;
  phone: string;
  passport: string;
  country: string;
  officer: string;
  agent: string;
  office: string;
  company: string;
  profession: string;
  currentStage: string;
  paymentStatus: string;
  paid: number;
  refunded: number;
  netPaid: number;
  totalPackage?: number;
  dueAmount?: number;
  advanceAmount?: number;
  dueDate: string | null;
  lastPaymentAt: string | null;
  paymentCount: number;
  payments?: PaymentEntry[];
};

type Data = {
  data: Row[];
  summary?: {
    totalCandidates: number;
    totalCollected: number;
    totalRefunded: number;
    totalNet: number;
    totalDue: number;
    totalAdvance: number;
    paidCount: number;
    pendingCount: number;
  };
  filters: { statuses: string[]; countries: string[] };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export function PaymentCollectionPage() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Unified Collect Payment Modal State
  const [selectedFile, setSelectedFile] = useState<Row | null>(null);
  const [paymentType, setPaymentType] = useState("Second Payment (Visa Fee)");
  const [collectAmount, setCollectAmount] = useState(150000);
  const [paymentMethod, setPaymentMethod] = useState("Cash at Office");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const paymentFileInputRef = useRef<HTMLInputElement>(null);

  const handleVoucherFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentReceiptFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl: reader.result as string,
      });
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const result = useQuery({
    queryKey: ["payment-collection", appliedQuery, status, country, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: appliedQuery,
        status,
        country,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/payment-collection?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load payment collection");
      return response.json() as Promise<Data>;
    },
    placeholderData: (previousData) => previousData,
  });

  const rows = result.data?.data ?? [];
  const meta = result.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };

  // Calculate dynamic KPIs
  const summary = result.data?.summary ?? {
    totalCandidates: meta.total,
    totalCollected: rows.reduce((sum, r) => sum + r.paid, 0),
    totalRefunded: rows.reduce((sum, r) => sum + r.refunded, 0),
    totalNet: rows.reduce((sum, r) => sum + (r.paid - r.refunded), 0),
    totalDue: rows.reduce((sum, r) => sum + (r.dueAmount || 0), 0),
    totalAdvance: rows.reduce((sum, r) => sum + (r.advanceAmount || 0), 0),
    paidCount: rows.filter((r) => r.paid > 0).length,
    pendingCount: rows.filter((r) => r.paid === 0).length,
  };

  const totalCollected = summary.totalCollected;
  const totalNet = summary.totalNet;
  const paidCount = summary.paidCount;
  const pendingCount = summary.pendingCount;

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(query.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setAppliedQuery("");
    setStatus("");
    setCountry("");
    setPage(1);
  };

  const download = () => {
    const csv = [
      ["File No", "Candidate No", "Candidate Name", "Passport", "Country", "Total Paid", "Refunded", "Net Paid", "Status"].join(","),
      ...rows.map((r) =>
        [
          `"${r.fileNo}"`,
          `"${r.candidateNo}"`,
          `"${r.name}"`,
          `"${r.passport}"`,
          `"${r.country}"`,
          r.paid,
          r.refunded,
          r.netPaid,
          `"${r.paymentStatus}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payment-collection-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPrintReceipt = (p: PaymentEntry, row: Row) => {
    setActiveReceipt({
      receiptNo: p.reference || `REC-${Date.now().toString().slice(-6)}`,
      date: new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB"),
      candidateName: row.name,
      candidateNo: row.candidateNo,
      fileNo: row.fileNo,
      passportNo: row.passport !== "Not entered" ? row.passport : "N/A",
      phone: row.phone,
      country: row.country,
      profession: row.profession,
      paymentType: p.type || "Candidate Deposit",
      paymentMethod: p.method || "Cash at Office",
      referenceNo: p.reference || `REC-${Date.now().toString().slice(-6)}`,
      amount: Number(p.amount),
      totalPaid: row.paid + (p.id ? 0 : Number(p.amount)),
      totalPackage: row.totalPackage || (/dubai/i.test(row.country) ? 300000 : 350000),
      officerName: row.officer || "Accounts Department",
    });
  };

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setSavingPayment(true);
    try {
      const res = await fetch("/api/payment-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          candidateId: selectedFile.candidateId,
          amount: Number(collectAmount),
          type: paymentType,
          method: paymentMethod,
          reference: referenceNo || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          notes,
          fileData: paymentReceiptFile?.dataUrl,
          fileName: paymentReceiptFile?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to record payment");
      toast.success(`Payment of ৳ ${Number(collectAmount).toLocaleString()} recorded successfully!`);
      setSelectedFile(null);
      setPaymentReceiptFile(null);
      void result.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving payment");
    } finally {
      setSavingPayment(false);
    }
  }

  return (
    <div className="collection-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Payment Collection
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Payment Collection</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Track candidate financial deposits, installment records, and payment stages.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={download}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              background: "#f0edff",
              border: "1px solid #dcd5fb",
              color: "#7258e8",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Download size={15} /> Download CSV
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#eff6ff", color: "#3b82f6" }}>
            <UsersRound size={20} />
          </div>
          <div>
            <small style={labelStyle}>Candidates In Process</small>
            <strong style={valueStyle}>{summary.totalCandidates}</strong>
            <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700 }}>Active files</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#ecfdf5", color: "#10b981" }}>
            <Wallet size={20} />
          </div>
          <div>
            <small style={labelStyle}>Total Collected</small>
            <strong style={valueStyle}>{money(summary.totalCollected)}</strong>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>Deposits received</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#f5f3ff", color: "#7c3aed" }}>
            <DollarSign size={20} />
          </div>
          <div>
            <small style={labelStyle}>Outstanding Due</small>
            <strong style={valueStyle}>{money(summary.totalDue)}</strong>
            <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>
              Adv: + {money(summary.totalAdvance)}
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#f0fdf4", color: "#059669" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <small style={labelStyle}>Deposits Active</small>
            <strong style={valueStyle}>{summary.paidCount}</strong>
            <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>Paid candidate files</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#fffbeb", color: "#f59e0b" }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <small style={labelStyle}>Pending / Due</small>
            <strong style={valueStyle}>{summary.pendingCount}</strong>
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700 }}>Awaiting 1st deposit</span>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
        <form onSubmit={applySearch} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          <label style={filterLabelStyle}>
            Search Candidate
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone, passport or file no..."
              style={inputStyle}
            />
          </label>

          <label style={filterLabelStyle}>
            Target Country
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle}>
              <option value="">All Countries</option>
              {result.data?.filters.countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={filterLabelStyle}>
            Payment Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="">All Statuses</option>
              {result.data?.filters.statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 20px",
                height: "40px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(114,88,232,0.25)",
              }}
            >
              <Search size={15} /> Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: "0 16px",
                height: "40px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {/* Main Table Section */}
      <section
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "18px 22px",
          boxShadow: "var(--shadow)",
          position: "relative",
          minHeight: "380px",
        }}
      >
        {result.isFetching && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #7258e8, #a855f7, #7258e8)",
              backgroundSize: "200% 100%",
              animation: "loading-bar 1s infinite linear",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              zIndex: 10,
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
            Showing <b>{meta.total ? (page - 1) * pageSize + 1 : 0}</b> to <b>{Math.min(page * pageSize, meta.total)}</b> of <b>{meta.total}</b> candidate accounts
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                height: "32px",
                padding: "0 8px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                fontSize: "12px",
                fontWeight: 700,
                background: "#fafafd",
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {result.isError && <div className="form-error">Payment collection could not be loaded.</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "50px" }}>SL</th>
                <th style={{ padding: "12px 14px" }}>Client Information</th>
                <th style={{ padding: "12px 14px" }}>Processing Stage</th>
                <th style={{ padding: "12px 14px" }}>Payment Status</th>
                <th style={{ padding: "12px 14px" }}>Paid (BDT)</th>
                <th style={{ padding: "12px 14px" }}>Refunded</th>
                <th style={{ padding: "12px 14px" }}>Net Paid</th>
                <th style={{ padding: "12px 14px" }}>Employer / Company</th>
                <th style={{ padding: "12px 14px" }}>Profession</th>
                <th style={{ padding: "12px 14px" }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ opacity: result.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {rows.map((row, index) => {
                const isExpanded = expanded === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid var(--line)",
                        transition: "background 0.15s ease",
                        background: isExpanded ? "#faf9ff" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.background = "#fcfaff";
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                        {(page - 1) * pageSize + index + 1}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: "13px" }}>{row.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          Phone: <b>{row.phone}</b> · Country: <b>{row.country}</b>
                        </div>
                        <div style={{ fontSize: "11px", color: "#7258e8", marginTop: "1px" }}>
                          File: <Link prefetch={true} href={`/file/${row.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>{row.fileNo}</Link> · PP: {row.passport}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: "#f0edff",
                            color: "#7258e8",
                            border: "1px solid #dcd5fb",
                          }}
                        >
                          {row.currentStage}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background:
                              row.advanceAmount && row.advanceAmount > 0
                                ? "#f5f3ff"
                                : row.paymentStatus === "PAID"
                                ? "#ecfdf5"
                                : row.paymentStatus === "PARTIAL"
                                ? "#eff6ff"
                                : "#fffbeb",
                            color:
                              row.advanceAmount && row.advanceAmount > 0
                                ? "#7c3aed"
                                : row.paymentStatus === "PAID"
                                ? "#059669"
                                : row.paymentStatus === "PARTIAL"
                                ? "#2563eb"
                                : "#d97706",
                            border: `1px solid ${
                              row.advanceAmount && row.advanceAmount > 0
                                ? "#ddd6fe"
                                : row.paymentStatus === "PAID"
                                ? "#a7f3d0"
                                : row.paymentStatus === "PARTIAL"
                                ? "#bfdbfe"
                                : "#fde68a"
                            }`,
                          }}
                        >
                          {row.advanceAmount && row.advanceAmount > 0 ? "ADVANCE" : row.paymentStatus}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 800, color: "#059669", fontSize: "13px" }}>
                          {money(row.paid)}
                        </div>
                        {(row.dueAmount ?? Math.max(0, (row.totalPackage || 350000) - row.paid)) > 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "2px",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: "#fff1f2",
                              color: "#e11d48",
                              border: "1px solid #fecdd3",
                            }}
                          >
                            Due: ৳ {(row.dueAmount ?? Math.max(0, (row.totalPackage || 350000) - row.paid)).toLocaleString()}
                          </span>
                        ) : (row.advanceAmount ?? Math.max(0, row.paid - (row.totalPackage || 350000))) > 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "2px",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: "#f5f3ff",
                              color: "#7c3aed",
                              border: "1px solid #ddd6fe",
                            }}
                          >
                            + ৳ {(row.advanceAmount ?? Math.max(0, row.paid - (row.totalPackage || 350000))).toLocaleString()} Adv
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "2px",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            ✓ Fully Paid
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", color: row.refunded ? "#ef4444" : "var(--muted)", fontWeight: 600, verticalAlign: "middle" }}>
                        {money(row.refunded)}
                      </td>

                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "var(--ink)", verticalAlign: "middle" }}>
                        <div>{money(row.netPaid)}</div>
                        <div style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600, marginTop: "2px" }}>
                          Pkg: ৳ {(row.totalPackage || 350000).toLocaleString()}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", color: "var(--ink)", fontWeight: 600 }}>
                        {row.company}
                      </td>

                      <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                        {row.profession}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(row);
                              setPaymentType(row.paid > 0 ? "Second Payment (Visa Fee)" : "First Payment Deposit");
                              setCollectAmount(row.paid > 0 ? 150000 : 50000);
                              setPaymentMethod("Cash at Office");
                              setReferenceNo(`REC-${Math.floor(100000 + Math.random() * 900000)}`);
                              setNotes("");
                              setPaymentReceiptFile(null);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "7px",
                              background: "#7258e8",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              boxShadow: "0 2px 4px rgba(114,88,232,0.2)",
                            }}
                          >
                            <Plus size={12} /> Collect
                          </button>

                          <Link
                            prefetch={true}
                            href={`/file/${row.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 8px",
                              borderRadius: "7px",
                              background: "#f1f5f9",
                              border: "1px solid var(--line)",
                              color: "var(--ink)",
                              fontSize: "11px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <Eye size={12} /> Dossier
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {/* Detailed info expander */}
                    {isExpanded && (
                      <tr style={{ background: "#faf9ff", borderBottom: "1px solid var(--line)" }}>
                        <td colSpan={10} style={{ padding: "10px 18px", fontSize: "12px", color: "var(--muted)" }}>
                          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                            <span>Office: <b style={{ color: "var(--ink)" }}>{row.office}</b></span>
                            <span>Officer Assigned: <b style={{ color: "var(--ink)" }}>{row.officer}</b></span>
                            <span>Agent / Referral: <b style={{ color: "var(--ink)" }}>{row.agent}</b></span>
                            <span>Payment Records Count: <b style={{ color: "#7258e8" }}>{row.paymentCount} entries</b></span>
                            <span>Due Date: <b>{date(row.dueDate)}</b></span>
                            <span>Last Transaction: <b>{date(row.lastPaymentAt)}</b></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {!rows.length && !result.isFetching && (
                <tr>
                  <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    No payment collection records match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: page <= 1 ? "#fafafd" : "#fff",
              color: page <= 1 ? "var(--muted)" : "var(--ink)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "12px", fontWeight: 700, padding: "0 8px" }}>
            Page {page} of {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: page >= meta.totalPages ? "#fafafd" : "#fff",
              color: page >= meta.totalPages ? "var(--muted)" : "var(--ink)",
              cursor: page >= meta.totalPages ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Unified Candidate Payment Deposits & Financial Receipts Modal (2-Column Agent Pay Design) */}
      {selectedFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={() => !savingPayment && setSelectedFile(null)}
        >
          <div
            className="modal-responsive-card"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "1050px",
              width: "100%",
              padding: "26px 30px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              maxHeight: "92vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    Candidate Payment Deposits &amp; Financial Receipts
                  </h2>
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Record candidate payment installments with custom titles, optional deposit vouchers, and printable receipts.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFile.payments && selectedFile.payments.length > 0) {
                      openPrintReceipt(selectedFile.payments[0], selectedFile);
                    } else {
                      openPrintReceipt(
                        {
                          id: "",
                          paymentNo: `REC-${Date.now().toString().slice(-6)}`,
                          amount: collectAmount,
                          type: paymentType,
                          method: paymentMethod,
                          reference: referenceNo || `REC-${Date.now().toString().slice(-6)}`,
                          createdAt: new Date().toISOString(),
                        },
                        selectedFile
                      );
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(37,99,235,0.1)",
                  }}
                >
                  <Printer size={13} /> Print Money Receipt
                </button>

                <button
                  type="button"
                  onClick={() => !savingPayment && setSelectedFile(null)}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Stage Guidance Banner */}
            <div
              style={{
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: "#5b21b6",
              }}
            >
              <Sparkles size={16} className="text-purple-600 shrink-0" />
              <span>
                <b>Stage Information:</b> Enter payment title, deposit amount, and save payment record. Uploading bank slip/voucher is optional.
              </span>
            </div>

            {/* 2-Column Grid: Left Form & Right Financial Ledger */}
            <div className="modal-2col-grid">
              {/* LEFT COLUMN: Payment Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Target Candidate Card */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px" }}>
                  <small style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    TARGET CANDIDATE
                  </small>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <div>
                      <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>{selectedFile.name}</b>
                      <span style={{ fontSize: "11.5px", color: "#475569" }}>
                        ID: <b>{selectedFile.candidateNo}</b> · PP: <b>{selectedFile.passport || "N/A"}</b> · {selectedFile.country} ({selectedFile.profession})
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                      File: {selectedFile.fileNo}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSavePayment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Payment Title / Purpose */}
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Payment Title / Purpose *
                    </label>
                    <input
                      type="text"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      placeholder="e.g. Second Payment (Visa Fee)..."
                      required
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Deposit Amount (BDT) & Payment Method */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Deposit Amount (BDT) *
                      </label>
                      <input
                        type="number"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(Number(e.target.value) || 0)}
                        required
                        min={1}
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 12px",
                          borderRadius: "8px",
                          border: "1px solid #10b981",
                          background: "#f0fdf4",
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "#059669",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--line)",
                          fontSize: "12.5px",
                          color: "var(--ink)",
                          outline: "none",
                        }}
                      >
                        <option value="Cash at Office">Cash at Office</option>
                        <option value="Bank Transfer / Deposit">Bank Transfer / Deposit</option>
                        <option value="bKash / Nagad / MFS">bKash / Nagad / MFS</option>
                        <option value="Bank Cheque">Bank Cheque</option>
                        <option value="Office Accounts">Office Accounts</option>
                      </select>
                    </div>
                  </div>

                  {/* Receipt / Reference No */}
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Receipt / Reference No
                    </label>
                    <input
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. REC-011043"
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Attach Bank Slip / Deposit Voucher (Optional) */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Paperclip size={13} className="text-indigo-600" /> Attach Bank Slip / Deposit Voucher (Optional)
                      </label>
                      <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>PDF, JPG, PNG (Max 10MB)</small>
                    </div>

                    <input
                      type="file"
                      ref={paymentFileInputRef}
                      style={{ display: "none" }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleVoucherFileSelect(f);
                      }}
                    />

                    {paymentReceiptFile ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FileText size={18} className="text-emerald-600" />
                          <div>
                            <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{paymentReceiptFile.name}</b>
                            <small style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                              {paymentReceiptFile.size} · ✓ Physical Scan Attached
                            </small>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => paymentFileInputRef.current?.click()}
                            style={{ padding: "4px 8px", borderRadius: "4px", background: "#ffffff", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentReceiptFile(null)}
                            style={{ padding: "4px 6px", borderRadius: "4px", background: "#fff1f2", color: "#e11d48", border: "none", cursor: "pointer" }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => paymentFileInputRef.current?.click()}
                        style={{
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: "10px",
                          padding: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: "#fafafd",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                            <UploadCloud size={18} />
                          </div>
                          <div>
                            <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>Click to upload or drag &amp; drop document scan</b>
                            <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Optional physical scan attachment for candidate dossier</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Browse File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payment Remarks / Office Comments */}
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Payment Remarks / Office Comments
                    </label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Received at accounts counter..."
                      style={{
                        width: "100%",
                        height: "38px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        padding: "0 12px",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={savingPayment}
                    style={{
                      marginTop: "6px",
                      padding: "12px 24px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      cursor: savingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
                    }}
                  >
                    <CreditCard size={16} />{" "}
                    {savingPayment
                      ? "Recording Deposit..."
                      : selectedFile.payments && selectedFile.payments.length > 0
                      ? "💾 Record Additional Payment"
                      : "💾 Save Payment Deposit"}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Financial Ledger */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={15} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    FINANCIAL LEDGER
                  </span>
                </div>

                {/* Balance Big Banner */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    border: "1px solid #bbf7d0",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                      TOTAL AMOUNT PAID
                    </span>
                    <b style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", display: "block", marginTop: "2px" }}>
                      ৳ {selectedFile.paid.toLocaleString()} <small style={{ fontSize: "13px", fontWeight: 700 }}>BDT</small>
                    </b>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "11px", flexWrap: "wrap" }}>
                      <span style={{ color: "#334155" }}>Contract Package: ৳ {(selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)).toLocaleString()}</span>
                      {(selectedFile.dueAmount ?? Math.max(0, (selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)) - selectedFile.paid)) > 0 ? (
                        <span style={{ fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: "4px", border: "1px solid #fecdd3" }}>
                          Due: ৳ {(selectedFile.dueAmount ?? Math.max(0, (selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)) - selectedFile.paid)).toLocaleString()}
                        </span>
                      ) : (selectedFile.advanceAmount ?? Math.max(0, selectedFile.paid - (selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)))) > 0 ? (
                        <span style={{ fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #ddd6fe" }}>
                          ● Advance Extra: + ৳ {(selectedFile.advanceAmount ?? Math.max(0, selectedFile.paid - (selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)))).toLocaleString()} BDT
                        </span>
                      ) : (
                        <span style={{ fontWeight: 800, color: "#059669", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
                          ● Fully Settled
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#bbf7d0", color: "#15803d", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: 900 }}>
                    $
                  </div>
                </div>

                {/* List of Previous Receipts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                  {selectedFile.payments && selectedFile.payments.length > 0 ? (
                    selectedFile.payments.map((p, pIdx) => (
                      <div
                        key={p.id || pIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <b style={{ fontSize: "12.5px", color: "var(--ink)" }}>{p.type || `Payment #${pIdx + 1}`}</b>
                            <button
                              type="button"
                              onClick={() => openPrintReceipt(p, selectedFile)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Printer size={10} /> Print Receipt
                            </button>
                          </div>
                          <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                            {new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB")} · {p.method || "Cash at Office"}
                          </small>
                        </div>

                        <b style={{ fontSize: "13.5px", color: "#059669", fontWeight: 800 }}>
                          ৳ {p.amount.toLocaleString()} BDT
                        </b>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)", fontSize: "12px" }}>
                      No payments deposited yet for this candidate.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Money Receipt Modal */}
      {activeReceipt && (
        <MoneyReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: "14px",
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  boxShadow: "var(--shadow)",
};

const iconStyle: React.CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--muted)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  display: "block",
};

const valueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "var(--ink)",
  display: "block",
  margin: "2px 0",
};

const filterLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--ink)",
};

const inputStyle: React.CSSProperties = {
  height: "40px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid var(--line)",
  background: "#fafafd",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
};

const money = (value: number) => `৳ ${Number(value || 0).toLocaleString()}`;
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
