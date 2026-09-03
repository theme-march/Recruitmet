"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Globe,
  MapPin,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as {
        name: string;
        role: string;
        roleKey: "SUPER_ADMIN" | "CALL_CENTER";
        permissions?: { canManageDemands?: boolean; canManageInterviews?: boolean };
      };
    },
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
    if (isFull) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 9px",
            borderRadius: "6px",
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            fontWeight: 700,
            fontSize: "11px",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
          Full Quota ({saleQty}/{visaQty})
        </span>
      );
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 9px",
          borderRadius: "6px",
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
          fontWeight: 700,
          fontSize: "11px",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
        Active ({saleQty}/{visaQty})
      </span>
    );
  };

  const getCountryBadge = (country: string) => {
    const isKsa = country.toLowerCase().includes("saudi");
    const isDubai = country.toLowerCase().includes("dubai") || country.toLowerCase().includes("uae");
    const bg = isKsa ? "#f0fdf4" : isDubai ? "#eff6ff" : "#fdf4ff";
    const color = isKsa ? "#15803d" : isDubai ? "#1d4ed8" : "#86198f";
    const border = isKsa ? "#bbf7d0" : isDubai ? "#bfdbfe" : "#f5d0fe";

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "6px",
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          fontWeight: 700,
          fontSize: "11px",
          whiteSpace: "nowrap",
        }}
      >
        {isKsa ? "🇸🇦" : isDubai ? "🇦🇪" : "🌐"} {country}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Works &amp; Demands
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>
            Works &amp; Demands
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Live foreign company recruitment quotas, candidate sales, and visa demand management.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {canManage && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={15} /> Create Work &amp; Demand
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 18px", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total Demands</span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>{meta.total}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 18px", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total Visa Quotas</span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#7258e8", marginTop: "4px" }}>{totalVisas} Visas</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 18px", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Candidates Sold</span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#059669", marginTop: "4px" }}>{totalSales} Allocated</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 18px", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Remaining Quotas</span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>{Math.max(0, totalVisas - totalSales)} Left</div>
        </div>
      </div>

      {/* Search and Table Card */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
        {/* Search Bar */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(query.trim());
            setPage(1);
          }}
          style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f8fafc",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "7px 14px",
              flex: "1",
              minWidth: "260px",
            }}
          >
            <Search size={16} color="var(--muted)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by demand no, company, profession, country, or location..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "12px",
                width: "100%",
                color: "var(--ink)",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                  setPage(1);
                }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(114,88,232,0.2)",
            }}
          >
            Search
          </button>
        </form>

        {result.isFetching && (
          <div style={{ height: "3px", width: "100%", background: "#f0edff", overflow: "hidden", marginBottom: "12px", borderRadius: "4px" }}>
            <div style={{ height: "100%", width: "40%", background: "#7258e8", animation: "indeterminate 1.2s infinite ease-in-out" }} />
          </div>
        )}

        {result.isError && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "12px", marginBottom: "14px", border: "1px solid #fecaca" }}>
            Works and demands could not be loaded. Please refresh the page.
          </div>
        )}

        {/* Table View */}
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>SL.</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Actions</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Demand</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Country</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Company</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Work Position</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Salary</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Visa Quota</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Sale Qty.</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Visa Rate</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Files</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Deadline</th>
                <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const totalV = row.visaQuantity ?? row.quantity ?? 0;
                const saleV = row.saleVisaQuantity ?? (row.requirements?.saleVisaQuantity ?? 0);
                const remaining = Math.max(0, totalV - saleV);
                const percent = totalV > 0 ? Math.min(100, Math.round((saleV / totalV) * 100)) : 0;

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#faf8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px", color: "var(--muted)", fontWeight: 600 }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px" }}>
                      {canManage ? (
                        <button
                          type="button"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 9px",
                            borderRadius: "6px",
                            background: "#f1f5f9",
                            border: "1px solid var(--line)",
                            color: "#7258e8",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onClick={() => setEditRow(row)}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                          Read-Only
                        </span>
                      )}
                    </td>

                    {/* Demand */}
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          background: "#f0edff",
                          color: "#7258e8",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          display: "inline-block",
                        }}
                      >
                        {row.demandNo}
                      </span>
                      {row.title && (
                        <small style={{ display: "block", color: "var(--muted)", marginTop: "3px", fontSize: "11px" }}>
                          {row.title}
                        </small>
                      )}
                    </td>

                    {/* Country */}
                    <td style={{ padding: "12px" }}>{getCountryBadge(row.country)}</td>

                    {/* Company */}
                    <td style={{ padding: "12px" }}>
                      <b style={{ color: "var(--ink)", display: "block" }}>{row.company.name}</b>
                      {row.company.office && (
                        <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                          {row.company.office.name}
                        </small>
                      )}
                    </td>

                    {/* Work Position */}
                    <td style={{ padding: "12px" }}>
                      <b style={{ color: "var(--ink)" }}>{row.profession}</b>
                      {row.requirements?.workLocation && (
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                          📍 {row.requirements.workLocation}
                        </small>
                      )}
                    </td>

                    {/* Salary */}
                    <td style={{ padding: "12px" }}>
                      <b style={{ color: "var(--ink)" }}>{money(row.salary, row.currency)}</b>
                      {row.requirements?.workHour && (
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "11px" }}>
                          ⏱️ {row.requirements.workHour}
                        </small>
                      )}
                    </td>

                    {/* Visa Quota */}
                    <td style={{ padding: "12px" }}>
                      <b style={{ color: "#7258e8", fontSize: "13px" }}>{totalV}</b>
                    </td>

                    {/* Sale Qty with mini meter */}
                    <td style={{ padding: "12px", minWidth: "120px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <b style={{ color: saleV > 0 ? "#059669" : "var(--muted)", fontSize: "12px" }}>{saleV} sold</b>
                        <small style={{ color: remaining === 0 ? "#ef4444" : "var(--muted)", fontWeight: 700, fontSize: "10px" }}>
                          {remaining} left
                        </small>
                      </div>
                      <div style={{ width: "100%", height: "5px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: percent >= 100 ? "#ef4444" : "#7258e8", borderRadius: "3px" }} />
                      </div>
                    </td>

                    {/* Visa Rate */}
                    <td style={{ padding: "12px" }}>
                      <b style={{ color: "var(--ink)" }}>{money(row.visaRate, row.currency)}</b>
                      {row.commissionPerFile > 0 && (
                        <small style={{ display: "block", color: "#059669", fontSize: "10px", fontWeight: 600 }}>
                          Com: {money(row.commissionPerFile, row.currency)}
                        </small>
                      )}
                    </td>

                    {/* Files */}
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {row.requirements?.fileOneId ? (
                          <FilePill label="File 1" onPreview={() => setPreviewFileId(row.requirements.fileOneId!)} />
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "11px" }}>-</span>
                        )}
                        {row.requirements?.fileTwoId && (
                          <FilePill label="File 2" onPreview={() => setPreviewFileId(row.requirements.fileTwoId!)} />
                        )}
                      </div>
                    </td>

                    {/* Deadline */}
                    <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                      {row.deadline ? (
                        <span style={{ color: new Date(row.deadline) < new Date() ? "#dc2626" : "var(--ink)", fontWeight: 600 }}>
                          {new Date(row.deadline).toLocaleDateString("en-GB")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>N/A</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "12px" }}>
                      {getStatusBadge(row.status, saleV, totalV)}
                    </td>
                  </tr>
                );
              })}

              {!rows.length && !result.isFetching && (
                <tr>
                  <td colSpan={13} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    No works and demands available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: "12px",
                color: "var(--ink)",
                outline: "none",
              }}
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Showing {meta.total ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, meta.total)} of {meta.total} records
            </span>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: page <= 1 ? "#f8fafc" : "#fff",
                color: page <= 1 ? "#cbd5e1" : "var(--ink)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "0 8px", color: "var(--ink)" }}>
              Page {page} of {Math.max(1, meta.totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: page >= meta.totalPages ? "#f8fafc" : "#fff",
                color: page >= meta.totalPages ? "#cbd5e1" : "var(--ink)",
                cursor: page >= meta.totalPages ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
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
        <div
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
          <div
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
              <button
                type="button"
                onClick={() => setPreviewFileId(null)}
                style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", minHeight: "350px", display: "grid", placeItems: "center", background: "#f8fafc" }}>
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
                <a
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
    <button
      type="button"
      onClick={onPreview}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "6px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1d4ed8",
        fontSize: "11px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <Eye size={12} /> {label}
    </button>
  );
}

function CreateDemandDialog({
  offices,
  companies,
  countries: propCountries,
  isSuperAdmin,
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
  const [officeId, setOfficeId] = useState(offices[0]?.id || "");
  const [isCustomOffice, setIsCustomOffice] = useState(false);
  const [customOfficeName, setCustomOfficeName] = useState("");

  const [country, setCountry] = useState("Saudi Arabia");
  const [isCustomCountry, setIsCustomCountry] = useState(false);
  const [customCountryName, setCustomCountryName] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState("");

  const [fileOne, setFileOne] = useState<File | null>(null);
  const [fileTwo, setFileTwo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const matchingCompanies = useMemo(() => {
    if (isCustomOffice || !officeId || officeId === "new") {
      const list = companies.filter((c) => !country || country === "new" || c.country === country);
      return list.length > 0 ? list : companies;
    }
    const filtered = companies.filter(
      (c) => (c.officeId === officeId || !c.officeId) && (!country || country === "new" || c.country === country)
    );
    return filtered.length > 0 ? filtered : companies;
  }, [companies, officeId, country, isCustomOffice]);

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
  const allCountries = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultCountries,
          ...(propCountries || []),
          ...offices.map((office) => office.country),
          ...companies.map((company) => company.country),
        ].filter(Boolean) as string[])
      ),
    [offices, companies, propCountries]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Validate Office
    if (isCustomOffice) {
      if (!customOfficeName.trim()) {
        setError("Please enter the new Office Name.");
        return;
      }
    } else if (!officeId) {
      setError("Please select an Office or add a new one.");
      return;
    }

    // Validate Country
    if (isCustomCountry) {
      if (!customCountryName.trim()) {
        setError("Please enter the new Country Name.");
        return;
      }
    } else if (!country) {
      setError("Please select a Country.");
      return;
    }

    // Validate Company
    if (isCustomCompany) {
      if (!customCompanyName.trim()) {
        setError("Please enter the new Foreign Company Name.");
        return;
      }
    } else if (!companyId) {
      if (matchingCompanies.length === 0 && isSuperAdmin) {
        setIsCustomCompany(true);
        setError("No companies found for this selection. Please type the foreign company name.");
        return;
      }
      setError("Please select a Company or click '+ Add New Company'.");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData(event.currentTarget);

      if (isCustomOffice) {
        body.set("officeId", "new");
        body.set("customOfficeName", customOfficeName.trim());
      } else {
        body.set("officeId", officeId);
      }

      if (isCustomCountry) {
        body.set("country", "new");
        body.set("customCountry", customCountryName.trim());
      } else {
        body.set("country", country);
      }

      if (isCustomCompany) {
        body.set("companyId", "new");
        body.set("customCompanyName", customCompanyName.trim());
      } else {
        body.set("companyId", companyId);
      }

      if (fileOne) body.set("fileOne", fileOne);
      if (fileTwo) body.set("fileTwo", fileTwo);

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
    <div
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
      <form
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px" }}>
              Create Work &amp; Demand
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              Add a new foreign company demand and visa quota allocation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--ink)" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "10px", fontSize: "12px", marginBottom: "18px", border: "1px solid #fecaca", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {/* Office Field */}
          <div>
            <OrbitField
              label="Office"
              required
              actionText={isSuperAdmin ? (isCustomOffice ? "← Existing Office" : "+ Add New Office") : undefined}
              onAction={
                isSuperAdmin
                  ? () => {
                      setIsCustomOffice(!isCustomOffice);
                      if (!isCustomOffice) setOfficeId("new");
                    }
                  : undefined
              }
            >
              {!isCustomOffice ? (
                <select
                  name="officeId"
                  value={officeId}
                  onChange={(event) => {
                    if (event.target.value === "__new__" && isSuperAdmin) {
                      setIsCustomOffice(true);
                      setOfficeId("new");
                    } else {
                      setOfficeId(event.target.value);
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="">Select Office</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                  {isSuperAdmin && (
                    <option value="__new__" style={{ fontWeight: "bold", color: "#7258e8" }}>
                      + Add New Custom Office...
                    </option>
                  )}
                </select>
              ) : (
                <input
                  name="customOfficeName"
                  value={customOfficeName}
                  onChange={(e) => setCustomOfficeName(e.target.value)}
                  placeholder="Type new office name..."
                  style={{ ...inputStyle, border: "2px solid #7258e8", background: "#faf8ff" }}
                />
              )}
            </OrbitField>
          </div>

          {/* Country Field */}
          <div>
            <OrbitField
              label="Country"
              required
              actionText={isSuperAdmin ? (isCustomCountry ? "← Select Country" : "+ Add New Country") : undefined}
              onAction={
                isSuperAdmin
                  ? () => {
                      setIsCustomCountry(!isCustomCountry);
                      if (!isCustomCountry) setCountry("new");
                    }
                  : undefined
              }
            >
              {!isCustomCountry ? (
                <select
                  name="country"
                  value={country}
                  onChange={(event) => {
                    if (event.target.value === "__new__" && isSuperAdmin) {
                      setIsCustomCountry(true);
                      setCountry("new");
                    } else {
                      setCountry(event.target.value);
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="">Select country</option>
                  {allCountries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  {isSuperAdmin && (
                    <option value="__new__" style={{ fontWeight: "bold", color: "#7258e8" }}>
                      + Add New Custom Country...
                    </option>
                  )}
                </select>
              ) : (
                <input
                  name="customCountry"
                  value={customCountryName}
                  onChange={(e) => setCustomCountryName(e.target.value)}
                  placeholder="Type new country name..."
                  style={{ ...inputStyle, border: "2px solid #7258e8", background: "#faf8ff" }}
                />
              )}
            </OrbitField>
          </div>

          {/* Company Field */}
          <div>
            <OrbitField
              label="Company"
              required
              actionText={isSuperAdmin ? (isCustomCompany ? "← Existing Company" : "+ Add New Company") : undefined}
              onAction={
                isSuperAdmin
                  ? () => {
                      setIsCustomCompany(!isCustomCompany);
                      if (!isCustomCompany) setCompanyId("new");
                    }
                  : undefined
              }
            >
              {!isCustomCompany ? (
                <select
                  name="companyId"
                  value={companyId}
                  onChange={(event) => {
                    if (event.target.value === "__new__" && isSuperAdmin) {
                      setIsCustomCompany(true);
                      setCompanyId("new");
                    } else {
                      setCompanyId(event.target.value);
                    }
                  }}
                  style={selectStyle}
                >
                  <option value="">Select company</option>
                  {matchingCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                  {isSuperAdmin && (
                    <option value="__new__" style={{ fontWeight: "bold", color: "#7258e8" }}>
                      + Add New Custom Company...
                    </option>
                  )}
                </select>
              ) : (
                <input
                  name="customCompanyName"
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  placeholder="Type new foreign company name..."
                  style={{ ...inputStyle, border: "2px solid #7258e8", background: "#faf8ff" }}
                />
              )}
            </OrbitField>
          </div>

          <OrbitField label="Work Position" required>
            <input name="profession" defaultValue="Electrician" placeholder="e.g. Electrician, Driver, Plumber" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Work Hours">
            <input name="workHour" placeholder="e.g. 8 Hours / 10 Hours" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Salary (Monthly)" required>
            <input name="salary" type="number" min="0" step="0.01" defaultValue="1800" placeholder="e.g. 1800" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Work Location">
            <input name="workLocation" placeholder="e.g. Riyadh, Dubai, Dammam" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Quantity" required>
            <input name="visaQuantity" type="number" min="1" defaultValue="50" placeholder="Total visa quota" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Sale Visa Quantity">
            <input name="saleVisaQuantity" type="number" min="0" defaultValue="0" placeholder="Initial sold visas" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Rate (Cost)">
            <input name="visaRate" type="number" min="0" step="0.01" placeholder="e.g. 450000" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Deadline">
            <input name="deadline" type="date" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Commission Per File">
            <input name="commissionPerFile" type="number" min="0" step="0.01" placeholder="e.g. 20000" style={inputStyle} />
          </OrbitField>

          <div style={{ gridColumn: "1 / -1" }}>
            <OrbitField label="Requirements / Note">
              <textarea name="note" rows={2} placeholder="Additional job details or quota notes..." style={textareaStyle} />
            </OrbitField>
          </div>

          <div style={{ gridColumn: "span 1.5" }}>
            <OrbitField label="File 1 (Document/Flyer)">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <input
                  type="file"
                  id="fileOneInput"
                  style={{ display: "none" }}
                  onChange={(e) => setFileOne(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="fileOneInput"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Upload size={12} /> Choose File
                </label>
                <span style={{ fontSize: "11px", color: fileOne ? "#1e293b" : "var(--muted)", fontWeight: fileOne ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileOne ? fileOne.name : "No file chosen"}
                </span>
              </div>
            </OrbitField>
          </div>

          <div style={{ gridColumn: "span 1.5" }}>
            <OrbitField label="File 2 (Quota Paper)">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <input
                  type="file"
                  id="fileTwoInput"
                  style={{ display: "none" }}
                  onChange={(e) => setFileTwo(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="fileTwoInput"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Upload size={12} /> Choose File
                </label>
                <span style={{ fontSize: "11px", color: fileTwo ? "#1e293b" : "var(--muted)", fontWeight: fileTwo ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileTwo ? fileTwo.name : "No file chosen"}
                </span>
              </div>
            </OrbitField>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <button
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
          <button
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
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
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
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/demands/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    <div
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
      <form
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px" }}>
              Edit Work &amp; Demand: <span style={{ color: "#7258e8" }}>{row.demandNo}</span>
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
              {row.company?.name} — {row.country}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--ink)" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "10px", fontSize: "12px", marginBottom: "18px", border: "1px solid #fecaca", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <OrbitField label="Work Position" required>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} required style={inputStyle} />
          </OrbitField>

          <OrbitField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </OrbitField>

          <OrbitField label="Work Hours">
            <input value={workHour} onChange={(e) => setWorkHour(e.target.value)} placeholder="e.g. 8 Hours" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Salary (Monthly)" required>
            <input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} required style={inputStyle} />
          </OrbitField>

          <OrbitField label="Work Location">
            <input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="e.g. Riyadh, Dubai" style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Quantity" required>
            <input type="number" min="1" value={visaQuantity} onChange={(e) => setVisaQuantity(e.target.value)} required style={inputStyle} />
          </OrbitField>

          <OrbitField label="Sale Visa Quantity">
            <input type="number" min="0" value={saleVisaQuantity} onChange={(e) => setSaleVisaQuantity(e.target.value)} style={inputStyle} />
          </OrbitField>

          <OrbitField label="Visa Rate (Cost)">
            <input type="number" min="0" step="0.01" value={visaRate} onChange={(e) => setVisaRate(e.target.value)} style={inputStyle} />
          </OrbitField>

          <OrbitField label="Deadline">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
          </OrbitField>

          <OrbitField label="Commission Per File">
            <input type="number" min="0" step="0.01" value={commissionPerFile} onChange={(e) => setCommissionPerFile(e.target.value)} style={inputStyle} />
          </OrbitField>

          <div style={{ gridColumn: "1 / -1" }}>
            <OrbitField label="Requirements / Note">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={textareaStyle} />
            </OrbitField>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <button
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
          <button
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
          <button
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
