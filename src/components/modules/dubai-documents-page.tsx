"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentViewerModal, type DocumentViewerData } from "@/components/modals/document-viewer-modal";

type State = "PENDING" | "DONE" | "NO NEED";
type Category =
  | "Passport"
  | "Medical"
  | "Police Clearance"
  | "Skill Certificate"
  | "Driving Licence"
  | "Visa Copy"
  | "BMET Smart Card"
  | "Flight Ticket";

const DEFAULT_CATEGORIES: Category[] = [
  "Passport",
  "Medical",
  "Police Clearance",
  "Skill Certificate",
  "Driving Licence",
  "Visa Copy",
  "BMET Smart Card",
  "Flight Ticket",
];

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
  office: string;
  company: string;
  profession: string;
  currentStage?: string;
  fileStatus?: string;
  medicalResult?: string | null;
  visaStatus?: string | null;
  manpowerStatus?: string | null;
  statuses: Record<Category, State>;
  docAttachments?: Record<string, string | undefined>;
};

type Data = {
  data: Row[];
  summary: Record<Category, Record<State, number>>;
  categories: Category[];
  filters?: {
    countries?: string[];
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalFiles: number;
    totalPages: number;
  };
};

function getCountryFlag(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("saudi") || n.includes("ksa")) return "🇸🇦";
  if (n.includes("dubai") || n.includes("uae") || n.includes("emirates")) return "🇦🇪";
  if (n.includes("oman")) return "🇴🇲";
  if (n.includes("malaysia")) return "🇲🇾";
  if (n.includes("singapore")) return "🇸🇬";
  if (n.includes("qatar")) return "🇶🇦";
  if (n.includes("kuwait")) return "🇰🇼";
  if (n.includes("bahrain")) return "🇧🇭";
  if (n.includes("romania")) return "🇷🇴";
  if (n.includes("italy")) return "🇮🇹";
  if (n.includes("poland")) return "🇵🇱";
  return "🌍";
}

export function DubaiDocumentsPage() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeDoc, setActiveDoc] = useState<DocumentViewerData | null>(null);

  const result = useQuery({
    queryKey: ["dubai-documents", applied, status, country, selectedCat, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: applied,
        status,
        country,
        category: selectedCat,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/dubai-documents?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load document collection records");
      return response.json() as Promise<Data>;
    },
    placeholderData: (previousData) => previousData,
  });

  const rows = result.data?.data ?? [];
  const categories = result.data?.categories ?? DEFAULT_CATEGORIES;
  const meta = result.data?.meta ?? { page, pageSize, total: 0, totalFiles: 0, totalPages: 1 };
  const summary = (result.data?.summary ?? {}) as Record<Category, Record<State, number> | undefined>;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(query.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setApplied("");
    setStatus("");
    setCountry("");
    setSelectedCat("");
    setPage(1);
  };

  const handleAttachFile = async (category: string, fileData: { url: string; fileName: string; size: string }) => {
    if (!activeDoc) return;
    try {
      const res = await fetch("/api/dubai-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: activeDoc.extraMeta?.fileId,
          candidateId: activeDoc.extraMeta?.candidateId,
          category,
          fileData: fileData.url,
          fileName: fileData.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to upload document");
      toast.success(`${category} uploaded successfully. Verification is pending.`);
      void result.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error uploading document");
    }
  };

  const download = () => {
    const quote = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["SL", "File No", "Candidate", "Phone", "Passport", "Country", "Stage", "File Status", "Medical", "Visa", "BMET", ...categories].join(","),
      ...rows.map((row, i) =>
        [
          (page - 1) * pageSize + i + 1,
          row.fileNo,
          row.name,
          row.phone,
          row.passport,
          row.country,
          row.currentStage || "Passport Entry",
          row.fileStatus || "ACTIVE",
          row.medicalResult || "N/A",
          row.visaStatus || "N/A",
          row.manpowerStatus || "N/A",
          ...categories.map((c) => row.statuses[c] ?? "PENDING"),
        ]
          .map(quote)
          .join(",")
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents-collection-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dubai-doc-page country-design-page management-design-page documents-design-page">
      <div className="country-design-breadcrumb">Dashboard / Document / Documents Collect</div>
      <header className="country-design-heading"><div><h1>Documents Collect</h1><p>Live verification status tracked automatically from each candidate&apos;s 360° workspace and dossier profile.</p></div><div className="country-design-actions"><button data-action-ui="neutral" data-action-size="normal" onClick={download}><Download size={13} /> Download CSV</button></div></header>
      <section className="country-design-metrics document-summary-strip">
        <button type="button" className="country-design-metric document-summary-card" aria-pressed={!selectedCat} onClick={() => { setSelectedCat(""); setStatus(""); setPage(1); }} title="Click to show all documents"><div><span>Total Files Tracked</span><FileText size={16} color="#007aff" /></div><b>{meta.totalFiles}</b><p>Tracked candidate files</p></button>
        {categories.map(cat => { const stats = summary[cat] ?? { PENDING: 0, DONE: 0, "NO NEED": 0 }; const isSelected = selectedCat === cat; return <button type="button" className="country-design-metric document-summary-card" key={cat} aria-pressed={isSelected} title="Click to filter by this category" onClick={() => { setSelectedCat(isSelected ? "" : cat); setPage(1); }}><div><span>{cat}</span><FileCheck2 size={16} color={isSelected ? "#007aff" : "#6855e8"} /></div><b>{stats.DONE}</b><p>Done · {stats.PENDING} pending · {stats["NO NEED"]} no need</p></button>; })}
      </section>
      <section className="dubai-documents-main-section country-design-workspace">
        <nav className="country-design-tabs management-tabs document-country-tabs" aria-label="Document countries">
          {[{id: "", label: "All Countries", flag: "🌍"}, ...(result.data?.filters?.countries || ["Saudi Arabia", "Dubai", "Other"]).map(name => ({id: name, label: name, flag: getCountryFlag(name)}))].map(c => <button key={c.id || "all"} type="button" aria-pressed={country === c.id} onClick={() => { setCountry(c.id); setPage(1); }}>{c.flag} {c.label}</button>)}
        </nav>
        <form className="country-design-filters" onSubmit={handleSearch}>
          <div className="country-design-filter-fields"><label className="country-design-search"><Search size={13} /><input aria-label="Search candidate documents" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search candidate name, phone, passport, file..." /></label><label className="country-design-select"><select aria-label="Document status filter" value={status} onChange={e => setStatus(e.target.value)}><option value="">All Document Statuses</option><option value="PENDING">Has PENDING Documents</option><option value="DONE">Has DONE Documents</option><option value="NO NEED">Has NO NEED Documents</option></select><ChevronDown size={10} /></label><button data-action-ui="primary" data-action-size="normal" className="management-filter-button" type="submit">Apply</button><button data-action-ui="neutral" data-action-size="normal" className="management-filter-button" type="button" onClick={clearFilters}>Clear</button></div>
          <label className="country-design-page-size">Per Page: <span className="country-design-select"><select aria-label="Documents per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</select><ChevronDown size={10} /></span></label>
        </form>
        {result.isFetching && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #007aff, #69afff, #007aff)",
              backgroundSize: "200% 100%",
              animation: "loading-bar 1s infinite linear",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              zIndex: 10,
            }}
          />
        )}

        <div className="country-design-count" aria-live="polite">Showing {meta.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, meta.total)} of {meta.total} Total Candidate Documents {selectedCat && <span>· Filtered by {selectedCat}</span>}</div>

        {result.isError && <div className="form-error">Document records could not be loaded.</div>}

        <div className="desktop-documents-table management-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "50px" }}>SL</th>
                <th style={{ padding: "12px 14px" }}>Client Information</th>
                <th style={{ padding: "12px 14px" }}>Recruitment Stage</th>
                <th style={{ padding: "12px 14px" }}>File &amp; Process Status</th>
                {categories.map((c) => (
                  <th key={c} style={{ padding: "12px 10px", textAlign: "center" }}>
                    {c}
                  </th>
                ))}
                <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ opacity: result.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                    {(page - 1) * pageSize + index + 1}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background: "#f0edff",
                          color: "#7258e8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "12px",
                          flexShrink: 0,
                          border: "1px solid #e0d9fc",
                        }}
                      >
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          prefetch={true}
                          href={`/file/${row.id}`}
                          style={{ fontWeight: 800, color: "var(--ink)", fontSize: "13px", textDecoration: "none" }}
                        >
                          {row.name}
                        </Link>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>📞 {row.phone}</span>
                          <span>·</span>
                          <span>{getCountryFlag(row.country)} <b>{row.country}</b></span>
                          {row.profession && (
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", background: "#f1f5f9", color: "#475569" }}>
                              {row.profession}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#7258e8", marginTop: "1px" }}>
                          File: <Link prefetch={true} href={`/file/${row.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>{row.fileNo}</Link> · PP: {row.passport}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Recruitment Stage */}
                  <td style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 800,
                        background: "#ecfdf5",
                        color: "#047857",
                        border: "1px solid #a7f3d0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <CheckCircle2 size={12} /> {row.currentStage || "Passport Entry"}
                    </div>
                  </td>

                  {/* File & Process Action Statuses */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "200px" }}>
                      {row.medicalResult && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: /fit/i.test(row.medicalResult) ? "#f0fdf4" : "#fef2f2",
                            color: /fit/i.test(row.medicalResult) ? "#166534" : "#991b1b",
                            border: `1px solid ${/fit/i.test(row.medicalResult) ? "#bbf7d0" : "#fecaca"}`,
                          }}
                        >
                          Med: {row.medicalResult}
                        </span>
                      )}
                      {row.visaStatus && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#eff6ff",
                            color: "#1e40af",
                            border: "1px solid #bfdbfe",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {/visa/i.test(row.visaStatus) ? row.visaStatus : `Visa: ${row.visaStatus}`}
                        </span>
                      )}
                      {row.manpowerStatus && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#fffbeb",
                            color: "#92400e",
                            border: "1px solid #fde68a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          BMET: {row.manpowerStatus}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: row.fileStatus === "COMPLETED" ? "#f5f3ff" : "#f0fdf4",
                          color: row.fileStatus === "COMPLETED" ? "#6d28d9" : "#166534",
                          border: `1px solid ${row.fileStatus === "COMPLETED" ? "#ddd6fe" : "#bbf7d0"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.fileStatus || "ACTIVE"}
                      </span>
                    </div>
                  </td>

                  {/* Interactive Dynamic Document Status Badges */}
                  {categories.map((c) => {
                    const st = row.statuses[c] ?? "PENDING";
                    const isDone = st === "DONE";
                    const isNoNeed = st === "NO NEED";
                    const hasAttachment = Boolean(row.docAttachments?.[c]);

                    return (
                      <td key={c} style={{ padding: "10px 6px", textAlign: "center" }}>
                        <button data-action-ui="secondary" data-action-size="compact"
                          type="button"
                          onClick={() => {
                            setActiveDoc({
                              candidateName: row.name,
                              passportNo: row.passport !== "Not entered" ? row.passport : undefined,
                              candidateNo: row.candidateNo,
                              country: row.country,
                              profession: row.profession,
                              company: row.company,
                              title: `${c} — ${row.name}`,
                              category: c,
                              url: row.docAttachments?.[c],
                              fileNumber: row.fileNo,
                              verifiedStatus: isDone ? "Verified Valid" : isNoNeed ? "Not Required" : "Pending Verification",
                              extraMeta: {
                                fileId: row.id,
                                candidateId: row.candidateId || "",
                              },
                            });
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 9px",
                            borderRadius: "6px",
                            fontSize: "10.5px",
                            fontWeight: 800,
                            letterSpacing: "0.3px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            background:
                              isDone
                                ? "#ecfdf5"
                                : isNoNeed
                                ? "#f5f3ff"
                                : "#fffbeb",
                            color:
                              isDone
                                ? "#059669"
                                : isNoNeed
                                ? "#7c3aed"
                                : "#d97706",
                            border: `1px solid ${
                              isDone
                                ? "#a7f3d0"
                                : isNoNeed
                                ? "#ddd6fe"
                                : "#fde68a"
                            }`,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                          }}
                          title={`Click to view, print or upload ${c}`}
                        >
                          {isDone && <CheckCircle2 size={11} />}
                          {isDone && hasAttachment ? "DONE (ATTACHED)" : st}
                        </button>
                      </td>
                    );
                  })}

                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <Link
                      prefetch={true}
                      href={`/file/${row.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#7258e8",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 2px 4px rgba(114,88,232,0.2)",
                      }}
                    >
                      <Eye size={12} /> Dossier
                    </Link>
                  </td>
                </tr>
              ))}

              {!rows.length && !result.isFetching && (
                <tr>
                  <td colSpan={5 + categories.length} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    No candidate documents match the selected country or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Documents Stream (Stitch Screen 84c1a2ba97ac4fdea66e3303dfa1376e) */}
        <div className="mobile-documents-stream">
          {rows.map((row) => {
            const readyCount = categories.filter((c) => (row.statuses[c] ?? "PENDING") === "DONE").length;
            return (
              <article key={row.id} className="document-mobile-card">
                {/* Identity Header */}
                <div className="document-mobile-card-head">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #eff4ff 0%, #dbeafe 100%)",
                        color: "#2563eb",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "13px",
                        flexShrink: 0,
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      {row.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link
                        prefetch={true}
                        href={`/file/${row.id}`}
                        style={{ fontWeight: 800, color: "var(--ink)", fontSize: "14px", textDecoration: "none", display: "block", lineHeight: "1.3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {row.name}
                      </Link>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>📞 {row.phone}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>{getCountryFlag(row.country)} <b>{row.country}</b></span>
                      </div>
                      <div style={{ fontSize: "11px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {row.profession && (
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "5px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                            {row.profession}
                          </span>
                        )}
                        <span style={{ fontFamily: "monospace", color: "#3525cd", background: "#eef2ff", padding: "1px 6px", borderRadius: "5px", border: "1px solid #e0e7ff", fontWeight: 700, fontSize: "11px" }}>
                          {row.fileNo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Tag */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "9999px",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <CheckCircle2 size={11} /> {row.currentStage || "Active"}
                  </span>
                </div>

                {/* Milestones Strip */}
                <div className="document-mobile-milestones">
                  {row.medicalResult && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: /fit/i.test(row.medicalResult) ? "#f0fdf4" : "#fef2f2", color: /fit/i.test(row.medicalResult) ? "#166534" : "#991b1b", border: `1px solid ${/fit/i.test(row.medicalResult) ? "#bbf7d0" : "#fecaca"}` }}>
                      Med: {row.medicalResult}
                    </span>
                  )}
                  {row.visaStatus && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                      {/visa/i.test(row.visaStatus) ? row.visaStatus : `Visa: ${row.visaStatus}`}
                    </span>
                  )}
                  {row.manpowerStatus && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                      BMET: {row.manpowerStatus}
                    </span>
                  )}
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: row.fileStatus === "COMPLETED" ? "#f5f3ff" : "#f0fdf4", color: row.fileStatus === "COMPLETED" ? "#6d28d9" : "#166534", border: `1px solid ${row.fileStatus === "COMPLETED" ? "#ddd6fe" : "#bbf7d0"}` }}>
                    {row.fileStatus || "ACTIVE"}
                  </span>
                </div>

                {/* Checklist Matrix */}
                <div className="document-mobile-checklist">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Document Checklist Matrix
                    </span>
                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: readyCount === categories.length ? "#059669" : "#4338ca", background: readyCount === categories.length ? "#ecfdf5" : "#eef2ff", padding: "2px 7px", borderRadius: "9999px", border: `1px solid ${readyCount === categories.length ? "#a7f3d0" : "#e0e7ff"}` }}>
                      {readyCount}/{categories.length} Ready
                    </span>
                  </div>

                  <div className="document-mobile-checklist-grid">
                    {categories.map((c) => {
                      const st = row.statuses[c] ?? "PENDING";
                      const isDone = st === "DONE";
                      const isNoNeed = st === "NO NEED";
                      const hasAttachment = Boolean(row.docAttachments?.[c]);

                      return (
                        <button data-action-ui="secondary" data-action-size="normal"
                          key={c}
                          type="button"
                          onClick={() => {
                            setActiveDoc({
                              candidateName: row.name,
                              passportNo: row.passport !== "Not entered" ? row.passport : undefined,
                              candidateNo: row.candidateNo,
                              country: row.country,
                              profession: row.profession,
                              company: row.company,
                              title: `${c} — ${row.name}`,
                              category: c,
                              url: row.docAttachments?.[c],
                              fileNumber: row.fileNo,
                              verifiedStatus: isDone ? "Verified Valid" : isNoNeed ? "Not Required" : "Pending Verification",
                              extraMeta: {
                                fileId: row.id,
                                candidateId: row.candidateId || "",
                              },
                            });
                          }}
                          className={`document-mobile-check-item ${isDone ? "is-done" : isNoNeed ? "is-none" : "is-pending"}`}
                          title={`Click to view, print or upload ${c}`}
                        >
                          <div className="doc-check-top">
                            <span className="doc-check-title">{c}</span>
                            {hasAttachment && <span className="doc-check-attach-icon" title="Document attached">📎</span>}
                          </div>
                          <div className="doc-check-status-row">
                            {isDone ? (
                              <span className="doc-status-badge is-done">
                                <CheckCircle2 size={11} />
                                <span>{hasAttachment ? "Attached" : "Done"}</span>
                              </span>
                            ) : isNoNeed ? (
                              <span className="doc-status-badge is-none">
                                <span>Not Req</span>
                              </span>
                            ) : (
                              <span className="doc-status-badge is-pending">
                                <Clock size={11} />
                                <span>Pending</span>
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              {/* Actions */}
              <div className="document-mobile-actions">
                <button data-action-ui="secondary" data-action-size="normal"
                  type="button"
                  onClick={() => {
                    const primaryCat = categories[0] || "Passport";
                    setActiveDoc({
                      candidateName: row.name,
                      passportNo: row.passport !== "Not entered" ? row.passport : undefined,
                      candidateNo: row.candidateNo,
                      country: row.country,
                      profession: row.profession,
                      company: row.company,
                      title: `${primaryCat} — ${row.name}`,
                      category: primaryCat,
                      url: row.docAttachments?.[primaryCat],
                      fileNumber: row.fileNo,
                      verifiedStatus: row.statuses[primaryCat] === "DONE" ? "Verified Valid" : "Pending Verification",
                      extraMeta: {
                        fileId: row.id,
                        candidateId: row.candidateId || "",
                      },
                    });
                  }}
                  style={{ background: "#f0edff", color: "#3525cd", border: "1px solid #dcd5fb", cursor: "pointer" }}
                >
                  <FileText size={13} /> View Documents
                </button>
                <Link
                  prefetch={true}
                  href={`/file/${row.id}`}
                  style={{ background: "#3525cd", color: "#ffffff", border: "none" }}
                >
                  <Eye size={13} /> Dossier 360
                </Link>
              </div>
            </article>
          );
        })}

          {!rows.length && !result.isFetching && (
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "16px", padding: "30px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              No candidate documents match the selected filter.
            </div>
          )}
        </div>

        <footer className="country-design-pagination"><span>{meta.total} Total Candidate Documents</span><div><button data-action-ui="neutral" data-action-size="normal" disabled={page <= 1} onClick={() => setPage(page-1)}>← Previous</button><span>Page {page} of {meta.totalPages}</span><button data-action-ui="neutral" data-action-size="normal" disabled={page >= meta.totalPages} onClick={() => setPage(page+1)}>Next →</button></div></footer>
      </section>

      {/* Document Viewer & Quick Uploader Modal */}
      {activeDoc && (
        <DocumentViewerModal
          doc={activeDoc}
          onClose={() => setActiveDoc(null)}
          onAttachFile={handleAttachFile}
        />
      )}
    </div>
  );
}

export const DocumentsCollectPage = DubaiDocumentsPage;
