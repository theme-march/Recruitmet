"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Globe,
  GraduationCap,
  Layers,
  MapPin,
  Phone,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getCountryFlagEmoji } from "@/components/country-management-page";

type CandidateRow = {
  id: string;
  fileNo: string;
  candidateNo: string;
  name: string;
  phone: string;
  passportNumber: string;
  passportExpiry: string | null;
  district: string;
  age: number | null;
  profession: string;
  company: string;
  agent: string;
  country: string;
  currentStage: string;
  status: string;
  visaNumber: string | null;
  visaStatus: string | null;
  medicalResult: string | null;
  totalPaid: number;
  totalPackage: number;
  balanceDue: number;
  officerName: string;
  officeName: string;
  updatedAt: string;
};

type CountryAgentItem = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  status: string;
  totalCandidates: number;
  activeCount: number;
  completedCount: number;
  totalPaid: number;
};

type ApiResponse = {
  data: CandidateRow[];
  countryAgents?: CountryAgentItem[];
  stats: {
    totalCandidates: number;
    inMedical: number;
    inVisa: number;
    inManpower: number;
    inFlight: number;
    inHold: number;
    totalDeposited: number;
  };
  filters: {
    officers: Array<{ id: string; name: string }>;
    agents: Array<{ id: string; name: string; code: string }>;
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function CountryCandidatesListPage({
  country = "Saudi Arabia",
}: {
  country?: string;
}) {
  const [activeView, setActiveView] = useState<"candidates" | "agents">("candidates");
  const [search, setSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officerFilter, setOfficerFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const countryFlag = getCountryFlagEmoji("", country);

  const { data, isLoading, isFetching, refetch } = useQuery<ApiResponse>({
    queryKey: [
      "country-candidates",
      country,
      search,
      stageFilter,
      statusFilter,
      officerFilter,
      agentFilter,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        country,
        search,
        stage: stageFilter,
        status: statusFilter,
        officer: officerFilter,
        agent: agentFilter,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/country-candidates?${params}`);
      if (!res.ok) throw new Error("Failed to load candidates");
      return res.json();
    },
  });

  const rows = data?.data || [];
  const countryAgents = data?.countryAgents || [];
  const stats = data?.stats;
  const meta = data?.meta || { page, pageSize, total: 0, totalPages: 1 };
  const officers = data?.filters?.officers || [];
  const agents = data?.filters?.agents || [];

  const handleClear = () => {
    setSearch("");
    setAgentSearch("");
    setStageFilter("all");
    setStatusFilter("all");
    setOfficerFilter("");
    setAgentFilter("");
    setPage(1);
  };

  const handleDownloadCsv = () => {
    if (!rows.length) return;
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const headers = [
      "SL",
      "File No",
      "Candidate No",
      "Full Name",
      "Phone",
      "Passport No",
      "District",
      "Profession",
      "Company / Kafeel",
      "Country",
      "Current Stage",
      "Status",
      "Total Paid (BDT)",
      "Balance Due (BDT)",
      "Officer",
      "Office",
      "Last Updated",
    ].join(",");

    const lines = rows.map((r, i) =>
      [
        (meta.page - 1) * meta.pageSize + i + 1,
        r.fileNo,
        r.candidateNo,
        r.name,
        r.phone,
        r.passportNumber,
        r.district,
        r.profession,
        r.company,
        r.country,
        r.currentStage,
        r.status,
        r.totalPaid,
        r.balanceDue,
        r.officerName,
        r.officeName,
        new Date(r.updatedAt).toLocaleDateString("en-GB"),
      ]
        .map(esc)
        .join(",")
    );

    const csvContent = [headers, ...lines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${country.toLowerCase().replace(/\s+/g, "-")}-candidates-list.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStageBadge = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes("passport")) {
      return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", icon: "📘", label: stage };
    }
    if (s.includes("medical")) {
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", icon: "🏥", label: stage };
    }
    if (s.includes("police")) {
      return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", icon: "🛡️", label: stage };
    }
    if (s.includes("payment")) {
      return { bg: "#fefce8", color: "#a16207", border: "#fef08a", icon: "💵", label: stage };
    }
    if (s.includes("takamul")) {
      return { bg: "#fdf4ff", color: "#a21caf", border: "#f5d0fe", icon: "🏅", label: stage };
    }
    if (s.includes("mofa") || s.includes("visa")) {
      return { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe", icon: "🌐", label: stage };
    }
    if (s.includes("manpower")) {
      return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", icon: "📜", label: stage };
    }
    if (s.includes("flight")) {
      return { bg: "#f0fdfa", color: "#0f766e", border: "#99f6e4", icon: "✈️", label: stage };
    }
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", icon: "●", label: stage };
  };

  return (
    <div className="country-candidates-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Link href="/dashboard" style={{ color: "var(--muted)", textDecoration: "none" }}>Dashboard</Link>
            <span>/</span>
            <span style={{ color: "var(--purple)", fontWeight: 700 }}>{country} Candidates</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <span>{countryFlag}</span>
            <span>{country} Candidates Processing Master List</span>
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0 0" }}>
            Manage all candidate files for {country}. Click <b>"Open 360° Profile &amp; Dossier"</b> on any candidate to view all 16 tables and perform full processing.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fff",
              border: "1px solid var(--line)",
              padding: "9px 15px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-purple-600" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0edff",
              border: "1px solid #dcd5fb",
              padding: "9px 15px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--purple)",
              cursor: "pointer",
            }}
          >
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div
        className="responsive-kpi-grid"
        style={{
          marginBottom: "20px",
        }}
      >
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total {country} Files</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "var(--ink)", marginTop: "4px" }}>{stats?.totalCandidates ?? 0}</div>
          <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>Active in pipeline</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Medical / Fit State</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#047857", marginTop: "4px" }}>{stats?.inMedical ?? 0}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Fitness test verified</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Visa &amp; MOFA Done</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#6d28d9", marginTop: "4px" }}>{stats?.inVisa ?? 0}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Stamped &amp; Issued</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Manpower Cleared</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#c2410c", marginTop: "4px" }}>{stats?.inManpower ?? 0}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>BMET Smart Card</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Flight Booked / Done</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#0f766e", marginTop: "4px" }}>{stats?.inFlight ?? 0}</div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Departed or Ready</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Deposited</div>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
            ৳ {(stats?.totalDeposited ?? 0).toLocaleString()} BDT
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Cumulative Accounts</div>
        </div>
      </div>

      {/* Main View Switcher: Candidates Master List vs Country Working Agents */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div className="scrollable-tabs-bar" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveView("candidates")}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: activeView === "candidates" ? "1px solid #7258e8" : "1px solid var(--line)",
              background: activeView === "candidates" ? "#7258e8" : "#fff",
              color: activeView === "candidates" ? "#fff" : "var(--ink)",
              boxShadow: activeView === "candidates" ? "0 2px 6px rgba(114,88,232,0.25)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
            }}
          >
            <span>📋 {country} Candidates</span>
            <span
              style={{
                fontSize: "11px",
                background: activeView === "candidates" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeView === "candidates" ? "#fff" : "var(--muted)",
                padding: "1px 6px",
                borderRadius: "999px",
                fontWeight: 800,
              }}
            >
              {data?.stats?.totalCandidates ?? meta.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("agents")}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: activeView === "agents" ? "1px solid #7258e8" : "1px solid var(--line)",
              background: activeView === "agents" ? "#7258e8" : "#fff",
              color: activeView === "agents" ? "#fff" : "var(--ink)",
              boxShadow: activeView === "agents" ? "0 2px 6px rgba(114,88,232,0.25)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🤝 Working Agents for {country}</span>
            <span
              style={{
                fontSize: "11px",
                background: activeView === "agents" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeView === "agents" ? "#fff" : "var(--muted)",
                padding: "1px 6px",
                borderRadius: "999px",
                fontWeight: 800,
              }}
            >
              {countryAgents.length}
            </span>
          </button>
        </div>

        {activeView === "candidates" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setAgentFilter("");
                setPage(1);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: !agentFilter ? "1px solid #7258e8" : "1px solid var(--line)",
                background: !agentFilter ? "#f5f3ff" : "#fff",
                color: !agentFilter ? "#7258e8" : "var(--muted)",
              }}
            >
              All Files ({data?.stats?.totalCandidates ?? meta.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setAgentFilter("HAS_AGENT");
                setPage(1);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: agentFilter === "HAS_AGENT" ? "1px solid #d97706" : "1px solid var(--line)",
                background: agentFilter === "HAS_AGENT" ? "#fffbeb" : "#fff",
                color: agentFilter === "HAS_AGENT" ? "#b45309" : "var(--muted)",
              }}
            >
              🤝 Agent Partner Files Only
            </button>
            <button
              type="button"
              onClick={() => {
                setAgentFilter("Direct");
                setPage(1);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: agentFilter === "Direct" ? "1px solid #059669" : "1px solid var(--line)",
                background: agentFilter === "Direct" ? "#ecfdf5" : "#fff",
                color: agentFilter === "Direct" ? "#047857" : "var(--muted)",
              }}
            >
              🏢 Direct Office
            </button>
          </div>
        )}
      </div>

      {/* 1. CANDIDATES MASTER LIST VIEW */}
      {activeView === "candidates" && (
        <>
          {/* Filter Toolbar */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ flex: "1 1 280px", position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                }}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by candidate name, candidate ID, passport number, phone..."
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  fontSize: "13px",
                  background: "#fafafd",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ minWidth: "150px" }}>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  fontSize: "13px",
                  background: "#fafafd",
                  color: "var(--ink)",
                  outline: "none",
                  fontWeight: 600,
                }}
              >
                <option value="all">⚡ All Statuses</option>
                <option value="ACTIVE">Active Files</option>
                <option value="COMPLETED">Completed</option>
                <option value="HOLD">Hold Files</option>
                <option value="RETURNED">Return Files</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div style={{ minWidth: "170px" }}>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  fontSize: "13px",
                  background: "#fafafd",
                  color: "var(--ink)",
                  outline: "none",
                  fontWeight: 600,
                }}
              >
                <option value="">👥 All Agents / Sources</option>
                <option value="HAS_AGENT">🤝 All Agent Partner Files</option>
                <option value="Direct">🏢 Direct Office Candidates</option>
                <optgroup label="── Registered Agency Partners ──">
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.name}>
                      🤝 {ag.name} ({ag.code})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {(search || stageFilter !== "all" || statusFilter !== "all" || officerFilter || agentFilter) && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: "8px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Candidates List Table Card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Table Header toolbar */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fafafd",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                  Showing <b>{meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0}</b>–
                  <b>{Math.min(meta.page * meta.pageSize, meta.total)}</b> of <b>{meta.total}</b> Total {country} Candidates
                </div>

                {agentFilter && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: "#f0edff",
                      color: "#7258e8",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      border: "1px solid #dcd5fb",
                    }}
                  >
                    Filtered by: {agentFilter === "HAS_AGENT" ? "Agent Partner Files" : agentFilter === "Direct" ? "Direct Office Candidates" : agentFilter}
                    <button
                      type="button"
                      onClick={() => {
                        setAgentFilter("");
                        setPage(1);
                      }}
                      title="Remove agent filter"
                      style={{ border: "none", background: "none", color: "#7258e8", cursor: "pointer", fontWeight: 900, fontSize: "13px", padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                <span>Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    background: "#fff",
                    outline: "none",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "12px 14px", width: "40px" }}>SL</th>
                    <th style={{ padding: "12px 14px", width: "130px" }}>Actions</th>
                    <th style={{ padding: "12px 14px" }}>Client Information</th>
                    <th style={{ padding: "12px 14px" }}>Passport</th>
                    <th style={{ padding: "12px 14px" }}>Profession &amp; Sponsor</th>
                    <th style={{ padding: "12px 14px" }}>Agent / Source</th>
                    <th style={{ padding: "12px 14px" }}>Current Stage</th>
                    <th style={{ padding: "12px 14px" }}>Financial Ledger</th>
                    <th style={{ padding: "12px 14px" }}>Officer &amp; Branch</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        Loading {country} candidates...
                      </td>
                    </tr>
                  ) : !rows.length ? (
                    <tr>
                      <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        No {country} candidates found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const isHold = row.status === "HOLD";
                      const isCompleted = row.status === "COMPLETED";

                      return (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: "1px solid var(--line)",
                            background: isHold ? "#fffbeb" : "#fff",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = isHold ? "#fef3c7" : "#fcfaff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = isHold ? "#fffbeb" : "#fff")}
                        >
                          <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                            {(meta.page - 1) * meta.pageSize + idx + 1}
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <Link
                              prefetch={true}
                              href={`/file/${row.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                background: "#7258e8",
                                color: "#fff",
                                fontSize: "11px",
                                fontWeight: 700,
                                textDecoration: "none",
                                boxShadow: "0 2px 4px rgba(114,88,232,0.25)",
                              }}
                            >
                              <Eye size={12} /> Open Dossier ➔
                            </Link>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <Link
                              prefetch={true}
                              href={`/file/${row.id}`}
                              style={{ fontWeight: 800, color: "var(--ink)", textDecoration: "none" }}
                            >
                              {row.name}
                            </Link>
                            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                              <span style={{ color: "#7258e8", fontWeight: 700 }}>{row.candidateNo}</span> · 📞 {row.phone}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{row.passportNumber}</div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{row.district}</div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{row.profession}</div>
                            <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Building2 size={10} /> {row.company}
                            </div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: row.agent && !/direct/i.test(row.agent) ? "#fffbeb" : "#f1f5f9",
                                color: row.agent && !/direct/i.test(row.agent) ? "#d97706" : "var(--muted)",
                                border: row.agent && !/direct/i.test(row.agent) ? "1px solid #fde68a" : "1px solid var(--line)",
                              }}
                            >
                              {row.agent && !/direct/i.test(row.agent) ? `🤝 ${row.agent}` : "🏢 Direct Office"}
                            </span>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                background: "#f5f3ff",
                                color: "#6d28d9",
                                border: "1px solid #ddd6fe",
                              }}
                            >
                              <CheckCircle2 size={11} /> {row.currentStage}
                            </span>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 800, color: "#166534" }}>৳ {row.totalPaid.toLocaleString()} BDT</div>
                            {row.balanceDue > 0 && (
                              <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: 700 }}>
                                Due: ৳ {row.balanceDue.toLocaleString()}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>{row.officerName}</div>
                            <div style={{ fontSize: "10px", color: "var(--muted)" }}>{row.officeName}</div>
                          </td>

                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                background: isHold ? "#fee2e2" : isCompleted ? "#dcfce7" : "#e0e7ff",
                                color: isHold ? "#991b1b" : isCompleted ? "#166534" : "#3730a3",
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fafafd",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Page <b>{meta.page}</b> of <b>{meta.totalPages}</b>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: page <= 1 ? "#f1f5f9" : "#fff",
                    color: page <= 1 ? "#94a3b8" : "var(--ink)",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span style={{ fontSize: "12px", fontWeight: 700, padding: "0 8px" }}>
                  {meta.page}
                </span>

                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: page >= meta.totalPages ? "#f1f5f9" : "#fff",
                    color: page >= meta.totalPages ? "#94a3b8" : "var(--ink)",
                    cursor: page >= meta.totalPages ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. WORKING AGENTS LIST VIEW */}
      {activeView === "agents" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Agent Table Toolbar */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fafafd",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🤝</span>
                <span>Active Recruitment Agents for {country}</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    background: "#f0edff",
                    color: "#7258e8",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    border: "1px solid #dcd5fb",
                  }}
                >
                  {countryAgents.length} Sources
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                List of all agency partners, sourcing brokers, and direct desks supplying candidate files for {country}.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                  }}
                />
                <input
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agent name, code, phone, location..."
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    fontSize: "12.5px",
                    background: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              {agentSearch && (
                <button
                  type="button"
                  onClick={() => setAgentSearch("")}
                  style={{
                    padding: "7px 12px",
                    background: "#f1f5f9",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Agents Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "14px 16px", width: "50px" }}>SL</th>
                  <th style={{ padding: "14px 16px" }}>Agent &amp; Agency Details</th>
                  <th style={{ padding: "14px 16px" }}>Contact &amp; Location</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Supplied Candidates</th>
                  <th style={{ padding: "14px 16px" }}>Pipeline Processing</th>
                  <th style={{ padding: "14px 16px" }}>Total Deposited Volume</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "14px 16px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {countryAgents
                  .filter((a) => {
                    if (!agentSearch) return true;
                    const q = agentSearch.toLowerCase();
                    return (
                      a.name.toLowerCase().includes(q) ||
                      a.code.toLowerCase().includes(q) ||
                      a.contactPerson.toLowerCase().includes(q) ||
                      a.phone.toLowerCase().includes(q) ||
                      a.address.toLowerCase().includes(q)
                    );
                  })
                  .map((ag, idx) => {
                    const isDirect = /direct/i.test(ag.name);
                    return (
                      <tr
                        key={ag.id}
                        style={{
                          borderBottom: "1px solid var(--line)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 600 }}>
                          {idx + 1}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: isDirect ? "#ecfdf5" : "#f0edff",
                                color: isDirect ? "#047857" : "#7258e8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "12px",
                                flexShrink: 0,
                                border: `1px solid ${isDirect ? "#a7f3d0" : "#e0d9fc"}`,
                              }}
                            >
                              {isDirect ? "🏢" : ag.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: "13.5px" }}>
                                {ag.name}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: isDirect ? "#ecfdf5" : "#f3e8ff", color: isDirect ? "#065f46" : "#7c3aed" }}>
                                  {ag.code}
                                </span>
                                <span>·</span>
                                <span>👤 Contact: <b>{ag.contactPerson}</b></span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
                            📞 {ag.phone}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                            📍 {ag.address}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "999px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontWeight: 800,
                              fontSize: "13px",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            {ag.totalCandidates} Files
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            >
                              ⚡ {ag.activeCount} Active
                            </span>
                            {ag.completedCount > 0 && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  background: "#ecfdf5",
                                  color: "#047857",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                ✈️ {ag.completedCount} Flight/Done
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 800, color: "#059669", fontSize: "13.5px" }}>
                            ৳ {ag.totalPaid.toLocaleString()} BDT
                          </div>
                          <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                            Paid by candidate files
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 800,
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            {ag.status}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView("candidates");
                                setAgentFilter(ag.name);
                                setPage(1);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                background: "#7258e8",
                                color: "#fff",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(114,88,232,0.25)",
                              }}
                              title={`View candidates submitted by ${ag.name}`}
                            >
                              <Search size={12} /> View Candidates
                            </button>

                            {!isDirect && ag.id.startsWith("cm") && (
                              <Link
                                href={`/module/office-vendor?tab=agents&agentId=${ag.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  border: "1px solid var(--line)",
                                }}
                                title="Open Agent Profile"
                              >
                                <UserCheck size={12} /> Profile
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!countryAgents.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                      No agents currently registered for {country}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
