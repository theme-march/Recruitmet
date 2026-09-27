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
    <div style={{ maxWidth: "1600px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* 1. PAGE HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Candidates / Candidate Directory
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>
            All Candidates Directory
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Central database of all registered candidates, overseas file pipelines, and interview registrations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={downloadCsv}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Download size={15} /> Export CSV
          </button>

          <Link
            href={moduleItemPath("call-center", "Create Candidate")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "12.5px",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
            }}
          >
            <Plus size={16} /> Create Candidate
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY KPI STATS CARDS */}
      <section className="responsive-kpi-grid" style={{ marginBottom: "18px" }}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
            <UsersRound size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Total Candidates</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--ink)" }}>{summary.totalCandidates}</div>
            <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>In System Registry</span>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center" }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>In File Processing</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#059669" }}>{summary.inProcessingFiles}</div>
            <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>Active Overseas Files</span>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fdf4ff", color: "#c026d3", display: "grid", placeItems: "center" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Interview Registrations</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#c026d3" }}>{summary.withInterviews}</div>
            <span style={{ fontSize: "11px", color: "#c026d3", fontWeight: 700 }}>Drives & Walk-ins</span>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f8fafc", color: "#64748b", display: "grid", placeItems: "center" }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Standalone Candidates</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--ink)" }}>{summary.withoutFiles}</div>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Awaiting File Open</span>
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC COUNTRY TABS (from Country Setup) */}
      <section className="scrollable-tabs-bar" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
        {[
          { id: "", label: "All Countries", flag: "🌍" },
          ...countries.map((cName) => ({
            id: cName,
            label: cName,
            flag: getCountryFlag(cName),
          })),
        ].map((c) => {
          const isSelected = country === c.id;
          return (
            <button
              key={c.id || "all"}
              type="button"
              onClick={() => handleSelectCountry(c.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "2px solid",
                borderColor: isSelected ? "#7258e8" : "var(--line)",
                background: isSelected ? "#7258e8" : "#fff",
                color: isSelected ? "#fff" : "var(--ink)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 2px 8px rgba(114,88,232,0.25)" : "none",
              }}
            >
              <span style={{ fontSize: "13px" }}>{c.flag}</span> {c.label}
            </button>
          );
        })}
      </section>

      {/* 4. SEARCH & FILTER CONTROLS */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
        <form onSubmit={handleSearch} className="candidate-search-form">
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Search Candidate
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, phone, passport, ID or file..."
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px 0 36px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  background: "#fafafd",
                  fontSize: "12.5px",
                  color: "var(--ink)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Candidate Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{
                height: "40px",
                padding: "0 12px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "#fafafd",
                fontSize: "12.5px",
                color: "var(--ink)",
                outline: "none",
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="HOLD">Hold</option>
              <option value="RETURNED">Returned</option>
            </select>
          </label>

          <div className="candidate-search-actions" style={{ display: "flex", gap: "8px" }}>
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                height: "40px",
                padding: "0 20px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                border: "none",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(114,88,232,0.25)",
              }}
            >
              <Search size={15} /> Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                height: "40px",
                padding: "0 14px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {/* 5. CANDIDATES DATA TABLE */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--shadow)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fbfbfd", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--ink)" }}>
            Showing {data.length > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0} to{" "}
            {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} candidates
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Rows per page:</span>
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
                fontWeight: 700,
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

        <div className="table-responsive-container" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "50px" }}>SL</th>
                <th style={{ padding: "12px 14px", width: "100px" }}>Action</th>
                <th style={{ padding: "12px 14px" }}>Candidate</th>
                <th style={{ padding: "12px 14px" }}>Contact</th>
                <th style={{ padding: "12px 14px" }}>Passport / NID</th>
                <th style={{ padding: "12px 14px" }}>Target Country</th>
                <th style={{ padding: "12px 14px" }}>Trade / Profession</th>
                <th style={{ padding: "12px 14px" }}>Processing File</th>
                <th style={{ padding: "12px 14px" }}>Recruitment Stage</th>
                <th style={{ padding: "12px 14px" }}>Source</th>
              </tr>
            </thead>
            <tbody style={{ opacity: query.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {data.map((row, index) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                    {(meta.page - 1) * meta.pageSize + index + 1}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => openCandidateProfile(row)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          background: "#f0edff",
                          border: "1px solid #dcd5fb",
                          color: "#7258e8",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={12} /> Details
                      </button>

                      {row.activeFile && (
                        <Link
                          href={`/file/${row.activeFile.id}?view=pipeline`}
                          title="Open Interactive Stage Processing Pipeline"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            background: "#7258e8",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 800,
                            textDecoration: "none",
                            boxShadow: "0 2px 4px rgba(114,88,232,0.25)",
                          }}
                        >
                          <Layers size={11} /> ⚡ Pipeline
                        </Link>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          color: "#4338ca",
                          fontSize: "12px",
                          fontWeight: 800,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        {row.profileImageUrl ? (
                          <img
                            src={row.profileImageUrl}
                            alt={row.fullName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          row.fullName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <b style={{ color: "var(--ink)", fontSize: "13px", display: "block" }}>{row.fullName}</b>
                        <small style={{ color: "#7258e8", fontWeight: 700, fontSize: "11px" }}>{row.candidateNo}</small>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)" }}>{row.phone}</div>
                    <small style={{ color: "var(--muted)", fontSize: "11px" }}>{row.district || "—"}</small>
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: row.passportNo !== "—" ? "#0f172a" : "var(--muted)" }}>
                      {row.passportNo}
                    </div>
                    {row.nationalId !== "—" && (
                      <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>NID: {row.nationalId}</small>
                    )}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "var(--ink)" }}>
                      {getCountryFlag(row.preferredCountry)} {row.preferredCountry}
                    </span>
                  </td>

                  <td style={{ padding: "12px 14px", fontWeight: 600, color: "#334155" }}>
                    {row.profession}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    {row.activeFile ? (
                      <div>
                        <Link
                          href={`/file/${row.activeFile.id}`}
                          style={{
                            fontWeight: 800,
                            color: "#7258e8",
                            textDecoration: "none",
                            fontSize: "12px",
                            background: "#f5f3ff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            display: "inline-block",
                          }}
                        >
                          {row.activeFile.fileNo}
                        </Link>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          {row.activeFile.company}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11.5px", color: "var(--muted)", fontStyle: "italic" }}>
                        No File Yet
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    {row.activeFile ? (
                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "#ecfdf5",
                            color: "#059669",
                          }}
                        >
                          <CheckCircle2 size={13} /> {row.activeFile.currentStage}
                        </div>

                        {/* File Action Condition Indicators */}
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                          {row.activeFile.medicalResult && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: /fit/i.test(row.activeFile.medicalResult) ? "#dcfce7" : "#fee2e2",
                                color: /fit/i.test(row.activeFile.medicalResult) ? "#15803d" : "#b91c1c",
                              }}
                            >
                              Med: {row.activeFile.medicalResult}
                            </span>
                          )}
                          {row.activeFile.visaResult && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#e0e7ff",
                                color: "#4338ca",
                              }}
                            >
                              Visa: {row.activeFile.visaResult}
                            </span>
                          )}
                          {row.activeFile.manpowerResult && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#fef3c7",
                                color: "#b45309",
                              }}
                            >
                              BMET: {row.activeFile.manpowerResult}
                            </span>
                          )}
                          {row.totalPaid > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                color: "#475569",
                              }}
                            >
                              ৳ {(row.totalPaid / 1000).toFixed(0)}k Paid
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "#f1f5f9",
                          color: "#64748b",
                        }}
                      >
                        Registered (No File)
                      </span>
                    )}
                  </td>

                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                      {row.source || "Direct"}
                    </span>
                  </td>
                </tr>
              ))}

              {!query.isLoading && data.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                    <UsersRound size={36} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No candidates found matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
            Page {meta.page} of {meta.totalPages}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: page <= 1 ? "#f8fafc" : "#fff",
                color: page <= 1 ? "#cbd5e1" : "var(--ink)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: page >= meta.totalPages ? "#f8fafc" : "#fff",
                color: page >= meta.totalPages ? "#cbd5e1" : "var(--ink)",
                cursor: page >= meta.totalPages ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 6. CANDIDATE 360° DETAILS MODAL */}
      {selectedCandidate && (
        <div
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
          <div
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
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "#fafafd", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
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
                    <span style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", padding: "3px 8px", borderRadius: "6px" }}>
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

              <button
                onClick={() => setSelectedCandidate(null)}
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
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
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
              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href={`tel:${selectedCandidate.phone.replace(/[^+\d]/g, "")}`}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#059669",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    textDecoration: "none",
                  }}
                >
                  <Phone size={15} /> Call Candidate
                </a>

                {selectedCandidate.activeFile ? (
                  <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                    <Link
                      href={`/file/${selectedCandidate.activeFile.id}?view=pipeline`}
                      style={{
                        flex: 1.3,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "#7258e8",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "12.5px",
                        textDecoration: "none",
                        boxShadow: "0 2px 8px rgba(114, 88, 232, 0.3)",
                      }}
                    >
                      <Layers size={15} /> ⚡ Open Stage Processing Pipeline
                    </Link>
                    <Link
                      href={`/file/${selectedCandidate.activeFile.id}?view=dossier`}
                      style={{
                        flex: 0.7,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "#f0edff",
                        color: "#7258e8",
                        border: "1px solid #dcd5fb",
                        fontWeight: 700,
                        fontSize: "12px",
                        textDecoration: "none",
                      }}
                    >
                      <Sparkles size={14} /> Master Dossier
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={moduleItemPath("call-center", "Create Candidate")}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "#7258e8",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "12.5px",
                      textDecoration: "none",
                    }}
                  >
                    <Plus size={15} /> Open File
                  </Link>
                )}
              </div>

              {/* Basic Information */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
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
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
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
                <div style={{ background: "#f5f3ff", padding: "16px", borderRadius: "12px", border: "1px solid #ddd6fe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, color: "#5b21b6", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layers size={14} /> Stage Processing Pipeline (Interactive Workflow)
                    </h3>
                    <Link
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
                  <div style={{ background: "#fff", padding: "12px", borderRadius: "10px", border: "1px solid #e9d5ff", marginBottom: "14px" }}>
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
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px dashed var(--line)", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)", fontWeight: 600 }}>
                    Candidate is registered in system but has no active overseas processing file opened yet.
                  </p>
                </div>
              )}

              {/* Interview & Drive Options — optional at registration, editable here later */}
              <div style={{ background: "#fdf4ff", padding: "16px", borderRadius: "12px", border: "1px solid #f5d0fe" }}>
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
                    <button
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
                      <button
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
                      <button
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
                  <div style={{ padding: "12px", borderRadius: "9px", border: "1px dashed #e9d5ff", background: "rgba(255,255,255,0.65)", color: "#a21caf", fontSize: "12px", fontWeight: 600, textAlign: "center" }}>
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
