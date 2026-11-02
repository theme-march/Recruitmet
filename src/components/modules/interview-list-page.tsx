"use client";
import { meQueryOptions } from "@/lib/queries/me";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  Edit,
  FileSpreadsheet,
  Globe,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";
import { getCountryFlagEmoji } from "@/lib/country-pipeline";

export type CountryRecord = {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string;
  phoneCode: string | null;
  workflowType: string;
  active: boolean;
  candidateCount: number;
};

type Schedule = {
  id: string;
  title: string;
  company: string | null;
  profession: string | null;
  scheduledAt: string;
  venue: string | null;
  capacity?: number;
  instructions?: string | null;
  status: string;
  _count: { interviews: number };
};

type DemandItem = {
  id: string;
  demandNo: string;
  title: string;
  country: string;
  profession: string;
  quantity: number;
  visaQuantity?: number;
  salary?: number;
  currency?: string;
  visaRate?: number;
  company?: { name: string };
};

const readableDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

function getScheduleCountry(sch: Schedule, allCountries: CountryRecord[] = []): { name: string; code: string; flag: string } {
  const text = `${sch.title} ${sch.company || ""} ${sch.instructions || ""} ${sch.venue || ""}`.toLowerCase();

  // 1. Check for explicit [Country: Name] tag in instructions
  const tagMatch = sch.instructions?.match(/\[Country:\s*([^\]]+)\]/i);
  if (tagMatch) {
    const matched = tagMatch[1].trim();
    const found = allCountries.find(
      (c) => c.name.toLowerCase() === matched.toLowerCase() || c.code.toLowerCase() === matched.toLowerCase()
    );
    if (found) {
      return { name: found.name, code: found.code, flag: getCountryFlagEmoji(found.code, found.name) };
    }
    return { name: matched, code: "OTHER", flag: getCountryFlagEmoji("OTHER", matched) };
  }

  // 2. Exact match against known destination countries
  for (const c of allCountries) {
    const cName = c.name.toLowerCase();

    if (cName === "saudi arabia" && /saudi|binladen|nesma|almarai|riyadh|jeddah|dammam|ksa/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "dubai" && /dubai|emirates|uae|sobha|abu dhabi|dxb/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "oman" && /oman|muscat/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "qatar" && /qatar|doha/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "malaysia" && /malaysia|kuala/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "singapore" && /singapore/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "kuwait" && /kuwait/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "bahrain" && /bahrain|manama/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName === "romania" && /romania|bucharest/i.test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
    if (cName !== "other" && new RegExp(`\\b${cName}\\b`, "i").test(text)) {
      return { name: c.name, code: c.code, flag: getCountryFlagEmoji(c.code, c.name) };
    }
  }

  // 3. Fallback regex patterns
  if (/saudi|binladen|nesma|almarai|riyadh|jeddah|dammam|ksa/i.test(text)) {
    return { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" };
  }
  if (/dubai|emirates|uae|sobha|abu dhabi|dxb/i.test(text)) {
    return { name: "Dubai", code: "AE", flag: "🇦🇪" };
  }
  if (/oman|muscat/i.test(text)) {
    return { name: "Oman", code: "OM", flag: "🇴🇲" };
  }
  if (/qatar|doha/i.test(text)) {
    return { name: "Qatar", code: "QA", flag: "🇶🇦" };
  }
  if (/malaysia|kuala/i.test(text)) {
    return { name: "Malaysia", code: "MY", flag: "🇲🇾" };
  }
  if (/singapore/i.test(text)) {
    return { name: "Singapore", code: "SG", flag: "🇸🇬" };
  }

  const otherCountry = allCountries.find((c) => c.name.toLowerCase() === "other" || c.code.toLowerCase() === "other");
  if (otherCountry) {
    return { name: otherCountry.name, code: otherCountry.code, flag: "🌐" };
  }

  return { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" };
}

export function InterviewListPage({ upcomingOnly = false, initialData }: { upcomingOnly?: boolean; initialData?: { data: Schedule[] } } = {}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [interviewView, setInterviewView] = useState<"all" | "upcoming" | "past">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Create Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("Saudi Arabia");

  // Edit Modal States
  const [editOpen, setEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editCountry, setEditCountry] = useState("Saudi Arabia");
  const [updating, setUpdating] = useState(false);

  // Demand Linking States
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [profession, setProfession] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("Dhaka Head Office (Auditorium)");
  const [capacity, setCapacity] = useState(50);
  const [instructions, setInstructions] = useState("");

  const profileQuery = useQuery({
    ...meQueryOptions(),
    select: (body) => body.data,
  });

  const canManage =
    profileQuery.data?.roleKey === "SUPER_ADMIN" || Boolean(profileQuery.data?.permissions?.canManageInterviews);

  const query = useQuery<Schedule[]>({
    queryKey: ["interview-schedules", search],
    initialData: !search ? initialData?.data : undefined,
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search) params.set("q", search);
      const response = await fetch(`/api/interviews?${params}`);
      if (!response.ok) throw new Error("Could not load interview schedules");
      return (await response.json()).data as Schedule[];
    },
  });

  // Query Destination Countries dynamically from Country Setup
  const countriesQuery = useQuery({
    queryKey: ["destination-countries-active"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as CountryRecord[];
    },
  });

  // Fetch active Demands from Works & Demands
  useEffect(() => {
    void fetch("/api/demands?pageSize=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data?.length) {
          setDemands(body.data);
        }
      })
      .catch(() => {});
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const schedules = query.data ?? [];
  const allCountries = countriesQuery.data ?? [];
  const activeCountries = allCountries.filter((c) => c.active !== false);

  // Dynamic Country Filter Tabs synced with Active Countries
  const countryTabs = useMemo(() => {
    const all = { id: "all", label: "🌍 All Countries", count: schedules.length };

    const list =
      activeCountries.length > 0
        ? activeCountries.map((c) => {
            const count = schedules.filter((s) => {
              const sc = getScheduleCountry(s, allCountries);
              return (
                sc.name.toLowerCase() === c.name.toLowerCase() ||
                sc.code.toLowerCase() === c.code.toLowerCase()
              );
            }).length;
            const flag = getCountryFlagEmoji(c.code, c.name);
            return {
              id: c.name,
              label: `${flag} ${c.name}`,
              count,
            };
          })
        : [
            { id: "Saudi Arabia", label: "🇸🇦 Saudi Arabia", count: schedules.filter((s) => getScheduleCountry(s).name === "Saudi Arabia").length },
            { id: "Dubai", label: "🇦🇪 Dubai", count: schedules.filter((s) => getScheduleCountry(s).name === "Dubai").length },
            { id: "Oman", label: "🇴🇲 Oman", count: schedules.filter((s) => getScheduleCountry(s).name === "Oman").length },
            { id: "Malaysia", label: "🇲🇾 Malaysia", count: schedules.filter((s) => getScheduleCountry(s).name === "Malaysia").length },
            { id: "Other", label: "🌐 Other", count: schedules.filter((s) => getScheduleCountry(s).name === "Other").length },
          ];

    return [all, ...list];
  }, [activeCountries, schedules, allCountries]);

  const filteredSchedules = schedules.filter((item) => {
    if (countryFilter === "all") return true;
    const sc = getScheduleCountry(item, allCountries);
    return (
      sc.name.toLowerCase() === countryFilter.toLowerCase() ||
      sc.code.toLowerCase() === countryFilter.toLowerCase()
    );
  });

  const upcoming = filteredSchedules
    .filter((item) => new Date(item.scheduledAt) >= today)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  const past = filteredSchedules
    .filter((item) => new Date(item.scheduledAt) < today)
    .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

  const handleDemandSelect = (demId: string) => {
    setSelectedDemandId(demId);
    if (!demId) return;

    const dem = demands.find((d) => d.id === demId);
    if (dem) {
      const compName = dem.company?.name || dem.title || "Foreign Employer";
      setTitle(`${compName} - ${dem.profession} Selection Drive`);
      setCompany(compName);
      setProfession(dem.profession);
      setCapacity(dem.visaQuantity || dem.quantity || 50);

      // Auto pre-select country from Demand
      if (dem.country) {
        const match = activeCountries.find(
          (c) =>
            c.name.toLowerCase() === dem.country.toLowerCase() ||
            c.code.toLowerCase() === dem.country.toLowerCase()
        );
        if (match) setSelectedCountry(match.name);
        else setSelectedCountry(dem.country);
      }

      setInstructions(
        `Salary: ${dem.salary ? `${dem.salary} ${dem.currency || "SAR"}` : "Competitive"} | Package: ৳ ${
          dem.visaRate ? Number(dem.visaRate).toLocaleString() : "500,000"
        } | Requirements: Trade experience & original passport`
      );

      if (!scheduledAt) {
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setScheduledAt(
          `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T10:00`
        );
      }

      toast.success(`Auto-filled details from Demand ${dem.demandNo} (${compName})`, {
        icon: "✨",
      });
    }
  };

  const openEditModal = (sch: Schedule) => {
    setEditingSchedule(sch);
    const sc = getScheduleCountry(sch, allCountries);
    setEditCountry(sc.name);

    // Format date for datetime-local input
    let formattedDate = "";
    if (sch.scheduledAt) {
      try {
        const d = new Date(sch.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {}
    }
    setTitle(sch.title || "");
    setCompany(sch.company || "");
    setProfession(sch.profession || "");
    setScheduledAt(formattedDate);
    setVenue(sch.venue || "Dhaka Head Office (Auditorium)");
    setCapacity(sch.capacity || 50);
    // Strip [Country: ...] tag from editable instructions
    const cleanInstructions = (sch.instructions || "").replace(/\[Country:\s*[^\]]+\]\s*/gi, "").trim();
    setInstructions(cleanInstructions);
    setEditOpen(true);
  };

  async function handleCreateSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const cleanInst = instructions.replace(/\[Country:\s*[^\]]+\]\s*/gi, "").trim();
      const finalInstructions = `[Country: ${selectedCountry}] ${cleanInst}`.trim();

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          profession,
          scheduledAt,
          venue,
          capacity: Number(capacity) || 50,
          instructions: finalInstructions,
          candidateIds: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create interview drive");
      toast.success("Interview drive created and linked to Works & Demands!");
      setCreateOpen(false);
      // Reset form
      setSelectedDemandId("");
      setTitle("");
      setCompany("");
      setProfession("");
      setScheduledAt("");
      setInstructions("");
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating interview");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSchedule) return;
    setUpdating(true);
    try {
      const cleanInst = instructions.replace(/\[Country:\s*[^\]]+\]\s*/gi, "").trim();
      const finalInstructions = `[Country: ${editCountry}] ${cleanInst}`.trim();

      const res = await fetch(`/api/interview-schedules/${editingSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          profession,
          scheduledAt,
          venue,
          capacity: Number(capacity) || 50,
          instructions: finalInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update interview drive");
      toast.success("Interview drive updated successfully!");
      setEditOpen(false);
      setEditingSchedule(null);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating interview");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteSchedule(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/interview-schedules/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete interview drive");
      toast.success("Interview drive deleted successfully!");
      setEditOpen(false);
      setEditingSchedule(null);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting interview");
    }
  }

  const visibleSchedules = upcomingOnly ? upcoming : interviewView === "upcoming" ? upcoming : interviewView === "past" ? past : [...upcoming, ...past];
  const totalPages = Math.max(1, Math.ceil(visibleSchedules.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const pageRows = visibleSchedules.slice(offset, offset + pageSize);
  const upcomingIds = new Set(upcoming.map(row => row.id));

  return (
    <div className="interview-list-page country-design-page interview-design-page" aria-busy={query.isFetching}>
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link> / Registration &amp; Interviews</nav>
      <header className="country-design-heading">
        <div><h1>Registration &amp; Interviews</h1><p>Create, schedule and manage overseas recruitment interview drives with clients.</p></div>
        <div className="country-design-actions interview-design-actions">
          {canManage && <button data-action-ui="primary" data-action-size="normal" type="button" className="interview-design-create" onClick={() => {
            if (activeCountries.length > 0 && !activeCountries.some(c => c.name === selectedCountry)) setSelectedCountry(activeCountries[0].name);
            setCreateOpen(true);
          }}><Plus size={14} /> Create Interview Drive</button>}
          <Link data-action-ui="primary" data-action-size="normal" prefetch={true} href={moduleItemPath("call-center", "Create Candidate")}><Plus size={14} /> Create Candidate</Link>
        </div>
      </header>
      <section className="country-design-metrics interview-design-metrics" aria-label="Interview summary">
        {[
          {label:"Upcoming Drives",value:upcoming.length,description:upcoming.length > 0 ? "Scheduled Ahead" : "All Corridors Clear",Icon:CalendarDays,tone:"purple"},
          {label:"Past Drives",value:past.length,description:"Completed Sessions",Icon:UsersRound,tone:"green"},
          {label:"Registered Candidates",value:[...upcoming,...past].reduce((acc,row) => acc + (row._count?.interviews || 0),0),description:"Candidates Evaluated",Icon:UsersRound,tone:"blue"},
          {label:"Client Employers",value:new Set([...upcoming,...past].map(row => row.company).filter(Boolean)).size,description:"Active Companies",Icon:Building2,tone:"orange"},
        ].map(({label,value,description,Icon,tone}) => <article key={label} className="country-design-metric"><div><span>{label}</span><Icon size={16} className={`interview-icon-${tone}`} /></div><b>{value}</b><p>{description}</p></article>)}
      </section>
      {query.isError && <div role="alert" className="form-error">Interview schedules could not be loaded.</div>}
      <section className="country-design-workspace interview-design-workspace" aria-label="Interview drives">
        <div className="country-design-tabs interview-design-country-tabs" role="group" aria-label="Filter interviews by country">
          {countryTabs.map(c => <button key={c.id} type="button" aria-pressed={countryFilter === c.id} className={countryFilter === c.id ? "selected" : ""}
            onClick={() => {setCountryFilter(c.id);setPage(1);}}>{c.label}<span className="interview-design-tab-count">{c.count}</span></button>)}
        </div>
        <form className="country-design-filters interview-design-filters" onSubmit={event => {event.preventDefault();setSearch(input.trim());setPage(1);}}>
          <div className="country-design-filter-fields">
            <label className="country-design-search interview-design-search"><Search size={14} aria-hidden="true" /><input aria-label="Search by interview name or company" value={input}
              onChange={event => setInput(event.target.value)} placeholder="Interview title, company or profession..." /></label>
            {!upcomingOnly && <span className="country-design-select"><select aria-label="Interview period" value={interviewView}
              onChange={event => {setInterviewView(event.target.value as "all" | "upcoming" | "past");setPage(1);}}>
              <option value="all">All Interviews</option><option value="upcoming">Upcoming interviews ({upcoming.length})</option><option value="past">Past interviews ({past.length})</option>
            </select><span className="interview-design-select-arrow" aria-hidden="true">⌄</span></span>}
            <button data-action-ui="primary" data-action-size="normal" type="submit" className="interview-design-filter-button">Search</button>
            <button data-action-ui="neutral" data-action-size="normal" type="button" className="interview-design-filter-button" onClick={() => {setInput("");setSearch("");setPage(1);}}>Clear</button>
          </div>
          <label className="country-design-page-size">Per Page:<span className="country-design-select"><select aria-label="Interviews per page" value={pageSize}
            onChange={event => {setPageSize(Number(event.target.value));setPage(1);}}>{[10,20,50,100].map(size => <option key={size} value={size}>{size}</option>)}</select><span className="interview-design-select-arrow" aria-hidden="true">⌄</span></span></label>
        </form>
        <div className="country-design-count">Showing {visibleSchedules.length ? offset + 1 : 0}–{Math.min(offset + pageSize,visibleSchedules.length)} of {visibleSchedules.length} Total {upcomingOnly || interviewView === "upcoming" ? "Upcoming Interviews" : interviewView === "past" ? "Past Interviews" : "Interviews"}</div>
        <ScheduleSection rows={pageRows} allCountries={allCountries} canManage={canManage} onEdit={openEditModal} onDelete={handleDeleteSchedule}
          offset={offset} upcomingIds={upcomingIds} loading={query.isLoading} error={query.isError} />
        <div className="country-design-pagination"><span>{visibleSchedules.length} Total Interviews</span><div>
          <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Previous</button>
          <span className="country-design-page-indicator">Page {currentPage} of {totalPages}</span>
          <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button>
        </div></div>
      </section>

      {/* 1. CREATE SCHEDULE MODAL */}
      {createOpen && (
        <div className="lead-modal-overlay master-modal-overlay" role="dialog" aria-modal="true" aria-label="Create interview drive" onClick={() => setCreateOpen(false)}>
          <div className="lead-modal master-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="lead-modal-header master-modal-header">
              <div>
                <h2>Create New Company Interview Drive</h2>
                <p>Create interview schedule directly linked with an active Works &amp; Demand letter.</p>
              </div>
              <button data-action-ui="neutral" data-action-size="icon" className="lead-close-btn master-modal-close" aria-label="Close create interview drive" onClick={() => setCreateOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div className="lead-modal-body" style={{ display: "block" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Active Demand Selector (Optional) */}
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <FileSpreadsheet size={15} /> Select Active Demand Letter (Optional)
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Auto-fill helper</span>
                    </div>
                    <select
                      value={selectedDemandId}
                      onChange={(e) => handleDemandSelect(e.target.value)}
                      style={{
                        height: 40,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 8,
                        padding: "0 10px",
                        fontWeight: 500,
                        color: "#334155",
                      }}
                    >
                      <option value="">-- None (Create Custom / Manual Interview) --</option>
                      {demands.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.demandNo} · {d.company?.name || d.title} · {d.profession} ({d.visaQuantity || d.quantity} Visas)
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedDemandId && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-bold">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-600 shrink-0" />
                        <span>Auto-filled from Works &amp; Demands. You can still edit any field below.</span>
                      </div>
                      <button data-action-ui="neutral" data-action-size="normal"
                        type="button"
                        onClick={() => setSelectedDemandId("")}
                        style={{ color: "#059669", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 11 }}
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Destination Country & Quota */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Destination Country *
                      <select
                        name="destinationCountry"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        style={{
                          height: 38,
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: "0 10px",
                          background: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        {activeCountries.map((c) => (
                          <option key={c.id || c.code} value={c.name}>
                            {getCountryFlagEmoji(c.code, c.name)} {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Candidate Capacity (Seats)
                      <input
                        name="capacity"
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Interview Title *
                    <input
                      name="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Saudi Binladen Group - Electrician Drive"
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Company Name
                      <input
                        name="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Saudi Binladen Group"
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Profession / Trade Category
                      <input
                        name="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="e.g. Electrician / Plumber"
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Interview Date &amp; Time *
                      <input
                        name="scheduledAt"
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Venue / Location
                      <input
                        name="venue"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g. Dhaka Head Office Auditorium"
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Requirements &amp; Instructions (Auto-filled from Demand)
                    <input
                      name="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Salary, package, passport requirements..."
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>
                </div>
              </div>
              <div className="lead-modal-footer master-modal-footer">
                <button data-action-ui="neutral" data-action-size="normal" type="button" className="button secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button data-action-ui="primary" data-action-size="normal" type="submit" disabled={creating} className="button primary master-modal-primary">
                  {creating ? "Creating..." : "Publish Interview Drive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT SCHEDULE MODAL */}
      {editOpen && editingSchedule && (
        <div className="lead-modal-overlay master-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit interview drive" onClick={() => setEditOpen(false)}>
          <div className="lead-modal master-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="lead-modal-header master-modal-header">
              <div>
                <h2>Edit Interview Schedule Drive</h2>
                <p>Update country, title, reschedule date &amp; time, location, or quota for this interview.</p>
              </div>
              <button data-action-ui="neutral" data-action-size="icon" className="lead-close-btn master-modal-close" aria-label="Close edit interview drive" onClick={() => setEditOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateSchedule}>
              <div className="lead-modal-body" style={{ display: "block" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Destination Country & Quota */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Destination Country *
                      <select
                        name="editCountry"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        style={{
                          height: 38,
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: "0 10px",
                          background: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        {activeCountries.map((c) => (
                          <option key={c.id || c.code} value={c.name}>
                            {getCountryFlagEmoji(c.code, c.name)} {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Candidate Capacity (Seats)
                      <input
                        name="capacity"
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Interview Title *
                    <input
                      name="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Company Name
                      <input
                        name="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Profession / Trade Category
                      <input
                        name="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Interview Date &amp; Time *
                      <input
                        name="scheduledAt"
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Venue / Location
                      <input
                        name="venue"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Requirements &amp; Instructions
                    <input
                      name="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>
                </div>
              </div>
              <div className="lead-modal-footer master-modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
                <button data-action-ui="danger" data-action-size="normal"
                  type="button"
                  className="button secondary master-modal-danger"
                  style={{ color: "#e11d48", border: "1px solid #fecdd3", background: "#fff1f2" }}
                  onClick={() => handleDeleteSchedule(editingSchedule.id, editingSchedule.title)}
                >
                  <Trash2 size={14} /> Delete Drive
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button data-action-ui="neutral" data-action-size="normal" type="button" className="button secondary" onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button data-action-ui="primary" data-action-size="normal" type="submit" disabled={updating} className="button primary master-modal-primary">
                    {updating ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleSection({ rows, allCountries = [], canManage = false, onEdit, onDelete, offset, upcomingIds, loading, error }: {
  rows: Schedule[];
  allCountries?: CountryRecord[];
  canManage?: boolean;
  onEdit: (sch: Schedule) => void;
  onDelete: (id: string, name: string) => void;
  offset: number;
  upcomingIds: Set<string>;
  loading: boolean;
  error: boolean;
}) {
  const emptyMessage = loading ? "Loading interview schedules..." : error ? "Interview schedules could not be loaded." : "No interview schedules found.";
  return <>
    <div className="country-design-table interview-design-table">
      <table><colgroup>{[50,170,260,125,120,155,165,115,180,110].map((width,index) => <col key={index} style={{width}} />)}</colgroup>
        <thead><tr>{["SL","Actions","Interview Drive","Interview Date","Country","Client / Company","Profession / Trade","Candidates","Venue / Location","Period"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row,index) => {
          const country = getScheduleCountry(row,allCountries);
          const isUpcoming = upcomingIds.has(row.id);
          return <tr key={row.id}>
            <td className="country-design-serial">{offset + index + 1}</td>
            <td><div className="interview-design-row-actions"><Link data-action-ui="secondary" data-action-size="compact" prefetch={true} href={`/module/registration/interview/${row.id}`} className="country-design-dossier">View details →</Link>
              {canManage && <button data-action-ui="secondary" data-action-size="compact" type="button" className="country-design-dossier interview-design-edit" title="Edit or Reschedule Interview Drive" aria-label={`Edit ${row.title}`} onClick={() => onEdit(row)}><Edit size={12} /> Edit</button>}</div></td>
            <td><div className="country-design-cell client"><b>{row.title}</b><span className="country-design-candidate-id">DRV-{row.id.slice(-6).toUpperCase()}</span></div></td>
            <td><div className="country-design-cell"><b>{readableDate(row.scheduledAt)}</b></div></td>
            <td><span className="interview-design-country">{country.flag} {country.name}</span></td>
            <td><div className="country-design-cell"><b>{row.company || "Direct Client"}</b></div></td>
            <td><div className="country-design-cell"><b>{row.profession || "General Staff"}</b></div></td>
            <td><span className="country-design-candidate-id">{row._count?.interviews ?? 0} Candidates</span></td>
            <td><div className="country-design-cell"><b>{row.venue || "Head Office"}</b></div></td>
            <td><span className={`interview-design-period ${isUpcoming ? "upcoming" : "past"}`}>{isUpcoming ? "Upcoming" : "Past"}</span></td>
          </tr>;
        })}{!rows.length && <tr><td colSpan={10} className="country-design-empty">{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    <div className="interview-design-mobile-stream">
      {rows.map(row => {
        const country = getScheduleCountry(row,allCountries);
        const isUpcoming = upcomingIds.has(row.id);
        return <article key={row.id} className="interview-design-mobile-card">
          <div className="interview-design-mobile-top"><span className="country-design-candidate-id">DRV-{row.id.slice(-6).toUpperCase()}</span><span className={`interview-design-period ${isUpcoming ? "upcoming" : "past"}`}>{isUpcoming ? "Upcoming" : "Past"}</span>
            {canManage && <button data-action-ui="danger" data-action-size="icon" type="button" className="interview-design-delete" aria-label={`Delete ${row.title}`} title="Delete drive" onClick={() => onDelete(row.id,row.title)}><Trash2 size={14} /></button>}</div>
          <div className="interview-design-mobile-title"><h3>{row.title}</h3><p>{row.company || "Direct Client"} · {readableDate(row.scheduledAt)}</p></div>
          <div className="interview-design-mobile-data">
            <div><small>Location</small><b>{row.venue || "Head Office"}</b></div><div><small>Candidates</small><b>{row._count?.interviews ?? 0} Registered</b></div>
            <div><small>Country</small><b>{country.flag} {country.name}</b></div><div><small>Profession</small><b>{row.profession || "General Staff"}</b></div>
          </div>
          <div className="interview-design-mobile-actions">{canManage ? <button data-action-ui="secondary" data-action-size="normal" type="button" className="country-design-dossier interview-design-edit" onClick={() => onEdit(row)}><Edit size={12} /> Edit Schedule</button> : <span className="interview-design-readonly">Read-Only</span>}
            <Link data-action-ui="secondary" data-action-size="normal" prefetch={true} href={`/module/registration/interview/${row.id}`} className="country-design-dossier">View details →</Link></div>
        </article>;
      })}
      {!rows.length && <p className="interview-design-mobile-empty">{emptyMessage}</p>}
    </div>
  </>;
}
