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

type State = "PENDING" | "DONE" | "NO NEED";
type Category = "PC Documents" | "Certificate" | "Licence" | "CV" | "BMET Finger" | "BMET Training";

type Row = {
  id: string;
  fileNo: string;
  candidateNo: string;
  name: string;
  phone: string;
  passport: string;
  country: string;
  officer: string;
  office: string;
  company: string;
  profession: string;
  statuses: Record<Category, State>;
};

type Data = {
  data: Row[];
  summary: Record<Category, Record<State, number>>;
  categories: Category[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalFiles: number;
    totalPages: number;
  };
};

const COUNTRIES = [
  { id: "", label: "All Countries" },
  { id: "Saudi Arabia", label: "Saudi Arabia" },
  { id: "Dubai", label: "Dubai" },
  { id: "Other Country", label: "Other Country" },
];

export function DubaiDocumentsPage() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
  const categories =
    result.data?.categories ??
    (["PC Documents", "Certificate", "Licence", "CV", "BMET Finger", "BMET Training"] as Category[]);
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

  const download = () => {
    const quote = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["SL", "File No", "Candidate", "Phone", "Passport", "Country", "Office", "Company", "Profession", ...categories].join(","),
      ...rows.map((row, i) =>
        [
          (page - 1) * pageSize + i + 1,
          row.fileNo,
          row.name,
          row.phone,
          row.passport,
          row.country,
          row.office,
          row.company,
          row.profession,
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
        {COUNTRIES.map((c) => {
          const isSelected = country === c.id;
          return (
            <button
              key={c.id}
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
              <Globe2 size={14} opacity={isSelected ? 1 : 0.6} /> {c.label}
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
                <th style={{ padding: "12px 14px" }}>Office &amp; Officer</th>
                <th style={{ padding: "12px 14px" }}>Company &amp; Trade</th>
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
                    <Link
                      prefetch={true}
                      href={`/file/${row.id}`}
                      style={{ fontWeight: 800, color: "var(--ink)", fontSize: "13px", textDecoration: "none" }}
                    >
                      {row.name}
                    </Link>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                      Phone: <b>{row.phone}</b> · Country: <b>{row.country}</b>
                    </div>
                    <div style={{ fontSize: "11px", color: "#7258e8", marginTop: "1px" }}>
                      File: <Link prefetch={true} href={`/file/${row.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>{row.fileNo}</Link> · PP: {row.passport}
                    </div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)" }}>{row.office}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{row.officer}</div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)" }}>{row.company}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{row.profession}</div>
                  </td>

                  {/* Read-only Live Dynamic Document Status Badges */}
                  {categories.map((c) => {
                    const st = row.statuses[c] ?? "PENDING";
                    return (
                      <td key={c} style={{ padding: "10px 6px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.3px",
                            background:
                              st === "DONE"
                                ? "#ecfdf5"
                                : st === "NO NEED"
                                ? "#f5f3ff"
                                : "#fffbeb",
                            color:
                              st === "DONE"
                                ? "#059669"
                                : st === "NO NEED"
                                ? "#7c3aed"
                                : "#d97706",
                            border: `1px solid ${
                              st === "DONE"
                                ? "#a7f3d0"
                                : st === "NO NEED"
                                ? "#ddd6fe"
                                : "#fde68a"
                            }`,
                          }}
                        >
                          {st}
                        </span>
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
    </div>
  );
}

export const DocumentsCollectPage = DubaiDocumentsPage;
