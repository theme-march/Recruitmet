"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Globe2,
  Info,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";

type Person = {
  id: string;
  candidateId: string;
  candidateNo: string;
  name: string;
  phone: string;
  interviewDate: string;
  category: string;
  fileStatus: string;
  interviewStatus: string;
  rating?: number | null;
  processingFileId?: string | null;
  fileNo?: string | null;
};

type Schedule = {
  id: string;
  title: string;
  company: string | null;
  profession: string | null;
  scheduledAt: string;
  venue: string | null;
  interviewer: string | null;
  capacity?: number;
  instructions?: string | null;
  status: string;
};

type DemandInfo = {
  id: string | null;
  demandNo: string;
  title: string;
  country: string;
  company: string;
  office: string;
  profession: string;
  totalVisaQty: number;
  salary: number;
  currency: string;
  visaRate: number;
  commission: number;
  deadline: string | null;
  workHour: string;
  workLocation: string;
  note: string;
  status: string;
};

type Attendance = {
  registered: number;
  waiting: number;
  present: number;
  absent: number;
  other: number;
};

type DetailPayload = {
  data: {
    schedule: Schedule;
    demand: DemandInfo;
    attendance: Attendance;
    fileStatusCounts: Record<string, number>;
    people: Person[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  };
};

const fileStatuses = ["Pre-Confirmed", "Confirm", "Received PP", "Call Back & Requested PP", "New Incoming Lead"];
const interviewStatuses = ["Waiting For Interview", "Selected", "Passed", "Absent", "Rescheduled", "Rejected"];

export function InterviewDetailPage({ scheduleId: propScheduleId }: { scheduleId?: string } = {}) {
  const params = useParams<{ id?: string; scheduleId?: string }>();
  const scheduleId = propScheduleId || params?.scheduleId || params?.id;
  const [editing, setEditing] = useState<string | null>(null);
  const [result, setResult] = useState("Waiting For Interview");
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({ fileStatus: "", interviewStatus: "", q: "" });
  const [applied, setApplied] = useState({ fileStatus: "", interviewStatus: "", q: "" });

  // Add Candidate to Interview States
  const [addOpen, setAddOpen] = useState(false);
  const [candidatePhone, setCandidatePhone] = useState("");
  const [adding, setAdding] = useState(false);

  const query = useQuery({
    queryKey: ["interview-detail", scheduleId, applied, page, pageSize],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        fileStatus: applied.fileStatus,
        interviewStatus: applied.interviewStatus,
        q: applied.q,
      });
      const response = await fetch(`/api/interview-schedules/${scheduleId}?${searchParams}`);
      if (!response.ok) throw new Error("Could not load interview details");
      return (await response.json()) as DetailPayload;
    },
    enabled: Boolean(scheduleId),
  });

  const leadsQuery = useQuery({
    queryKey: ["all-call-leads-for-interview"],
    queryFn: async () => {
      const res = await fetch("/api/work-calls?pageSize=100");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as Array<{ id: string; fullName: string; phone: string; country: string }>;
    },
    enabled: addOpen,
  });

  const data = query.data?.data;
  const schedule = data?.schedule;
  const demand = data?.demand;

  const apply = () => {
    setApplied({ ...filters });
    setPage(1);
  };

  const reset = () => {
    const cleared = { fileStatus: "", interviewStatus: "", q: "" };
    setFilters(cleared);
    setApplied(cleared);
    setPage(1);
  };

  const filterStatus = (status: string) => {
    const nextStatus = applied.fileStatus === status ? "" : status;
    setFilters((prev) => ({ ...prev, fileStatus: nextStatus }));
    setApplied((prev) => ({ ...prev, fileStatus: nextStatus }));
    setPage(1);
  };

  async function saveResult(interviewId: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/interviews/${interviewId}/assessment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          notes: "Updated from interview assessment dashboard",
        }),
      });
      const resData = await response.json();
      if (!response.ok) {
        const errorMsg =
          (typeof resData.error === "object" ? resData.error?.message : resData.error) ||
          resData.message ||
          "Could not update interview status";
        throw new Error(errorMsg);
      }
      toast.success(resData.message || "Interview status updated successfully!");
      setEditing(null);
      void query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStartProcessing(person: Person) {
    setConvertingId(person.id);
    try {
      const res = await fetch(`/api/interviews/${scheduleId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: person.id,
          candidateId: person.candidateId,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || resJson.message || "Failed to start file processing");
      }
      toast.success(
        resJson.message || `File ${resJson.data?.fileNo} created and sent to 9-Stage Processing Pipeline!`,
        { icon: "🚀" }
      );
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error starting file processing");
    } finally {
      setConvertingId(null);
    }
  }

  async function handleAddCandidate(phone: string) {
    if (!phone) return;
    setAdding(true);
    try {
      const selectedLead = (leadsQuery.data ?? []).find((l) => l.phone === phone);
      const res = await fetch(`/api/interview-schedules/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          candidateId: selectedLead?.id,
          name: selectedLead?.fullName,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        const msg =
          (typeof resJson.error === "object" ? resJson.error?.message : resJson.error) ||
          resJson.message ||
          "Failed to add candidate";
        throw new Error(msg);
      }
      toast.success(resJson.message || "Candidate added to interview schedule!");
      setAddOpen(false);
      setCandidatePhone("");
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign candidate");
    } finally {
      setAdding(false);
    }
  }

  const downloadCsv = async () => {
    if (!scheduleId) return;
    const url = `/api/interview-schedules/${scheduleId}?export=1&fileStatus=${encodeURIComponent(
      applied.fileStatus
    )}&interviewStatus=${encodeURIComponent(applied.interviewStatus)}&q=${encodeURIComponent(applied.q)}`;
    const res = await fetch(url);
    if (!res.ok) {
      toast.error("CSV download failed");
      return;
    }
    const body = (await res.json()) as DetailPayload;
    const list = body?.data?.people ?? [];
    if (!list.length) {
      toast.info("No records to export");
      return;
    }
    const headers = [
      "Candidate ID",
      "Full Name",
      "Phone",
      "Interview Date",
      "Trade",
      "File Status",
      "Interview Status",
      "Processing File",
    ];
    const rows = list.map((p) => [
      p.candidateNo,
      `"${p.name.replace(/"/g, '""')}"`,
      p.phone,
      dateLabel(p.interviewDate),
      p.category,
      p.fileStatus,
      p.interviewStatus,
      p.fileNo || "Pending",
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Interview_${schedule?.title || "List"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("CSV exported successfully!");
  };

  const totalQuota = demand?.totalVisaQty || schedule?.capacity || 50;
  const registeredCount = data?.attendance?.registered || 0;
  const quotaRemaining = Math.max(0, totalQuota - registeredCount);

  return (
    <div className="interview-detail-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Officer Dashboard / All Interviews / Detail
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>
            Interview: {schedule?.title || "Loading..."}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Overseas interview drive, candidate selection scoring, and instant pipeline conversion.
          </p>
        </div>

        <Link
          href={moduleItemPath("call-center", "Registration & Interviews")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "#fff",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={15} /> Back to all interviews
        </Link>
      </div>

      {query.isFetching && (
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, #7258e8, #a855f7, #7258e8)",
            backgroundSize: "200% 100%",
            animation: "loading-bar 1s infinite linear",
            borderRadius: "4px",
            marginBottom: "14px",
          }}
        />
      )}

      {query.isError && <div className="form-error">Interview details could not be loaded.</div>}

      {schedule && data && (
        <>
          {/* Action Buttons Toolbar */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
              }}
            >
              <UserPlus size={15} /> Add Candidate To This Interview
            </button>

            <Link
              href={`${moduleItemPath("call-center", "Create Work Call")}?scheduleId=${scheduleId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Plus size={14} /> Create New Lead (this schedule)
            </Link>

            <Link
              href={moduleItemPath("call-center", "Work Call List")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "10px",
                background: "#fff",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <UsersRound size={14} /> Work Call List
            </Link>
          </div>

          {/* 🌟 1. WORKS & DEMANDS COMPREHENSIVE DOSSIER CARD */}
          <section
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "var(--shadow)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            {/* Top Bar: Demand Title & Quota Badges */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--line)",
                paddingBottom: "14px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      background: "#f0edff",
                      color: "#7258e8",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FileSpreadsheet size={13} /> {demand?.demandNo || "DEM-AUTO"}
                  </span>
                  <span
                    style={{
                      background: "#ecfdf5",
                      color: "#059669",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {demand?.status || "Active"}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                  {demand?.title || schedule.title}
                </h2>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <span>🏢 <b>{demand?.company || schedule.company || "Employer"}</b></span>
                  <span>🌍 <b>{demand?.country || "Saudi Arabia"}</b></span>
                  <span>📍 Office: <b>{demand?.office || "Dhaka Head Office"}</b></span>
                  <span>🛠️ Trade: <b>{demand?.profession || schedule.profession || "General"}</b></span>
                </div>
              </div>

              {/* Quota Highlights */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid var(--line)",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total Quota</span>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--ink)" }}>{totalQuota} Visas</div>
                </div>
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>Registered</span>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#2563eb" }}>{registeredCount}</div>
                </div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    padding: "8px 16px",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>Available</span>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#059669" }}>{quotaRemaining} Left</div>
                </div>
              </div>
            </div>

            {/* Financial & Contract Specs Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <Banknote size={14} className="text-emerald-600" /> Monthly Salary
                </span>
                <b style={specValueStyle}>
                  {demand?.salary ? `${demand.salary.toLocaleString()} ${demand.currency}` : "50,000 BDT"}
                </b>
              </div>

              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <Coins size={14} className="text-indigo-600" /> Visa Package Rate
                </span>
                <b style={specValueStyle}>
                  ৳ {demand?.visaRate ? Number(demand.visaRate).toLocaleString() : "500,000"}
                </b>
              </div>

              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <Briefcase size={14} className="text-amber-600" /> Agent Commission
                </span>
                <b style={specValueStyle}>
                  {demand?.commission ? `${demand.commission.toLocaleString()} BDT` : "15,000 BDT"}
                </b>
              </div>

              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <Clock size={14} className="text-sky-600" /> Duty Hours
                </span>
                <b style={specValueStyle}>
                  {demand?.workHour || "8 Hours / Day"}
                </b>
              </div>

              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <MapPin size={14} className="text-rose-600" /> Venue / Location
                </span>
                <b style={specValueStyle}>
                  {demand?.workLocation || schedule.venue || "Dhaka Head Office"}
                </b>
              </div>

              <div style={specCardStyle}>
                <span style={specLabelStyle}>
                  <Calendar size={14} className="text-violet-600" /> Interview Date
                </span>
                <b style={specValueStyle}>
                  {dateLabel(schedule.scheduledAt)}
                </b>
              </div>
            </div>

            {/* Demand Notes & Instructions */}
            {(demand?.note || schedule.instructions) && (
              <div
                style={{
                  background: "#fafafd",
                  border: "1px dashed var(--line)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Info size={16} color="#7258e8" className="shrink-0" />
                <span>
                  <b>Instructions &amp; Requirements:</b> {demand?.note || schedule.instructions}
                </span>
              </div>
            )}
          </section>

          {/* 2. ATTENDANCE SUMMARY SECTION */}
          <section style={{ marginBottom: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: "0 0 10px 0" }}>
              Interview Attendance <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>(registration done only)</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
              <div style={{ ...attendanceCardStyle, background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8" }}>Registered</span>
                <b style={{ fontSize: "20px", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>{data.attendance.registered}</b>
              </div>
              <div style={{ ...attendanceCardStyle, background: "#fffbeb", borderColor: "#fde68a" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309" }}>Waiting</span>
                <b style={{ fontSize: "20px", fontWeight: 800, color: "#92400e", marginTop: "2px" }}>{data.attendance.waiting}</b>
              </div>
              <div style={{ ...attendanceCardStyle, background: "#ecfdf5", borderColor: "#a7f3d0" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#047857" }}>Present / Selected</span>
                <b style={{ fontSize: "20px", fontWeight: 800, color: "#065f46", marginTop: "2px" }}>{data.attendance.present}</b>
              </div>
              <div style={{ ...attendanceCardStyle, background: "#fff1f2", borderColor: "#fecdd3" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#be123c" }}>Absent / Reschedule</span>
                <b style={{ fontSize: "20px", fontWeight: 800, color: "#9f1239", marginTop: "2px" }}>{data.attendance.absent}</b>
              </div>
              <div style={{ ...attendanceCardStyle, background: "#f8fafc", borderColor: "var(--line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Other</span>
                <b style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>{data.attendance.other}</b>
              </div>
            </div>
          </section>

          {/* 3. FILE STATUS FILTER PILLS */}
          <section style={{ marginBottom: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: "0 0 10px 0" }}>
              File Status <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>(click a card to filter; same as Work create)</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              {fileStatuses.map((st) => {
                const isSelected = applied.fileStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => filterStatus(st)}
                    style={{
                      background: isSelected ? "#f0edff" : "#fff",
                      border: "2px solid",
                      borderColor: isSelected ? "#7258e8" : "var(--line)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: isSelected ? "0 2px 8px rgba(114,88,232,0.2)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 700, color: isSelected ? "#7258e8" : "var(--ink)" }}>
                      {st}
                    </span>
                    <b style={{ fontSize: "16px", fontWeight: 800, color: isSelected ? "#7258e8" : "var(--muted)" }}>
                      {data.fileStatusCounts[st] ?? 0}
                    </b>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. SEARCH & FILTERS BAR */}
          <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
              <label style={filterLabelStyle}>
                File Status
                <select
                  value={filters.fileStatus}
                  onChange={(e) => setFilters({ ...filters, fileStatus: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">All File Statuses</option>
                  {fileStatuses.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </label>

              <label style={filterLabelStyle}>
                Interview Status
                <select
                  value={filters.interviewStatus}
                  onChange={(e) => setFilters({ ...filters, interviewStatus: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">All Interview Statuses</option>
                  {interviewStatuses.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </label>

              <label style={filterLabelStyle}>
                Search Candidate
                <input
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="Candidate name or phone..."
                  style={inputStyle}
                />
              </label>

              <label style={filterLabelStyle}>
                Per Page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={inputStyle}
                >
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </label>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={apply}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 22px",
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
                  onClick={reset}
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
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* 5. PEOPLE LIST TABLE SECTION */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UsersRound size={18} color="#7258e8" />
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>People List</h3>
                <span style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", padding: "2px 8px", borderRadius: "9999px" }}>
                  {data.meta.total} candidates
                </span>
              </div>

              <button
                type="button"
                onClick={downloadCsv}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "#f0edff",
                  border: "1px solid #dcd5fb",
                  color: "#7258e8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Download size={14} /> Download CSV
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "12px 14px" }}>Name &amp; Candidate ID</th>
                    <th style={{ padding: "12px 14px" }}>Phone</th>
                    <th style={{ padding: "12px 14px" }}>Interview Date</th>
                    <th style={{ padding: "12px 14px" }}>Category</th>
                    <th style={{ padding: "12px 14px" }}>File Status</th>
                    <th style={{ padding: "12px 14px" }}>Interview Status</th>
                    <th style={{ padding: "12px 14px", textAlign: "center" }}>Action / File Processing</th>
                  </tr>
                </thead>
                <tbody style={{ opacity: query.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
                  {data.people.map((person) => (
                    <tr
                      key={person.id}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <b style={{ color: "var(--ink)", display: "block" }}>{person.name}</b>
                        <small style={{ color: "var(--muted)", fontSize: "11px" }}>{person.candidateNo}</small>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{person.phone}</td>
                      <td style={{ padding: "12px 14px", color: "var(--muted)" }}>{dateLabel(person.interviewDate)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#f1f5f9", color: "var(--ink)" }}>
                          {person.category}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "#faf5ff",
                            color: "#7e22ce",
                            border: "1px solid #e9d5ff",
                          }}
                        >
                          {person.fileStatus}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {editing === person.id ? (
                          <select
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            style={{
                              height: "32px",
                              padding: "0 8px",
                              borderRadius: "8px",
                              border: "1px solid #7258e8",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {interviewStatuses.map((st) => (
                              <option key={st}>{st}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background:
                                person.interviewStatus === "Selected" || person.interviewStatus === "Passed"
                                  ? "#ecfdf5"
                                  : person.interviewStatus === "Rejected" || person.interviewStatus === "Absent"
                                  ? "#fff1f2"
                                  : "#fffbeb",
                              color:
                                person.interviewStatus === "Selected" || person.interviewStatus === "Passed"
                                  ? "#059669"
                                  : person.interviewStatus === "Rejected" || person.interviewStatus === "Absent"
                                  ? "#e11d48"
                                  : "#d97706",
                            }}
                          >
                            {person.interviewStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
                          {editing === person.id ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                disabled={saving}
                                onClick={() => void saveResult(person.id)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  background: "#10b981",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  background: "#f1f5f9",
                                  border: "1px solid var(--line)",
                                  color: "var(--muted)",
                                  cursor: "pointer",
                                }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(person.id);
                                setResult(
                                  person.interviewStatus === "Waiting For Interview"
                                    ? "Selected"
                                    : person.interviewStatus
                                );
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                borderRadius: "8px",
                                background: "#f8fafc",
                                border: "1px solid var(--line)",
                                color: "var(--ink)",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                          )}

                          {person.processingFileId ? (
                            <Link
                              prefetch={true}
                              href={`/file/${person.processingFileId}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#f0edff",
                                color: "#7258e8",
                                border: "1px solid #dcd5fb",
                                fontWeight: 700,
                                fontSize: "11px",
                                padding: "5px 10px",
                                textDecoration: "none",
                                borderRadius: "8px",
                              }}
                              title="Open 360° Processing Dossier Workspace"
                            >
                              <FolderOpen size={12} /> {person.fileNo || "View File"}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={convertingId === person.id}
                              onClick={() => handleStartProcessing(person)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background:
                                  person.interviewStatus === "Selected" || person.interviewStatus === "Passed"
                                    ? "#7258e8"
                                    : "#64748b",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "5px 10px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                              }}
                              title="Create Processing File and send to Candidate 360 Workspace"
                            >
                              <Send size={11} />
                              {convertingId === person.id ? "Creating..." : "Start Processing"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.people.length && (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        No candidates match these filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Showing {data.meta.total ? (data.meta.page - 1) * data.meta.pageSize + 1 : 0}–
                {Math.min(data.meta.page * data.meta.pageSize, data.meta.total)} of {data.meta.total} candidates
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
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
                  Previous
                </button>
                <button
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: page >= data.meta.totalPages ? "#fafafd" : "#fff",
                    color: page >= data.meta.totalPages ? "var(--muted)" : "var(--ink)",
                    cursor: page >= data.meta.totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modal for adding candidates to interview */}
      {addOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setAddOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                  Add Candidate To Interview
                </h2>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0 0" }}>
                  Select a candidate lead from Call Center to assign into this schedule.
                </p>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                Choose Candidate from Call Center Leads
                <select
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select Candidate --</option>
                  {(leadsQuery.data || []).map((lead: { id?: string; phone: string; fullName: string }, idx: number) => (
                    <option key={`${lead.id || lead.phone}-${idx}`} value={lead.phone}>
                      {lead.fullName} ({lead.phone})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  padding: "9px 16px",
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
                type="button"
                disabled={adding || !candidatePhone}
                onClick={() => handleAddCandidate(candidatePhone)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "10px",
                  background: "#7258e8",
                  color: "#fff",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: adding || !candidatePhone ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
                }}
              >
                {adding ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const specCardStyle: React.CSSProperties = {
  background: "#fafafd",
  border: "1px solid var(--line)",
  borderRadius: "10px",
  padding: "10px 12px",
};

const specLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--muted)",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontWeight: 700,
};

const specValueStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--ink)",
  display: "block",
  marginTop: "3px",
  fontWeight: 800,
};

const attendanceCardStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
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

function dateLabel(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
