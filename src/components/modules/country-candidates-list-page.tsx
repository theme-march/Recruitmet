"use client";

import { useQuery } from "@tanstack/react-query";
import { countryModule } from "@/lib/permission-policy";
import { useAccess } from "@/hooks/use-access";
import { countryCandidatesQueryOptions } from "@/lib/queries/country-candidates";
import { ChevronRight, Download, Eye, Phone, RefreshCw, Search, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { CountryDesignIcon } from "@/components/layout/country-design-icon";
import { useEffect, useState, useTransition } from "react";
import { getCountryFlagEmoji } from "@/components/modules/country-management-page";

export function CountryCandidatesListPage({
  country = "Saudi Arabia",
}: {
  country?: string;
}) {
  const [activeView, setActiveView] = useState<"candidates" | "agents">("candidates");
  const { allows } = useAccess();
  const canExport = allows(countryModule(country), "export");
  const [, startTabTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officerFilter, setOfficerFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const countryFlag = getCountryFlagEmoji("", country);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    ...countryCandidatesQueryOptions(country, {
      search: debouncedSearch,
      stage: stageFilter,
      status: statusFilter,
      officer: officerFilter,
      agent: agentFilter,
      page,
      pageSize,
    }),
    // Retain rows for pagination/filtering, never label another country's data as this one.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === country ? previousData : undefined,
  });

  const rows = data?.data || [];
  const countryAgents = data?.countryAgents || [];
  const stats = data?.stats;
  const filteredCountryAgents = countryAgents.filter((agent) => {
    if (!agentSearch) return true;
    const query = agentSearch.toLowerCase();
    return [agent.name, agent.code, agent.contactPerson, agent.phone, agent.address]
      .some(value => value.toLowerCase().includes(query));
  });
  const meta = data?.meta || { page, pageSize, total: 0, totalPages: 1 };
  const officers = data?.filters?.officers || [];
  const agents = data?.filters?.agents || [];

  const handleClear = () => {
    setSearch("");
    setDebouncedSearch("");
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
      return { bg: "#e5f8eb", color: "#34c759", border: "transparent", icon: "✈", label: stage };
    }
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", icon: "●", label: stage };
  };

  return (
    <div aria-busy={isFetching} className="country-candidates-page country-design-page">
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link> / {country} Candidates</nav>
      <div className="country-design-heading">
        <div><h1>{countryFlag} {country} Candidates Processing Master List</h1><p>Manage all candidate files for {country}. Click "Open 360° Profile &amp; Dossier" on any candidate to view all 16 tables and perform full processing.</p></div>
        <div className="country-design-actions">
          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => refetch()}><CountryDesignIcon name="Refresh" className={isFetching ? "animate-spin" : undefined} />Refresh</button>
          <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={!canExport} title={!canExport ? "Export permission is required" : undefined} onClick={() => { if (canExport) handleDownloadCsv(); }}><CountryDesignIcon name="Download" />Download CSV</button>
        </div>
      </div>
      {isError && <div role="alert" className="form-error">{error.message} <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => void refetch()}>Retry</button></div>}
      <div className="country-design-metrics">
        {[
          {label: `Total ${country} Files`, value: stats?.totalCandidates ?? "—", description: "Active in pipeline", icon: "Folder"},
          {label: "Medical / Fit State", value: stats?.inMedical ?? "—", description: "Fitness test verified", icon: "Medical"},
          {label: "Visa & MOFA Done", value: stats?.inVisa ?? "—", description: "Stamped & Issued", icon: "Visa"},
          {label: "Manpower Cleared", value: stats?.inManpower ?? "—", description: "BMET Smart Card", icon: "Manpower"},
          {label: "Flight Booked / Done", value: stats?.inFlight ?? "—", description: "Departed or Ready", icon: "Flight"},
          {label: "Total Deposited", value: `৳ ${stats ? stats.totalDeposited.toLocaleString() : "—"} BDT`, description: "Cumulative Accounts", icon: "Wallet"},
        ].map(metric => <article className={`country-design-metric ${metric.icon === "Wallet" ? "money" : ""}`} key={metric.icon}>
          <div><span>{metric.label}</span><CountryDesignIcon name={metric.icon as "Folder" | "Medical" | "Visa" | "Manpower" | "Flight" | "Wallet"} /></div><b>{metric.value}</b><p>{metric.description}</p>
        </article>)}
      </div>
      <section className="country-design-workspace" aria-label={`${country} candidate workspace`}>
        <div className="country-design-tabs">
          <button type="button" aria-pressed={activeView === "candidates"} className={activeView === "candidates" ? "selected" : ""} onClick={() => startTabTransition(() => setActiveView("candidates"))}>{country} Candidates ({stats?.totalCandidates ?? meta.total})</button>
          <button type="button" aria-pressed={activeView === "agents"} className={`agents-tab ${activeView === "agents" ? "selected" : ""}`} onClick={() => startTabTransition(() => setActiveView("agents"))}>Working Agents for {country} ({countryAgents.length})</button>
          {activeView === "candidates" && <div className="country-design-source-tabs">
            <button type="button" aria-pressed={!agentFilter} onClick={() => {setAgentFilter(""); setPage(1);}}>All Files ({stats?.totalCandidates ?? meta.total})</button>
            <button type="button" aria-pressed={agentFilter === "HAS_AGENT"} onClick={() => {setAgentFilter("HAS_AGENT"); setPage(1);}}>Agent Partner Files Only</button>
            <button type="button" aria-pressed={agentFilter === "Direct"} onClick={() => {setAgentFilter("Direct"); setPage(1);}}>Direct Office</button>
          </div>}
        </div>
        {activeView === "candidates" && <>
          <div className="country-design-filters">
            <div className="country-design-filter-fields">
              <div className="country-design-search"><CountryDesignIcon name="Search" /><input aria-label="Search country candidates" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} placeholder="Search by candidate name, ID, passport..." />{search && <button data-action-ui="ghost" data-action-size="icon" type="button" aria-label="Clear search" onClick={() => {setSearch("");setPage(1);}}><X size={12} /></button>}</div>
              <div className="country-design-select"><select aria-label="Candidate status" value={statusFilter} onChange={e => {setStatusFilter(e.target.value);setPage(1);}}><option value="all">All Statuses</option><option value="ACTIVE">Active Files</option><option value="COMPLETED">Completed</option><option value="HOLD">Hold Files</option><option value="RETURNED">Return Files</option></select><CountryDesignIcon name="ChevronDown" /></div>
              <div className="country-design-select agent-select"><select aria-label="Agent or source" value={agentFilter} onChange={e => {setAgentFilter(e.target.value);setPage(1);}}><option value="">All Agents / Sources</option><option value="HAS_AGENT">All Agent Partner Files</option><option value="Direct">Direct Office Candidates</option><optgroup label="Registered Agency Partners">{agents.map(ag => <option key={ag.id} value={ag.name}>{ag.name} ({ag.code})</option>)}</optgroup></select><CountryDesignIcon name="ChevronDown" /></div>
              {(search || stageFilter !== "all" || statusFilter !== "all" || officerFilter || agentFilter) && <button data-action-ui="neutral" data-action-size="normal" className="country-design-clear" type="button" onClick={handleClear}>Clear Filters</button>}
            </div>
            <label className="country-design-page-size">Per Page:<span className="country-design-select"><select aria-label="Candidates per page" value={pageSize} onChange={e => {setPageSize(Number(e.target.value));setPage(1);}}>{[10,20,50,100].map(size => <option value={size} key={size}>{size}</option>)}</select><CountryDesignIcon name="ChevronDown" /></span></label>
          </div>
          <div className="country-design-count">Showing {meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} Total {country} Candidates
            {agentFilter && <span className="country-design-filter-tag">Filtered by: {agentFilter === "HAS_AGENT" ? "Agent Partner Files" : agentFilter === "Direct" ? "Direct Office Candidates" : agentFilter}<button data-action-ui="danger" data-action-size="icon" type="button" aria-label="Remove agent filter" onClick={() => {setAgentFilter("");setPage(1);}}>×</button></span>}
          </div>
          <div className="desktop-country-candidates-table country-design-table">
            <table><colgroup>{[62,120,180,120,190,170,150,150,150,108].map((width,i) => <col key={i} style={{width}} />)}</colgroup>
              <thead><tr>{["SL","Actions","Client Information","Passport","Profession & Sponsor","Agent / Source","Current Stage","Financial Ledger","Officer & Branch","Status"].map(label => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={10} className="country-design-empty">Loading {country} candidates...</td></tr> : isError && !data ? <tr><td colSpan={10} className="country-design-empty">Candidate data is unavailable. Use Retry above.</td></tr> : !rows.length ? <tr><td colSpan={10} className="country-design-empty">No {country} candidates found matching current filters.</td></tr> : rows.map((row,idx) => {
                  const stageBadge = getStageBadge(row.currentStage);
                  return <tr key={row.id}>
                    <td className="country-design-serial">{(meta.page - 1) * meta.pageSize + idx + 1}</td>
                    <td><Link data-action-ui="secondary" data-action-size="compact" prefetch={true} href={`/file/${row.id}`} className="country-design-dossier">Open Dossier →</Link></td>
                    <td><div className="country-design-cell client"><Link prefetch={true} href={`/file/${row.id}`}>{row.name}</Link><span className="country-design-candidate-id">{row.candidateNo}</span><small>{row.phone}</small></div></td>
                    <td><div className="country-design-cell"><b>{row.passportNumber}</b><small>{row.district}</small></div></td>
                    <td><div className="country-design-cell"><b>{row.profession}</b><small>{row.company}</small></div></td>
                    <td><div className="country-design-agent"><CountryDesignIcon name={(["AgentOrange","AgentPurple","AgentGreen"] as const)[idx % 3]} /><span>{row.agent && !/direct/i.test(row.agent) ? row.agent : "Direct Office"}</span></div></td>
                    <td><span className="country-design-stage" style={{background:stageBadge.bg,color:stageBadge.color}}>{stageBadge.icon} {row.currentStage}</span></td>
                    <td><div className="country-design-cell financial"><b>৳ {row.totalPaid.toLocaleString()} BDT</b>{row.balanceDue > 0 && <span className="country-design-due">Due: ৳ {row.balanceDue.toLocaleString()}</span>}</div></td>
                    <td><div className="country-design-cell officer"><b>{row.officerName}</b><small>{row.officeName}</small></div></td>
                    <td><span className={`country-design-status ${row.status.toLowerCase()}`}>{row.status}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
            {/* Mobile Candidate Stream View (Stitch Mobile Card Architecture) */}
            <div className="mobile-country-candidates-stream">
              {isLoading ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                  <RefreshCw size={24} className="animate-spin text-purple-600" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>Loading {country} candidates...</p>
                </div>
              ) : isError && !data ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>Candidate data is unavailable. Use Retry above.</p>
                </div>
              ) : !rows.length ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>No {country} candidates found matching current filters.</p>
                </div>
              ) : (
                rows.map((row) => {
                  const stageBadge = getStageBadge(row.currentStage);
                  const isHold = row.status === "HOLD";
                  const isCompleted = row.status === "COMPLETED";

                  return (
                    <div key={row.id} className="country-candidate-card">
                      {/* Top Row: Avatar/Initials, Candidate Name, ID, Trade, Status */}
                      <div className="country-cand-card-top">
                        <div className="country-cand-avatar-wrap">
                          <div className="country-cand-avatar">
                            {row.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="country-cand-name-block">
                            <Link href={`/file/${row.id}`} className="country-cand-name">
                              {row.name}
                            </Link>
                            <div className="country-cand-sub-row">
                              <span className="country-cand-id-pill">{row.candidateNo}</span>
                              <span className="country-cand-trade">• {row.profession}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className="country-cand-status-badge"
                          style={{
                            background: isHold ? "#fee2e2" : isCompleted ? "#dcfce7" : "#e0e7ff",
                            color: isHold ? "#991b1b" : isCompleted ? "#166534" : "#3730a3",
                            border: `1px solid ${isHold ? "#fecaca" : isCompleted ? "#bbf7d0" : "#c7d2fe"}`,
                          }}
                        >
                          {row.status}
                        </span>
                      </div>

                      {/* 2-Column Info Grid: Contact/District & Passport/Sponsor */}
                      <div className="country-cand-info-grid">
                        <div className="country-cand-grid-cell">
                          <span className="country-cand-grid-label">Contact &amp; District</span>
                          <span className="country-cand-grid-val">📞 {row.phone}</span>
                          <span className="country-cand-grid-sub">📍 {row.district || "Direct Intake"}</span>
                        </div>
                        <div className="country-cand-grid-cell">
                          <span className="country-cand-grid-label">Passport &amp; Sponsor</span>
                          <span className="country-cand-grid-val">📘 {row.passportNumber}</span>
                          <span className="country-cand-grid-sub">🏢 {row.company || "Awaiting Kafeel"}</span>
                        </div>
                      </div>

                      {/* Pipeline Stage & Financial Ledger Strip */}
                      <div className="country-cand-strip">
                        <span
                          className="country-cand-stage"
                          style={{
                            background: stageBadge.bg,
                            color: stageBadge.color,
                            border: `1px solid ${stageBadge.border}`,
                          }}
                        >
                          <span>{stageBadge.icon}</span> {row.currentStage}
                        </span>

                        <div className="country-cand-finance">
                          <span>৳ {row.totalPaid.toLocaleString()}</span>
                          {row.balanceDue > 0 && (
                            <span className="country-cand-finance-due">
                              (Due: ৳ {row.balanceDue.toLocaleString()})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Source/Agent & Open Dossier Action Button */}
                      <div className="country-cand-footer">
                        <span
                          className="country-cand-source"
                          style={{
                            background: row.agent && !/direct/i.test(row.agent) ? "#fffbeb" : "#f1f5f9",
                            color: row.agent && !/direct/i.test(row.agent) ? "#d97706" : "var(--muted)",
                            border: `1px solid ${row.agent && !/direct/i.test(row.agent) ? "#fde68a" : "var(--line)"}`,
                          }}
                        >
                          {row.agent && !/direct/i.test(row.agent) ? `🤝 ${row.agent}` : "🏢 Direct Office"}
                        </span>

                        <Link data-action-ui="secondary" data-action-size="normal"
                          prefetch={true}
                          href={`/file/${row.id}`}
                          className="country-cand-open-btn"
                        >
                          <Eye size={13} />
                          <span>Open Dossier</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          <div className="country-design-pagination"><span>{meta.total} Total {country} Candidates</span><div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1,p - 1))}>← Previous</button>
            <span className="country-design-page-indicator">Page {meta.page} of {meta.totalPages}</span>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div></div>
        </>}
      {activeView === "agents" && (
        <div className="country-agents-results-panel country-design-agents-panel" aria-label={`Active Recruitment Agents for ${country}`}>
          <div className="country-design-filters">
            <div className="country-design-filter-fields">
              <div className="country-design-search"><CountryDesignIcon name="Search" />
                <input aria-label="Search country agents" value={agentSearch} onChange={event => setAgentSearch(event.target.value)} placeholder="Search agent name, code, phone, location..." />
                {agentSearch && <button data-action-ui="ghost" data-action-size="icon" type="button" aria-label="Clear agent search" onClick={() => setAgentSearch("")}><X size={12} /></button>}
              </div>
            </div>
            <p className="country-design-agent-description">Agency partners, sourcing brokers and direct desks supplying candidate files for {country}.</p>
          </div>
          <div className="country-design-count">Showing {filteredCountryAgents.length ? 1 : 0}–{filteredCountryAgents.length} of {countryAgents.length} Total {country} Working Agents</div>
          <div className="desktop-country-agents-table country-design-table country-design-agents-table">
            <table>
              <colgroup>{[62,300,210,130,160,180,90,208].map((width,index) => <col key={index} style={{width}} />)}</colgroup>
              <thead><tr>{["SL","Agent & Agency Details","Contact & Location","Supplied Candidates","Pipeline Processing","Total Deposited Volume","Status","Actions"].map(label => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>
                {filteredCountryAgents.map((ag,index) => {
                  const isDirect = /direct/i.test(ag.name);
                  return <tr key={ag.id}>
                    <td className="country-design-serial">{index + 1}</td>
                    <td><div className="country-design-agent-identity">
                      <span className="country-design-agent-avatar">{isDirect ? "🏢" : ag.name.slice(0,2).toUpperCase()}</span>
                      <div className="country-design-cell client"><b>{ag.name}</b><span className="country-design-candidate-id">{ag.code}</span><small>Contact: {ag.contactPerson}</small></div>
                    </div></td>
                    <td><div className="country-design-cell"><b>{ag.phone}</b><small>{ag.address}</small></div></td>
                    <td><span className="country-design-candidate-id country-design-file-count">{ag.totalCandidates} Files</span></td>
                    <td><div className="country-design-cell"><span className="country-design-stage country-design-agent-active">⚡ {ag.activeCount} Active</span>{ag.completedCount > 0 && <span className="country-design-stage country-design-agent-completed">✈ {ag.completedCount} Flight/Done</span>}</div></td>
                    <td><div className="country-design-cell financial"><b>৳ {ag.totalPaid.toLocaleString()} BDT</b><small>Paid by candidate files</small></div></td>
                    <td><span className="country-design-status">{ag.status}</span></td>
                    <td><div className="country-design-agent-actions">
                      <button data-action-ui="secondary" data-action-size="compact" type="button" className="country-design-dossier" title={`View candidates submitted by ${ag.name}`} onClick={() => {startTabTransition(() => {setActiveView("candidates");setAgentFilter(ag.name);setPage(1);});}}>View Candidates →</button>
                      {!isDirect && ag.id.startsWith("cm") && <Link data-action-ui="secondary" data-action-size="compact" href={`/module/office-vendor?tab=agents&agentId=${ag.id}`} className="country-design-dossier country-design-agent-profile" title="Open Agent Profile">Profile</Link>}
                    </div></td>
                  </tr>;
                })}
                {!filteredCountryAgents.length && <tr><td colSpan={8} className="country-design-empty">{isLoading ? "Loading agents…" : isError && !data ? "Agent data is unavailable. Use Retry above." : countryAgents.length ? "No agents found matching current search." : `No agents currently registered for ${country}.`}</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Mobile Country Agents Stream View */}
          <div className="mobile-country-agents-stream">
            {filteredCountryAgents
              .map((ag) => {
                const isDirect = /direct/i.test(ag.name);
                return (
                  <div key={ag.id} className="country-agent-mobile-card">
                    <div className="country-cand-card-top">
                      <div className="country-cand-avatar-wrap">
                        <div
                          className="country-cand-avatar"
                          style={{
                            background: isDirect ? "#ecfdf5" : "#f0edff",
                            color: isDirect ? "#047857" : "#7258e8",
                            borderColor: isDirect ? "#a7f3d0" : "#ddd6fe",
                          }}
                        >
                          {isDirect ? "🏢" : ag.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="country-cand-name-block">
                          <span className="country-cand-name">{ag.name}</span>
                          <div className="country-cand-sub-row">
                            <span className="country-cand-id-pill">{ag.code}</span>
                            <span className="country-cand-trade">• Contact: {ag.contactPerson}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="country-cand-status-badge"
                        style={{
                          background: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        {ag.status}
                      </span>
                    </div>

                    <div className="country-cand-info-grid">
                      <div className="country-cand-grid-cell">
                        <span className="country-cand-grid-label">Contact Phone</span>
                        <span className="country-cand-grid-val">📞 {ag.phone}</span>
                        <span className="country-cand-grid-sub">📍 {ag.address}</span>
                      </div>
                      <div className="country-cand-grid-cell">
                        <span className="country-cand-grid-label">Candidates Volume</span>
                        <span className="country-cand-grid-val">👥 {ag.totalCandidates} Files</span>
                        <span className="country-cand-grid-sub">৳ {ag.totalPaid.toLocaleString()} Paid</span>
                      </div>
                    </div>

                    <div className="country-cand-footer">
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                          ⚡ {ag.activeCount} Active
                        </span>
                        {ag.completedCount > 0 && (
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                            ✈️ {ag.completedCount} Flight
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button data-action-ui="secondary" data-action-size="normal"
                          type="button"
                          onClick={() => {
                            startTabTransition(() => {
                              setActiveView("candidates");
                              setAgentFilter(ag.name);
                              setPage(1);
                            });
                          }}
                          className="country-cand-open-btn"
                        >
                          <Search size={12} /> View Files
                        </button>
                        {!isDirect && ag.id.startsWith("cm") && (
                          <Link data-action-ui="secondary" data-action-size="normal"
                            href={`/module/office-vendor?tab=agents&agentId=${ag.id}`}
                            className="country-cand-open-btn"
                            style={{ background: "#f1f5f9", color: "#475569", border: "1px solid var(--line)", boxShadow: "none" }}
                          >
                            <UserCheck size={12} /> Profile
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {!filteredCountryAgents.length && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>
                  {isLoading ? "Loading agents…" : isError && !data ? "Agent data is unavailable. Use Retry above." : (countryAgents.length ? "No agents found matching current search." : `No agents currently registered for ${country}.`)}
                </p>
              </div>
            )}
          </div>
          <div className="country-design-pagination"><span>{filteredCountryAgents.length} Total {country} Working Agents</span><span>{countryAgents.length} Sources</span></div>
        </div>
      )}
      </section>
    </div>
  );
}
