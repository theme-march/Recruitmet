"use client";
import { CountryDesignIcon } from "@/components/layout/country-design-icon";
import { usePaymentRequest } from "@/hooks/use-payment-request";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Printer,
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
import { MoneyReceiptModal, type ReceiptData } from "@/components/modals/money-receipt-modal";

type PaymentEntry = {
  id: string;
  paymentNo: string;
  amount: number;
  type: string;
  method: string;
  reference: string;
  status?: string;
  dueDate?: string | null;
  collectedAt?: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  fileNo: string;
  candidateId?: string;
  candidateNo: string;
  registrationNo?: string | null;
  nationalId?: string | null;
  name: string;
  phone: string;
  passport: string;
  country: string;
  rawCountry?: string;
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
  grossPackage?: number;
  discount?: number;
  packageTitle?: string | null;
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
    totalPackageValue?: number;
    totalDiscount?: number;
    paidCount: number;
    pendingCount: number;
  };
  filters: {
    statuses: string[];
    countries: string[];
    agents?: string[];
    stages?: string[];
  };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export function PaymentCollectionPage() {
  const paymentRequest = usePaymentRequest();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [agent, setAgent] = useState("");
  const [stage, setStage] = useState("");
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
    queryKey: ["payment-collection", appliedQuery, status, country, agent, stage, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: appliedQuery,
        status,
        country,
        agent,
        stage,
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
    totalPackageValue: rows.reduce((sum, r) => sum + (r.totalPackage || 350000), 0),
    totalDiscount: rows.reduce((sum, r) => sum + (r.discount || 0), 0),
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
    setAgent("");
    setStage("");
    setPage(1);
  };

  const download = () => {
    const headers = [
      "SL",
      "Candidate ID",
      "File No",
      "Candidate Name",
      "Passport No",
      "Phone",
      "Target Country",
      "Agent / Source Partner",
      "Company / Employer",
      "Profession / Trade",
      "Processing Stage",
      "Payment Status",
      "Agreed Package (BDT)",
      "Discount (BDT)",
      "Net Package (BDT)",
      "Total Paid (BDT)",
      "Refunded (BDT)",
      "Net Paid (BDT)",
      "Outstanding Due (BDT)",
      "Advance Extra (BDT)",
      "Last Payment Date",
      "Next Due Date",
      "Assigned Officer",
      "Office Branch",
    ];

    const csvRows = rows.map((r, idx) => [
      idx + 1,
      `"${r.candidateNo}"`,
      `"${r.fileNo}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.passport}"`,
      `"${r.phone}"`,
      `"${r.country}"`,
      `"${(r.agent || "Direct Walk-in").replace(/"/g, '""')}"`,
      `"${(r.company || "").replace(/"/g, '""')}"`,
      `"${(r.profession || "").replace(/"/g, '""')}"`,
      `"${r.currentStage}"`,
      `"${r.paymentStatus}"`,
      r.grossPackage || r.totalPackage || 350000,
      r.discount || 0,
      r.totalPackage || 350000,
      r.paid,
      r.refunded,
      r.netPaid,
      r.dueAmount || 0,
      r.advanceAmount || 0,
      `"${r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleDateString("en-GB") : "N/A"}"`,
      `"${r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-GB") : "N/A"}"`,
      `"${(r.officer || "Unassigned").replace(/"/g, '""')}"`,
      `"${(r.office || "Head Office").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payment-collection-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
      agent: row.agent || "Direct Office Walk-in",
      company: row.company || "Awaiting Sponsor",
      currentStage: row.currentStage || "Active",
      grossPackage: row.grossPackage || row.totalPackage,
      discount: row.discount || 0,
      paymentType: p.type || "Registration & Medical Processing Fee",
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
      const res = await paymentRequest("/api/payment-collection", {
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
    <div className="collection-page country-design-page payment-design-page">
      <div className="country-design-breadcrumb">Dashboard / Payment Collection</div>
      <div className="country-design-heading">
        <div>
          <h1>Payment Collection</h1>
          <p>Track candidate financial deposits, installment records, and payment stages.</p>
        </div>
        <div className="country-design-actions">
          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={download}><CountryDesignIcon name="Download" /> Download CSV</button>
        </div>
      </div>

      <section className="country-design-metrics payment-design-metrics">
        <div className="country-design-metric">
          <div><span>Candidates In Process</span><UsersRound size={16} color="#007aff" /></div>
          <b>{summary.totalCandidates}</b><p>Active candidate files</p>
        </div>
        <div className="country-design-metric money">
          <div><span>Total Collected</span><CountryDesignIcon name="Wallet" /></div>
          <b>{money(summary.totalCollected)}</b><p>Deposits received</p>
        </div>
        <div className="country-design-metric money">
          <div><span>Outstanding Due</span><DollarSign size={16} color="#6c4dff" /></div>
          <b>{money(summary.totalDue)}</b>
          <p>{summary.totalAdvance > 0 ? `Adv: + ${money(summary.totalAdvance)}` : `Target Pkg: ${money(summary.totalPackageValue || 0)}`}</p>
        </div>
        <div className="country-design-metric">
          <div><span>Deposits Active</span><CheckCircle2 size={16} color="#34c759" /></div>
          <b>{summary.paidCount}</b><p>Paid candidate files</p>
        </div>
        <div className="country-design-metric">
          <div><span>Pending / Due</span><AlertCircle size={16} color="#ff9500" /></div>
          <b>{summary.pendingCount}</b><p>Awaiting 1st deposit</p>
        </div>
      </section>

      <section className="payment-results-section country-design-workspace payment-design-workspace">
        <div className="country-design-filters payment-design-filters">
          <form className="country-design-filter-fields payment-design-filter-fields" onSubmit={applySearch}>
            <label className="country-design-search payment-design-search">
              <CountryDesignIcon name="Search" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search candidate payments" placeholder="Name, phone, passport, file no, agent, employer..." />
            </label>
            <span className="country-design-select">
              <select aria-label="Target country" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}>
                <option value="">All Countries</option>
                {result.data?.filters.countries.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
            <span className="country-design-select">
              <select aria-label="Agent / Partner" value={agent} onChange={(e) => { setAgent(e.target.value); setPage(1); }}>
                <option value="">All Agents / Sources</option>
                <option value="DIRECT">Direct Candidates (No Agent)</option>
                {result.data?.filters.agents?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
            <span className="country-design-select">
              <select aria-label="Processing Stage" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
                <option value="">All Stages</option>
                {result.data?.filters.stages?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
            <span className="country-design-select">
              <select aria-label="Payment status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                {result.data?.filters.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
            <button data-action-ui="primary" data-action-size="normal" className="payment-design-filter-action" type="submit">Apply</button>
            <button data-action-ui="neutral" data-action-size="normal" className="payment-design-filter-action" type="button" onClick={clearFilters}>Clear</button>
          </form>
          <label className="country-design-page-size">
            Per Page:
            <span className="country-design-select">
              <select aria-label="Payment accounts per page" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value="10">10</option><option value="20">20</option><option value="50">50</option>
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
          </label>
        </div>
        {result.isFetching && <div className="payment-design-loading" role="status" aria-label="Loading payment accounts" />}
        <div className="country-design-count">
          Showing {meta.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, meta.total)} of {meta.total} candidate accounts
        </div>
        {result.isError && <div className="payment-design-error" role="alert">Payment collection could not be loaded.</div>}

        <div className="desktop-payment-table country-design-table payment-design-table">
          <table>
            <colgroup>{[55, 230, 140, 110, 100, 140, 130, 135, 215].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
            <thead>
              <tr>{["SL", "Client Information", "Agent / Source", "Stage", "Status", "Paid & Due (BDT)", "Package & Disc", "Company & Trade", "Actions"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr>
            </thead>
            <tbody style={{ opacity: result.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {rows.map((row, index) => {
                const isExpanded = expanded === row.id;
                const due = row.dueAmount ?? Math.max(0, (row.totalPackage || 350000) - row.paid);
                const advance = row.advanceAmount ?? Math.max(0, row.paid - (row.totalPackage || 350000));
                const paymentTone = row.advanceAmount && row.advanceAmount > 0 ? "advance" : row.paymentStatus === "PAID" ? "paid" : row.paymentStatus === "PARTIAL" ? "partial" : "pending";
                return (
                  <Fragment key={row.id}>
                    <tr className={isExpanded ? "payment-design-expanded" : undefined}>
                      <td className="country-design-serial">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setExpanded(isExpanded ? null : row.id)}
                            aria-label={isExpanded ? "Collapse payment details" : "Expand payment details"}
                            title={isExpanded ? "Collapse ledger" : "View payment history & details"}
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              border: "1px solid var(--line)",
                              background: isExpanded ? "#eff6ff" : "#ffffff",
                              color: isExpanded ? "#2563eb" : "var(--muted)",
                              display: "grid",
                              placeItems: "center",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <span>{(page - 1) * pageSize + index + 1}</span>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell client payment-design-client">
                          <b>{row.name}</b>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                            <span className="country-design-candidate-id" title="Candidate ID">{row.candidateNo}</span>
                            <Link prefetch={true} href={`/file/${row.id}`} className="country-design-candidate-id" style={{ color: "#7258e8" }} title="Processing File">{row.fileNo}</Link>
                          </div>
                          <small>{row.phone} · {row.country}</small>
                          <small>PP: {row.passport}</small>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b style={{ fontSize: "12px", color: row.agent && !/direct/i.test(row.agent) ? "#7258e8" : "var(--ink)" }}>
                            {row.agent || "Direct Walk-in"}
                          </b>
                          <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                            {/direct/i.test(row.agent) ? "Direct Candidate" : "Agency Partner"}
                          </small>
                        </div>
                      </td>
                      <td><span className={`country-design-stage payment-design-stage ${/flight/i.test(row.currentStage) ? "flight" : ""}`}>{row.currentStage}</span></td>
                      <td><span className={`country-design-status payment-design-status ${paymentTone}`}>{row.advanceAmount && row.advanceAmount > 0 ? "ADVANCE" : row.paymentStatus}</span></td>
                      <td>
                        <div className="country-design-cell financial payment-design-financial">
                          <b>{money(row.paid)}</b>
                          {due > 0 ? (
                            <span className="country-design-due">Due: ৳ {due.toLocaleString()}</span>
                          ) : advance > 0 ? (
                            <span className="country-design-due payment-design-advance">+ ৳ {advance.toLocaleString()} Adv</span>
                          ) : (
                            <span className="country-design-status" style={{ background: "#ecfdf5", color: "#059669" }}>✓ Fully Paid</span>
                          )}
                          {row.lastPaymentAt && (
                            <small style={{ color: "var(--muted)", fontSize: "10px", marginTop: "1px" }}>
                              Last: {date(row.lastPaymentAt)}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell financial">
                          <b>{money(row.totalPackage || 350000)}</b>
                          {row.discount && row.discount > 0 ? (
                            <small style={{ color: "#059669", fontWeight: 700, fontSize: "10.5px" }}>
                              Disc: -৳ {row.discount.toLocaleString()}
                            </small>
                          ) : (
                            <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                              Gross: ৳ {(row.grossPackage || row.totalPackage || 350000).toLocaleString()}
                            </small>
                          )}
                          {row.packageTitle && (
                            <small style={{ color: "#64748b", fontSize: "9.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.packageTitle}>
                              {row.packageTitle}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b>{row.company}</b>
                          <small style={{ color: "var(--muted)" }}>{row.profession}</small>
                        </div>
                      </td>
                      <td>
                        <div className="payment-design-row-actions">
                          <button
                            data-action-ui="success"
                            data-action-size="compact"
                            type="button"
                            className="country-design-dossier"
                            style={{
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontWeight: 700,
                              fontSize: "10.5px",
                              padding: "4px 8px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                            onClick={() => {
                              setSelectedFile(row);
                              setPaymentType(row.paid > 0 ? "Second Payment (Visa Fee)" : "First Payment Deposit");
                              setCollectAmount(row.paid > 0 ? 150000 : 50000);
                              setPaymentMethod("Cash at Office");
                              setReferenceNo(`REC-${Math.floor(100000 + Math.random() * 900000)}`);
                              setNotes("");
                              setPaymentReceiptFile(null);
                            }}
                          >
                            + Collect
                          </button>
                          {row.payments && row.payments.length > 0 && (
                            <button
                              data-action-ui="neutral"
                              data-action-size="compact"
                              type="button"
                              title="Print latest money receipt"
                              aria-label="Print receipt"
                              onClick={() => openPrintReceipt(row.payments![0], row)}
                              style={{
                                padding: "4px 7px",
                                borderRadius: "6px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Printer size={13} />
                            </button>
                          )}
                          <Link
                            data-action-ui="secondary"
                            data-action-size="compact"
                            prefetch={true}
                            href={`/file/${row.id}`}
                            className="country-design-dossier payment-design-dossier"
                            style={{
                              fontSize: "10.5px",
                              padding: "4px 8px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            Dossier →
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {/* Detailed info expander */}
                    {isExpanded && (
                      <tr className="payment-expanded-row" style={{ background: "#f8faff", borderBottom: "2px solid #e0e7ff" }}>
                        <td colSpan={9} style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {/* Key vital tags */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center", fontSize: "12px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "10px" }}>
                              <span>🏢 Branch: <b style={{ color: "var(--ink)" }}>{row.office || "Head Office"}</b></span>
                              <span>👤 Officer Assigned: <b style={{ color: "var(--ink)" }}>{row.officer || "Unassigned"}</b></span>
                              <span>🤝 Agent / Partner: <b style={{ color: "#7258e8" }}>{row.agent || "Direct Walk-in"}</b></span>
                              <span>📅 Next Due Date: <b>{row.dueDate ? date(row.dueDate) : "No due date set"}</b></span>
                              <span>⏱️ Last Transaction: <b>{row.lastPaymentAt ? date(row.lastPaymentAt) : "No deposits yet"}</b></span>
                              {row.nationalId && <span>🆔 NID: <b>{row.nationalId}</b></span>}
                              {row.discount && row.discount > 0 ? (
                                <span style={{ color: "#059669", fontWeight: 700 }}>
                                  🏷️ Agreed Contract: ৳ {(row.grossPackage || 350000).toLocaleString()} (Special Discount: ৳ {row.discount.toLocaleString()})
                                </span>
                              ) : null}
                            </div>

                            {/* Previous Installments Ledger */}
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  Payment Installments &amp; Deposit History ({row.payments?.length || 0})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFile(row);
                                    setPaymentType(row.paid > 0 ? "Second Payment (Visa Fee)" : "First Payment Deposit");
                                    setCollectAmount(row.dueAmount && row.dueAmount > 0 ? Math.min(row.dueAmount, 100000) : 50000);
                                    setPaymentMethod("Cash at Office");
                                    setReferenceNo(`REC-${Math.floor(100000 + Math.random() * 900000)}`);
                                    setNotes("");
                                    setPaymentReceiptFile(null);
                                  }}
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    background: "#7258e8",
                                    color: "#ffffff",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  + Record Installment
                                </button>
                              </div>

                              {row.payments && row.payments.length > 0 ? (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                                  {row.payments.map((p, pIdx) => (
                                    <div
                                      key={p.id || pIdx}
                                      style={{
                                        background: "#ffffff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                        padding: "10px 12px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                      }}
                                    >
                                      <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <b style={{ fontSize: "12px", color: "var(--ink)" }}>{p.type || `Installment #${pIdx + 1}`}</b>
                                          <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", fontWeight: 700 }}>
                                            {p.status || "PAID"}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: "2px" }}>
                                          <span>{new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB")}</span> · <span>{p.method}</span>
                                          {p.reference && p.reference !== "N/A" && <span> · Ref: <b>{p.reference}</b></span>}
                                        </div>
                                      </div>

                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                        <b style={{ fontSize: "13px", color: "#15803d", fontWeight: 800 }}>
                                          ৳ {Number(p.amount).toLocaleString()}
                                        </b>
                                        <button
                                          type="button"
                                          onClick={() => openPrintReceipt(p, row)}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "3px",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            background: "#eff6ff",
                                            color: "#2563eb",
                                            border: "1px solid #bfdbfe",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                          }}
                                        >
                                          <Printer size={10} /> Print Receipt
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ padding: "10px 14px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "11.5px", color: "#92400e" }}>
                                  No deposit installments recorded yet. Outstanding balance is ৳ {(row.dueAmount ?? row.totalPackage ?? 350000).toLocaleString()} BDT.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!rows.length && !result.isFetching && <tr><td colSpan={9} className="country-design-empty">No payment collection records match the filter criteria.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Stitch Payment Collection Mobile Stream */}
        <div className="mobile-payment-stream">
          {rows.map((row) => (
            <div key={row.id} className="payment-mobile-card">
              {/* Top Row: Candidate Name, Phone, Country, Status Badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    {row.name}
                  </h3>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{row.phone}</span>
                    <span>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                      {row.country}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
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
              </div>

              {/* Secondary Candidate Meta: File, Stage, Employer, Profession */}
              <div className="payment-mobile-meta-grid">
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                    Candidate ID
                  </span>
                  <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#007aff" }}>
                    {row.candidateNo}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                    File Reference
                  </span>
                  <Link prefetch={true} href={`/file/${row.id}`} style={{ fontSize: "11.5px", fontWeight: 800, color: "#7258e8", textDecoration: "underline" }}>
                    {row.fileNo}
                  </Link>
                </div>
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                    Agent / Source
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>
                    {row.agent || "Direct Walk-in"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "9.5px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                    Stage
                  </span>
                  <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 800, background: "#dbeafe", color: "#1e40af" }}>
                    {row.currentStage}
                  </span>
                </div>
                <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #e2e8f0", paddingTop: "5px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--muted)" }}>{row.company}</span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{row.profession}</span>
                </div>
              </div>

              {/* Financial Snapshot Box */}
              <div className="payment-mobile-snapshot">
                <div>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#166534", textTransform: "uppercase", display: "block" }}>
                    Paid (BDT)
                  </span>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#15803d" }}>
                    {money(row.paid)}
                  </div>
                  {(row.dueAmount ?? Math.max(0, (row.totalPackage || 350000) - row.paid)) > 0 ? (
                    <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: 700 }}>
                      Due: ৳ {(row.dueAmount ?? Math.max(0, (row.totalPackage || 350000) - row.paid)).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#7c3aed", fontWeight: 700 }}>
                      + ৳ {(row.advanceAmount ?? Math.max(0, row.paid - (row.totalPackage || 350000))).toLocaleString()} Adv
                    </span>
                  )}
                  {row.lastPaymentAt && (
                    <span style={{ display: "block", fontSize: "9.5px", color: "var(--muted)", marginTop: "2px" }}>
                      Last: {date(row.lastPaymentAt)}
                    </span>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block" }}>
                    Net Package
                  </span>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>
                    ৳ {(row.totalPackage || 350000).toLocaleString()}
                  </div>
                  {row.discount && row.discount > 0 ? (
                    <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700, display: "block" }}>
                      Disc: -৳ {row.discount.toLocaleString()}
                    </span>
                  ) : null}
                  {row.refunded > 0 && (
                    <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, display: "block" }}>
                      Ref: {money(row.refunded)}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Actions: Collect & Dossier */}
              <div className="payment-mobile-actions" style={{ display: "flex", gap: "8px" }}>
                <button data-action-ui="success" data-action-size="normal"
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
                    flex: 1,
                    background: "#7258e8",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(114, 88, 232, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={14} /> Collect
                </button>

                {row.payments && row.payments.length > 0 && (
                  <button
                    data-action-ui="neutral"
                    data-action-size="normal"
                    type="button"
                    onClick={() => openPrintReceipt(row.payments![0], row)}
                    style={{
                      padding: "0 10px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Printer size={13} />
                  </button>
                )}

                <Link
                  prefetch={true}
                  href={`/file/${row.id}`}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <Eye size={14} /> Dossier
                </Link>
              </div>
            </div>
          ))}

          {!rows.length && !result.isFetching && (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted)", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
              No payment collection records match the filter criteria.
            </div>
          )}
        </div>

        <div className="country-design-pagination">
          <span>{meta.total} Total Candidate Accounts</span>
          <div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span className="country-design-page-indicator">Page {page} of {meta.totalPages}</span>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      </section>

      {/* Unified Candidate Payment Deposits & Financial Receipts Modal (2-Column Agent Pay Design) */}
      {selectedFile && (
        <div role="dialog" aria-modal="true" aria-label="Candidate Payment Deposits & Financial Receipts"
          className="app-modal-overlay payment-modal-overlay master-modal-overlay"
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
            className="modal-responsive-card payment-modal-card master-modal-card master-modal-panel"
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
              className="payment-modal-header master-modal-header"
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

              <div className="payment-modal-header-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button data-action-ui="neutral" data-action-size="normal" className="master-modal-secondary"
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

                <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
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
              className="payment-modal-guidance master-modal-panel"
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
              <div className="payment-modal-form-column" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Target Candidate Card */}
                <div className="payment-modal-target master-modal-panel" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px" }}>
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

                <form className="payment-modal-form" onSubmit={handleSavePayment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                  <div className="payment-modal-field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                    <div className="payment-upload-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
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
                      <div className="master-modal-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "10px" }}>
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
                          <button data-action-ui="secondary" data-action-size="normal"
                            type="button"
                            onClick={() => paymentFileInputRef.current?.click()}
                            style={{ padding: "4px 8px", borderRadius: "4px", background: "#ffffff", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            Replace
                          </button>
                          <button data-action-ui="danger" data-action-size="icon" aria-label="Remove attachment" className="master-modal-close"
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
                        className="payment-upload-dropzone master-modal-panel"
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
                          <div className="master-modal-accent master-modal-icon" style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                            <UploadCloud size={18} />
                          </div>
                          <div>
                            <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>Click to upload or drag &amp; drop document scan</b>
                            <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Optional physical scan attachment for candidate dossier</small>
                          </div>
                        </div>
                        <button data-action-ui="secondary" data-action-size="normal"
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
                  <button data-action-ui="success" data-action-size="normal"
                    className="payment-modal-submit master-modal-primary"
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
              <div className="payment-modal-ledger master-modal-panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={15} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    FINANCIAL LEDGER
                  </span>
                </div>

                {/* Balance Big Banner */}
                <div
                  className="payment-modal-balance master-modal-panel"
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
                        <span className="master-modal-accent" style={{ fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #ddd6fe" }}>
                          ● Advance Extra: + ৳ {(selectedFile.advanceAmount ?? Math.max(0, selectedFile.paid - (selectedFile.totalPackage || (/dubai/i.test(selectedFile.country) ? 300000 : 350000)))).toLocaleString()} BDT
                        </span>
                      ) : (
                        <span style={{ fontWeight: 800, color: "#059669", background: "#ecfdf5", padding: "1px 6px", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
                          ● Fully Settled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="master-modal-icon" style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#bbf7d0", color: "#15803d", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: 900 }}>
                    $
                  </div>
                </div>

                {/* List of Previous Receipts */}
                <div className="payment-receipt-list" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                  {selectedFile.payments && selectedFile.payments.length > 0 ? (
                    selectedFile.payments.map((p, pIdx) => (
                      <div
                        className="payment-receipt-row master-modal-panel"
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
                            <button data-action-ui="neutral" data-action-size="compact" className="master-modal-secondary"
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

const money = (value: number) => `৳ ${Number(value || 0).toLocaleString()}`;
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
