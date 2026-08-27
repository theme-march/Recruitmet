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
  Plus,
  RefreshCcw,
  Search,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { toast } from "sonner";

type Row = {
  id: string;
  fileNo: string;
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
  dueDate: string | null;
  lastPaymentAt: string | null;
  paymentCount: number;
};

type Data = {
  data: Row[];
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

  // Collect Payment Modal
  const [selectedFile, setSelectedFile] = useState<Row | null>(null);
  const [collectAmount, setCollectAmount] = useState(50000);
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [notes, setNotes] = useState("Installment deposit");
  const [savingPayment, setSavingPayment] = useState(false);

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
  const totalCollected = rows.reduce((sum, r) => sum + r.paid, 0);
  const totalRefunded = rows.reduce((sum, r) => sum + r.refunded, 0);
  const totalNet = totalCollected - totalRefunded;
  const paidCount = rows.filter((r) => r.paymentStatus === "PAID").length;
  const pendingCount = rows.filter((r) => r.paymentStatus === "PENDING").length;

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
    const quote = (val: unknown) => `"${String(val ?? "").replaceAll('"', '""')}"`;
    const lines = [
      "SL,File No,Candidate No,Name,Phone,Passport,Country,Officer,Agent,Stage,Payment Status,Paid,Refunded,Net Paid,Company,Profession,Last Payment",
      ...rows.map((r, i) =>
        [
          (page - 1) * pageSize + i + 1,
          r.fileNo,
          r.candidateNo,
          r.name,
          r.phone,
          r.passport,
          r.country,
          r.officer,
          r.agent,
          r.currentStage,
          r.paymentStatus,
          r.paid,
          r.refunded,
          r.netPaid,
          r.company,
          r.profession,
          date(r.lastPaymentAt),
        ]
          .map(quote)
          .join(",")
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payment-collection-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setSavingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          amount: Number(collectAmount),
          method: paymentMethod,
          type: "INSTALLMENT",
          referenceNo: `RCP-${Date.now().toString().slice(-6)}`,
          notes,
          dueDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to record payment");
      toast.success(`Payment of ৳ ${Number(collectAmount).toLocaleString()} recorded successfully!`);
      setSelectedFile(null);
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
            <strong style={valueStyle}>{meta.total}</strong>
            <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700 }}>Active files</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#ecfdf5", color: "#10b981" }}>
            <Wallet size={20} />
          </div>
          <div>
            <small style={labelStyle}>Total Collected</small>
            <strong style={valueStyle}>{money(totalCollected)}</strong>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>Deposits received</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#f0edff", color: "#7258e8" }}>
            <DollarSign size={20} />
          </div>
          <div>
            <small style={labelStyle}>Net Realized Amount</small>
            <strong style={valueStyle}>{money(totalNet)}</strong>
            <span style={{ fontSize: "11px", color: "#7258e8", fontWeight: 700 }}>After refunds</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#f0fdf4", color: "#059669" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <small style={labelStyle}>Paid Candidates</small>
            <strong style={valueStyle}>{paidCount}</strong>
            <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>Complete settlements</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#fffbeb", color: "#f59e0b" }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <small style={labelStyle}>Pending / Due</small>
            <strong style={valueStyle}>{pendingCount}</strong>
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700 }}>Awaiting deposit</span>
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

                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background:
                              row.paymentStatus === "PAID"
                                ? "#ecfdf5"
                                : row.paymentStatus === "PARTIAL"
                                ? "#eff6ff"
                                : "#fffbeb",
                            color:
                              row.paymentStatus === "PAID"
                                ? "#059669"
                                : row.paymentStatus === "PARTIAL"
                                ? "#2563eb"
                                : "#d97706",
                            border: `1px solid ${
                              row.paymentStatus === "PAID"
                                ? "#a7f3d0"
                                : row.paymentStatus === "PARTIAL"
                                ? "#bfdbfe"
                                : "#fde68a"
                            }`,
                          }}
                        >
                          {row.paymentStatus}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#059669" }}>
                        {money(row.paid)}
                      </td>

                      <td style={{ padding: "12px 14px", color: row.refunded ? "#ef4444" : "var(--muted)", fontWeight: 600 }}>
                        {money(row.refunded)}
                      </td>

                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "var(--ink)" }}>
                        {money(row.netPaid)}
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
                            onClick={() => setSelectedFile(row)}
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

      {/* Collect Payment Modal */}
      {selectedFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setSelectedFile(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                  Record Payment Deposit
                </h2>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                  Candidate: <b>{selectedFile.name}</b> ({selectedFile.fileNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} style={{ display: "grid", gap: "14px" }}>
              <label style={filterLabelStyle}>
                Amount to Collect (BDT) *
                <input
                  type="number"
                  required
                  min={1}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value) || 0)}
                  style={inputStyle}
                />
              </label>

              <label style={filterLabelStyle}>
                Payment Method *
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={inputStyle}
                >
                  <option value="BANK">Bank Transfer / Deposit</option>
                  <option value="CASH">Direct Cash</option>
                  <option value="BKASH">bKash Merchant</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </label>

              <label style={filterLabelStyle}>
                Remarks &amp; Notes
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 1st installment for visa processing"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    border: "1px solid var(--line)",
                    color: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "10px",
                    background: "#7258e8",
                    color: "#fff",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: savingPayment ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
                  }}
                >
                  {savingPayment ? "Saving..." : "Confirm & Save Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
