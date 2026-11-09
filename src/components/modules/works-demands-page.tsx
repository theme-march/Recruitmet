"use client";
import { CountryDesignIcon } from "@/components/layout/country-design-icon";
import { meQueryOptions } from "@/lib/queries/me";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_WORLD_COUNTRIES, resolveCountryFlagEmoji } from "@/lib/country-data";

type Office = { id: string; code: string; name: string; country: string | null };
type Company = { id: string; code: string; name: string; country: string; officeId: string | null };
type Requirements = {
  officeId?: string;
  workHour?: string;
  workLocation?: string;
  saleVisaQuantity?: number;
  note?: string;
  fileOneId?: string | null;
  fileTwoId?: string | null;
};
type Row = {
  id: string;
  demandNo: string;
  title: string;
  country: string;
  profession: string;
  quantity: number;
  salary: number;
  currency: string | null;
  visaQuantity: number | null;
  saleVisaQuantity?: number;
  remainingQuantity?: number;
  visaRate: number;
  commissionPerFile: number;
  deadline: string | null;
  status: string;
  company: Company & { office: Office | null };
  requirements: Requirements;
};
type Payload = {
  data: Row[];
  filters: { offices: Office[]; companies: Company[]; countries?: string[] };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "40px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "13px",
  color: "#1e293b",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: "40px",
  padding: "0 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "13px",
  color: "#1e293b",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "13px",
  color: "#1e293b",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

export function WorksDemandsPage() {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const profileQuery = useQuery({
    ...meQueryOptions(),
    select: (body) => body.data,
  });

  const isSuperAdmin = profileQuery.data?.roleKey === "SUPER_ADMIN";
  const canManage = isSuperAdmin || Boolean(profileQuery.data?.permissions?.canManageDemands);

  const result = useQuery({
    queryKey: ["works-demands", search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ q: search, page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/api/demands?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load works and demands");
      return response.json() as Promise<Payload>;
    },
  });

  const rows = result.data?.data ?? [],
    meta = result.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };

  const totalVisas = useMemo(() => rows.reduce((acc, r) => acc + (r.visaQuantity ?? r.quantity ?? 0), 0), [rows]);
  const totalSales = useMemo(() => rows.reduce((acc, r) => acc + (r.saleVisaQuantity ?? r.requirements?.saleVisaQuantity ?? 0), 0), [rows]);

  const money = (value: number, currency: string | null = "BDT") => {
    if (!value) return "0.00";
    return `${Number(value).toLocaleString("en-US")} ${currency || "BDT"}`;
  };

  const getStatusBadge = (status: string, saleQty: number, visaQty: number) => {
    const isFull = visaQty > 0 && saleQty >= visaQty;
    return (
      <span className={`country-design-status works-design-status ${isFull ? "full" : "active"}`}>
        {isFull ? "Full Quota" : "Active"} ({saleQty}/{visaQty})
      </span>
    );
  };

  const getCountryBadge = (country: string) => {
    const isKsa = country.toLowerCase().includes("saudi");
    const isDubai = country.toLowerCase().includes("dubai") || country.toLowerCase().includes("uae");
    return (
      <span className={`country-design-stage works-design-country ${isKsa ? "saudi" : isDubai ? "dubai" : "other"}`}>
        {isKsa ? "🇸🇦" : isDubai ? "🇦🇪" : "🌐"} {country}
      </span>
    );
  };

  return (
    <div className="country-design-page works-design-page">
      <div className="country-design-breadcrumb">Dashboard / Works &amp; Demands</div>
      <div className="country-design-heading">
        <div>
          <h1>Works &amp; Demands</h1>
          <p>Live foreign company recruitment quotas, candidate sales, and visa demand management.</p>
        </div>
        {canManage && (
          <div className="country-design-actions">
            <button data-action-ui="primary" data-action-size="normal" className="works-design-create" type="button" onClick={() => setOpen(true)}>
              + Create Work &amp; Demand
            </button>
          </div>
        )}
      </div>

      <div className="country-design-metrics works-design-metrics">
        <div className="country-design-metric">
          <div><span>Total Demands</span><CountryDesignIcon name="Folder" /></div>
          <b>{meta.total}</b><p>Registered demands</p>
        </div>
        <div className="country-design-metric">
          <div><span>Total Visa Quotas</span><CountryDesignIcon name="Visa" /></div>
          <b>{totalVisas}</b><p>Visa allocations</p>
        </div>
        <div className="country-design-metric">
          <div><span>Candidates Sold</span><Users size={16} color="#34c759" /></div>
          <b>{totalSales}</b><p>Allocated candidates</p>
        </div>
        <div className="country-design-metric">
          <div><span>Remaining Quotas</span><CountryDesignIcon name="Manpower" /></div>
          <b>{Math.max(0, totalVisas - totalSales)}</b><p>Available visa quotas</p>
        </div>
      </div>

      <section className="demands-results-panel country-design-workspace works-design-workspace">
        <div className="country-design-filters works-design-filters">
          <form className="works-design-search-form" onSubmit={(event) => {
            event.preventDefault(); setSearch(query.trim()); setPage(1);
          }}>
            <label className="country-design-search works-design-search">
              <CountryDesignIcon name="Search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search works and demands" placeholder="Search by demand no, company, profession, country, or location..." />
              {query && (
                <button data-action-ui="ghost" data-action-size="icon" type="button" aria-label="Clear demand search" onClick={() => { setQuery(""); setSearch(""); setPage(1); }}><X size={14} /></button>
              )}
            </label>
            <button data-action-ui="primary" data-action-size="normal" className="works-design-search-submit" type="submit">Search</button>
          </form>
          <label className="country-design-page-size">
            Per Page:
            <span className="country-design-select">
              <select aria-label="Demands per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value="10">10</option><option value="20">20</option><option value="50">50</option>
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
          </label>
        </div>
        {result.isFetching && <div className="works-design-loading" role="status" aria-label="Loading works and demands"><div /></div>}
        {result.isError && <div className="works-design-error" role="alert">Works and demands could not be loaded. Please refresh the page.</div>}
        <div className="country-design-count">
          Showing {meta.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, meta.total)} of {meta.total} Total Works &amp; Demands
        </div>

        <div className="desktop-demands-table country-design-table works-design-table">
          <table>
            <colgroup>{[44, 75, 134, 116, 138, 120, 89, 76, 129, 107, 67, 102, 143].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
            <thead>
              <tr>{["SL", "Actions", "Demand", "Country", "Company", "Work Position", "Salary", "Visa Quota", "Sale Qty.", "Visa Rate", "Files", "Deadline", "Status"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const totalV = row.visaQuantity ?? row.quantity ?? 0;
                const saleV = row.saleVisaQuantity ?? (row.requirements?.saleVisaQuantity ?? 0);
                const remaining = Math.max(0, totalV - saleV);
                const percent = totalV > 0 ? Math.min(100, Math.round((saleV / totalV) * 100)) : 0;
                return (
                  <tr key={row.id}>
                    <td className="country-design-serial">{(page - 1) * pageSize + index + 1}</td>
                    <td>{canManage ? <button data-action-ui="secondary" data-action-size="compact" type="button" className="country-design-dossier works-design-edit" onClick={() => setEditRow(row)}>Edit →</button> : <span className="works-design-read-only">Read-Only</span>}</td>
                    <td><div className="country-design-cell works-design-demand"><span className="country-design-candidate-id">{row.demandNo}</span>{row.title && <small>{row.title}</small>}</div></td>
                    <td>{getCountryBadge(row.country)}</td>
                    <td><div className="country-design-cell client"><b>{row.company.name}</b>{row.company.office && <small>{row.company.office.name}</small>}</div></td>
                    <td><div className="country-design-cell"><b>{row.profession}</b>{row.requirements?.workLocation && <small>📍 {row.requirements.workLocation}</small>}</div></td>
                    <td><div className="country-design-cell"><b>{money(row.salary, row.currency)}</b>{row.requirements?.workHour && <small>⏱️ {row.requirements.workHour}</small>}</div></td>
                    <td><b className="works-design-quota">{totalV}</b></td>
                    <td>
                      <div className="works-design-sales">
                        <div><b className={saleV > 0 ? "sold" : ""}>{saleV} sold</b><small className={remaining === 0 ? "full" : ""}>{remaining} left</small></div>
                        <div className="works-design-progress" role="progressbar" aria-label={`Allocated quota for ${row.demandNo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className={percent >= 100 ? "full" : ""} style={{ width: `${percent}%` }} /></div>
                      </div>
                    </td>
                    <td><div className="country-design-cell"><b>{money(row.visaRate, row.currency)}</b>{row.commissionPerFile > 0 && <small className="works-design-commission">Com: {money(row.commissionPerFile, row.currency)}</small>}</div></td>
                    <td><div className="works-design-files">
                      {row.requirements?.fileOneId ? <FilePill label="File 1" onPreview={() => setPreviewFileId(row.requirements.fileOneId!)} /> : <span className="works-design-read-only">-</span>}
                      {row.requirements?.fileTwoId && <FilePill label="File 2" onPreview={() => setPreviewFileId(row.requirements.fileTwoId!)} />}
                    </div></td>
                    <td>{row.deadline ? <span className={`works-design-deadline ${new Date(row.deadline) < new Date() ? "overdue" : ""}`}>{new Date(row.deadline).toLocaleDateString("en-GB")}</span> : <span className="works-design-read-only">N/A</span>}</td>
                    <td>{getStatusBadge(row.status, saleV, totalV)}</td>
                  </tr>
                );
              })}
              {!rows.length && !result.isFetching && <tr><td colSpan={13} className="country-design-empty">No works and demands available.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile Demands Feed (Stitch Screen 7f7d18060a604f1db01d912aa10ab430) */}
        <div className="mobile-demands-stream">
          {rows.map((row) => {
            const totalV = row.visaQuantity ?? row.quantity ?? 0;
            const saleV = row.saleVisaQuantity ?? (row.requirements?.saleVisaQuantity ?? 0);
            const remaining = Math.max(0, totalV - saleV);
            const percent = totalV > 0 ? Math.min(100, Math.round((saleV / totalV) * 100)) : 0;

            return (
              <article key={row.id} className="demand-mobile-card">
                {/* Header: Demand No & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#4f46e5", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e0e7ff" }}>
                    {row.demandNo}
                  </span>
                  {getStatusBadge(row.status, saleV, totalV)}
                </div>

                {/* Body: Title & Meta */}
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px", lineHeight: "1.3" }}>
                    {row.title || `${row.company.name} ${row.profession}`}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)" }}>
                    {getCountryBadge(row.country)}
                    <span>•</span>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{row.company.name}</span>
                    {row.company.office && <span>({row.company.office.name})</span>}
                  </div>
                </div>

                {/* Position & Financial Specs 2x2 Grid */}
                <div className="demand-mobile-specs">
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", display: "block" }}>Position</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      {row.profession}
                      {row.requirements?.workLocation && (
                        <span style={{ fontSize: "10px", color: "#e11d48", fontWeight: 500 }}>📍 {row.requirements.workLocation}</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", display: "block" }}>Salary</span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      {money(row.salary, row.currency)}
                      {row.requirements?.workHour && (
                        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 500 }}>⏱ {row.requirements.workHour}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", display: "block" }}>Visa Rate</span>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)" }}>{money(row.visaRate, row.currency)}</span>
                    {row.commissionPerFile > 0 && (
                      <span style={{ display: "block", fontSize: "10px", color: "#059669", fontWeight: 600 }}>Com: {money(row.commissionPerFile, row.currency)}</span>
                    )}
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", display: "block" }}>Deadline</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: row.deadline && new Date(row.deadline) < new Date() ? "#dc2626" : "var(--ink)" }}>
                      {row.deadline ? new Date(row.deadline).toLocaleDateString("en-GB") : "Open"}
                    </span>
                  </div>
                </div>

                {/* Sales Allocation Meter */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                      Sale Qty: <strong style={{ color: "#059669" }}>{saleV} sold</strong>
                    </span>
                    <span style={{ color: "var(--muted)" }}>
                      <strong style={{ color: remaining === 0 ? "#ef4444" : "#d97706" }}>{remaining} left</strong> / <strong style={{ color: "#4f46e5" }}>{totalV} quota</strong>
                    </span>
                  </div>
                  <div className="demand-mobile-progress-track">
                    <div style={{ width: `${percent}%`, height: "100%", background: percent >= 100 ? "#ef4444" : "#4f46e5", borderRadius: "9999px", transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="demand-mobile-actions">
                  {canManage ? (
                    <button data-action-ui="secondary" data-action-size="normal"
                      type="button"
                      onClick={() => setEditRow(row)}
                      style={{ background: "#f0edff", color: "#4f46e5", border: "1px solid #dcd5fb", cursor: "pointer" }}
                    >
                      <Edit3 size={13} /> Edit Demand
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      Read-Only
                    </div>
                  )}

                  {row.requirements?.fileOneId || row.requirements?.fileTwoId ? (
                    <button data-action-ui="secondary" data-action-size="normal"
                      type="button"
                      onClick={() => setPreviewFileId(row.requirements?.fileOneId || row.requirements?.fileTwoId || null)}
                      style={{ background: "#ffffff", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer" }}
                    >
                      <FileCheck size={13} /> Attached Files
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--muted)" }}>
                      No Documents
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {!rows.length && !result.isFetching && (
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "16px", padding: "30px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              No works and demands available.
            </div>
          )}
        </div>

        <div className="country-design-pagination">
          <span>{meta.total} Total Works &amp; Demands</span>
          <div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span className="country-design-page-indicator">Page {page} of {Math.max(1, meta.totalPages)}</span>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      </section>

      {/* CREATE DEMAND DIALOG */}
      {open && (
        <CreateDemandDialog
          offices={result.data?.filters.offices ?? []}
          companies={result.data?.filters.companies ?? []}
          countries={result.data?.filters.countries ?? []}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            toast.success("Work & Demand created successfully!");
            await client.invalidateQueries({ queryKey: ["works-demands"] });
          }}
        />
      )}

      {/* EDIT DEMAND DIALOG */}
      {editRow && (
        <EditDemandDialog
          row={editRow}
          countries={result.data?.filters.countries ?? []}
          onClose={() => setEditRow(null)}
          onSaved={async () => {
            setEditRow(null);
            toast.success("Work & Demand updated successfully!");
            await client.invalidateQueries({ queryKey: ["works-demands"] });
          }}
        />
      )}

      {/* FILE PREVIEW MODAL */}
      {previewFileId && (
        <div role="dialog" aria-modal="true" aria-label="Dialog" className="master-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setPreviewFileId(null)}
        >
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "800px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <b style={{ fontSize: "16px", color: "var(--ink)" }}>Attached Document Preview</b>
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
                type="button"
                onClick={() => setPreviewFileId(null)}
                style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="master-modal-panel" style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", minHeight: "350px", display: "grid", placeItems: "center", background: "#f8fafc" }}>
              <Image
                src={`/api/files/${previewFileId}`}
                alt="Demand Attachment"
                width={800}
                height={500}
                unoptimized
                style={{ maxWidth: "100%", maxHeight: "500px", height: "auto", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <div style={{ textAlign: "center", padding: "20px" }}>
                <FileText size={40} color="#7258e8" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 600, margin: "0 0 8px" }}>
                  Document attachment
                </p>
                <a data-action-ui="primary" data-action-size="normal"
                  href={`/api/files/${previewFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilePill({ label, onPreview }: { label: string; onPreview: () => void }) {
  return (
    <button data-action-ui="secondary" data-action-size="normal"
      type="button"
      onClick={onPreview}
      className="country-design-dossier works-design-file-pill"
    >
      <Eye size={12} /> {label}
    </button>
  );
}

const defaultCountries = [
  "Saudi Arabia",
  "Dubai",
  "Other Country",
  "Qatar",
  "Kuwait",
  "Oman",
  "Malaysia",
  "Romania",
  "Italy",
  "Poland",
];

function SearchableCountryField({
  value,
  onChange,
  name,
  required = true,
}: {
  value: string;
  onChange: (val: string) => void;
  name?: string;
  listId?: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search input with external value
  useEffect(() => {
    if (!isOpen) {
      setSearch(value || "");
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const flag = resolveCountryFlagEmoji(undefined, value) || "🌐";

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q === (value || "").toLowerCase()) {
      return ALL_WORLD_COUNTRIES;
    }
    return ALL_WORLD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search, value]);

  const selectCountry = (countryName: string) => {
    onChange(countryName);
    setSearch(countryName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {name && <input type="hidden" name={name} value={value} />}

      <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
        {/* Flag Icon Box */}
        <div
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) setSearch(value || "");
          }}
          style={{
            width: "42px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            fontSize: "19px",
            flexShrink: 0,
            cursor: "pointer",
            userSelect: "none",
          }}
          title={`Flag: ${flag} (Click to open country list)`}
        >
          {flag}
        </div>

        {/* Search Input with dropdown arrow */}
        <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
          <input
            type="text"
            required={required && !value}
            value={isOpen ? search : value}
            onFocus={(e) => {
              setIsOpen(true);
              setSearch(value || "");
              e.target.select();
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder="e.g. Russia, Kuwait, Japan, Croatia"
            style={{
              ...inputStyle,
              paddingRight: "36px",
              fontWeight: 600,
            }}
            autoComplete="off"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) setSearch(value || "");
            }}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            <ChevronDown
              size={16}
              style={{
                transform: isOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List of all Countries */}
      {isOpen && (
        <div
          className="master-modal-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: "250px",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 1100,
            padding: "4px",
          }}
        >
          {filteredCountries.length > 0 ? (
            filteredCountries.map((c) => {
              const isSelected = c.name.toLowerCase() === (value || "").toLowerCase();
              return (
                <div
                  key={c.code + "-" + c.name}
                  onClick={() => selectCountry(c.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: isSelected ? "#f3f0ff" : "transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "18px", userSelect: "none" }}>{c.flag}</span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#7258e8" : "#1e293b",
                    }}
                  >
                    {c.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                    ({c.code})
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
              <p style={{ margin: "0 0 6px" }}>No matching country found.</p>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => selectCountry(search.trim())}
                  style={{
                    background: "#7258e8",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use &quot;{search.trim()}&quot;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateDemandDialog({
  offices,
  companies: _companies,
  countries: _propCountries,
  isSuperAdmin: _isSuperAdmin,
  onClose,
  onSaved,
}: {
  offices: Office[];
  companies: Company[];
  countries?: string[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [country, setCountry] = useState("Saudi Arabia");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Validate Company
    if (!companyName.trim()) {
      setError("Please enter the Foreign Company Name.");
      return;
    }

    // Validate Country
    if (!country.trim()) {
      setError("Please select or type a Country.");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData(event.currentTarget);

      const resolvedOfficeId = offices[0]?.id || "default";
      body.set("officeId", resolvedOfficeId);
      body.set("companyName", companyName.trim());
      body.set("country", country.trim());
      body.set("status", status);

      const response = await fetch("/api/demands", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Could not create demand");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create demand");
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Create Work & Demand" className="master-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <form className="master-modal-card master-modal-inline-card"
        noValidate
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Modal Header */}
        <div className="master-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px" }}>
              Create Work &amp; Demand
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              Add a new foreign company demand and visa quota allocation.
            </p>
          </div>
          <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--ink)" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="master-modal-panel" style={{ padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "10px", fontSize: "12px", marginBottom: "18px", border: "1px solid #fecaca", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {/* Row 1: Company Field (Direct Input) */}
          <OrbitField label="Company" required>
            <input
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Almarai, Nesma & Partners, Aramco"
              required
              style={inputStyle}
            />
          </OrbitField>

          {/* Row 1: Country Field */}
          <div>
            <OrbitField label="Country" required>
              <SearchableCountryField
                value={country}
                onChange={setCountry}
                name="country"
              />
            </OrbitField>
          </div>

          {/* Row 1: Status Field */}
          <div>
            <OrbitField label="Status">
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </OrbitField>
          </div>

          {/* Row 2: Work Position, Work Hours, Salary */}
          <OrbitField label="Work Position" required>
            <input name="profession" defaultValue="Electrician" placeholder="e.g. Electrician, Driver, Plumber" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Work Hours">
            <input name="workHour" placeholder="e.g. 8 Hours / 10 Hours" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Salary (Monthly)" required>
            <input name="salary" type="number" min="0" step="0.01" defaultValue="1800" placeholder="e.g. 1800" style={inputStyle} />
          </OrbitField>

          {/* Row 3: Work Location, Visa Quantity, Sale Visa Quantity */}
          <OrbitField label="Work Location">
            <input name="workLocation" placeholder="e.g. Riyadh, Dubai, Dammam" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Quantity" required>
            <input name="visaQuantity" type="number" min="1" defaultValue="50" placeholder="Total visa quota" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Sale Visa Quantity">
            <input name="saleVisaQuantity" type="number" min="0" defaultValue="0" placeholder="Initial sold visas" style={inputStyle} />
          </OrbitField>

          {/* Row 4: Visa Rate, Deadline, Commission Per File */}
          <OrbitField label="Visa Rate (Cost)">
            <input name="visaRate" type="number" min="0" step="0.01" placeholder="e.g. 450000" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Deadline">
            <input name="deadline" type="date" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Commission Per File">
            <input name="commissionPerFile" type="number" min="0" step="0.01" placeholder="e.g. 20000" style={inputStyle} />
          </OrbitField>

          {/* Row 5: Requirements / Note */}
          <div style={{ gridColumn: "1 / -1" }}>
            <OrbitField label="Requirements / Note">
              <textarea name="note" rows={3} placeholder="Additional job details or quota notes..." style={textareaStyle} />
            </OrbitField>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <button data-action-ui="neutral" data-action-size="normal"
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
            }}
          >
            {saving ? "Creating Demand..." : "Save Work & Demand"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditDemandDialog({
  row,
  countries: _propCountries,
  onClose,
  onSaved,
}: {
  row: Row;
  countries?: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [country, setCountry] = useState(row.country || "Saudi Arabia");
  const [companyName, setCompanyName] = useState(row.company?.name || "");
  const [profession, setProfession] = useState(row.profession);
  const [salary, setSalary] = useState(String(row.salary));
  const [workHour, setWorkHour] = useState(row.requirements?.workHour || "");
  const [workLocation, setWorkLocation] = useState(row.requirements?.workLocation || "");
  const [visaQuantity, setVisaQuantity] = useState(String(row.visaQuantity ?? row.quantity ?? 50));
  const [saleVisaQuantity, setSaleVisaQuantity] = useState(String(row.saleVisaQuantity ?? row.requirements?.saleVisaQuantity ?? 0));
  const [visaRate, setVisaRate] = useState(String(row.visaRate || ""));
  const [commissionPerFile, setCommissionPerFile] = useState(String(row.commissionPerFile || ""));
  const [deadline, setDeadline] = useState(row.deadline ? new Date(row.deadline).toISOString().split("T")[0] : "");
  const [note, setNote] = useState(row.requirements?.note || "");
  const [status, setStatus] = useState(row.status || "Active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) {
      setError("Please enter the Foreign Company Name.");
      return;
    }
    if (!country.trim()) {
      setError("Please select or type a Country.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/demands/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          country: country.trim(),
          profession,
          salary: Number(salary),
          workHour,
          workLocation,
          visaQuantity: Number(visaQuantity),
          saleVisaQuantity: Number(saleVisaQuantity),
          visaRate: Number(visaRate),
          commissionPerFile: Number(commissionPerFile),
          deadline: deadline || null,
          note,
          status,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Could not update demand");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update demand");
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit Work & Demand:" className="master-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <form className="master-modal-card master-modal-inline-card"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Modal Header */}
        <div className="master-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px" }}>
              Edit Work &amp; Demand: <span className="master-modal-accent" style={{ color: "#7258e8" }}>{row.demandNo}</span>
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              {companyName || "Corporate Employer"} — <b>{country}</b>
            </p>
          </div>
          <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--ink)" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="master-modal-panel" style={{ padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "10px", fontSize: "12px", marginBottom: "18px", border: "1px solid #fecaca", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {/* Row 1: Company, Country, Status */}
          <OrbitField label="Company" required>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Almarai, Nesma & Partners, Aramco"
              required
              style={inputStyle}
            />
          </OrbitField>

          <OrbitField label="Country" required>
            <SearchableCountryField
              value={country}
              onChange={setCountry}
              name="country"
              listId="edit-demand-country-presets"
            />
          </OrbitField>

          <OrbitField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </OrbitField>

          {/* Row 2: Work Position, Work Hours, Salary */}
          <OrbitField label="Work Position" required>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} required style={inputStyle} />
          </OrbitField>

          <OrbitField label="Work Hours">
            <input value={workHour} onChange={(e) => setWorkHour(e.target.value)} placeholder="e.g. 8 Hours / 10 Hours" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Salary (Monthly)" required>
            <input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} required style={inputStyle} />
          </OrbitField>

          {/* Row 3: Work Location, Visa Quantity, Sale Visa Quantity */}
          <OrbitField label="Work Location">
            <input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="e.g. Riyadh, Dubai, Dammam" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Quantity" required>
            <input type="number" min="1" value={visaQuantity} onChange={(e) => setVisaQuantity(e.target.value)} required style={inputStyle} />
          </OrbitField>

          <OrbitField label="Sale Visa Quantity">
            <input type="number" min="0" value={saleVisaQuantity} onChange={(e) => setSaleVisaQuantity(e.target.value)} style={inputStyle} />
          </OrbitField>

          {/* Row 4: Visa Rate (Cost), Deadline, Commission Per File */}
          <OrbitField label="Visa Rate (Cost)">
            <input type="number" min="0" step="0.01" value={visaRate} onChange={(e) => setVisaRate(e.target.value)} placeholder="e.g. 450000" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Deadline">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
          </OrbitField>

          <OrbitField label="Commission Per File">
            <input type="number" min="0" step="0.01" value={commissionPerFile} onChange={(e) => setCommissionPerFile(e.target.value)} placeholder="e.g. 20000" style={inputStyle} />
          </OrbitField>

          {/* Row 5: Requirements / Note */}
          <div style={{ gridColumn: "1 / -1" }}>
            <OrbitField label="Requirements / Note">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional job details or quota notes..." style={textareaStyle} />
            </OrbitField>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <button data-action-ui="neutral" data-action-size="normal"
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
            }}
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrbitField({
  label,
  required,
  actionText,
  onAction,
  children,
}: {
  label: string;
  required?: boolean;
  actionText?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
        </span>
        {actionText && onAction && (
          <button data-action-ui="secondary" data-action-size="normal"
            type="button"
            onClick={onAction}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "11px",
              fontWeight: 700,
              color: "#7258e8",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {actionText}
          </button>
        )}
      </div>
      {children}
    </label>
  );
}
