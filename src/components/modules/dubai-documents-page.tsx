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
  Minus,
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
  registrationNo?: string | null;
  nationalId?: string | null;
  name: string;
  phone: string;
  passport: string;
  country: string;
  rawCountry?: string;
  agent: string;
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
  docMeta?: Record<string, { number?: string; expiry?: string; date?: string; detail?: string }>;
};

type Data = {
  data: Row[];
  summary: Record<Category, Record<State, number>>;
  categories: Category[];
  filters?: {
    countries?: string[];
    agents?: string[];
    stages?: string[];
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

function getStageBadge(stage: string): { bg: string; color: string; icon: string } {
  const s = (stage || "").toLowerCase();
  if (s.includes("passport")) return { bg: "#eff6ff", color: "#1d4ed8", icon: "📘" };
  if (s.includes("medical")) return { bg: "#ecfdf5", color: "#047857", icon: "🩺" };
  if (s.includes("police")) return { bg: "#f0fdf4", color: "#15803d", icon: "🛡️" };
  if (s.includes("payment")) return { bg: "#fefce8", color: "#a16207", icon: "💵" };
  if (s.includes("takamul") || s.includes("skill")) return { bg: "#fdf4ff", color: "#a21caf", icon: "🏅" };
  if (s.includes("mofa") || s.includes("visa")) return { bg: "#f5f3ff", color: "#6d28d9", icon: "🌐" };
  if (s.includes("manpower") || s.includes("bmet")) return { bg: "#fff7ed", color: "#c2410c", icon: "📜" };
  if (s.includes("flight") || s.includes("ticket")) return { bg: "#e5f8eb", color: "#34c759", icon: "✈️" };
  if (s.includes("offer")) return { bg: "#f0f9ff", color: "#0284c7", icon: "📄" };
  return { bg: "#f8fafc", color: "#475569", icon: "●" };
}

function formatDocDate(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
}

export function DubaiDocumentsPage() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [agent, setAgent] = useState("");
  const [stage, setStage] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeDoc, setActiveDoc] = useState<DocumentViewerData | null>(null);

  const result = useQuery({
    queryKey: ["dubai-documents", applied, status, country, agent, stage, selectedCat, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: applied,
        status,
        country,
        agent,
        stage,
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
    setAgent("");
    setStage("");
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
      [
        "SL",
        "Candidate ID",
        "File No",
        "Candidate Name",
        "Phone",
        "Passport No",
        "Target Country",
        "Agent / Source Partner",
        "Company",
        "Profession",
        "Recruitment Stage",
        "Readiness Ratio",
        "Readiness %",
        "File Status",
        "Medical Result",
        "Visa Status",
        "BMET Status",
        ...categories,
        "Assigned Officer",
        "Office Branch",
      ].join(","),
      ...rows.map((row, i) => {
        const needed = categories.filter((c) => (row.statuses[c] ?? "PENDING") !== "NO NEED").length;
        const ready = categories.filter((c) => (row.statuses[c] ?? "PENDING") === "DONE").length;
        const pct = Math.round((ready / (needed || 1)) * 100);
        return [
          (page - 1) * pageSize + i + 1,
          row.candidateNo,
          row.fileNo,
          row.name,
          row.phone,
          row.passport,
          row.country,
          row.agent || "Direct Walk-in",
          row.company || "",
          row.profession || "",
          row.currentStage || "Passport Entry",
          `${ready}/${needed}`,
          `${pct}%`,
          row.fileStatus || "ACTIVE",
          row.medicalResult || "N/A",
          row.visaStatus || "N/A",
          row.manpowerStatus || "N/A",
          ...categories.map((c) => row.statuses[c] ?? "PENDING"),
          row.officer || "Office Operations",
          row.office || "Head Office",
        ]
          .map(quote)
          .join(",");
      }),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-collection-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <div className="country-design-filter-fields" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <label className="country-design-search">
              <Search size={13} />
              <input aria-label="Search candidate documents" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search candidate name, phone, passport, file, agent..." />
            </label>
            <label className="country-design-select">
              <select
                aria-label="Agent / Partner filter"
                value={agent}
                onChange={e => { setAgent(e.target.value); setPage(1); }}
              >
                <option value="">All Agents / Sources</option>
                <option value="DIRECT">Direct Office (No Agent)</option>
                {result.data?.filters?.agents?.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={10} />
            </label>
            <label className="country-design-select">
              <select
                aria-label="Recruitment stage filter"
                value={stage}
                onChange={e => { setStage(e.target.value); setPage(1); }}
              >
                <option value="">All Stages</option>
                {result.data?.filters?.stages?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={10} />
            </label>
            <label className="country-design-select">
              <select aria-label="Document status filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Document Statuses</option>
                <option value="PENDING">Has PENDING Documents</option>
                <option value="DONE">Has DONE Documents</option>
                <option value="NO NEED">Has NO NEED Documents</option>
              </select>
              <ChevronDown size={10} />
            </label>
            <button data-action-ui="primary" data-action-size="normal" className="management-filter-button" type="submit">Apply</button>
            <button data-action-ui="neutral" data-action-size="normal" className="management-filter-button" type="button" onClick={clearFilters}>Clear</button>
          </div>
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

        <div className="desktop-documents-table country-design-table">
          <table>
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 85 }} />
              <col style={{ width: 230 }} />
              {categories.map((c) => (
                <col key={c} style={{ width: 120 }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>SL</th>
                <th>Actions</th>
                <th>Client Information</th>
                {categories.map((c) => (
                  <th key={c} style={{ textAlign: "center" }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ opacity: result.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {rows.map((row, index) => {
                return (
                  <tr key={row.id}>
                    <td className="country-design-serial">
                      {(page - 1) * pageSize + index + 1}
                    </td>

                    {/* Actions: Open Dossier */}
                    <td>
                      <Link
                        data-action-ui="secondary"
                        data-action-size="compact"
                        prefetch={true}
                        href={`/file/${row.id}`}
                        className="country-design-dossier"
                      >
                        Dossier →
                      </Link>
                    </td>

                    {/* Client Information */}
                    <td>
                      <div className="country-design-cell client">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <Link prefetch={true} href={`/file/${row.id}`}>
                            {row.name}
                          </Link>
                          {row.candidateNo && (
                            <span className="country-design-candidate-id">
                              {row.candidateNo}
                            </span>
                          )}
                        </div>
                        <small>{row.phone}</small>
                        <small style={{ color: "#8e8e93", fontSize: "11px" }}>
                          File: <b>{row.fileNo}</b> · {getCountryFlag(row.country)} {row.country}
                        </small>
                      </div>
                    </td>

                    {/* Dynamic Document Categories */}
                    {categories.map((c) => {
                      const st = row.statuses[c] ?? "PENDING";
                      const isDone = st === "DONE";
                      const isNoNeed = st === "NO NEED";
                      const isPending = !isDone && !isNoNeed;
                      const hasAttachment = Boolean(row.docAttachments?.[c]);
                      const metaInfo = row.docMeta?.[c];
                      const dateText = metaInfo?.expiry ? formatDocDate(metaInfo.expiry) : metaInfo?.date ? formatDocDate(metaInfo.date) : "";
                      const metaText = dateText ? `Exp: ${dateText}` : metaInfo?.number ? `#${metaInfo.number}` : metaInfo?.detail || "";
                      const statusClass = isDone ? "is-done" : isNoNeed ? "is-none" : "is-pending";

                      return (
                        <td key={c} style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className={`doc-status-btn ${statusClass}`}
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
                            title={`Click to view, print or upload ${c}${metaText ? ` (${metaText})` : ""}`}
                          >
                            <span className="doc-status-top">
                              {isDone && <CheckCircle2 size={11} className="doc-icon-done" />}
                              {isPending && <Clock size={11} className="doc-icon-pending" />}
                              {isNoNeed && <Minus size={10} className="doc-icon-none" />}
                              <span className="doc-status-label">
                                {isDone && hasAttachment ? "DONE (ATTACHED)" : st}
                              </span>
                            </span>
                            {metaText ? (
                              <span className="doc-status-meta" title={metaText}>
                                {metaText}
                              </span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {!rows.length && !result.isFetching && (
                <tr>
                  <td colSpan={3 + categories.length} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <Link
                          prefetch={true}
                          href={`/file/${row.id}`}
                          style={{ fontWeight: 800, color: "var(--ink)", fontSize: "14px", textDecoration: "none", display: "inline-block", lineHeight: "1.3" }}
                        >
                          {row.name}
                        </Link>
                        {row.candidateNo && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              fontFamily: "monospace",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            {row.candidateNo}
                          </span>
                        )}
                      </div>
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
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          PP: <b>{row.passport}</b>
                        </span>
                      </div>
                      {row.agent && (
                        <div style={{ fontSize: "10.5px", color: "#475569", marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f8fafc", padding: "1px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                          <span>🤝</span>
                          <span style={{ fontWeight: 600 }}>Agent:</span>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{row.agent}</span>
                        </div>
                      )}
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

                {/* Readiness Progress Bar */}
                <div style={{ margin: "10px 0 6px", padding: "6px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Document Readiness</span>
                    <span style={{ color: readyCount === categories.length ? "#059669" : "#2563eb", fontWeight: 800 }}>
                      {readyCount}/{categories.length} Ready ({categories.length ? Math.round((readyCount / categories.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${categories.length ? Math.round((readyCount / categories.length) * 100) : 0}%`, height: "100%", background: readyCount === categories.length ? "#10b981" : "#3b82f6" }} />
                  </div>
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
                        <button
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
