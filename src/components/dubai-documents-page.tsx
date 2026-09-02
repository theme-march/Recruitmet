"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Info,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentViewerModal, type DocumentViewerData } from "@/components/document-viewer-modal";

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
      if (!res.ok) throw new Error(data.message || "Failed to upload document");
      toast.success(`${category} scan attached & verified successfully!`);
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
    <div className="dubai-doc-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Document / Documents Collect
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Documents Collect</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Live verification status tracked automatically from each candidate&apos;s 360° workspace and dossier profile.
          </p>
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

      {/* Country Selector Tabs */}
      <section
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "16px",
        }}
      >
        {[
          { id: "", label: "All Countries", flag: "🌍" },
          ...(result.data?.filters?.countries || ["Saudi Arabia", "Dubai", "Other"]).map((cName) => ({
            id: cName,
            label: cName,
            flag: getCountryFlag(cName),
          })),
        ].map((c) => {
          const isSelected = country === c.id;
          return (
            <button
              key={c.id || "all"}
              type="button"
              onClick={() => {
                setCountry(c.id);
                setPage(1);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "2px solid",
                borderColor: isSelected ? "#7258e8" : "var(--line)",
                background: isSelected ? "#7258e8" : "#fff",
                color: isSelected ? "#fff" : "var(--ink)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 2px 8px rgba(114,88,232,0.25)" : "none",
              }}
            >
              <span style={{ fontSize: "13px" }}>{c.flag}</span> {c.label}
            </button>
          );
        })}
      </section>

      {/* Dynamic Summary Cards (Click to filter) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        {/* Total Files Card */}
        <div
          onClick={() => {
            setSelectedCat("");
            setStatus("");
            setPage(1);
          }}
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
            border: "2px solid",
            borderColor: selectedCat === "" ? "#10b981" : "#a7f3d0",
            borderRadius: "14px",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow)",
            cursor: "pointer",
          }}
          title="Click to show all documents"
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Files Tracked
          </span>
          <b style={{ fontSize: "26px", fontWeight: 900, color: "#047857", marginTop: "4px" }}>
            {meta.totalFiles}
          </b>
        </div>

        {/* Category Breakdown Cards */}
        {categories.map((cat) => {
          const stats = summary[cat] ?? { PENDING: 0, DONE: 0, "NO NEED": 0 };
          const isSelected = selectedCat === cat;
          return (
            <div
              key={cat}
              onClick={() => {
                setSelectedCat(isSelected ? "" : cat);
                setPage(1);
              }}
              style={{
                background: isSelected ? "#fcfaff" : "#fff",
                border: "2px solid",
                borderColor: isSelected ? "#7258e8" : "var(--line)",
                borderRadius: "14px",
                padding: "14px 16px",
                boxShadow: isSelected ? "0 4px 12px rgba(114,88,232,0.2)" : "var(--shadow)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to filter by this category"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <b style={{ fontSize: "12px", fontWeight: 800, color: isSelected ? "#7258e8" : "var(--ink)" }}>
                  {cat}
                </b>
                {isSelected && <span style={{ fontSize: "10px", color: "#7258e8", fontWeight: 800 }}>ACTIVE</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#d97706",
                    background: "#fffbeb",
                    padding: "3px 6px",
                    borderRadius: "6px",
                  }}
                >
                  <Clock size={11} /> {stats.PENDING}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "3px 6px",
                    borderRadius: "6px",
                  }}
                >
                  <CheckCircle2 size={11} /> {stats.DONE}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#7c3aed",
                    background: "#f5f3ff",
                    padding: "3px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {stats["NO NEED"]}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Filters Section */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
        <form onSubmit={handleSearch} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Search Candidate
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidate name, phone, passport, file..."
              style={{
                height: "40px",
                padding: "0 12px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "#fafafd",
                fontSize: "13px",
                color: "var(--ink)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Document Status Filter
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                height: "40px",
                padding: "0 12px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "#fafafd",
                fontSize: "13px",
                color: "var(--ink)",
                outline: "none",
              }}
            >
              <option value="">All Document Statuses</option>
              <option value="PENDING">Has PENDING Documents</option>
              <option value="DONE">Has DONE Documents</option>
              <option value="NO NEED">Has NO NEED Documents</option>
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
            Showing <b>{meta.total ? (page - 1) * pageSize + 1 : 0}</b> to <b>{Math.min(page * pageSize, meta.total)}</b> of <b>{meta.total}</b> candidates
            {selectedCat && <span style={{ color: "#7258e8", fontWeight: 700, marginLeft: "6px" }}>· Filtered by {selectedCat}</span>}
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

        {result.isError && <div className="form-error">Document records could not be loaded.</div>}

        <div style={{ overflowX: "auto" }}>
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                        <button
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
