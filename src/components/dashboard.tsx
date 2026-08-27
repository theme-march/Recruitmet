"use client";

import {
  AlertCircle,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Globe,
  GraduationCap,
  Headphones,
  ListChecks,
  Phone,
  PhoneCall,
  Plane,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { moduleItemPath } from "@/lib/modules";

export type DashboardData = {
  userName: string;
  officeName: string;
  metrics: {
    totalLeads: number;
    dueToday: number;
    overdue: number;
    scheduledInterviews: number;
    converted: number;
  };
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
};

export function Dashboard({ data }: { data: DashboardData }) {
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
    return "🌍";
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("converted") || s.includes("confirmed") || s.includes("approved")) return "badge on-track";
    if (s.includes("overdue") || s.includes("not interested") || s.includes("rejected")) return "badge overdue";
    if (s.includes("interview") || s.includes("follow")) return "badge attention";
    return "badge pending";
  };

  return (
    <div className="call-center-dashboard">
      {/* 1. HERO HEADER WITH QUICK ACTION PILLS */}
      <div className="dashboard-hero-banner">
        <div className="hero-welcome-info">
          <div className="hero-live-pill">
            <span className="live-pulse" /> Live Recruitment Control
          </div>
          <h1>
            {greeting}, {data.userName}! <span className="office-tag">({data.officeName})</span>
          </h1>
          <p>
            {timestamp} · Real-time Candidate Pipeline, Lead Call Center &amp; Processing Control
          </p>
        </div>
        <div className="hero-action-buttons">
          <Link
            className="hero-btn-primary"
            href={moduleItemPath("call-center", "Create Work Call")}
          >
            <PlusCircle size={18} />
            <span>New Work Call</span>
          </Link>
          <Link
            className="hero-btn-secondary"
            href={moduleItemPath("call-center", "Work Call List")}
          >
            <ListChecks size={17} />
            <span>Lead Pipeline</span>
          </Link>
        </div>
      </div>

      {/* 2. RECRUITMENT WORKFLOW FUNNEL PROGRESS STRIP */}
      <div className="pipeline-funnel-card">
        <div className="funnel-header">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            <h3>9-Stage Recruitment Workflow Funnel</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Standard Recruitment Lifecycle</span>
        </div>
        <div className="funnel-steps-row">
          <Link href="/module/call-center/work-call-list" className="funnel-step-item">
            <div className="step-badge">1</div>
            <div className="step-info">
              <b>Work Call</b>
              <small>Lead Inflow</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/passport-submit" className="funnel-step-item">
            <div className="step-badge">2</div>
            <div className="step-info">
              <b>Passport</b>
              <small>Entry &amp; Check</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/medical-submit" className="funnel-step-item">
            <div className="step-badge">3</div>
            <div className="step-info">
              <b>Medical GCC</b>
              <small>GAMCA Fit</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/police-clearance" className="funnel-step-item">
            <div className="step-badge">4</div>
            <div className="step-info">
              <b>Police PCC</b>
              <small>Clearance</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/takamul" className="funnel-step-item">
            <div className="step-badge">5</div>
            <div className="step-info">
              <b>Takamul</b>
              <small>Skill Test</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/visa-stamping" className="funnel-step-item">
            <div className="step-badge">6</div>
            <div className="step-info">
              <b>Visa MOFA</b>
              <small>Embassy</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/manpower" className="funnel-step-item">
            <div className="step-badge">7</div>
            <div className="step-info">
              <b>Manpower</b>
              <small>Smart Card</small>
            </div>
          </Link>
          <div className="funnel-arrow">➔</div>
          <Link href="/module/ksa/flight" className="funnel-step-item">
            <div className="step-badge">8</div>
            <div className="step-info">
              <b>Flight</b>
              <small>Departure ✈️</small>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. 5-COLUMN VIBRANT KPI CARDS */}
      <section className="dashboard-kpi-grid">
        <div className="kpi-card tone-blue">
          <div className="kpi-icon">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span>Total Candidates</span>
            <b>{data.metrics.totalLeads.toLocaleString()}</b>
            <small className="flex items-center gap-1 text-emerald-600 font-semibold">
              <TrendingUp size={12} /> Active Pipeline
            </small>
          </div>
        </div>

        <div className="kpi-card tone-purple">
          <div className="kpi-icon">
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <span>Due Today</span>
            <b>{data.metrics.dueToday}</b>
            <small className="text-indigo-600 font-semibold">Scheduled follow-ups</small>
          </div>
        </div>

        <div className="kpi-card tone-rose">
          <div className="kpi-icon">
            <PhoneCall size={22} />
          </div>
          <div className="kpi-info">
            <span>Overdue Calls</span>
            <b>{data.metrics.overdue}</b>
            <small className="text-rose-600 font-semibold">Needs attention</small>
          </div>
        </div>

        <div className="kpi-card tone-green">
          <div className="kpi-icon">
            <CalendarDays size={22} />
          </div>
          <div className="kpi-info">
            <span>Interview Drives</span>
            <b>{data.metrics.scheduledInterviews}</b>
            <small className="text-emerald-600 font-semibold">Scheduled sessions</small>
          </div>
        </div>

        <div className="kpi-card tone-sky">
          <div className="kpi-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-info">
            <span>Converted Files</span>
            <b>{data.metrics.converted}</b>
            <small className="text-sky-600 font-semibold">Processing files</small>
          </div>
        </div>
      </section>

      {/* 4. WORKSPACE 2-COLUMN GRID (RECENT WORK CALLS & COUNTRY HUBS) */}
      <div className="dashboard-main-grid">
        {/* Left Column: Recent Work Calls & Candidate Table */}
        <section className="recent-leads-card">
          <div className="recent-leads-head">
            <div>
              <h2>📋 Recent Candidate Inflow</h2>
              <p>Real-time candidate registrations and priority status</p>
            </div>
            <Link
              href={moduleItemPath("call-center", "Work Call List")}
              className="view-all-link"
            >
              View All Candidates <ChevronRight size={15} />
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead No</th>
                  <th>Candidate Name</th>
                  <th>Destination</th>
                  <th>Profession</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <span className="lead-tag">{lead.leadNo}</span>
                    </td>
                    <td>
                      <div className="person">
                        <span className="avatar-mini">
                          {lead.fullName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <b>{lead.fullName}</b>
                          <small>{lead.phone}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="country-pill">
                        {getCountryFlag(lead.country)} {lead.country}
                      </span>
                    </td>
                    <td>
                      <span className="profession-pill">{lead.workCategory}</span>
                    </td>
                    <td>
                      <span className={`priority-badge p${Math.min(5, Math.max(1, lead.priority))}`}>
                        {"★".repeat(Math.min(5, Math.max(1, lead.priority)))} P{lead.priority}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(lead.status)}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-600">
                        {dateLabel(lead.followUpAt)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <a className="table-call-btn" href={phoneHref(lead.phone)} title="Call Candidate">
                          <Phone size={13} />
                        </a>
                        <Link href={`/file/${lead.id}`} className="table-profile-btn" title="Open Workspace Profile">
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data.recentCalls.length && (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      No active work calls found. Click &quot;New Work Call&quot; to register a candidate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Country Hubs & Quick Action Centers */}
        <div className="dashboard-sidebar-column">
          {/* Country Hub Widget */}
          <div className="country-hub-card">
            <div className="hub-head">
              <h3>🌍 Country Workflows</h3>
              <small>Quick Access</small>
            </div>
            <div className="country-hub-list">
              <Link href="/module/ksa/passport-submit" className="country-hub-item">
                <span className="flag">🇸🇦</span>
                <div className="country-info">
                  <b>Saudi Arabia Pipeline</b>
                  <small>Medical · Takamul · MOFA · Manpower</small>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
              <Link href="/module/dubai/passport-submit" className="country-hub-item">
                <span className="flag">🇦🇪</span>
                <div className="country-info">
                  <b>Dubai &amp; UAE Pipeline</b>
                  <small>Offer Letter · E-Visa · Departure</small>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
              <Link href="/module/other-country/candidates" className="country-hub-item">
                <span className="flag">🌐</span>
                <div className="country-info">
                  <b>Other Destinations</b>
                  <small>Oman, Qatar, Kuwait &amp; Europe</small>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Quick Action Navigation Card */}
          <div className="dashboard-quick-actions-card">
            <div className="hub-head">
              <h3>⚡ Operations Center</h3>
              <small>Fast Shortcuts</small>
            </div>
            <div className="quick-actions-grid">
              <Link href="/module/payment-collection/collection-list" className="qa-item">
                <div className="qa-icon green">
                  <CreditCard size={18} />
                </div>
                <div>
                  <b>Collections</b>
                  <small>Payment Ledger</small>
                </div>
              </Link>
              <Link href="/module/ksa/flight" className="qa-item">
                <div className="qa-icon blue">
                  <Plane size={18} />
                </div>
                <div>
                  <b>Flights</b>
                  <small>Ticket &amp; Depart</small>
                </div>
              </Link>
              <Link href="/module/ksa/hold-file" className="qa-item">
                <div className="qa-icon amber">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <b>Hold Files</b>
                  <small>Medical Pauses</small>
                </div>
              </Link>
              <Link href="/module/ksa/returned-files" className="qa-item">
                <div className="qa-icon rose">
                  <FileText size={18} />
                </div>
                <div>
                  <b>Returned</b>
                  <small>Refund Reports</small>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
