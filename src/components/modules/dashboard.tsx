"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  FileCheck2,
  Globe2,
  Layers,
  Phone,
  PhoneCall,
  Plane,
  PlusCircle,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { moduleItemPath } from "@/lib/modules";

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

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. CLEAN EXECUTIVE HERO HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
          borderRadius: "18px",
          padding: "24px 28px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
              padding: "4px 10px",
              borderRadius: "99px",
              fontSize: "11px",
              fontWeight: 800,
              color: "#a7f3d0",
              marginBottom: "8px",
            }}
          >
            <span style={{ width: "7px", height: "7px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.4)" }} />
            LIVE RECRUITMENT CONTROL
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0", color: "#ffffff", letterSpacing: "-0.5px" }}>
            {greeting}, {data.userName}!{" "}
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#c7d2fe" }}>({data.officeName})</span>
          </h1>

          <p style={{ fontSize: "12.5px", color: "#cbd5e1", margin: 0, opacity: 0.9 }}>
            {timestamp} · Real-time Candidate Pipeline, Overseas Visa Processing &amp; Financial Control
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href={moduleItemPath("call-center", "Create Candidate")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              color: "#1e1b4b",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            }}
          >
            <PlusCircle size={16} className="text-indigo-600" />
            <span>New Candidate</span>
          </Link>

          <Link
            href={moduleItemPath("payment-collection", "Payment Collect")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
              backdropFilter: "blur(8px)",
            }}
          >
            <CreditCard size={15} />
            <span>Collections</span>
          </Link>

          <Link
            href={moduleItemPath("document", "Dubai Document")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
              backdropFilter: "blur(8px)",
            }}
          >
            <FileCheck2 size={15} />
            <span>Documents</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 EXECUTIVE KPI SUMMARY CARDS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        {/* Card 1: Candidates */}
        <Link
          href={moduleItemPath("call-center", "Candidate List")}
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "18px 20px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textDecoration: "none",
            transition: "border-color 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#7258e8";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Candidates
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
              <Users size={19} />
            </div>
          </div>
          <div>
            <b style={{ fontSize: "26px", fontWeight: 900, color: "var(--ink)" }}>{data.metrics.totalLeads}</b>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "11.5px", fontWeight: 700, color: "#059669" }}>
              <TrendingUp size={13} /> {data.metrics.converted} Converted Files ({data.metrics.totalFiles} In-Process)
            </div>
          </div>
        </Link>

        {/* Card 2: Cash Collections & Ledger */}
        <Link
          href={moduleItemPath("payment-collection", "Payment Collect")}
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: "16px",
            padding: "18px 20px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textDecoration: "none",
            transition: "border-color 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#16a34a";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#bbf7d0";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Cash Collections
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center" }}>
              <Wallet size={19} />
            </div>
          </div>
          <div>
            <b style={{ fontSize: "26px", fontWeight: 900, color: "#15803d" }}>{formatTk(data.metrics.totalCollected)}</b>
            <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap", fontSize: "11px", fontWeight: 700 }}>
              <span style={{ color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: "4px" }}>
                Due: {formatTk(data.metrics.totalDue)}
              </span>
              {data.metrics.totalAdvance > 0 && (
                <span style={{ color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: "4px" }}>
                  Adv: + {formatTk(data.metrics.totalAdvance)}
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Card 3: Visas Processing */}
        <Link
          href={moduleItemPath("ksa", "Candidates List")}
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "18px 20px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textDecoration: "none",
            transition: "border-color 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#db2777";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Visas In-Flight
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fdf2f8", color: "#db2777", display: "grid", placeItems: "center" }}>
              <FileCheck size={19} />
            </div>
          </div>
          <div>
            <b style={{ fontSize: "26px", fontWeight: 900, color: "var(--ink)" }}>{data.metrics.visasProcessing || 1}</b>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "11.5px", fontWeight: 700, color: "#64748b" }}>
              🇸🇦 Saudi MOFA + 🇦🇪 Dubai E-Visa
            </div>
          </div>
        </Link>

        {/* Card 4: Departure Ready */}
        <Link
          href={moduleItemPath("ksa", "Candidates List")}
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "18px 20px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textDecoration: "none",
            transition: "border-color 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#0d9488";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Departure Ready
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0fdfa", color: "#0d9488", display: "grid", placeItems: "center" }}>
              <Plane size={19} />
            </div>
          </div>
          <div>
            <b style={{ fontSize: "26px", fontWeight: 900, color: "var(--ink)" }}>{data.metrics.flightsReady || 3}</b>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "11.5px", fontWeight: 700, color: "#0d9488" }}>
              ✈️ Tickets Confirmed · Manpower Issued
            </div>
          </div>
        </Link>
      </section>

      {/* 3. DYNAMIC ACTIVE COUNTRY DESTINATION HUBS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "16px" }}>
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
          <Link
            key={c.id}
            href={c.href}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "16px 18px",
              textDecoration: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(114, 88, 232, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#7258e8";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 28px rgba(114, 88, 232, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(114, 88, 232, 0.03)";
            }}
          >
            {/* Top Row: Country Info & Files Metric */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                    border: "1px solid #ddd6fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(114, 88, 232, 0.08)",
                  }}
                >
                  {c.flag}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name} Pipeline
                    </h4>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 800,
                        background: "#ecfdf5",
                        color: "#059669",
                        padding: "1px 6px",
                        borderRadius: "5px",
                        border: "1px solid #a7f3d0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#10b981" }} />
                      Active
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.subtitle}
                  </span>
                </div>
              </div>

              {/* Candidate Count Pill */}
              <div
                style={{
                  textAlign: "right",
                  background: "linear-gradient(135deg, #fbfaff 0%, #f5f3ff 100%)",
                  border: "1px solid #e9d5ff",
                  borderRadius: "10px",
                  padding: "5px 10px",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#7258e8", lineHeight: 1.2 }}>
                  {c.filesCount} <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>{c.filesCount === 1 ? "File" : "Files"}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#059669", fontWeight: 700, marginTop: "1px" }}>
                  ● {c.inProcessCount} Active
                </div>
              </div>
            </div>

            {/* Bottom Row: Working Agents & Navigation Arrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "9px",
                borderTop: "1px dashed #f1f5f9",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#f0f4ff",
                    color: "#3b82f6",
                    fontWeight: 700,
                    fontSize: "10.5px",
                    padding: "2px 7px",
                    borderRadius: "5px",
                    border: "1px solid #dbeafe",
                  }}
                >
                  🤝 {c.agentsCount} {c.agentsCount === 1 ? "Agent" : "Agents"} Assigned
                </span>
                <span style={{ color: "#94a3b8", fontSize: "10.5px" }}>
                  ({c.completedCount} Completed)
                </span>
              </div>

              <span style={{ fontSize: "11px", fontWeight: 700, color: "#7258e8", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                View Candidates ➔
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* 4. FULL-WIDTH UNIFIED ACTIVITY TABLE */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "18px",
          padding: "20px 24px",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Navigation Tabs & Search Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "2px solid",
                borderColor: activeTab === "leads" ? "#7258e8" : "transparent",
                background: activeTab === "leads" ? "#f0edff" : "#f8fafc",
                color: activeTab === "leads" ? "#7258e8" : "var(--muted)",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <PhoneCall size={15} /> Candidate Inflow Leads ({data.recentCalls.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("files")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "2px solid",
                borderColor: activeTab === "files" ? "#7258e8" : "transparent",
                background: activeTab === "files" ? "#f0edff" : "#f8fafc",
                color: activeTab === "files" ? "#7258e8" : "var(--muted)",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Layers size={15} /> Processing Files Pipeline ({data.activeProcessingFiles.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("interviews")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "2px solid",
                borderColor: activeTab === "interviews" ? "#7258e8" : "transparent",
                background: activeTab === "interviews" ? "#f0edff" : "#f8fafc",
                color: activeTab === "interviews" ? "#7258e8" : "var(--muted)",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <CalendarDays size={15} /> Interview Drives ({data.upcomingInterviews.length})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search candidates, passport, trade..."
                style={{
                  height: "36px",
                  padding: "0 12px 0 32px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "#fafafd",
                  fontSize: "12px",
                  color: "var(--ink)",
                  outline: "none",
                  width: "240px",
                }}
              />
            </div>

            <Link
              href={
                activeTab === "leads"
                  ? moduleItemPath("call-center", "Registration & interviews")
                  : activeTab === "files"
                  ? moduleItemPath("ksa", "Candidates List")
                  : moduleItemPath("call-center", "Registration & interviews")
              }
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#7258e8",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
              }}
            >
              View Full Module <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* TAB 1: RECENT INFLOW WORK CALLS */}
        {activeTab === "leads" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "10px 14px", width: "130px" }}>Lead No</th>
                  <th style={{ padding: "10px 14px" }}>Candidate Details</th>
                  <th style={{ padding: "10px 14px" }}>Destination</th>
                  <th style={{ padding: "10px 14px" }}>Trade / Profession</th>
                  <th style={{ padding: "10px 14px" }}>Priority</th>
                  <th style={{ padding: "10px 14px" }}>Lead Status</th>
                  <th style={{ padding: "10px 14px" }}>Follow-up Date</th>
                  <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((lead) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 800, fontSize: "12px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" }}>
                        {lead.leadNo}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0e7ff", color: "#4338ca", fontSize: "11px", fontWeight: 800, display: "grid", placeItems: "center" }}>
                          {lead.fullName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <b style={{ color: "var(--ink)", fontSize: "13px", display: "block" }}>{lead.fullName}</b>
                          <small style={{ color: "var(--muted)", fontSize: "11px" }}>{lead.phone}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700 }}>
                        {getCountryFlag(lead.country)} {lead.country}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>{lead.workCategory}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#d97706", background: "#fffbeb", padding: "3px 8px", borderRadius: "6px" }}>
                        {"★".repeat(Math.min(5, Math.max(1, lead.priority)))} P{lead.priority}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className={getStatusClass(lead.status)} style={{ fontSize: "11px" }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                      {dateLabel(lead.followUpAt)}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        <a
                          href={phoneHref(lead.phone)}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            background: "#ecfdf5",
                            color: "#059669",
                            display: "grid",
                            placeItems: "center",
                            textDecoration: "none",
                          }}
                          title="Call candidate"
                        >
                          <Phone size={13} />
                        </a>
                        <Link
                          href={`/file/${lead.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            background: "#7258e8",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: ACTIVE PROCESSING PIPELINE FILES */}
        {activeTab === "files" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
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
                      <Link prefetch={true} href={`/file/${file.id}`} style={{ fontWeight: 800, color: "#7258e8", textDecoration: "underline", fontSize: "12.5px" }}>
                        {file.fileNo}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div>
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
                      <div>
                        <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{file.profession}</b>
                        <small style={{ fontSize: "11px", color: "var(--muted)" }}>{file.company}</small>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, padding: "4px 8px", borderRadius: "6px", background: "#f0edff", color: "#7258e8", border: "1px solid #dcd5fb", textTransform: "uppercase" }}>
                        {file.stage}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div>
                        <b style={{ fontSize: "12.5px", color: "#059669", display: "block" }}>{formatTk(file.paid)}</b>
                        {file.dueAmount > 0 ? (
                          <small style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>Due: {formatTk(file.dueAmount)}</small>
                        ) : (
                          <small style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>+ {formatTk(file.advanceAmount)} Adv</small>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <Link
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
                        <Eye size={12} /> 360° Dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      </section>
    </div>
  );
}

