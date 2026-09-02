"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Edit3, FileClock, FileWarning, FolderCheck, ListChecks, Phone, PhoneCall, PlusCircle, TimerOff, UserRoundCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { moduleItemPath } from "@/lib/modules";

type Lead = { id: string; leadNo: string; name: string; phone: string; passport: string; status: string; priority: number; priorityPercent: number; score: number; category: string; company: string; followUpAt: string | null; followUpCount: number; overdue: boolean };
type OfficerDashboardData = {
  officer: string;
  alerts: { overdue: number; passportMissing: number; interviewThreeDays: number; noFollowUp: number };
  metrics: { open: number; dueToday: number; overdue: number; passportMissing: number; interviews: number; documentsPending: number; converted: number; closed: number };
  categories: Array<{ category: string; total: number; callNow: number }>;
  priorityLeads: Lead[];
  dueToday: Lead[];
};
const emptyData: OfficerDashboardData = { officer: "Officer", alerts: { overdue: 0, passportMissing: 0, interviewThreeDays: 0, noFollowUp: 0 }, metrics: { open: 0, dueToday: 0, overdue: 0, passportMissing: 0, interviews: 0, documentsPending: 0, converted: 0, closed: 0 }, categories: [], priorityLeads: [], dueToday: [] };
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value)) : "Not set";
const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

export function OfficerDashboardPage() {
  const query = useQuery({
    queryKey: ["officer-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/officer-dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load officer dashboard");
      return (await response.json()).data as OfficerDashboardData;
    },
  });
  const data = query.data ?? emptyData;

  const coreMetrics = [
    { label: "Active Open Leads", value: data.metrics.open, hint: "View all leads", icon: UsersRound, tone: "#3b82f6", bg: "#eff6ff", href: moduleItemPath("call-center", "Work Call List") },
    { label: "Due Today", value: data.metrics.dueToday, hint: "Call scheduled today", icon: CalendarClock, tone: "#7258e8", bg: "#f0edff", href: `${moduleItemPath("call-center", "Work Call List")}?summary=Pre+Confirm` },
    { label: "Overdue Follow-ups", value: data.metrics.overdue, hint: "Urgent action required", icon: TimerOff, tone: "#ef4444", bg: "#fef2f2", href: "#must-do" },
    { label: "Interview Drives", value: data.metrics.interviews, hint: "Next 7 days", icon: CalendarClock, tone: "#10b981", bg: "#ecfdf5", href: moduleItemPath("call-center", "Registration & Interviews") },
    { label: "Converted to File", value: data.metrics.converted, hint: "Successful candidates", icon: CheckCircle2, tone: "#059669", bg: "#f0fdf4", href: `${moduleItemPath("call-center", "Work Call List")}?summary=Converted` },
    { label: "Passport to Collect", value: data.metrics.passportMissing, hint: "Missing PP records", icon: FileWarning, tone: "#f59e0b", bg: "#fffbeb", href: "#must-do" },
  ];

  const hasUrgentAlerts = data.alerts.overdue > 0 || data.alerts.passportMissing > 0 || data.alerts.interviewThreeDays > 0;

  return (
    <div className="officer-dashboard" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div className="officer-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Call Center
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Call Center – Officer Dashboard</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Welcome, <b>{data.officer}</b>. Live call center queue, daily follow-ups, and interview pipeline.</p>
        </div>

        <div className="officer-actions" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Create Candidate")}
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
            <PlusCircle size={15} /> New Candidate
          </Link>

          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Work Call List")}
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
            <ListChecks size={15} /> Work Call List
          </Link>

          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Registration & Interviews")}
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
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <UserRoundCheck size={15} /> Registration &amp; Interviews
          </Link>
        </div>
      </div>

      {query.isFetching && <div className="loading-line" />}
      {query.isError && <div className="form-error">Officer dashboard data could not be loaded. Please refresh the page.</div>}

      {/* Action Needed Alert Banner */}
      {hasUrgentAlerts && (
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            border: "1px solid #fecaca",
            borderRadius: "16px",
            padding: "16px 22px",
            background: "#fef2f2",
            color: "#991b1b",
            marginBottom: "18px",
            flexWrap: "wrap",
            boxShadow: "0 2px 8px rgba(239,68,68,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <AlertCircle size={24} color="#ef4444" />
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "#991b1b" }}>Immediate Action Needed on Open Pipeline</h2>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {data.alerts.overdue > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", background: "#fff", color: "#ef4444", border: "1px solid #fecaca" }}>
                    {data.alerts.overdue} OVERDUE CALLS
                  </span>
                )}
                {data.alerts.passportMissing > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", background: "#fff", color: "#f59e0b", border: "1px solid #fde68a" }}>
                    {data.alerts.passportMissing} MISSING PASSPORTS
                  </span>
                )}
                {data.alerts.interviewThreeDays > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "20px", background: "#fff", color: "#10b981", border: "1px solid #a7f3d0" }}>
                    {data.alerts.interviewThreeDays} INTERVIEWS IN 3 DAYS
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href="#must-do"
            style={{
              background: "#ef4444",
              color: "#fff",
              borderRadius: "10px",
              textDecoration: "none",
              padding: "8px 18px",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 2px 6px rgba(239,68,68,0.2)",
            }}
          >
            Go to Priority Queue ➔
          </a>
        </section>
      )}

      {/* 6 Essential Core Metric KPI Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        {coreMetrics.map(({ label, value, hint, icon: Icon, tone, bg, href }) => (
          <Link
            key={label}
            prefetch={true}
            href={href}
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              textDecoration: "none",
              color: "var(--ink)",
              boxShadow: "var(--shadow)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: bg,
                color: tone,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <small style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", display: "block" }}>
                {label}
              </small>
              <strong style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", display: "block", marginTop: "2px" }}>
                {value}
              </strong>
              <em style={{ fontStyle: "normal", fontSize: "11px", color: tone, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                {hint} <ArrowRight size={11} />
              </em>
            </div>
          </Link>
        ))}
      </section>

      {/* By Interested Category Breakdown */}
      {data.categories.length > 0 && (
        <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "20px 24px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "1px", color: "#7258e8", textTransform: "uppercase" }}>
                Live Breakdown
              </span>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: "3px 0 0" }}>Pipeline by Interested Work Category</h2>
            </div>
            <Link
              prefetch={true}
              href={moduleItemPath("call-center", "Work Call List")}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#7258e8",
                background: "#f0edff",
                border: "1px solid #dcd5fb",
                padding: "6px 14px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              View Full List ➔
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px" }}>Work Category</th>
                  <th style={{ padding: "12px 16px" }}>Total Interested Leads</th>
                  <th style={{ padding: "12px 16px" }}>Calls Scheduled Today</th>
                  <th style={{ padding: "12px 16px" }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((row) => (
                  <tr
                    key={row.category}
                    style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--ink)" }}>{row.category}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: "#f0edff", color: "#7258e8", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", fontSize: "12px" }}>
                        {row.total} Leads
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {row.callNow > 0 ? (
                        <span style={{ color: "#ef4444", fontWeight: 800, background: "#fef2f2", padding: "4px 10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                          {row.callNow} Due Now
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>0 Due</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        prefetch={true}
                        href={`${moduleItemPath("call-center", "Work Call List")}?category=${encodeURIComponent(row.category)}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          background: "#7258e8",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "12px",
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(114,88,232,0.25)",
                        }}
                      >
                        Open Queue ➔
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Priority Table */}
      <section id="must-do" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "20px 24px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <PhoneCall size={20} color="#ef4444" />
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>Priority Calling Queue (Immediate Action)</h2>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>Ranked by urgency (overdue schedule, passport status, interview date, priority score).</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "50px" }}>#</th>
                <th style={{ padding: "12px 14px" }}>Lead No</th>
                <th style={{ padding: "12px 14px" }}>Candidate Name</th>
                <th style={{ padding: "12px 14px" }}>Phone</th>
                <th style={{ padding: "12px 14px" }}>Passport</th>
                <th style={{ padding: "12px 14px" }}>Call Status</th>
                <th style={{ padding: "12px 14px" }}>Priority</th>
                <th style={{ padding: "12px 14px" }}>Urgency Action</th>
                <th style={{ padding: "12px 14px" }}>Follow-up Due</th>
                <th style={{ padding: "12px 14px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.priorityLeads.map((lead, index) => (
                <tr
                  key={lead.id}
                  style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>{index + 1}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--purple)" }}>{lead.leadNo}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--ink)" }}>{lead.name}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>{lead.phone}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {lead.passport === "MISSING" ? (
                      <em style={{ fontStyle: "normal", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", fontWeight: 800 }}>
                        MISSING
                      </em>
                    ) : (
                      lead.passport
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className="badge" style={{ fontSize: "11px", padding: "3px 8px" }}>{lead.status.replaceAll("_", " ")}</span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`priority-badge p${lead.priority}`} style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px" }}>
                      P{lead.priority}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: lead.overdue ? "#ef4444" : "#7258e8" }}>
                      {lead.passport === "MISSING" ? "COLLECT PASSPORT" : lead.overdue ? "OVERDUE - CALL NOW" : "FOLLOW UP"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", fontWeight: 600 }}>
                    {lead.overdue && <em style={{ fontStyle: "normal", background: "#ef4444", color: "#fff", borderRadius: "4px", padding: "1px 5px", fontSize: "10px", marginRight: "4px" }}>OVERDUE</em>}
                    {dateLabel(lead.followUpAt)}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <a
                      href={phoneHref(lead.phone)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        background: "#10b981",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 2px 4px rgba(16,185,129,0.25)",
                      }}
                    >
                      <Phone size={12} /> Call
                    </a>
                  </td>
                </tr>
              ))}
              {!data.priorityLeads.length && !query.isFetching && (
                <tr>
                  <td colSpan={10} style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
                    No open leads need immediate action. All follow-ups are up to date!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function priorityLabel(priority: number) {
  return priority === 1 ? "VERY HIGH" : priority === 2 ? "HIGH" : priority === 3 ? "MEDIUM" : priority === 4 ? "LOW" : "VERY LOW";
}
