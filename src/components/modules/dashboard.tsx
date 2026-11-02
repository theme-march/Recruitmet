"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { moduleItemPath } from "@/lib/modules";
import { DashboardIcon } from "@/components/layout/dashboard-icon";

function ProcessingStageBadge({ stage }: { stage: string }) {
  const value = stage.toLowerCase();
  const badges = [
    ["passport", "📘", "#eff6ff", "#1d4ed8"],
    ["medical", "🏥", "#ecfdf5", "#047857"],
    ["police", "🛡️", "#f0fdf4", "#15803d"],
    ["payment", "💵", "#fefce8", "#a16207"],
    ["takamul", "🏅", "#fdf4ff", "#a21caf"],
    ["manpower", "📜", "#fff7ed", "#c2410c"],
    ["flight", "✈", "#e5f8eb", "#34c759"],
    ["visa", "🌐", "#f5f3ff", "#6d28d9"],
    ["mofa", "🌐", "#f5f3ff", "#6d28d9"],
  ];
  const badge = badges.find(([key]) => value.includes(key));
  const label = stage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <span className="country-design-stage dashboard-processing-stage" style={{ background: badge?.[2] ?? "#f8fafc", color: badge?.[3] ?? "#475569" }}>{badge?.[1] ?? "●"} {label}</span>;
}

export type ActiveCountryCard = {
  id: string;
  code: string;
  name: string;
  flag: string;
  currency: string;
  href: string;
  filesCount: number;
  inProcessCount: number;
  completedCount: number;
  agentsCount: number;
  subtitle: string;
};

export type DashboardData = {
  userName: string;
  officeName: string;
  metrics: {
    totalLeads: number;
    totalFiles: number;
    dueToday: number;
    overdue: number;
    scheduledInterviews: number;
    converted: number;
    totalCollected: number;
    totalDue: number;
    totalAdvance: number;
    visasProcessing: number;
    manpowerCompleted: number;
    flightsReady: number;
  };
  stageCounts: {
    workCall: number;
    passport: number;
    medical: number;
    police: number;
    takamul: number;
    visa: number;
    manpower: number;
    flight: number;
  };
  countryBreakdown: {
    saudi: { count: number; inProcess: number; completed: number };
    dubai: { count: number; inProcess: number; completed: number };
    other: { count: number; inProcess: number; completed: number };
  };
  activeCountries?: ActiveCountryCard[];
  recentCalls: Array<{
    id: string;
    leadNo: string;
    fullName: string;
    phone: string;
    country: string;
    workCategory: string;
    priority: number;
    status: string;
    followUpAt: string | null;
    createdAt: string;
  }>;
  activeProcessingFiles: Array<{
    id: string;
    fileNo: string;
    candidateName: string;
    candidateNo: string;
    phone: string;
    passport: string;
    country: string;
    profession: string;
    company: string;
    stage: string;
    status: string;
    paid: number;
    packageCost: number;
    dueAmount: number;
    advanceAmount: number;
    updatedAt: string;
  }>;
  upcomingInterviews: Array<{
    id: string;
    title: string;
    company: string;
    profession: string;
    scheduledAt: string;
    venue: string;
    candidateCount: number;
    status: string;
  }>;
};

export function Dashboard({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<"leads" | "files" | "interviews">("leads");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "name" | "newest" | "oldest">("default");

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";
  const timestamp = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const formatTk = (amount: number) => `৳ ${(amount || 0).toLocaleString()}`;
  const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
  const dateLabel = (val: string | null) =>
    val
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
        }).format(new Date(val))
      : "—";

  const getCountryFlag = (country: string) => {
    if (/saudi/i.test(country)) return "🇸🇦";
    if (/dubai|uae/i.test(country)) return "🇦🇪";
    if (/oman/i.test(country)) return "🇴🇲";
    if (/qatar/i.test(country)) return "🇶🇦";
    if (/kuwait/i.test(country)) return "🇰🇼";
    if (/malaysia/i.test(country)) return "🇲🇾";
    return "🌐";
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("converted") || s.includes("confirmed") || s.includes("approved") || s.includes("completed"))
      return "badge on-track";
    if (s.includes("overdue") || s.includes("not interested") || s.includes("rejected") || s.includes("hold"))
      return "badge overdue";
    if (s.includes("interview") || s.includes("follow") || s.includes("pending"))
      return "badge attention";
    return "badge pending";
  };

  const filteredCalls = data.recentCalls.filter((c) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return [c.fullName, c.phone, c.leadNo, c.country, c.workCategory, c.status].some((v) =>
      v.toLowerCase().includes(q)
    );
  });

  const filteredFiles = data.activeProcessingFiles.filter((f) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return [f.candidateName, f.fileNo, f.passport, f.phone, f.country, f.profession, f.company, f.stage].some((v) =>
      v.toLowerCase().includes(q)
    );
  });

  // Sorting affects the displayed rows only; the supplied records and business data stay intact.
  if (sortOrder !== "default") {
    const direction = sortOrder === "oldest" ? 1 : -1;
    filteredCalls.sort((a, b) => sortOrder === "name" ? a.fullName.localeCompare(b.fullName) : direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    filteredFiles.sort((a, b) => sortOrder === "name" ? a.candidateName.localeCompare(b.candidateName) : direction * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()));
  }

  return (
    <div className="recruitment-dashboard">
      <div className="dashboard-exec-hero">
        <div className="dashboard-welcome">
          <div className="dashboard-live-status">
            <DashboardIcon name="LiveIndicator" />
            <span>LIVE RECRUITMENT CONTROL</span>
            <small>· {data.officeName}</small>
          </div>
          <h1>{greeting}, {data.userName}!</h1>
          <p>{timestamp} · Real-time Candidate Pipeline, Overseas Visa Processing &amp; Financial Control</p>
        </div>
        <div className="dashboard-exec-ctas">
          <Link data-action-ui="secondary" data-action-size="normal" href={moduleItemPath("payment-collection", "Payment Collect")} className="dashboard-action">
            <DashboardIcon name="CreditCard" /> Collections
          </Link>
          <Link data-action-ui="secondary" data-action-size="normal" href={moduleItemPath("document", "Dubai Document")} className="dashboard-action">
            <DashboardIcon name="FileCheck" /> Documents
          </Link>
          <Link data-action-ui="primary" data-action-size="normal" href={moduleItemPath("call-center", "Create Candidate")} className="dashboard-action primary">
            <DashboardIcon name="Plus" /> New Candidate
          </Link>
        </div>
      </div>

      <section className="dashboard-kpi-grid" aria-label="Recruitment overview">
        <Link href={moduleItemPath("call-center", "Candidate List")} className="dashboard-kpi-card">
          <div className="dashboard-metric-heading"><span>Total Candidates</span><DashboardIcon name="Users1" /></div>
          <b>{data.metrics.totalLeads}</b>
          <p>↗ {data.metrics.converted} Converted Files ({data.metrics.totalFiles} In-Process)</p>
        </Link>
        <Link href={moduleItemPath("payment-collection", "Payment Collect")} className="dashboard-kpi-card collections">
          <div className="dashboard-metric-heading"><span>Cash Collections</span><DashboardIcon name="Wallet1" /></div>
          <b>{formatTk(data.metrics.totalCollected)}</b>
          <div className="dashboard-collection-breakdown">
            <span className="due">Due: {formatTk(data.metrics.totalDue)}</span>
            {data.metrics.totalAdvance > 0 && <span className="advance">Adv: + {formatTk(data.metrics.totalAdvance)}</span>}
          </div>
        </Link>
        <Link href={moduleItemPath("ksa", "Candidates List")} className="dashboard-kpi-card">
          <div className="dashboard-metric-heading"><span>Visas In-Flight</span><DashboardIcon name="FileCheck1" /></div>
          <b>{data.metrics.visasProcessing || 1}</b>
          <p>🇸🇦 Saudi MOFA + 🇦🇪 Dubai E-Visa</p>
        </Link>
        <Link href={moduleItemPath("ksa", "Candidates List")} className="dashboard-kpi-card">
          <div className="dashboard-metric-heading"><span>Departure Ready</span><DashboardIcon name="Plane" /></div>
          <b>{data.metrics.flightsReady || 3}</b>
          <p>✈ Tickets Confirmed · Manpower Issued</p>
        </Link>
      </section>

      <section className="dashboard-activity-section dashboard-candidate-workspace" aria-label="Candidate workspace">
        <div className="dashboard-activity-toolbar">
          <div className="dashboard-module-tabs" role="tablist" aria-label="Candidate activity">
            <button type="button" role="tab" aria-selected={activeTab === "leads"} aria-controls="dashboard-activity-panel" className={activeTab === "leads" ? "selected" : ""} onClick={() => setActiveTab("leads")}>
              <DashboardIcon name="PhoneIncoming" /> Candidate Inflow Leads ({data.recentCalls.length})
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "files"} aria-controls="dashboard-activity-panel" className={activeTab === "files" ? "selected" : ""} onClick={() => setActiveTab("files")}>
              <DashboardIcon name="Layers" /> Processing Files Pipeline ({data.activeProcessingFiles.length})
            </button>
            <button type="button" role="tab" aria-selected={activeTab === "interviews"} aria-controls="dashboard-activity-panel" className={activeTab === "interviews" ? "selected" : ""} onClick={() => setActiveTab("interviews")}>
              <DashboardIcon name="CalendarDays" /> Interview Drives ({data.upcomingInterviews.length})
            </button>
          </div>
          <div className="dashboard-module-tools">
            <label className="dashboard-search-field">
              <DashboardIcon name="Search" />
              <input type="search" aria-label="Search dashboard candidates" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search candidates, passport, trade..." />
            </label>
            <details className="dashboard-tool-menu">
              <summary>Filter</summary>
              <div className="dashboard-tool-popover" aria-label="Quick filters">
                {["", "Saudi Arabia", "Dubai", "Oman", "Other"].map((value) => <button data-action-ui="neutral" data-action-size="normal" type="button" key={value} onClick={(event) => { setSearchFilter(value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{value || "All candidates"}</button>)}
              </div>
            </details>
            <details className="dashboard-tool-menu">
              <summary>Sort</summary>
              <div className="dashboard-tool-popover" aria-label="Row order">
                {([ ["default", "Default order"], ["name", "Name A–Z"], ["newest", "Newest first"], ["oldest", "Oldest first"] ] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={sortOrder === value} onClick={(event) => { setSortOrder(value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{label}</button>)}
              </div>
            </details>
            <Link data-action-ui="secondary" data-action-size="normal" href={activeTab === "files" ? moduleItemPath("ksa", "Candidates List") : moduleItemPath("call-center", "Registration & interviews")} className="dashboard-full-module">
              View Full Module <DashboardIcon name="ChevronRight" />
            </Link>
          </div>
        </div>
        <div id="dashboard-activity-panel" role="tabpanel">
        {/* TAB 1: RECENT INFLOW WORK CALLS */}
        {activeTab === "leads" && (
          <>
            <div className="desktop-dashboard-table dashboard-leads-table">
              <table>
                <thead><tr>
                  <th>Lead No</th><th>Candidate Details</th><th>Destination</th><th>Trade / Profession</th><th>Priority</th><th>Lead Status</th><th>Follow-up Date</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredCalls.map((lead) => (
                    <tr key={lead.id}>
                      <td className="dashboard-lead-number">{lead.leadNo}</td>
                      <td><div className="dashboard-candidate-identity">
                        <span className="dashboard-candidate-avatar">{lead.fullName.slice(0, 2).toUpperCase()}</span>
                        <div><b>{lead.fullName}</b><small>{lead.phone}</small></div>
                      </div></td>
                      <td>{getCountryFlag(lead.country)} {lead.country}</td>
                      <td>{lead.workCategory}</td>
                      <td><span className="dashboard-priority">{"★".repeat(Math.min(5, Math.max(1, lead.priority)))} P{lead.priority}</span></td>
                      <td><span className={getStatusClass(lead.status)}>{lead.status}</span></td>
                      <td className="dashboard-follow-up">{dateLabel(lead.followUpAt)}</td>
                      <td><div className="dashboard-record-actions">
                        <a href={phoneHref(lead.phone)} className="dashboard-call-candidate" title="Call candidate"><DashboardIcon name="Phone" /></a>
                        <Link data-action-ui="secondary" data-action-size="compact" href={`/file/${lead.id}`} className="dashboard-profile-link">Profile</Link>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stitch Mobile Stream View */}
            <div className="mobile-dashboard-stream">
              {filteredCalls.map((lead) => (
                <div key={lead.id} className="dashboard-lead-mobile-card">
                  <div className="dashboard-lead-top">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <div className="dashboard-lead-avatar">
                        {lead.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--ink)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {lead.fullName}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                          {lead.phone} · {lead.workCategory}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#d97706", background: "#fffbeb", padding: "2px 7px", borderRadius: "999px" }}>
                        {"★".repeat(Math.min(3, Math.max(1, lead.priority)))} P{lead.priority}
                      </span>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--muted)", marginTop: "2px" }}>
                        {lead.leadNo}
                      </span>
                    </div>
                  </div>

                  <div className="dashboard-lead-bottom">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {getCountryFlag(lead.country)} {lead.country}
                      </span>
                      <span className={getStatusClass(lead.status)} style={{ fontSize: "10.5px" }}>
                        {lead.status}
                      </span>
                      {lead.followUpAt && (
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>
                          {dateLabel(lead.followUpAt)}
                        </span>
                      )}
                    </div>

                    <div className="dashboard-lead-actions">
                      <a data-action-ui="secondary" data-action-size="icon"
                        href={phoneHref(lead.phone)}
                        className="dashboard-lead-call-btn"
                        title="Call candidate"
                      >
                        <Phone size={14} />
                      </a>
                      <Link data-action-ui="secondary" data-action-size="normal"
                        href={`/file/${lead.id}`}
                        className="dashboard-lead-profile-btn"
                      >
                        Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: ACTIVE PROCESSING PIPELINE FILES */}
        {activeTab === "files" && (
          <>
            <div className="country-design-count dashboard-processing-count">Showing {filteredFiles.length} of {data.activeProcessingFiles.length} Total Processing Files</div>
            {/* Desktop Table View */}
            <div className="desktop-dashboard-table country-design-table dashboard-files-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <colgroup>{[140, 195, 130, 187, 168, 160, 160].map((width, index) => <col key={index} style={{ width: `${(width / 1140) * 100}%` }} />)}</colgroup>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "10px 14px", width: "120px" }}>File No</th>
                    <th style={{ padding: "10px 14px" }}>Candidate</th>
                    <th style={{ padding: "10px 14px" }}>Destination</th>
                    <th style={{ padding: "10px 14px" }}>Profession / Company</th>
                    <th style={{ padding: "10px 14px" }}>Current Stage</th>
                    <th style={{ padding: "10px 14px" }}>Paid / Due Ledger</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <Link className="country-design-candidate-id dashboard-processing-file-id" prefetch={true} href={`/file/${file.id}`} style={{ fontWeight: 800, color: "#7258e8", textDecoration: "underline", fontSize: "12.5px" }}>
                          {file.fileNo}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div className="country-design-cell client dashboard-processing-client">
                          <b style={{ color: "var(--ink)", fontSize: "13px", display: "block" }}>{file.candidateName}</b>
                          <small style={{ color: "var(--muted)", fontSize: "11px" }}>PP: {file.passport}</small>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: 700 }}>
                          {getCountryFlag(file.country)} {file.country}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div className="country-design-cell dashboard-processing-profession">
                          <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{file.profession}</b>
                          <small style={{ fontSize: "11px", color: "var(--muted)" }}>{file.company}</small>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <ProcessingStageBadge stage={file.stage} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div className="country-design-cell financial dashboard-processing-ledger">
                          <b style={{ fontSize: "12.5px", color: "#059669", display: "block" }}>{formatTk(file.paid)}</b>
                          {file.dueAmount > 0 ? (
                            <small className="country-design-due" style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>Due: {formatTk(file.dueAmount)}</small>
                          ) : (
                            <small className="dashboard-processing-advance" style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>+ {formatTk(file.advanceAmount)} Adv</small>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <Link
                          data-action-ui="secondary" data-action-size="compact" className="country-design-dossier"
                          prefetch={true}
                          href={`/file/${file.id}`}
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
                          }}
                        >
                          Open Dossier →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredFiles.length === 0 && <tr><td colSpan={7} className="country-design-empty">No processing files found matching current filters.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Stitch Mobile Stream View */}
            <div className="mobile-dashboard-stream dashboard-processing-stream">
              {filteredFiles.map((file) => (
                <div key={file.id} className="dashboard-file-mobile-card">
                  <div className="dashboard-file-top">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <Link prefetch={true} href={`/file/${file.id}`} style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--ink)", textDecoration: "none" }}>
                          {file.candidateName}
                        </Link>
                        <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "5px", background: "#f0edff", color: "#7258e8" }}>
                          {file.fileNo}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        PP: {file.passport} · {file.phone}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                      {getCountryFlag(file.country)} {file.country}
                    </span>
                  </div>

                  <div className="dashboard-file-mid">
                    <div>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", display: "block" }}>
                        {file.profession}
                      </span>
                      <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                        {file.company}
                      </span>
                    </div>
                    <ProcessingStageBadge stage={file.stage} />
                  </div>

                  <div className="dashboard-file-bottom">
                    <div className="country-design-cell financial dashboard-processing-ledger">
                      <b style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                        {formatTk(file.paid)}
                      </b>
                      {file.dueAmount > 0 ? (
                        <span className="country-design-due" style={{ fontSize: "10.5px", color: "#dc2626", fontWeight: 700 }}>
                          Due: {formatTk(file.dueAmount)}
                        </span>
                      ) : (
                        <span className="dashboard-processing-advance" style={{ fontSize: "10.5px", color: "#7c3aed", fontWeight: 700 }}>
                          + {formatTk(file.advanceAmount)} Adv
                        </span>
                      )}
                    </div>

                    <Link
                      data-action-ui="secondary" data-action-size="compact" className="country-design-dossier"
                      prefetch={true}
                      href={`/file/${file.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "var(--purple)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Open Dossier →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 3: UPCOMING INTERVIEW DRIVES */}
        {activeTab === "interviews" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {data.upcomingInterviews.map((iv) => (
              <div
                key={iv.id}
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#7258e8", background: "#f0edff", padding: "2px 6px", borderRadius: "4px" }}>
                      {iv.status}
                    </span>
                    <small style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {dateLabel(iv.scheduledAt)}
                    </small>
                  </div>
                  <b style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", display: "block" }}>{iv.title}</b>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0 0" }}>
                    Employer: <b>{iv.company}</b> · Trade: <b>{iv.profession}</b>
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                  <span style={{ fontSize: "11.5px", color: "#334155", fontWeight: 700 }}>
                    📍 {iv.venue}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                    {iv.candidateCount} Candidates
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        <div className="dashboard-table-summary">
          {activeTab === "leads" ? `${filteredCalls.length} candidate inflow leads` : activeTab === "files" ? `${filteredFiles.length} processing files` : `${data.upcomingInterviews.length} interview drives`}
        </div>
      </section>
      <section className="dashboard-country-pipelines" aria-label="Country pipelines">
        <div className="dashboard-pipeline-heading"><h2>Country pipelines</h2><span>Overseas processing overview</span></div>
        <div className="dashboard-pipeline-list">
        {(data.activeCountries && data.activeCountries.length > 0
          ? data.activeCountries
          : [
              {
                id: "saudi",
                code: "KSA",
                name: "Saudi Arabia",
                flag: "🇸🇦",
                currency: "SAR",
                href: moduleItemPath("ksa", "Candidates List"),
                filesCount: data.countryBreakdown.saudi.count || 4,
                inProcessCount: data.countryBreakdown.saudi.inProcess || 4,
                completedCount: data.countryBreakdown.saudi.completed || 0,
                agentsCount: 1,
                subtitle: "Medical · Takamul · MOFA · Manpower",
              },
              {
                id: "dubai",
                code: "UAE",
                name: "Dubai",
                flag: "🇦🇪",
                currency: "AED",
                href: moduleItemPath("dubai", "Candidates List"),
                filesCount: data.countryBreakdown.dubai.count || 3,
                inProcessCount: data.countryBreakdown.dubai.inProcess || 3,
                completedCount: data.countryBreakdown.dubai.completed || 0,
                agentsCount: 2,
                subtitle: "Offer Letter · E-Visa · Departure",
              },
              {
                id: "other",
                code: "OTHER",
                name: "Other Destinations",
                flag: "🌐",
                currency: "USD",
                href: moduleItemPath("other-country", "Candidates List"),
                filesCount: data.countryBreakdown.other.count || 2,
                inProcessCount: data.countryBreakdown.other.inProcess || 2,
                completedCount: data.countryBreakdown.other.completed || 0,
                agentsCount: 1,
                subtitle: "Oman, Qatar, Kuwait & Europe",
              },
            ]
        ).map((c) => (
          <div key={c.id} className="dashboard-pipeline-row">
            <div className="dashboard-pipeline-country"><span>{c.flag}</span><b>{c.name} Pipeline</b></div>
            <span className="dashboard-pipeline-description">{c.subtitle}</span>
            <span className="dashboard-pipeline-status">• Active</span>
            <b className="dashboard-pipeline-files">{c.filesCount} {c.filesCount === 1 ? "File" : "Files"}</b>
            <span className="dashboard-pipeline-active">{c.inProcessCount} Active</span>
            <span className="dashboard-pipeline-agents">{c.agentsCount} {c.agentsCount === 1 ? "Agent" : "Agents"} Assigned</span>
            <span className="dashboard-pipeline-completed">({c.completedCount} Completed)</span>
            <Link data-action-ui="secondary" data-action-size="compact" href={c.href} className="dashboard-pipeline-link">View Candidates <DashboardIcon name="ChevronRight" /></Link>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}
