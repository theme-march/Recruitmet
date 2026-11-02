"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Globe,
  Globe2,
  GraduationCap,
  Layers,
  MapPin,
  Phone,
  Plane,
  Save,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  User,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useMemo } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";
import { CandidateProfileImageField } from "@/components/modules/candidate-profile-image-field";

type CandidateItem = {
  id: string;
  candidateNo: string;
  registrationNo: string;
  fullName: string;
  phone: string;
  additionalPhones: string[];
  photo?: string | null;
  profileImageUrl?: string | null;
  email: string;
  district: string;
  address: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  education: string;
  experience: string;
  profession: string;
  preferredCountry: string;
  rawCountry: string;
  passportNo: string;
  nationalId: string;
  source: string;
  status: string;
  createdAt: string;
  totalPaid: number;
  packageCost?: number;
  dueAmount?: number;
  activeFile: {
    id: string;
    fileNo: string;
    currentStage: string;
    status: string;
    company: string;
    officer: string;
    medicalResult?: string | null;
    visaResult?: string | null;
    manpowerResult?: string | null;
  } | null;
  latestCall: {
    id: string;
    leadNo: string;
    status: string;
    officer: string;
    followUpAt: string | null;
  } | null;
  latestInterview: {
    id: string;
    status: string;
    scheduledAt: string;
    title: string;
    company: string;
  } | null;
  interviewOptions: InterviewOptions;
};

type InterviewOptions = {
  interviewScheduleId: string;
  interviewSchedule: string;
  interviewDate: string;
  workCategory: string;
  workSubCategory: string;
  company: string;
  interviewStatus: string;
  fileStatus: string;
};

type ScheduleOption = {
  id: string;
  title: string;
  company?: string | null;
  profession?: string | null;
  scheduledAt: string;
};

type CandidateCategoryOption = {
  id: string;
  name: string;
  professions: Array<{ id: string; name: string }>;
};

type CandidateCompanyOption = { id: string; name: string };
type CandidateFileStatusOption = { id: string; name: string };

const emptyInterviewOptions: InterviewOptions = {
  interviewScheduleId: "",
  interviewSchedule: "",
  interviewDate: "",
  workCategory: "",
  workSubCategory: "",
  company: "",
  interviewStatus: "",
  fileStatus: "",
};

function toDateTimeLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ApiResponse = {
  data: CandidateItem[];
  summary: {
    totalCandidates: number;
    inProcessingFiles: number;
    withInterviews: number;
    withoutFiles: number;
  };
  filters: {
    countries: string[];
    stages: string[];
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function getCountryFlag(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("saudi") || n.includes("ksa")) return "🇸🇦";
  if (n.includes("dubai") || n.includes("uae") || n.includes("emirates")) return "🇦🇪";
  if (n.includes("oman")) return "🇴🇲";
  if (n.includes("malaysia")) return "🇲🇾";
  if (n.includes("singapore")) return "🇸🇬";
  if (n.includes("qatar")) return "🇶🇦";
  if (n.includes("kuwait")) return "🇰🇼";
  if (n.includes("bahrain")) return "🇧🇭";
  if (n.includes("romania")) return "🇷🇴";
  if (n.includes("italy")) return "🇮🇹";
  if (n.includes("poland")) return "🇵🇱";
  return "🌍";
}

function getCountryAbbr(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("saudi") || n.includes("ksa")) return "KSA";
  if (n.includes("dubai") || n.includes("uae") || n.includes("emirates")) return "Dubai";
  if (n.includes("oman")) return "Oman";
  if (n.includes("bahrain")) return "Bahrain";
  if (n.includes("qatar")) return "Qatar";
  if (n.includes("kuwait")) return "Kuwait";
  if (n.includes("malaysia")) return "Malaysia";
  return name.split(" ")[0] || "Global";
}

function formatDate(val?: string | null): string {
  if (!val || val === "—") return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function getCountryStages(countryName: string): string[] {
  const norm = (countryName || "").trim().toLowerCase();
  if (!countryName || norm === "all" || norm === "all countries") {
    return [
      "Passport Entry",
      "Medical",
      "MOFA",
      "Takamul",
      "Bio Finger",
      "Police Clearance",
      "First Payment",
      "Approval Application",
      "Visa Stamping",
      "Visa Hold",
      "Second Payment",
      "Manpower",
      "Ready For Flight",
      "Flight",
      "Hold File",
      "No File",
    ];
  }
  if (norm.includes("saudi") || norm.includes("ksa")) {
    return [
      "Passport Entry",
      "Medical",
      "MOFA",
      "Takamul",
      "Bio Finger",
      "Police Clearance",
      "First Payment",
      "Visa Stamping",
      "Visa Hold",
      "Second Payment",
      "Manpower",
      "Ready For Flight",
      "Flight",
      "Hold File",
      "No File",
    ];
  }
  if (norm.includes("dubai") || norm.includes("uae") || norm.includes("emirates")) {
    return [
      "Passport Entry",
      "Medical",
      "First Payment",
      "Approval Application",
      "Visa Stamping",
      "Visa Hold",
      "Second Payment",
      "Manpower",
      "Ready For Flight",
      "Flight",
      "Hold File",
      "No File",
    ];
  }
  if (norm.includes("romania") || norm.includes("italy") || norm.includes("poland") || norm.includes("croatia")) {
    return [
      "Passport Entry",
      "Medical",
      "Police Clearance",
      "Approval Application",
      "First Payment",
      "Visa Stamping",
      "Visa Hold",
      "Second Payment",
      "Manpower",
      "Ready For Flight",
      "Flight",
      "Hold File",
      "No File",
    ];
  }
  // Standard General Pipeline for Bahrain, Oman, Qatar, Kuwait, Malaysia, Singapore, Other, etc.
  return [
    "Passport Entry",
    "Medical",
    "Police Clearance",
    "First Payment",
    "Visa Stamping",
    "Visa Hold",
    "Second Payment",
    "Manpower",
    "Ready For Flight",
    "Flight",
    "Hold File",
    "No File",
  ];
}

function directoryStageStyle(stage: string) {
  const name = stage.toLowerCase();
  if (name.includes("flight")) return { background: "#e5f8eb", color: "#34c759" };
  if (name.includes("police") || name.includes("medical")) return { background: "#ecfdf5", color: "#15803d" };
  if (name.includes("takamul")) return { background: "#fdf4ff", color: "#a21caf" };
  if (name.includes("manpower")) return { background: "#fff7ed", color: "#c2410c" };
  if (name.includes("visa") || name.includes("mofa")) return { background: "#f5f3ff", color: "#6d28d9" };
  return { background: "#eaf2ff", color: "#007aff" };
}

function DirectoryAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <div className="candidate-mobile-avatar">
    {imageUrl && imageUrl !== failedUrl ? <img src={imageUrl} alt={name} onError={() => setFailedUrl(imageUrl)} /> : name.slice(0, 2).toUpperCase()}
  </div>;
}

export function AllCandidatesListPage({ initialData }: { initialData?: ApiResponse } = {}) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [country, setCountry] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [detailsPhotoFile, setDetailsPhotoFile] = useState<File | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [editingInterviewOptions, setEditingInterviewOptions] = useState(false);
  const [savingInterviewOptions, setSavingInterviewOptions] = useState(false);
  const [interviewDraft, setInterviewDraft] = useState<InterviewOptions>(emptyInterviewOptions);

  const openCandidateProfile = (candidate: CandidateItem) => {
    const normalizedOptions = {
      ...emptyInterviewOptions,
      ...candidate.interviewOptions,
    };
    setSelectedCandidate({ ...candidate, interviewOptions: normalizedOptions });
    setInterviewDraft({
      ...normalizedOptions,
      interviewDate: toDateTimeLocal(normalizedOptions.interviewDate),
    });
    setEditingInterviewOptions(false);
  };

  const handleDetailsPhotoUpload = async (file: File | null) => {
    if (!selectedCandidate || !file) return;
    setUpdatingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/photo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to upload photo");
      toast.success("Profile photo updated successfully!");
      setDetailsPhotoFile(null);
      const newUrl = `/api/candidates/${selectedCandidate.id}/photo?v=${Date.now()}`;
      setSelectedCandidate({
        ...selectedCandidate,
        profileImageUrl: newUrl,
        photo: json.data?.objectKey || newUrl,
      });
      await queryClient.invalidateQueries({ queryKey: ["all-candidates-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleDetailsPhotoRemove = async () => {
    if (!selectedCandidate) return;
    setUpdatingPhoto(true);
    try {
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/photo`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove photo");
      toast.success("Profile photo removed.");
      setSelectedCandidate({
        ...selectedCandidate,
        profileImageUrl: null,
        photo: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["all-candidates-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const isDefaultQuery = !appliedSearch && !country && !stage && !status && page === 1;

  const query = useQuery({
    queryKey: ["all-candidates-list", appliedSearch, country, stage, status, page, pageSize],
    initialData: isDefaultQuery ? initialData : undefined,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: appliedSearch,
        country,
        stage,
        status,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/all-candidates?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load candidate list");
      return res.json() as Promise<ApiResponse>;
    },
    placeholderData: (prev) => prev,
  });

  const countriesQuery = useQuery({
    queryKey: ["active-countries-setup"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || json || [])
        .filter((c: { active?: boolean }) => c.active !== false)
        .map((c: { name: string }) => c.name);
    },
    staleTime: 60_000,
  });

  const schedulesQuery = useQuery({
    queryKey: ["candidate-profile-interview-schedules"],
    queryFn: async () => {
      const res = await fetch("/api/interviews?pageSize=100");
      if (!res.ok) throw new Error("Could not load interview schedules");
      const json = await res.json();
      return (json.data || []) as ScheduleOption[];
    },
    staleTime: 60_000,
  });

  const candidateOptionsQuery = useQuery({
    queryKey: ["candidate-profile-drive-options", selectedCandidate?.preferredCountry || ""],
    enabled: Boolean(selectedCandidate),
    queryFn: async () => {
      const countryName = selectedCandidate?.preferredCountry || "";
      const res = await fetch(`/api/candidate-options?country=${encodeURIComponent(countryName)}`);
      if (!res.ok) throw new Error("Could not load candidate options");
      const json = await res.json();
      return {
        categories: (json.data?.categories || []) as CandidateCategoryOption[],
        companies: (json.data?.companies || []) as CandidateCompanyOption[],
        fileStatuses: (json.data?.fileStatuses || []) as CandidateFileStatusOption[],
      };
    },
    staleTime: 60_000,
  });

  const profileSchedules = schedulesQuery.data ?? [];
  const profileCategories = candidateOptionsQuery.data?.categories ?? [];
  const profileCompanies = candidateOptionsQuery.data?.companies ?? [];
  const profileFileStatuses = candidateOptionsQuery.data?.fileStatuses ?? [];
  const profileCategory = profileCategories.find(
    (category) => category.name === interviewDraft.workCategory,
  );
  const profileProfessions = [
    ...new Set([
      ...(profileCategory?.professions.map((profession) => profession.name) ??
        profileCategories.flatMap((category) =>
          category.professions.map((profession) => profession.name),
        )),
      ...profileSchedules
        .map((schedule) => schedule.profession)
        .filter((value): value is string => Boolean(value)),
      ...(interviewDraft.workSubCategory ? [interviewDraft.workSubCategory] : []),
    ]),
  ];
  const profileCompanyNames = [
    ...new Set([
      ...profileCompanies.map((company) => company.name),
      ...profileSchedules
        .map((schedule) => schedule.company)
        .filter((value): value is string => Boolean(value)),
      ...(interviewDraft.company ? [interviewDraft.company] : []),
    ]),
  ];

  const handleProfileScheduleChange = (scheduleId: string) => {
    const schedule = profileSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      setInterviewDraft((current) => ({
        ...current,
        interviewScheduleId: "",
        interviewSchedule: "",
      }));
      return;
    }
    const configuredCategory = profileCategories.find((category) =>
      category.professions.some((profession) => profession.name === schedule.profession),
    );
    setInterviewDraft((current) => ({
      ...current,
      interviewScheduleId: schedule.id,
      interviewSchedule: schedule.title,
      interviewDate: toDateTimeLocal(schedule.scheduledAt),
      company: schedule.company || current.company,
      workCategory: configuredCategory?.name || current.workCategory,
      workSubCategory: schedule.profession || current.workSubCategory,
      interviewStatus: current.interviewStatus || "Waiting For Interview",
    }));
  };

  const saveInterviewOptions = async () => {
    if (!selectedCandidate) return;
    setSavingInterviewOptions(true);
    try {
      const res = await fetch(`/api/candidates/${selectedCandidate.id}/interview-options`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interviewDraft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Could not update interview options");

      const savedOptions = json.data?.interviewOptions as InterviewOptions;
      setSelectedCandidate((current) =>
        current
          ? {
              ...current,
              interviewOptions: savedOptions,
              latestInterview: json.data?.latestInterview ?? current.latestInterview,
              profession:
                savedOptions.workSubCategory || savedOptions.workCategory || current.profession,
              activeFile: current.activeFile
                ? {
                    ...current.activeFile,
                    company: savedOptions.company || current.activeFile.company,
                  }
                : null,
            }
          : current,
      );
      setInterviewDraft({
        ...savedOptions,
        interviewDate: toDateTimeLocal(savedOptions.interviewDate),
      });
      setEditingInterviewOptions(false);
      await queryClient.invalidateQueries({ queryKey: ["all-candidates-list"] });
      toast.success("Interview & drive options updated from candidate profile.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update interview options");
    } finally {
      setSavingInterviewOptions(false);
    }
  };

  const data = query.data?.data ?? [];
  const summary = query.data?.summary ?? {
    totalCandidates: 0,
    inProcessingFiles: 0,
    withInterviews: 0,
    withoutFiles: 0,
  };
  const meta = query.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  
  const countries = useMemo(() => {
    const fromApi = query.data?.filters?.countries;
    if (fromApi && fromApi.length > 0) return fromApi;
    const fromCountrySetup = countriesQuery.data;
    if (fromCountrySetup && fromCountrySetup.length > 0) {
      return [...fromCountrySetup, "Other"].filter((n, i, a) => a.indexOf(n) === i);
    }
    return ["Saudi Arabia", "Dubai", "Oman", "Bahrain", "Malaysia", "Singapore", "Other"];
  }, [query.data?.filters?.countries, countriesQuery.data]);

  const currentCountryStages = useMemo(() => {
    if (query.data?.filters?.stages && query.data.filters.stages.length > 0) {
      return query.data.filters.stages;
    }
    return getCountryStages(country);
  }, [country, query.data?.filters?.stages]);

  const handleSelectCountry = (newCountry: string) => {
    setCountry(newCountry);
    setPage(1);
    const validStages = getCountryStages(newCountry);
    if (stage && !validStages.includes(stage)) {
      setStage("");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setCountry("");
    setStage("");
    setStatus("");
    setPage(1);
  };

  const downloadCsv = () => {
    if (!data.length) return;
    const escape = (val: unknown) => `"${String(val ?? "").replaceAll('"', '""')}"`;
    const headers = [
      "SL",
      "Candidate ID",
      "Full Name",
      "Phone",
      "Passport No",
      "District",
      "Target Country",
      "Profession",
      "Processing File No",
      "Pipeline Stage",
      "Interview Drive",
      "Status",
      "Registration Date",
    ];

    const rows = data.map((c, i) => [
      (meta.page - 1) * meta.pageSize + i + 1,
      c.candidateNo,
      c.fullName,
      c.phone,
      c.passportNo,
      c.district,
      c.preferredCountry,
      c.profession,
      c.activeFile?.fileNo || "No File",
      c.activeFile?.currentStage || "—",
      c.latestInterview?.title || "—",
      c.status,
      formatDate(c.createdAt),
    ]);

    const csvContent = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidate-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="country-design-page directory-design-page" aria-busy={query.isFetching}>
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link> / Candidate Directory</nav>
      <header className="country-design-heading">
        <div>
          <h1>All Candidates Directory</h1>
          <p>Central database of all registered candidates, overseas file pipelines, and interview registrations.</p>
        </div>
        <div className="country-design-actions directory-design-actions">
          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={downloadCsv}><Download size={14} /> Export CSV</button>
          <Link data-action-ui="primary" data-action-size="normal" href={moduleItemPath("call-center", "Create Candidate")} className="directory-design-create"><Plus size={14} /> Create Candidate</Link>
        </div>
      </header>

      <section className="country-design-metrics directory-design-metrics" aria-label="Candidate summary">
        {[
          { label: "Total Candidates", value: summary.totalCandidates, description: "In System Registry", Icon: UsersRound, tone: "blue" },
          { label: "File Processing", value: summary.inProcessingFiles, description: "Active Overseas Files", Icon: Layers, tone: "green" },
          { label: "Interviews", value: summary.withInterviews, description: "Drives & Walk-ins", Icon: Calendar, tone: "purple" },
          { label: "Standalone", value: summary.withoutFiles, description: "Awaiting File Open", Icon: FileText, tone: "orange" },
        ].map(({ label, value, description, Icon, tone }) => (
          <article key={label} className="country-design-metric">
            <div><span>{label}</span><Icon size={16} className={`directory-icon-${tone}`} /></div>
            <b>{value}</b><p>{description}</p>
          </article>
        ))}
      </section>

      <section className="country-design-workspace directory-design-workspace" aria-label="All candidates directory">
        <div className="country-design-tabs directory-design-country-tabs" role="group" aria-label="Filter by country">
          {[{ id: "", label: "All Countries", flag: "🌍" }, ...countries.map(cName => ({ id: cName, label: cName, flag: getCountryFlag(cName) }))].map(c => (
            <button key={c.id || "all"} type="button" aria-pressed={country === c.id}
              className={country === c.id ? "selected" : ""} onClick={() => handleSelectCountry(c.id)}>{c.flag} {c.label}</button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="country-design-filters directory-design-filters">
          <div className="country-design-filter-fields">
            <label className="country-design-search directory-design-search"><Search size={14} aria-hidden="true" /><input
              aria-label="Search Candidate" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, passport, ID or file..." /></label>
            <div className="country-design-select"><select aria-label="Candidate Status" value={status} onChange={e => {setStatus(e.target.value);setPage(1);}}>
              <option value="">All Statuses</option><option value="ACTIVE">Active</option><option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option><option value="HOLD">Hold</option><option value="RETURNED">Returned</option>
            </select><span className="directory-select-arrow" aria-hidden="true">⌄</span></div>
            <button data-action-ui="primary" data-action-size="normal" type="submit" className="directory-design-filter-button">Apply</button>
            <button data-action-ui="neutral" data-action-size="normal" type="button" className="directory-design-filter-button" onClick={clearFilters}>Clear</button>
          </div>
          <label className="country-design-page-size">Per Page:<span className="country-design-select"><select
            aria-label="Candidates per page" value={pageSize} onChange={e => {setPageSize(Number(e.target.value));setPage(1);}}>
            {[10,20,50,100].map(size => <option key={size} value={size}>{size}</option>)}</select><span className="directory-select-arrow" aria-hidden="true">⌄</span></span></label>
        </form>
        <div className="country-design-count">
          Showing {data.length > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} Total Candidates
        </div>
        <div className="desktop-candidates-table country-design-table directory-design-table">
          <table>
            <colgroup>{[50,170,210,135,150,125,150,140,215,175].map((width,i) => <col key={i} style={{width}} />)}</colgroup>
            <thead><tr>{["SL","Actions","Candidate","Contact","Passport / NID","Target Country","Trade / Profession","Processing File","Recruitment Stage","Source"].map(label => <th key={label}>{label}</th>)}</tr></thead>
            <tbody style={{opacity:query.isFetching ? .75 : 1}}>
              {data.map((row,index) => (
                <tr key={row.id}>
                  <td className="country-design-serial">{(meta.page - 1) * meta.pageSize + index + 1}</td>
                  <td><div className="directory-design-row-actions">
                    <button data-action-ui="secondary" data-action-size="compact" type="button" className="country-design-dossier" onClick={() => openCandidateProfile(row)} aria-label={`Details for ${row.fullName}`}><Eye size={12} /> Details</button>
                    {row.activeFile && <Link data-action-ui="secondary" data-action-size="compact" href={`/file/${row.activeFile.id}?view=pipeline`} title="Open Interactive Stage Processing Pipeline" className="country-design-dossier"><Layers size={12} /> Pipeline →</Link>}
                  </div></td>
                  <td><div className="country-design-cell client"><b>{row.fullName}</b><span className="country-design-candidate-id">{row.candidateNo}</span></div></td>
                  <td><div className="country-design-cell"><b>{row.phone}</b><small>{row.district || "—"}</small></div></td>
                  <td><div className="country-design-cell"><b>{row.passportNo}</b>{row.nationalId !== "—" && <small>NID: {row.nationalId}</small>}</div></td>
                  <td><span className="directory-design-country">{getCountryFlag(row.preferredCountry)} {row.preferredCountry}</span></td>
                  <td><div className="country-design-cell"><b>{row.profession}</b></div></td>
                  <td>{row.activeFile ? <div className="country-design-cell"><Link href={`/file/${row.activeFile.id}`} className="country-design-candidate-id directory-design-file">{row.activeFile.fileNo}</Link><small>{row.activeFile.company}</small></div> : <span className="directory-design-muted">No File Yet</span>}</td>
                  <td>{row.activeFile ? <div className="directory-design-stage-cell">
                    <span className="country-design-stage" style={directoryStageStyle(row.activeFile.currentStage)}><CheckCircle2 size={12} /> {row.activeFile.currentStage}</span>
                    <div className="directory-design-micro-badges">
                      {row.activeFile.medicalResult && <span className={`directory-design-micro ${/fit/i.test(row.activeFile.medicalResult) ? "medical" : "warning"}`}>Med: {row.activeFile.medicalResult}</span>}
                      {row.activeFile.visaResult && <span className="directory-design-micro visa">Visa: {row.activeFile.visaResult}</span>}
                      {row.activeFile.manpowerResult && <span className="directory-design-micro manpower">BMET: {row.activeFile.manpowerResult}</span>}
                      {row.totalPaid > 0 && <span className="directory-design-micro paid">৳ {(row.totalPaid / 1000).toFixed(0)}k Paid</span>}
                    </div>
                  </div> : <span className="directory-design-micro paid">Registered (No File)</span>}</td>
                  <td><span className="directory-design-source"><span className={`directory-source-dot tone-${index % 3}`} />{row.source || "Direct"}</span></td>
                </tr>
              ))}
              {query.isLoading && <tr><td colSpan={10} className="country-design-empty">Loading candidates...</td></tr>}
              {!query.isLoading && data.length === 0 && <tr><td colSpan={10} className="country-design-empty">No candidates found matching criteria.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile Candidate Card Feed (Stitch Design Reference: 097f249f1dc6408c94f8b28aa2585c52) */}
        <div className="mobile-candidates-stream">
          {data.map((row) => (
            <div className="candidate-mobile-card" key={row.id}>
              {/* Top Row: Avatar, Full Name, ID, Trade, Country */}
              <div className="candidate-mobile-top">
                <div className="candidate-mobile-bio">
                  <DirectoryAvatar name={row.fullName} imageUrl={row.profileImageUrl} />
                  <div className="candidate-mobile-title-block">
                    <h3 className="candidate-mobile-name">{row.fullName}</h3>
                    <div className="candidate-mobile-id-row">
                      <span className="candidate-mobile-id-badge">{row.candidateNo}</span>
                      <span className="candidate-mobile-trade">• {row.profession}</span>
                    </div>
                  </div>
                </div>
                <span className="candidate-mobile-country-badge">
                  <span>{getCountryFlag(row.preferredCountry)}</span>
                  <span>{getCountryAbbr(row.preferredCountry)}</span>
                </span>
              </div>

              {/* Quick Data Points Grid (2-columns) */}
              <div className="candidate-mobile-data-grid">
                <div className="candidate-mobile-data-col">
                  <span className="candidate-mobile-data-lbl">Contact &amp; Location</span>
                  <span className="candidate-mobile-data-val">{row.phone}</span>
                  <span className="candidate-mobile-data-sub">{row.district || "Direct Intake"}</span>
                </div>
                <div className="candidate-mobile-data-col">
                  <span className="candidate-mobile-data-lbl">National ID / Passport</span>
                  <span className="candidate-mobile-data-val">
                    {row.passportNo !== "—" ? row.passportNo : (row.nationalId !== "—" ? row.nationalId : "Unverified")}
                  </span>
                  <span className="candidate-mobile-data-sub">
                    {row.nationalId !== "—" && row.passportNo !== "—" ? `NID: ${row.nationalId}` : "Registry ID Verified"}
                  </span>
                </div>
              </div>

              {/* Processing File Stack */}
              {row.activeFile ? (
                <div className="candidate-mobile-file-strip">
                  <div className="candidate-mobile-file-meta">
                    <span style={{ fontSize: "14px" }}>📁</span>
                    <span className="candidate-mobile-file-no">{row.activeFile.fileNo}</span>
                    <span className="candidate-mobile-file-company">{row.activeFile.company}</span>
                  </div>
                  {row.totalPaid > 0 && (
                    <span className="candidate-mobile-paid-badge">
                      ৳ {(row.totalPaid / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
              ) : (
                <div className="candidate-mobile-file-strip empty">
                  <span className="candidate-mobile-no-file-text">Awaiting Overseas File Opening</span>
                </div>
              )}

              {/* Stage Micro Badges */}
              <div className="candidate-mobile-micro-badges">
                {row.activeFile ? (
                  <>
                    <span className="micro-badge stage-badge" style={{
                      "--directory-stage-bg": directoryStageStyle(row.activeFile.currentStage).background,
                      "--directory-stage-color": directoryStageStyle(row.activeFile.currentStage).color,
                    } as React.CSSProperties}>
                      {row.activeFile.currentStage}
                    </span>
                    {row.activeFile.medicalResult && (
                      <span className="micro-badge med-badge">
                        Med: {row.activeFile.medicalResult}
                      </span>
                    )}
                    {row.activeFile.visaResult && (
                      <span className="micro-badge visa-badge">
                        Visa: {row.activeFile.visaResult}
                      </span>
                    )}
                    {row.activeFile.manpowerResult && (
                      <span className="micro-badge bmet-badge">
                        BMET: {row.activeFile.manpowerResult}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="micro-badge direct-badge">
                    Registry Intake
                  </span>
                )}
              </div>

              {/* Action Footer */}
              <div className="candidate-mobile-footer">
                <span className="candidate-mobile-src">Src: {row.source || "Direct Intake"}</span>
                <div className="candidate-mobile-actions">
                  <button data-action-ui="secondary" data-action-size="normal"
                    type="button"
                    className="candidate-mobile-btn details"
                    onClick={() => openCandidateProfile(row)}
                  >
                    <Eye size={14} /> Details
                  </button>
                  {row.activeFile && (
                    <Link data-action-ui="secondary" data-action-size="normal"
                      href={`/file/${row.activeFile.id}?view=pipeline`}
                      className="candidate-mobile-btn pipeline"
                    >
                      <Layers size={14} /> Pipeline
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!query.isLoading && data.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", background: "#ffffff", borderRadius: "16px", border: "1px solid var(--line)" }}>
              <UsersRound size={32} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>No candidates found matching criteria.</p>
            </div>
          )}
        </div>

        <div className="country-design-pagination">
          <span>{meta.total} Total Candidates</span>
          <div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1,p - 1))}>← Previous</button>
            <span className="country-design-page-indicator">Page {meta.page} of {meta.totalPages}</span>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages,p + 1))}>Next →</button>
          </div>
        </div>
      </section>

      {/* 6. CANDIDATE 360° DETAILS MODAL */}
      {selectedCandidate && (
        <div className="master-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Candidate details"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedCandidate(null)}
        >
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "88vh",
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="master-modal-header" style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "#fafafd", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="master-modal-accent master-modal-icon"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    fontSize: "16px",
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {selectedCandidate.profileImageUrl ? (
                    <img
                      src={selectedCandidate.profileImageUrl}
                      alt={selectedCandidate.fullName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    selectedCandidate.fullName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span className="master-modal-accent" style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", padding: "3px 8px", borderRadius: "6px" }}>
                      {selectedCandidate.candidateNo}
                    </span>
                    {selectedCandidate.activeFile && (
                      <span style={{ fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: "6px" }}>
                        {selectedCandidate.activeFile.fileNo}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    {selectedCandidate.fullName}
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                    Registered on {formatDate(selectedCandidate.createdAt)} · Source: <b>{selectedCandidate.source}</b>
                  </p>
                </div>
              </div>

              <button data-action-ui="neutral" data-action-size="icon" className="master-modal-close"
                onClick={() => setSelectedCandidate(null)}
                aria-label="Close candidate details"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", flex: 1 }}>
              {/* Profile Photo Editor */}
              <div className="master-modal-panel" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <CandidateProfileImageField
                  candidateName={selectedCandidate.fullName}
                  imageUrl={selectedCandidate.profileImageUrl}
                  selectedFile={detailsPhotoFile}
                  onFileChange={(file) => {
                    setDetailsPhotoFile(file);
                    if (file) handleDetailsPhotoUpload(file);
                  }}
                  onRemoveExisting={() => handleDetailsPhotoRemove()}
                  disabled={updatingPhoto}
                  compact
                  label="Candidate Profile Photo (View / Change / Delete)"
                />
              </div>

              {/* Quick Call & Actions */}
              <div className="candidate-detail-actions">
                <a
                  className="candidate-detail-action"
                  data-action-ui="success"
                  href={`tel:${selectedCandidate.phone.replace(/[^+\d]/g, "")}`}
                >
                  <Phone size={16} aria-hidden="true" />
                  <span>Call Candidate</span>
                </a>

                {selectedCandidate.activeFile ? (
                  <>
                    <Link
                      className="candidate-detail-action"
                      data-action-ui="primary"
                      href={`/file/${selectedCandidate.activeFile.id}?view=pipeline`}
                      aria-label="Open Stage Processing Pipeline"
                    >
                      <Layers size={16} aria-hidden="true" />
                      <span>Processing Pipeline</span>
                    </Link>
                    <Link
                      className="candidate-detail-action"
                      data-action-ui="secondary"
                      href={`/file/${selectedCandidate.activeFile.id}?view=dossier`}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      <span>Master Dossier</span>
                    </Link>
                  </>
                ) : (
                  <Link
                    className="candidate-detail-action"
                    data-action-ui="primary"
                    href={moduleItemPath("call-center", "Create Candidate")}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>Open File</span>
                  </Link>
                )}
              </div>

              {/* Basic Information */}
              <div className="master-modal-panel" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={14} className="text-indigo-600" /> Basic &amp; Contact Details
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Primary Phone:</span><b>{selectedCandidate.phone}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Additional Phones:</span><b>{selectedCandidate.additionalPhones.length ? selectedCandidate.additionalPhones.join(", ") : "None"}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>District:</span><b>{selectedCandidate.district}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Date of Birth:</span><b>{selectedCandidate.dob}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Gender / Marital:</span><b>{selectedCandidate.gender} / {selectedCandidate.maritalStatus}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Last Education:</span><b>{selectedCandidate.education}</b></div>
                </div>
              </div>

              {/* Passport & Identity */}
              <div className="master-modal-panel" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileCheck size={14} className="text-emerald-600" /> Passport &amp; Legal Identity
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Passport Number:</span><b>{selectedCandidate.passportNo}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>National ID (NID):</span><b>{selectedCandidate.nationalId}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Target Country:</span><b>{getCountryFlag(selectedCandidate.preferredCountry)} {selectedCandidate.preferredCountry}</b></div>
                  <div><span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Trade / Profession:</span><b>{selectedCandidate.profession}</b></div>
                </div>
              </div>

              {/* Processing File & Recruitment Stage Status */}
              {selectedCandidate.activeFile ? (
                <div className="master-modal-panel" style={{ background: "#f5f3ff", padding: "16px", borderRadius: "12px", border: "1px solid #ddd6fe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#5b21b6", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layers size={14} /> Stage Processing Pipeline (Interactive Workflow)
                    </h3>
                    <Link data-action-ui="secondary" data-action-size="normal" className="master-modal-accent"
                      href={`/file/${selectedCandidate.activeFile.id}?view=pipeline`}
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#7258e8",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "#fff",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #dcd5fb",
                      }}
                    >
                      ⚡ Open Full Pipeline ➔
                    </Link>
                  </div>

                  {/* Visual Stage Pipeline Progression Bar */}
                  <div className="master-modal-panel" style={{ background: "#fff", padding: "12px", borderRadius: "10px", border: "1px solid #e9d5ff", marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b21a8", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span>Progress Stages ({selectedCandidate.preferredCountry})</span>
                      <span style={{ color: "#059669", fontWeight: 800 }}>
                        Current: {selectedCandidate.activeFile.currentStage}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                      {getCountryStages(selectedCandidate.preferredCountry)
                        .filter((st) => !["Hold File", "No File", "Visa Hold"].includes(st))
                        .map((st, idx, arr) => {
                          const currentStageNorm = (selectedCandidate.activeFile?.currentStage || "").toLowerCase();
                          const thisStageNorm = st.toLowerCase();
                          const currentIdx = arr.findIndex((x) => x.toLowerCase() === currentStageNorm);
                          const isDone = currentIdx !== -1 ? idx < currentIdx || selectedCandidate.activeFile?.status === "COMPLETED" : false;
                          const isCurrent = thisStageNorm === currentStageNorm && selectedCandidate.activeFile?.status !== "COMPLETED";

                          return (
                            <Link
                              key={st}
                              href={`/file/${selectedCandidate.activeFile?.id}?stage=${encodeURIComponent(st)}`}
                              title={`Click to open ${st} stage workflow`}
                              style={{
                                flexShrink: 0,
                                display: "inline-flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                background: isCurrent ? "#1e1b4b" : isDone ? "#ecfdf5" : "#f8fafc",
                                border: isCurrent ? "1.5px solid #1e1b4b" : isDone ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                                color: isCurrent ? "#fff" : isDone ? "#065f46" : "#64748b",
                                textDecoration: "none",
                                fontSize: "11px",
                                fontWeight: 700,
                                minWidth: "80px",
                                textAlign: "center",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "10px", opacity: isCurrent ? 0.8 : 0.6 }}>#{idx + 1}</span>
                                {isDone ? (
                                  <CheckCircle2 size={12} color="#059669" />
                                ) : isCurrent ? (
                                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a5b4fc", display: "inline-block" }} />
                                ) : (
                                  <Clock size={10} color="#94a3b8" />
                                )}
                              </div>
                              <span style={{ whiteSpace: "nowrap" }}>{st}</span>
                            </Link>
                          );
                        })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                    <div><span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>File Number:</span><b>{selectedCandidate.activeFile.fileNo}</b></div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Current Stage:</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "11.5px" }}>
                        <CheckCircle2 size={12} /> {selectedCandidate.activeFile.currentStage}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Medical Fitness:</span>
                      <b>{selectedCandidate.activeFile.medicalResult || "Pending / In Progress"}</b>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Visa Status:</span>
                      <b>{selectedCandidate.activeFile.visaResult || "Pending / Processing"}</b>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>BMET Manpower:</span>
                      <b>{selectedCandidate.activeFile.manpowerResult || "Pending"}</b>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Assigned Officer:</span>
                      <b>{selectedCandidate.activeFile.officer}</b>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Total Paid:</span>
                      <b style={{ color: "#059669" }}>৳ {selectedCandidate.totalPaid.toLocaleString("en-IN")}</b>
                    </div>
                    <div>
                      <span style={{ color: "#6b21a8", display: "block", fontSize: "11px" }}>Balance Due:</span>
                      <b style={{ color: (selectedCandidate.dueAmount ?? 0) > 0 ? "#e11d48" : "#059669" }}>
                        ৳ {(selectedCandidate.dueAmount ?? 0).toLocaleString("en-IN")}
                      </b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="master-modal-panel" style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px dashed var(--line)", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)", fontWeight: 600 }}>
                    Candidate is registered in system but has no active overseas processing file opened yet.
                  </p>
                </div>
              )}

              {/* Interview & Drive Options — optional at registration, editable here later */}
              <div className="master-modal-panel" style={{ background: "#fdf4ff", padding: "16px", borderRadius: "12px", border: "1px solid #f5d0fe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#86198f", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={14} /> Interview &amp; Drive Options
                    </h3>
                    <p style={{ margin: "4px 0 0", color: "#a21caf", fontSize: "11px" }}>
                      Optional — add or update these details whenever they become available.
                    </p>
                  </div>
                  {!editingInterviewOptions && (
                    <button data-action-ui="secondary" data-action-size="normal"
                      type="button"
                      onClick={() => setEditingInterviewOptions(true)}
                      style={{ padding: "6px 11px", borderRadius: "7px", border: "1px solid #e9d5ff", background: "#fff", color: "#86198f", fontSize: "11px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Edit options
                    </button>
                  )}
                </div>

                {editingInterviewOptions ? (
                  <div className="work-form-grid" style={{ gap: "12px" }}>
                    <label>
                      <span>Interview Schedule</span>
                      <select
                        value={interviewDraft.interviewScheduleId}
                        onChange={(event) => handleProfileScheduleChange(event.target.value)}
                      >
                        <option value="">No schedule selected</option>
                        {profileSchedules.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.title} · {new Date(schedule.scheduledAt).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Interview Date</span>
                      <input
                        type="datetime-local"
                        value={interviewDraft.interviewDate}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, interviewDate: event.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Interested Work Category</span>
                      <select
                        value={interviewDraft.workCategory}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, workCategory: event.target.value, workSubCategory: "" }))}
                      >
                        <option value="">No category selected</option>
                        {profileCategories.map((category) => (
                          <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Interested Work Sub Category</span>
                      <select
                        value={interviewDraft.workSubCategory}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, workSubCategory: event.target.value }))}
                      >
                        <option value="">No sub category selected</option>
                        {profileProfessions.map((profession) => (
                          <option key={profession} value={profession}>{profession}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Interested Company</span>
                      <select
                        value={interviewDraft.company}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, company: event.target.value }))}
                      >
                        <option value="">No company selected</option>
                        {profileCompanyNames.map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Interview Status</span>
                      <select
                        value={interviewDraft.interviewStatus}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, interviewStatus: event.target.value }))}
                      >
                        <option value="">No status selected</option>
                        <option value="Waiting For Interview">Waiting For Interview</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </label>
                    <label>
                      <span>File Status</span>
                      <select
                        value={interviewDraft.fileStatus}
                        onChange={(event) => setInterviewDraft((current) => ({ ...current, fileStatus: event.target.value }))}
                      >
                        <option value="">No file status selected</option>
                        {profileFileStatuses.map((fileStatus) => (
                          <option key={fileStatus.id} value={fileStatus.name}>{fileStatus.name}</option>
                        ))}
                      </select>
                    </label>
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "2px" }}>
                      <button data-action-ui="neutral" data-action-size="normal"
                        type="button"
                        disabled={savingInterviewOptions}
                        onClick={() => {
                          setInterviewDraft({
                            ...emptyInterviewOptions,
                            ...selectedCandidate.interviewOptions,
                            interviewDate: toDateTimeLocal(selectedCandidate.interviewOptions?.interviewDate || ""),
                          });
                          setEditingInterviewOptions(false);
                        }}
                        style={{ padding: "7px 13px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "11.5px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
                        type="button"
                        disabled={savingInterviewOptions}
                        onClick={saveInterviewOptions}
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none", background: "#86198f", color: "#fff", fontSize: "11.5px", fontWeight: 800, cursor: savingInterviewOptions ? "not-allowed" : "pointer", opacity: savingInterviewOptions ? 0.65 : 1 }}
                      >
                        <Save size={13} /> {savingInterviewOptions ? "Saving..." : "Save options"}
                      </button>
                    </div>
                  </div>
                ) : selectedCandidate.latestInterview || Object.values(selectedCandidate.interviewOptions).some(Boolean) ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Schedule:</span><b>{selectedCandidate.interviewOptions.interviewSchedule || selectedCandidate.latestInterview?.title || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interview Status:</span><b>{selectedCandidate.interviewOptions.interviewStatus || selectedCandidate.latestInterview?.status || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interview Date:</span><b>{formatDate(selectedCandidate.interviewOptions.interviewDate || selectedCandidate.latestInterview?.scheduledAt)}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interested Company:</span><b>{selectedCandidate.interviewOptions.company || selectedCandidate.latestInterview?.company || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Work Category:</span><b>{selectedCandidate.interviewOptions.workCategory || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Work Sub Category:</span><b>{selectedCandidate.interviewOptions.workSubCategory || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>File Status:</span><b>{selectedCandidate.interviewOptions.fileStatus || "—"}</b></div>
                  </div>
                ) : (
                  <div className="master-modal-panel" style={{ padding: "12px", borderRadius: "9px", border: "1px dashed #e9d5ff", background: "rgba(255,255,255,0.65)", color: "#a21caf", fontSize: "12px", fontWeight: 600, textAlign: "center" }}>
                    No interview or drive details added yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
