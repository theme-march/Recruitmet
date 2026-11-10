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
  Upload,
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
import { CandidateBulkUploadModal } from "@/components/modules/candidate-bulk-upload-modal";

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
  agent?: string;
  agentId?: string | null;
  status: string;
  createdAt: string;
  totalPaid: number;
  packageCost?: number;
  contractPackage?: number;
  discount?: number;
  packageTitle?: string;
  dueAmount?: number;
  activeFile: {
    id: string;
    fileNo: string;
    currentStage: string;
    status: string;
    company: string;
    officer: string;
    agent?: string | null;
    medicalResult?: string | null;
    visaResult?: string | null;
    manpowerResult?: string | null;
    stageDetails?: Record<string, Record<string, string | number | null | undefined>>;
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
    scheduleId?: string | null;
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

function formatTk(amount?: number | null): string {
  return `৳ ${(amount || 0).toLocaleString()}`;
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

function interviewStatusStyle(status?: string | null): React.CSSProperties {
  const norm = (status || "").trim().toLowerCase();
  if (norm.includes("select") || norm.includes("pass")) {
    return { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
  }
  if (norm.includes("reject") || norm.includes("fail")) {
    return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  }
  if (norm.includes("absent")) {
    return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
  }
  if (norm.includes("wait") || norm.includes("schedul")) {
    return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  }
  if (norm.includes("reschedul")) {
    return { background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" };
  }
  return { background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0" };
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<string | null>(null);
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
    setActiveStageTab(candidate.activeFile?.currentStage || "Passport Entry");
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
      "Agent",
      "Interview Drive",
      "Interview Status",
      "Processing File No",
      "Pipeline Stage",
      "Total Paid (BDT)",
      "Package Cost (BDT)",
      "Balance Due (BDT)",
      "Status",
      "Registration Date",
    ];

    const rows = data.map((c, i) => {
      const pkgCost = c.packageCost || (/dubai/i.test(c.rawCountry || c.preferredCountry) ? 300000 : 350000);
      const paid = c.totalPaid || 0;
      const due = c.dueAmount !== undefined ? c.dueAmount : Math.max(0, pkgCost - paid);

      return [
        (meta.page - 1) * meta.pageSize + i + 1,
        c.candidateNo,
        c.fullName,
        c.phone,
        c.passportNo,
        c.district,
        c.preferredCountry,
        c.profession,
        c.agent || c.source || "Direct Office",
        c.latestInterview?.title || (c.interviewOptions?.interviewSchedule && c.interviewOptions.interviewSchedule !== "—" ? c.interviewOptions.interviewSchedule : "No Drive"),
        c.latestInterview?.status || (c.interviewOptions?.interviewStatus && c.interviewOptions.interviewStatus !== "—" && c.interviewOptions.interviewStatus !== "Not Scheduled" ? c.interviewOptions.interviewStatus : (c.latestInterview?.title ? "Waiting For Interview" : "Not Scheduled")),
        c.activeFile?.fileNo || "No File",
        c.activeFile?.currentStage || "—",
        paid,
        pkgCost,
        due,
        c.status,
        formatDate(c.createdAt),
      ];
    });

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
          <button
            data-action-ui="secondary"
            data-action-size="normal"
            type="button"
            onClick={() => setShowBulkUpload(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0edff",
              color: "#4f46e5",
              border: "1px solid #c7d2fe",
              fontWeight: 700,
            }}
          >
            <Upload size={14} /> Bulk Upload
          </button>
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
            <colgroup>{[50,250,190,130,140,125,140,165,190,140,200,155].map((width,i) => <col key={i} style={{width}} />)}</colgroup>
            <thead><tr>{["SL","Actions","Candidate","Contact","Passport / NID","Target Country","Trade / Profession","Agent","Interview","Processing File","Recruitment Stage","Financial Ledger"].map(label => <th key={label}>{label}</th>)}</tr></thead>
            <tbody style={{opacity:query.isFetching ? .75 : 1}}>
              {data.map((row,index) => (
                <tr key={row.id}>
                  <td className="country-design-serial">{(meta.page - 1) * meta.pageSize + index + 1}</td>
                  <td><div className="directory-design-row-actions">
                    <button data-action-ui="secondary" data-action-size="compact" type="button" className="country-design-dossier" onClick={() => openCandidateProfile(row)} aria-label={`Details for ${row.fullName}`}><Eye size={12} /> Details</button>
                    <Link data-action-ui="secondary" data-action-size="compact" href={`/candidate/${row.id}/cv`} title="Generate & Download Candidate CV" className="country-design-dossier"><FileText size={12} /> Generate CV</Link>
                    {Boolean(/saudi/i.test(row.preferredCountry || "")) && (
                      <Link data-action-ui="secondary" data-action-size="compact" href={`/candidate/${row.id}/mofa`} title="Generate Saudi Embassy MOFA Visa Application" className="country-design-dossier"><FileCheck size={12} /> Generate MOFA</Link>
                    )}
                    {row.activeFile && <Link data-action-ui="secondary" data-action-size="compact" href={`/file/${row.activeFile.id}?view=pipeline`} title="Open Interactive Stage Processing Pipeline" className="country-design-dossier"><Layers size={12} /> Pipeline →</Link>}
                  </div></td>
                  <td><div className="country-design-cell client"><b>{row.fullName}</b><span className="country-design-candidate-id">{row.candidateNo}</span></div></td>
                  <td><div className="country-design-cell"><b>{row.phone}</b><small>{row.district || "—"}</small></div></td>
                  <td><div className="country-design-cell"><b>{row.passportNo}</b>{row.nationalId !== "—" && <small>NID: {row.nationalId}</small>}</div></td>
                  <td><span className="directory-design-country">{getCountryFlag(row.preferredCountry)} {row.preferredCountry}</span></td>
                  <td><div className="country-design-cell"><b>{row.profession}</b></div></td>
                  <td>
                    {(() => {
                      const agentName = row.agent && !/^(direct|direct walk-in)$/i.test(row.agent)
                        ? row.agent
                        : (row.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(row.source)
                          ? row.source
                          : "Direct Office");
                      const isAgency = (row.agent && !/^(direct|direct walk-in)$/i.test(row.agent)) ||
                        (row.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(row.source));
                      const badgeLabel = isAgency ? "Agency Partner" : (row.source || "Direct Intake");
                      const agentTargetUrl = isAgency
                        ? (row.agentId ? `/agent/${row.agentId}` : `/agent/${encodeURIComponent(agentName)}`)
                        : `/agents`;

                      return (
                        <div className="country-design-cell">
                          <b>
                            <Link
                              href={agentTargetUrl}
                              className="hover:underline transition-colors"
                              style={{
                                color: isAgency ? "#007aff" : "inherit",
                                textDecoration: "none",
                              }}
                              title={isAgency ? `Open Agent Profile: ${agentName}` : "View Registered Agents Directory"}
                            >
                              {agentName}
                            </Link>
                          </b>
                          <small
                            style={{
                              color: isAgency ? "#6366f1" : "var(--muted)",
                              fontWeight: 600,
                            }}
                          >
                            {badgeLabel}
                          </small>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const interviewDriveTitle = row.latestInterview?.title || (row.interviewOptions?.interviewSchedule && row.interviewOptions.interviewSchedule !== "—" ? row.interviewOptions.interviewSchedule : null);
                      const rawInterviewStatus = row.latestInterview?.status || (row.interviewOptions?.interviewStatus && row.interviewOptions.interviewStatus !== "—" && row.interviewOptions.interviewStatus !== "Not Scheduled" ? row.interviewOptions.interviewStatus : null);
                      const interviewStatus = rawInterviewStatus || (interviewDriveTitle ? "Waiting For Interview" : null);

                      if (!interviewDriveTitle) {
                        return <span className="directory-design-muted">No Interview</span>;
                      }

                      return (
                        <div className="country-design-cell">
                          <b>
                            {row.latestInterview?.scheduleId ? (
                              <Link
                                href={`/module/registration/interview/${row.latestInterview.scheduleId}`}
                                style={{ color: "inherit", textDecoration: "none" }}
                                title={`View Interview Drive: ${interviewDriveTitle}`}
                                className="hover:underline"
                              >
                                {interviewDriveTitle}
                              </Link>
                            ) : (
                              interviewDriveTitle
                            )}
                          </b>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "3px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "1.5px 7px",
                                borderRadius: "6px",
                                fontSize: "10.5px",
                                fontWeight: 600,
                                ...interviewStatusStyle(interviewStatus),
                              }}
                            >
                              {interviewStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td>{row.activeFile ? <div className="country-design-cell"><Link href={`/file/${row.activeFile.id}`} className="country-design-candidate-id directory-design-file">{row.activeFile.fileNo}</Link><small>{row.activeFile.company}</small></div> : <span className="directory-design-muted">No File Yet</span>}</td>
                  <td>{row.activeFile ? <div className="directory-design-stage-cell">
                    <span className="country-design-stage" style={directoryStageStyle(row.activeFile.currentStage)}><CheckCircle2 size={12} /> {row.activeFile.currentStage}</span>
                    <div className="directory-design-micro-badges">
                      {row.activeFile.medicalResult && <span className={`directory-design-micro ${/fit/i.test(row.activeFile.medicalResult) ? "medical" : "warning"}`}>Med: {row.activeFile.medicalResult}</span>}
                      {row.activeFile.visaResult && <span className="directory-design-micro visa">Visa: {row.activeFile.visaResult}</span>}
                      {row.activeFile.manpowerResult && <span className="directory-design-micro manpower">BMET: {row.activeFile.manpowerResult}</span>}
                    </div>
                  </div> : <span className="directory-design-micro paid">Registered (No File)</span>}</td>
                  <td data-label="Financial Ledger">
                    {(() => {
                      const gross = Number(row.contractPackage || row.packageCost) || (/dubai/i.test(row.rawCountry || row.preferredCountry) ? 300000 : 350000);
                      const discount = Number(row.discount || 0);
                      const pkgCost = row.packageCost !== undefined ? row.packageCost : Math.max(0, gross - discount);
                      const paid = row.totalPaid || 0;
                      const due = row.dueAmount !== undefined ? row.dueAmount : Math.max(0, pkgCost - paid);
                      const advance = Math.max(0, paid - pkgCost);

                      return (
                        <div className="country-design-cell financial" style={{ minWidth: "125px" }}>
                          <b style={{ fontSize: "13.5px", color: paid > 0 ? "#059669" : "#1d1d1f", display: "block", fontWeight: 700 }}>
                            {formatTk(paid)}
                          </b>
                          <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block", marginTop: "1px" }}>
                            Package: {formatTk(pkgCost)}
                            {discount > 0 && <span style={{ color: "#059669", fontWeight: 700, marginLeft: "3px" }}>(Disc: -{formatTk(discount)})</span>}
                          </small>
                          <div style={{ marginTop: "3px" }}>
                            {due > 0 ? (
                              <span style={{ fontSize: "10.5px", color: "#dc2626", fontWeight: 800, background: "#fef2f2", padding: "1px 6px", borderRadius: "3px", display: "inline-block" }}>
                                Due: {formatTk(due)}
                              </span>
                            ) : (
                              <span style={{ fontSize: "10.5px", color: "#7c3aed", fontWeight: 800, background: "#f5f3ff", padding: "1px 6px", borderRadius: "3px", display: "inline-block" }}>
                                {advance > 0 ? `+ ${formatTk(advance)} Advance` : "Paid in Full"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {query.isLoading && <tr><td colSpan={12} className="country-design-empty">Loading candidates...</td></tr>}
              {!query.isLoading && data.length === 0 && <tr><td colSpan={12} className="country-design-empty">No candidates found matching criteria.</td></tr>}
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

              {/* Interview Drive Strip (if assigned) */}
              {(() => {
                const interviewDriveTitle = row.latestInterview?.title || (row.interviewOptions?.interviewSchedule && row.interviewOptions.interviewSchedule !== "—" ? row.interviewOptions.interviewSchedule : null);
                const rawInterviewStatus = row.latestInterview?.status || (row.interviewOptions?.interviewStatus && row.interviewOptions.interviewStatus !== "—" && row.interviewOptions.interviewStatus !== "Not Scheduled" ? row.interviewOptions.interviewStatus : null);
                const interviewStatus = rawInterviewStatus || (interviewDriveTitle ? "Waiting For Interview" : null);

                if (!interviewDriveTitle) return null;

                return (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 11px",
                    background: "#fdf4ff",
                    border: "1px solid #f5d0fe",
                    borderRadius: "9px",
                    margin: "4px 0 8px",
                    gap: "8px",
                  }}>
                    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px" }}>🎯</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#701a75", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {interviewDriveTitle}
                        </span>
                        <small style={{ color: "#a21caf", fontSize: "10px", fontWeight: 600 }}>Interview Drive</small>
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      flexShrink: 0,
                      ...interviewStatusStyle(interviewStatus),
                    }}>
                      {interviewStatus}
                    </span>
                  </div>
                );
              })()}

              {/* Processing File Stack */}
              {row.activeFile ? (
                <div className="candidate-mobile-file-strip">
                  <div className="candidate-mobile-file-meta">
                    <span style={{ fontSize: "14px" }}>📁</span>
                    <span className="candidate-mobile-file-no">{row.activeFile.fileNo}</span>
                    <span className="candidate-mobile-file-company">{row.activeFile.company}</span>
                  </div>
                </div>
              ) : (
                <div className="candidate-mobile-file-strip empty">
                  <span className="candidate-mobile-no-file-text">Awaiting Overseas File Opening</span>
                </div>
              )}

              {/* Financial Ledger Mobile Strip */}
              {(() => {
                const gross = Number(row.contractPackage || row.packageCost) || (/dubai/i.test(row.rawCountry || row.preferredCountry) ? 300000 : 350000);
                const discount = Number(row.discount || 0);
                const pkgCost = row.packageCost !== undefined ? row.packageCost : Math.max(0, gross - discount);
                const paid = row.totalPaid || 0;
                const due = row.dueAmount !== undefined ? row.dueAmount : Math.max(0, pkgCost - paid);
                const advance = Math.max(0, paid - pkgCost);

                return (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 11px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "9px",
                    margin: "5px 0 8px",
                    gap: "8px",
                  }}>
                    <div>
                      <span style={{ display: "block", fontSize: "10px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        Financial Ledger
                      </span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "1px" }}>
                        <b style={{ fontSize: "12.5px", color: paid > 0 ? "#059669" : "#1d1d1f", fontWeight: 700 }}>
                          {formatTk(paid)}
                        </b>
                        <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                          / {formatTk(pkgCost)}
                        </small>
                      </div>
                    </div>
                    <div>
                      {due > 0 ? (
                        <span style={{ fontSize: "10.5px", color: "#dc2626", fontWeight: 800, background: "#fef2f2", padding: "2px 7px", borderRadius: "4px", display: "inline-block" }}>
                          Due: {formatTk(due)}
                        </span>
                      ) : (
                        <span style={{ fontSize: "10.5px", color: "#7c3aed", fontWeight: 800, background: "#f5f3ff", padding: "2px 7px", borderRadius: "4px", display: "inline-block" }}>
                          {advance > 0 ? `+ ${formatTk(advance)} Adv` : "Paid in Full"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                <span className="candidate-mobile-src">
                  Agent:{" "}
                  {(() => {
                    const agentName = row.agent && !/^(direct|direct walk-in)$/i.test(row.agent)
                      ? row.agent
                      : (row.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(row.source)
                        ? row.source
                        : "Direct Office");
                    const isAgency = (row.agent && !/^(direct|direct walk-in)$/i.test(row.agent)) ||
                      (row.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(row.source));
                    const targetUrl = isAgency
                      ? (row.agentId ? `/agent/${row.agentId}` : `/agent/${encodeURIComponent(agentName)}`)
                      : `/agents`;

                    return (
                      <Link
                        href={targetUrl}
                        className="hover:underline font-semibold"
                        style={{ color: isAgency ? "#007aff" : "inherit", textDecoration: "none" }}
                        title={isAgency ? `Open Agent Profile: ${agentName}` : "View Agents"}
                      >
                        {agentName}
                      </Link>
                    );
                  })()}
                </span>
                <div className="candidate-mobile-actions">
                  <button data-action-ui="secondary" data-action-size="normal"
                    type="button"
                    className="candidate-mobile-btn details"
                    onClick={() => openCandidateProfile(row)}
                  >
                    <Eye size={14} /> Details
                  </button>
                  <Link data-action-ui="secondary" data-action-size="normal"
                    href={`/candidate/${row.id}/cv`}
                    className="candidate-mobile-btn cv"
                    style={{ textDecoration: "none" }}
                    title="Generate & Download CV"
                  >
                    <FileText size={14} /> Generate CV
                  </Link>
                  {Boolean(/saudi/i.test(row.preferredCountry || "")) && (
                    <Link data-action-ui="secondary" data-action-size="normal"
                      href={`/candidate/${row.id}/mofa`}
                      className="candidate-mobile-btn mofa"
                      style={{ textDecoration: "none" }}
                      title="Generate Saudi Embassy MOFA Form"
                    >
                      <FileCheck size={14} /> MOFA
                    </Link>
                  )}
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
                    {(() => {
                      const agentName = selectedCandidate.agent && !/^(direct|direct walk-in)$/i.test(selectedCandidate.agent)
                        ? selectedCandidate.agent
                        : (selectedCandidate.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(selectedCandidate.source)
                          ? selectedCandidate.source
                          : "Direct Office");
                      const isAgency = (selectedCandidate.agent && !/^(direct|direct walk-in)$/i.test(selectedCandidate.agent)) ||
                        (selectedCandidate.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(selectedCandidate.source));
                      const targetUrl = isAgency
                        ? (selectedCandidate.agentId ? `/agent/${selectedCandidate.agentId}` : `/agent/${encodeURIComponent(agentName)}`)
                        : `/agents`;

                      return (
                        <>
                          Registered on {formatDate(selectedCandidate.createdAt)} · Agent:{" "}
                          <Link
                            href={targetUrl}
                            style={{ color: isAgency ? "#007aff" : "inherit", textDecoration: "none" }}
                            className="hover:underline font-bold"
                            title={isAgency ? `Open ${agentName} Profile` : "View Agents Directory"}
                          >
                            {agentName}
                          </Link>
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Link
                  data-action-ui="primary"
                  data-action-size="compact"
                  href={`/candidate/${selectedCandidate.id}/cv`}
                  style={{ textDecoration: "none" }}
                  title="Generate and Download CV"
                >
                  <FileText size={12} /> Generate CV
                </Link>
                {Boolean(/saudi/i.test(selectedCandidate.preferredCountry || "")) && (
                  <Link
                    data-action-ui="secondary"
                    data-action-size="compact"
                    href={`/candidate/${selectedCandidate.id}/mofa`}
                    style={{ textDecoration: "none" }}
                    title="Generate Saudi Embassy MOFA Form"
                  >
                    <FileCheck size={12} /> Generate MOFA
                  </Link>
                )}
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
                  <div>
                    <span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Agent / Partner:</span>
                    {(() => {
                      const agentName = selectedCandidate.agent && !/^(direct|direct walk-in)$/i.test(selectedCandidate.agent)
                        ? selectedCandidate.agent
                        : (selectedCandidate.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(selectedCandidate.source)
                          ? selectedCandidate.source
                          : "Direct Office");
                      const isAgency = (selectedCandidate.agent && !/^(direct|direct walk-in)$/i.test(selectedCandidate.agent)) ||
                        (selectedCandidate.source && !/^(direct|direct walk-in|website|walk-in)$/i.test(selectedCandidate.source));
                      const targetUrl = isAgency
                        ? (selectedCandidate.agentId ? `/agent/${selectedCandidate.agentId}` : `/agent/${encodeURIComponent(agentName)}`)
                        : `/agents`;

                      return (
                        <Link
                          href={targetUrl}
                          style={{
                            color: isAgency ? "#007aff" : "inherit",
                            textDecoration: "none",
                            fontWeight: 700,
                          }}
                          className="hover:underline"
                          title={isAgency ? `Open ${agentName} Profile` : "View Agents Directory"}
                        >
                          {agentName}
                        </Link>
                      );
                    })()}
                  </div>
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
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b21a8", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Progress Stages ({selectedCandidate.preferredCountry}) — Click any stage to preview info</span>
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
                          const isSelected = (activeStageTab || selectedCandidate.activeFile?.currentStage || "").toLowerCase() === thisStageNorm;

                          return (
                            <button
                              type="button"
                              key={st}
                              onClick={() => setActiveStageTab(st)}
                              title={`Click to preview ${st} stage details (in-modal)`}
                              style={{
                                flexShrink: 0,
                                display: "inline-flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                background: isSelected ? "#1e1b4b" : isDone ? "#ecfdf5" : "#f8fafc",
                                border: isSelected ? "2px solid #6366f1" : isCurrent ? "2px solid #1e1b4b" : isDone ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                                color: isSelected ? "#fff" : isDone ? "#065f46" : "#64748b",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: 700,
                                minWidth: "82px",
                                textAlign: "center",
                                transition: "all 0.15s ease",
                                boxShadow: isSelected ? "0 2px 8px rgba(30, 27, 75, 0.25)" : "none",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "10px", opacity: isSelected ? 0.9 : 0.6 }}>#{idx + 1}</span>
                                {isDone ? (
                                  <CheckCircle2 size={12} color={isSelected ? "#34d399" : "#059669"} />
                                ) : isCurrent ? (
                                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isSelected ? "#818cf8" : "#4338ca", display: "inline-block" }} />
                                ) : (
                                  <Clock size={10} color={isSelected ? "#cbd5e1" : "#94a3b8"} />
                                )}
                              </div>
                              <span style={{ whiteSpace: "nowrap" }}>{st}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Active Selected Stage Preview Card */}
                  {(() => {
                    const activeTab = activeStageTab || selectedCandidate.activeFile.currentStage;
                    const stages = getCountryStages(selectedCandidate.preferredCountry).filter((st) => !["Hold File", "No File", "Visa Hold"].includes(st));
                    const currentStageNorm = (selectedCandidate.activeFile?.currentStage || "").toLowerCase();
                    const activeStageNorm = activeTab.toLowerCase();
                    const currentIdx = stages.findIndex((x) => x.toLowerCase() === currentStageNorm);
                    const activeIdx = stages.findIndex((x) => x.toLowerCase() === activeStageNorm);
                    const isDone = currentIdx !== -1 ? activeIdx < currentIdx || selectedCandidate.activeFile?.status === "COMPLETED" : false;
                    const isCurrent = activeStageNorm === currentStageNorm;

                    return (
                      <div style={{ background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1.5px solid #d8b4fe", marginBottom: "12px", boxShadow: "0 2px 6px rgba(124, 58, 237, 0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f3e8ff", paddingBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#3b0764", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <Layers size={14} color="#7c3aed" /> Stage #{activeIdx + 1}: {activeTab}
                            </span>
                            {isCurrent ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 7px", borderRadius: "999px", fontSize: "10.5px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                                ● Current In-Progress
                              </span>
                            ) : isDone ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#ecfdf5", color: "#059669", padding: "2px 7px", borderRadius: "999px", fontSize: "10.5px", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                                ✓ Completed
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "#f8fafc", color: "#64748b", padding: "2px 7px", borderRadius: "999px", fontSize: "10.5px", fontWeight: 700, border: "1px solid #e2e8f0" }}>
                                ⏱ Upcoming Stage
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/file/${selectedCandidate.activeFile.id}?stage=${encodeURIComponent(activeTab)}`}
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#6d28d9",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              background: "#faf5ff",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #e9d5ff",
                            }}
                            title={`Open ${activeTab} in File Processing Workspace`}
                          >
                            Open in Pipeline ➔
                          </Link>
                        </div>

                        {/* Stage Specific Fields */}
                        {(() => {
                          const details = selectedCandidate.activeFile.stageDetails?.[activeTab] || {};
                          const stageNorm = activeTab.toLowerCase();

                          const rowStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "2px" };
                          const labelStyle: React.CSSProperties = { color: "#6b21a8", fontSize: "11px", fontWeight: 600 };
                          const valStyle: React.CSSProperties = { color: "#1e1b4b", fontSize: "12.5px", fontWeight: 700 };

                          if (stageNorm.includes("passport")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Passport Number:</span><b style={valStyle}>{String(details.number || selectedCandidate.passportNo || "—")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Verification Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || "Verified")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Issue Date:</span><b style={valStyle}>{String(details.issueDate || "2023-10-29")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Expiry Date:</span><b style={valStyle}>{String(details.expiryDate || "2033-10-28")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Issuing Authority:</span><b style={valStyle}>{String(details.authority || "DIP/DHAKA")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Place of Issue:</span><b style={valStyle}>DHAKA</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("medical")) {
                            const isFit = /fit/i.test(String(details.result || selectedCandidate.activeFile.medicalResult || ""));
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}>
                                  <span style={labelStyle}>Medical Fitness:</span>
                                  <b style={{ ...valStyle, color: isFit ? "#059669" : "#d97706" }}>
                                    {String(details.result || selectedCandidate.activeFile.medicalResult || "Pending / In Progress")}
                                  </b>
                                </div>
                                <div style={rowStyle}><span style={labelStyle}>Medical Center:</span><b style={valStyle}>{String(details.center || "Ibn Sina GCC Medical Center, Dhaka")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Test / Report Date:</span><b style={valStyle}>{String(details.testDate || "2026-11-03")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Validity Expiry:</span><b style={valStyle}>{String(details.expiryDate || "2027-02-01")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("mofa")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>MOFA Number:</span><b style={valStyle}>{String(details.mofaNumber || "Pending MOFA Entry")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>MOFA Status:</span><b style={{ ...valStyle, color: /done|approved|ready/i.test(String(details.status || "")) ? "#059669" : "#d97706" }}>{String(details.status || "Pending")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Submit Date:</span><b style={valStyle}>{String(details.submitDate || "—")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Done Date:</span><b style={valStyle}>{String(details.doneDate || "—")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("takamul") || stageNorm.includes("skill")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Takamul Profession:</span><b style={valStyle}>{String(details.profession || selectedCandidate.profession || "Electrician")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Assessment Result:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.reportStatus || "Selected (Passed)")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Registration No:</span><b style={valStyle}>{String(details.regNo || "—")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Certificate No:</span><b style={valStyle}>{String(details.certNo || "—")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("finger") || stageNorm.includes("bio")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Biometrics Status:</span><b style={{ ...valStyle, color: /done|completed|approved/i.test(String(details.status || "")) ? "#059669" : "#6366f1" }}>{String(details.status || "Scheduled / Pending")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Biometric Center:</span><b style={valStyle}>{String(details.center || "VFS Global / GCC Bio Center")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Appointment Date:</span><b style={valStyle}>{String(details.date || "Scheduled")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Fingerprint Type:</span><b style={valStyle}>Ten Finger Biometric</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("police")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Police Clearance Result:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.result || "Clear / Verified")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Clearance Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || "Approved")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Application Number:</span><b style={valStyle}>{String(details.appNo || "PCC-FILE-KSA-001")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Issue Date:</span><b style={valStyle}>{String(details.issueDate || "2026-11-03")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("first payment")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Payment Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || "Deposited")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Total Deposited:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.totalPaid || `৳ ${selectedCandidate.totalPaid.toLocaleString("en-IN")}`)}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Balance Remaining:</span><b style={{ ...valStyle, color: (selectedCandidate.dueAmount ?? 0) > 0 ? "#e11d48" : "#059669" }}>{String(details.dueAmount || `৳ ${(selectedCandidate.dueAmount ?? 0).toLocaleString("en-IN")}`)}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Package Category:</span><b style={valStyle}>{String(details.packageTitle || "General Work Visa")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("visa")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Visa Number:</span><b style={valStyle}>{String(details.visaNumber || "VISA-KSA-SA-001")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Visa Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || selectedCandidate.activeFile.visaResult || "Visa Done")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Issue Date:</span><b style={valStyle}>{String(details.issueDate || "2026-11-03")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Expiry Date:</span><b style={valStyle}>{String(details.expiryDate || "2027-02-01")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("second payment")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Second Payment Status:</span><b style={{ ...valStyle, color: (selectedCandidate.dueAmount ?? 0) === 0 ? "#059669" : "#e11d48" }}>{String(details.status || ((selectedCandidate.dueAmount ?? 0) === 0 ? "Fully Paid" : "Due"))}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Paid Amount:</span><b style={{ ...valStyle, color: "#059669" }}>৳ {selectedCandidate.totalPaid.toLocaleString("en-IN")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Due Balance:</span><b style={{ ...valStyle, color: (selectedCandidate.dueAmount ?? 0) > 0 ? "#e11d48" : "#059669" }}>৳ {(selectedCandidate.dueAmount ?? 0).toLocaleString("en-IN")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("manpower") || stageNorm.includes("bmet")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>BMET Smart Card / Ref:</span><b style={valStyle}>{String(details.smartCardNo || "BMET-CARD-SA-001")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Manpower Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || selectedCandidate.activeFile.manpowerResult || "Approved")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Sponsoring Company:</span><b style={valStyle}>{String(details.company || selectedCandidate.activeFile.company || "Almarai")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Approval Date:</span><b style={valStyle}>{String(details.approvedAt || "2026-11-03")}</b></div>
                              </div>
                            );
                          }

                          if (stageNorm.includes("flight") || stageNorm.includes("ticket")) {
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={rowStyle}><span style={labelStyle}>Flight / Ticket Status:</span><b style={{ ...valStyle, color: "#059669" }}>{String(details.status || "Flight Ready")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>E-Ticket Number:</span><b style={valStyle}>{String(details.ticketNo || "TKT-95033370")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Baggage Allowance:</span><b style={valStyle}>{String(details.baggage || "30 kg Check-in + 7 kg Cabin")}</b></div>
                                <div style={rowStyle}><span style={labelStyle}>Destination:</span><b style={valStyle}>{selectedCandidate.preferredCountry}</b></div>
                              </div>
                            );
                          }

                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                              <div style={rowStyle}><span style={labelStyle}>Stage Name:</span><b style={valStyle}>{activeTab}</b></div>
                              <div style={rowStyle}><span style={labelStyle}>Stage Status:</span><b style={{ ...valStyle, color: isCurrent ? "#059669" : "#6b7280" }}>{isCurrent ? "Active In-Progress" : "Upcoming"}</b></div>
                              <div style={rowStyle}><span style={labelStyle}>Associated File:</span><b style={valStyle}>{selectedCandidate.activeFile.fileNo}</b></div>
                              <div style={rowStyle}><span style={labelStyle}>Assigned Officer:</span><b style={valStyle}>{selectedCandidate.activeFile.officer}</b></div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Overall File & Financial Summary Strip */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div><span style={{ color: "#6b21a8", display: "block", fontSize: "10.5px" }}>File Number:</span><b>{selectedCandidate.activeFile.fileNo}</b></div>
                    <div><span style={{ color: "#6b21a8", display: "block", fontSize: "10.5px" }}>Assigned Officer:</span><b>{selectedCandidate.activeFile.officer}</b></div>
                    <div><span style={{ color: "#6b21a8", display: "block", fontSize: "10.5px" }}>Total Deposited:</span><b style={{ color: "#059669" }}>৳ {selectedCandidate.totalPaid.toLocaleString("en-IN")}</b></div>
                    <div><span style={{ color: "#6b21a8", display: "block", fontSize: "10.5px" }}>Balance Due:</span><b style={{ color: (selectedCandidate.dueAmount ?? 0) > 0 ? "#e11d48" : "#059669" }}>৳ {(selectedCandidate.dueAmount ?? 0).toLocaleString("en-IN")}</b></div>
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
                    <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#86198f", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
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
                      style={{ padding: "6px 11px", borderRadius: "7px", border: "1px solid #e9d5ff", background: "#fff", color: "#86198f", fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
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
                            workSubCategory: selectedCandidate.interviewOptions?.workSubCategory || selectedCandidate.profession || "",
                            company: selectedCandidate.interviewOptions?.company || selectedCandidate.activeFile?.company || "",
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
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none", background: "#86198f", color: "#fff", fontSize: "11.5px", fontWeight: 700, cursor: savingInterviewOptions ? "not-allowed" : "pointer", opacity: savingInterviewOptions ? 0.65 : 1 }}
                      >
                        <Save size={13} /> {savingInterviewOptions ? "Saving..." : "Save options"}
                      </button>
                    </div>
                  </div>
                ) : selectedCandidate.latestInterview || Object.values(selectedCandidate.interviewOptions).some(Boolean) || selectedCandidate.profession || selectedCandidate.activeFile?.company ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Schedule:</span><b>{selectedCandidate.interviewOptions.interviewSchedule || selectedCandidate.latestInterview?.title || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interview Status:</span><b>{selectedCandidate.interviewOptions.interviewStatus || selectedCandidate.latestInterview?.status || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interview Date:</span><b>{formatDate(selectedCandidate.interviewOptions.interviewDate || selectedCandidate.latestInterview?.scheduledAt)}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Interested Company:</span><b>{selectedCandidate.interviewOptions.company || selectedCandidate.latestInterview?.company || selectedCandidate.activeFile?.company || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Work Category:</span><b>{selectedCandidate.interviewOptions.workCategory || profileCategory?.name || "—"}</b></div>
                    <div><span style={{ color: "#701a75", display: "block", fontSize: "11px" }}>Work Sub Category / Trade:</span><b>{selectedCandidate.interviewOptions.workSubCategory || selectedCandidate.profession || "—"}</b></div>
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

      {/* 7. BULK UPLOAD CANDIDATES MODAL */}
      <CandidateBulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["all-candidates-list"] });
        }}
      />
    </div>
  );
}
