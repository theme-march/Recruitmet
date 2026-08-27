"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, FileDown, FileText, FileUp, Filter, Phone, Plus, Search, Sparkles, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";

export type WorkCallRow = {
  id: string;
  leadNo: string;
  fullName: string;
  phone: string;
  additionalPhones?: string[];
  country: string;
  dataType: string;
  executive: string;
  priority: number;
  callStatus: string;
  fileStatus: string;
  callPurpose?: string;
  callSource?: string;
  proposedRate?: string;
  behaviorTag?: string;
  officeVisit?: string;
  dob?: string;
  age?: string;
  passportStatus?: string;
  passportNo?: string;
  expertIn?: string;
  district?: string;
  maritalStatus?: string;
  education?: string;
  passingYear?: string;
  bankLoan?: string;
  xBidesh?: string;
  email?: string;
  interviewOption?: string;
  interviewStatus: string;
  interviewScheduleId?: string;
  interviewSchedule: string;
  interviewDate?: string;
  workCategory?: string;
  workSubCategory?: string;
  company?: string;
  workerComments?: string[];
  executiveComments?: string[];
  adminComments?: string[];
  followUpAt: string | null;
  createdAt: string;
};

type WorkCallPage = { data: WorkCallRow[]; summary: Record<string, number>; meta: { page: number; pageSize: number; total: number; totalPages: number } };
type Schedule = { id: string; title: string; scheduledAt: string };
const summaryLabels = ["All", "Pre Confirm", "Confirm", "Converted", "Not Interested"];
const emptyFilters = { interviewSchedule: "", country: "", fileStatus: "", callStatus: "", interviewStatus: "", priority: "" };

export function WorkCallListPage() {
  const router = useRouter();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [summary, setSummary] = useState("All");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<WorkCallRow | null>(null);
  const [importing, setImporting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  async function handleConvertToFile(leadId: string) {
    setConvertingId(leadId);
    try {
      const res = await fetch("/api/work-calls/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to convert");
      toast.success("Lead successfully converted to Processing File!");
      if (json.data?.fileId) {
        router.push(`/file/${json.data.fileId}`);
      } else {
        void query.refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConvertingId(null);
    }
  }

  const schedules = useQuery({
    queryKey: ["interview-schedules-for-calls"],
    queryFn: async () => {
      const response = await fetch("/api/interviews?pageSize=100");
      return response.ok ? ((await response.json()).data as Schedule[]) : [];
    },
  });

  const query = useQuery({
    queryKey: ["work-call-list", applied, summary, search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (summary !== "All") params.set("summary", summary);
      if (search) params.set("q", search);
      Object.entries(applied).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const response = await fetch(`/api/work-calls?${params}`);
      if (!response.ok) throw new Error("Could not load work calls");
      return response.json() as Promise<WorkCallPage>;
    },
    placeholderData: (previousData) => previousData,
  });

  const data = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  const counts = query.data?.summary ?? {};

  const apply = () => {
    setApplied(filters);
    setPage(1);
  };
  const clear = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setSummary("All");
    setQ("");
    setSearch("");
    setPage(1);
  };
  const download = (filename: string, content: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const downloadSample = () =>
    download(
      "work-call-sample.csv",
      "fullName,phone,country,priority,callPurpose,behaviorTag,callStatus\nSample Worker,01700000000,Saudi Arabia,3,Overseas Employment,Interested,New\n"
    );
  const downloadRows = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    download(
      "work-call-list.csv",
      [
        "SL,Lead No,Officer,Name,Phone,Country,Priority,Call Status,File Status,Interview Status",
        ...data.map((row, index) =>
          [
            index + 1,
            row.leadNo,
            row.executive,
            row.fullName,
            row.phone,
            row.country,
            `P${row.priority}`,
            row.callStatus,
            row.fileStatus,
            row.interviewStatus,
          ]
            .map(escape)
            .join(",")
        ),
      ].join("\n")
    );
  };

  async function importCsv(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
      const headers = lines.shift()?.split(",").map((item) => item.trim()) ?? [];
      let saved = 0;
      for (const line of lines) {
        const values = line.split(",").map((item) => item.trim());
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        const response = await fetch("/api/work-calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewOption: "Without Interview",
            interviewScheduleId: "",
            interviewDate: "",
            workCategory: "",
            workSubCategory: "",
            company: "",
            interviewStatus: "",
            fileStatus: "New",
            fullName: row.fullName,
            phone: row.phone,
            additionalPhones: [],
            dob: "",
            age: "",
            passportStatus: "",
            passportNo: "",
            expertIn: "",
            country: row.country,
            district: "",
            maritalStatus: "",
            education: "",
            passingYear: "",
            bankLoan: "",
            xBidesh: "",
            email: "",
            proposedRate: "",
            priority: row.priority || "3",
            officeVisit: "",
            callSource: "CSV Import",
            callPurpose: row.callPurpose || "Overseas Employment",
            behaviorTag: row.behaviorTag || "Interested",
            callStatus: row.callStatus || "New",
            followUpDate: "",
            followUp1: "",
            followUp2: "",
            followUp3: "",
            workerComments: [],
            executiveComments: [],
            adminComments: [],
          }),
        });
        if (!response.ok) throw new Error(`Row ${saved + 2} could not be imported`);
        saved++;
      }
      toast.success(`${saved} work calls imported`);
      void query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      setImporting(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  return (
    <div className="work-call-list-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      <div className="page-head compact" style={{ marginBottom: "16px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Call Center / Work Call List
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Work Call List</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Search, filter and manage every recruitment lead across call operations.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={downloadSample}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileDown size={15} /> Sample CSV
          </button>
          <button
            disabled={importing}
            onClick={() => uploadRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileUp size={15} /> {importing ? "Importing..." : "Upload CSV File"}
          </button>
          <input ref={uploadRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0])} />

          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Registration & Interviews")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              background: "#f0edff",
              border: "1px solid #dcd5fb",
              color: "#7258e8",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <CalendarDays size={15} /> Interviews
          </Link>

          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Create Work Call")}
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
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
            }}
          >
            <Plus size={15} /> Create Call List
          </Link>
        </div>
      </div>

      {/* 1. DYNAMIC FILE STATUS METRICS */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", margin: 0 }}>
            File Pipeline Status
          </h2>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Click any stage to filter lead records</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {summaryLabels.map((label) => {
            const isSelected = summary === label;
            const count = counts[label] ?? 0;
            const displayLabel =
              label === "All"
                ? "All Records"
                : label === "Pre Confirm"
                ? "New & Pre-Confirm"
                : label === "Confirm"
                ? "Confirmed Leads"
                : label === "Converted"
                ? "Converted to File"
                : "Not Interested";

            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSummary(label);
                  setPage(1);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "2px solid",
                  borderColor: isSelected ? "#7258e8" : "var(--line)",
                  background: isSelected ? "#7258e8" : "#fafafd",
                  color: isSelected ? "#fff" : "var(--ink)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                  minHeight: "72px",
                  boxShadow: isSelected ? "0 4px 12px rgba(114,88,232,0.25)" : "none",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, opacity: isSelected ? 0.95 : 0.7 }}>{displayLabel}</span>
                <b style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>{count}</b>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. ESSENTIAL FILTERS */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "14px" }}>
          <FilterSelect
            label="Target Country"
            value={filters.country}
            options={["Saudi Arabia", "Dubai", "Other Country"]}
            onChange={(value) => setFilters({ ...filters, country: value })}
          />
          <FilterSelect
            label="Interview Schedule"
            value={filters.interviewSchedule}
            options={(schedules.data ?? []).map((item) => ({ value: item.id, label: item.title }))}
            onChange={(value) => setFilters({ ...filters, interviewSchedule: value })}
          />
          <FilterSelect
            label="File Status"
            value={filters.fileStatus}
            options={["New", "Pre-Confirmed", "Confirm", "Received PP", "Registration Done", "Active", "Hold", "Closed"]}
            onChange={(value) => setFilters({ ...filters, fileStatus: value })}
          />
          <FilterSelect
            label="Call Status"
            value={filters.callStatus}
            options={["New", "Interested", "Follow-up", "Interview Scheduled", "Converted", "Not Interested", "Closed"]}
            onChange={(value) => setFilters({ ...filters, callStatus: value })}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            options={[
              { value: "1", label: "P1 - Urgent" },
              { value: "2", label: "P2 - High" },
              { value: "3", label: "P3 - Normal" },
              { value: "4", label: "P4 - Low" },
              { value: "5", label: "P5 - Lowest" },
            ]}
            onChange={(value) => setFilters({ ...filters, priority: value })}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
          <button
            onClick={clear}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
          <button
            onClick={apply}
            style={{
              padding: "8px 22px",
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
            Apply Filters
          </button>
        </div>
      </section>

      {/* 3. TABLE AND SEARCH TOOLBAR */}
      <section
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "18px 22px",
          boxShadow: "var(--shadow)",
          position: "relative",
          minHeight: "360px",
        }}
      >
        {query.isFetching && (
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <form
            onSubmit={(event) => { event.preventDefault(); setSearch(q.trim()); setPage(1); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#fafafd",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "0 14px",
              height: "40px",
              width: "min(420px, 100%)",
            }}
          >
            <Search size={16} color="var(--muted)" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search candidate name, lead ID, phone, country..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                width: "100%",
                color: "var(--ink)",
              }}
            />
          </form>

          <button
            onClick={downloadRows}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
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

        {query.isError && <div className="form-error">Unable to load work call records.</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "50px" }}>SL</th>
                <th style={{ padding: "12px 14px", width: "90px" }}>Action</th>
                <th style={{ padding: "12px 14px" }}>Candidate &amp; Lead No</th>
                <th style={{ padding: "12px 14px" }}>Phone</th>
                <th style={{ padding: "12px 14px" }}>Target Country</th>
                <th style={{ padding: "12px 14px" }}>Officer</th>
                <th style={{ padding: "12px 14px" }}>Priority</th>
                <th style={{ padding: "12px 14px" }}>Call Status</th>
                <th style={{ padding: "12px 14px" }}>File Pipeline Status</th>
              </tr>
            </thead>
            <tbody style={{ opacity: query.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {data.map((row, index) => (
                <Fragment key={row.id}>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--line)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                      <span>{(meta.page - 1) * meta.pageSize + index + 1}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        className="lead-detail-btn"
                        onClick={() => setSelectedLead(row)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "6px 12px",
                          borderRadius: "7px",
                          background: "#7258e8",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(114,88,232,0.25)",
                        }}
                      >
                        <Eye size={12} /> Details
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, color: "var(--ink)" }}>{row.fullName}</div>
                      <div style={{ fontSize: "11px", color: "var(--purple)", fontWeight: 600 }}>{row.leadNo}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{row.phone}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--ink)" }}>{row.country}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--ink)" }}>
                      {row.executive}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className={`priority-badge p${row.priority}`} style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px" }}>
                        P{row.priority}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className="badge" style={{ fontSize: "11px", padding: "3px 8px" }}>{row.callStatus}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <select
                        className="inline-status-select"
                        value={row.fileStatus}
                        style={{
                          padding: "5px 8px",
                          borderRadius: "8px",
                          border: "1px solid var(--line)",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: "#fafafd",
                          color: "var(--ink)",
                        }}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            const res = await fetch("/api/work-calls", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: row.id, fileStatus: newStatus }),
                            });
                            if (!res.ok) throw new Error("Failed to update status");
                            toast.success(`File status changed to ${newStatus}`);
                            void query.refetch();
                          } catch (err) {
                            toast.error("Could not change status");
                          }
                        }}
                      >
                        <option value="New">New</option>
                        <option value="Interested">Interested</option>
                        <option value="Pre-Confirmed">Pre-Confirmed</option>
                        <option value="Confirm">Confirm</option>
                        <option value="Received PP">Received PP</option>
                        <option value="Registration Done">Registration Done</option>
                        <option value="Active">Active</option>
                        <option value="Hold">Hold</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
          {!data.length && !query.isFetching && (
            <div className="empty-state" style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
              <Search size={26} />
              <b style={{ display: "block", marginTop: "8px", color: "var(--ink)" }}>No work calls found</b>
              <span>Change the filters or create a new call.</span>
            </div>
          )}
        </div>
        <div className="pagination" style={{ marginTop: "16px" }}>
          <span>Showing {meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0} to {Math.min(page * pageSize, meta.total)} of {meta.total}</span>
          <div>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            <button className="current">{page}</button>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {selectedLead && <LeadDetailsModal lead={selectedLead} schedules={schedules.data ?? []} onUpdate={() => void query.refetch()} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          height: "38px",
          padding: "0 12px",
          borderRadius: "10px",
          border: "1px solid var(--line)",
          background: "#fafafd",
          fontSize: "13px",
          color: "var(--ink)",
          outline: "none",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <option value="">All</option>
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option} value={option}>
              {option}
            </option>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function LeadDetailsModal({ lead, schedules, onUpdate, onClose }: { lead: WorkCallRow; schedules: Schedule[]; onUpdate: () => void; onClose: () => void }) {
  const router = useRouter();
  const phoneHref = `tel:${lead.phone.replace(/[^+\d]/g, "")}`;
  const dateFormatted = (val?: string | null) => val ? new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set";

  const [fileStatus, setFileStatus] = useState(lead.fileStatus || "New");
  const [callStatus, setCallStatus] = useState(lead.callStatus || "New");
  const [scheduleId, setScheduleId] = useState(lead.interviewScheduleId || "");
  const [interviewStatus, setInterviewStatus] = useState(lead.interviewStatus || "Scheduled");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  async function handleConvertInModal() {
    setConverting(true);
    try {
      const res = await fetch("/api/work-calls/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to convert");
      toast.success("Lead converted to Processing File!");
      onClose();
      if (json.data?.fileId) {
        router.push(`/file/${json.data.fileId}`);
      } else {
        onUpdate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  async function saveChanges(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/work-calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          fileStatus,
          callStatus,
          interviewScheduleId: scheduleId,
          interviewStatus,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(data.message || "Lead status updated!");
      onUpdate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lead-modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lead-modal-header">
          <div>
            <div className="lead-badge-row">
              <span className="lead-no-tag">{lead.leadNo}</span>
              <span className={`priority-badge p${lead.priority}`}>P{lead.priority} Priority</span>
              <span className="badge">{fileStatus}</span>
              <span className="badge">{callStatus}</span>
            </div>
            <h2>{lead.fullName}</h2>
            <p>Created on {dateFormatted(lead.createdAt)} · Assigned to <b>{lead.executive}</b></p>
          </div>
          <div className="lead-modal-actions">
            <button
              type="button"
              className="button success"
              disabled={converting}
              onClick={handleConvertInModal}
              style={{ background: "#059669", color: "#ffffff", border: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={15} /> {converting ? "Converting..." : "Convert to File"}
            </button>
            <a href={phoneHref} className="lead-call-btn"><Phone size={15} /> Call Now</a>
            <button className="lead-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="lead-modal-body">
          {/* Quick Status Update Form */}
          <form className="lead-section full lead-edit-box" onSubmit={saveChanges}>
            <h3>⚡ Quick Status &amp; Interview Update</h3>
            <div className="lead-edit-grid">
              <label>File Status
                <select value={fileStatus} onChange={(e) => setFileStatus(e.target.value)}>
                  <option value="New">New</option>
                  <option value="Interested">Interested</option>
                  <option value="Pre-Confirmed">Pre-Confirmed</option>
                  <option value="Confirm">Confirm</option>
                  <option value="Received PP">Received PP (Passport)</option>
                  <option value="Registration Done">Registration Done</option>
                  <option value="Active">Active</option>
                  <option value="Hold">Hold</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <label>Call Status
                <select value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                  <option value="New">New</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <label>Select Interview Schedule
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                  <option value="">No Interview / General</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({new Date(s.scheduledAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </label>

              <label>Interview Status
                <select value={interviewStatus} onChange={(e) => setInterviewStatus(e.target.value)}>
                  <option value="Waiting For Interview">Waiting For Interview</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Absent">Absent</option>
                </select>
              </label>

              <label className="full">Add Officer Note / Follow-up Comment
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Type update note here..." />
              </label>
            </div>
            <div className="lead-edit-actions">
              <button type="submit" disabled={saving} className="button primary">
                {saving ? "Saving..." : "Save & Update Lead Status"}
              </button>
            </div>
          </form>

          {/* Basic Question */}
          <div className="lead-section">
            <h3><User size={16} /> Basic Information</h3>
            <div className="lead-info-grid">
              <div><span>Full Name:</span><b>{lead.fullName}</b></div>
              <div><span>Primary Phone:</span><b>{lead.phone}</b></div>
              <div><span>Additional Phones:</span><b>{lead.additionalPhones?.length ? lead.additionalPhones.join(", ") : "None"}</b></div>
              <div><span>Date of Birth:</span><b>{lead.dob || "—"}</b></div>
              <div><span>Age:</span><b>{lead.age ? `${lead.age} Years` : "—"}</b></div>
              <div><span>Passport Status:</span><b>{lead.passportStatus || "Not Available"}</b></div>
              <div><span>Passport Number:</span><b>{lead.passportNo || "—"}</b></div>
              <div><span>Expert In:</span><b>{lead.expertIn || "—"}</b></div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="lead-section">
            <h3>🌍 Personal &amp; Preferences</h3>
            <div className="lead-info-grid">
              <div><span>Preferred Country:</span><b>{lead.country}</b></div>
              <div><span>Present District:</span><b>{lead.district || "—"}</b></div>
              <div><span>Marital Status:</span><b>{lead.maritalStatus || "—"}</b></div>
              <div><span>Last Education:</span><b>{lead.education || "—"}</b></div>
              <div><span>Passing Year:</span><b>{lead.passingYear || "—"}</b></div>
              <div><span>Bank Loan:</span><b>{lead.bankLoan || "—"}</b></div>
              <div><span>X-Bidesh:</span><b>{lead.xBidesh || "—"}</b></div>
              <div><span>Email Address:</span><b>{lead.email || "—"}</b></div>
            </div>
          </div>

          {/* Call Center Control */}
          <div className="lead-section">
            <h3>📞 Call Center Control</h3>
            <div className="lead-info-grid">
              <div><span>Proposed Rate:</span><b>{lead.proposedRate ? `${lead.proposedRate} BDT` : "—"}</b></div>
              <div><span>Priority Score:</span><b>P{lead.priority}</b></div>
              <div><span>Office Visit:</span><b>{lead.officeVisit || "—"}</b></div>
              <div><span>Call Source:</span><b>{lead.callSource || "Direct"}</b></div>
              <div><span>Call Purpose:</span><b>{lead.callPurpose || "Overseas Employment"}</b></div>
              <div><span>Human Behavior Tag:</span><b>{lead.behaviorTag || "Interested"}</b></div>
              <div><span>Follow-up Date:</span><b>{dateFormatted(lead.followUpAt)}</b></div>
            </div>
          </div>

          {/* Interview Details */}
          <div className="lead-section">
            <h3>🗓️ Interview Details</h3>
            <div className="lead-info-grid">
              <div><span>Interview Option:</span><b>{lead.interviewOption || "Without Interview"}</b></div>
              <div><span>Schedule Title:</span><b>{lead.interviewSchedule || "—"}</b></div>
              <div><span>Interview Date:</span><b>{dateFormatted(lead.interviewDate)}</b></div>
              <div><span>Work Category:</span><b>{lead.workCategory || "—"}</b></div>
              <div><span>Work Sub Category:</span><b>{lead.workSubCategory || "—"}</b></div>
              <div><span>Company:</span><b>{lead.company || "—"}</b></div>
              <div><span>Interview Status:</span><b>{lead.interviewStatus || "—"}</b></div>
            </div>
          </div>

          {/* Comments and Notes */}
          <div className="lead-section full">
            <h3>💬 Comments &amp; Activity Log</h3>
            <div className="lead-comments-grid">
              <div className="comment-box">
                <h4>Worker Comments</h4>
                {lead.workerComments?.length ? lead.workerComments.map((c, i) => <p key={i}>• {c}</p>) : <em>No worker comments</em>}
              </div>
              <div className="comment-box">
                <h4>Executive Comments</h4>
                {lead.executiveComments?.length ? lead.executiveComments.map((c, i) => <p key={i}>• {c}</p>) : <em>No executive comments</em>}
              </div>
              <div className="comment-box">
                <h4>Admin Comments</h4>
                {lead.adminComments?.length ? lead.adminComments.map((c, i) => <p key={i}>• {c}</p>) : <em>No admin comments</em>}
              </div>
            </div>
          </div>
        </div>

        <div className="lead-modal-footer">
          <button className="button secondary" onClick={onClose}>Close</button>
          <a href={phoneHref} className="button primary"><Phone size={15} /> Direct Call ({lead.phone})</a>
        </div>
      </div>
    </div>
  );
}



