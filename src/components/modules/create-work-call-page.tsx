"use client";

import { Calendar, Check, ChevronDown, ChevronUp, List, Plus, Send, Sparkles, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";
import { getCountryFlagEmoji } from "@/components/modules/country-management-page";
import { CandidateProfileImageField } from "@/components/modules/candidate-profile-image-field";

type Schedule = {
  id: string;
  title: string;
  company?: string | null;
  profession?: string | null;
  scheduledAt: string;
  venue?: string | null;
};

type AgentOption = {
  id: string;
  code: string;
  name: string;
  phone: string;
  district: string;
};

type CandidateCategoryOption = {
  id: string;
  code: string;
  name: string;
  professions: Array<{ id: string; code: string; name: string; categoryId: string }>;
};

type CandidateCompanyOption = { id: string; code: string; name: string; country: string };
type CandidateStatusOption = { id: string; code: string; name: string; sortOrder: number };

export function CreateWorkCallPage({ officerName }: { officerName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [companies, setCompanies] = useState<CandidateCompanyOption[]>([]);
  const [categories, setCategories] = useState<CandidateCategoryOption[]>([]);
  const [fileStatuses, setFileStatuses] = useState<CandidateStatusOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [interviewSectionOpen, setInterviewSectionOpen] = useState(true);

  // Controlled Interview Option Auto-fill States
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [interviewStatus, setInterviewStatus] = useState("");
  const [fileStatus, setFileStatus] = useState("");

  const [candidatePhotoFile, setCandidatePhotoFile] = useState<File | null>(null);
  const [candidateFullName, setCandidateFullName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Saudi Arabia");
  const [customCountry, setCustomCountry] = useState("");
  const [phones, setPhones] = useState([""]);
  const [dob, setDob] = useState("");
  const [workerComments, setWorkerComments] = useState([""]);
  const [executiveComments, setExecutiveComments] = useState([""]);
  const [adminComments, setAdminComments] = useState([""]);

  const age = useMemo(() => {
    if (!dob) return "";
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) years--;
    return String(Math.max(0, years));
  }, [dob]);

  const hasAutoFilledUrlRef = useState({ done: false })[0];

  const handleScheduleChange = (schId: string, showToast = true) => {
    setSelectedScheduleId(schId);
    if (!schId) return;

    const sch = schedules.find((s) => s.id === schId);
    if (sch) {
      // 1. Auto-fill Interview Date formatted for datetime-local
      if (sch.scheduledAt) {
        try {
          const d = new Date(sch.scheduledAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setInterviewDate(localIso);
        } catch (e) {}
      }

      // 2. Auto-fill Company
      if (sch.company) {
        setSelectedCompany(sch.company);
      }

      // 3. Auto-fill Work Category & Sub-Category
      if (sch.profession) {
        setSelectedSubCategory(sch.profession);
        const configuredCategory = categories.find((category) =>
          category.professions.some((profession) => profession.name === sch.profession),
        );
        if (configuredCategory) setSelectedCategory(configuredCategory.name);
        else if (/driver|rider/i.test(sch.profession)) setSelectedCategory("Driver");
        else if (/electrician|plumber|technician|fitter|welder/i.test(sch.profession)) setSelectedCategory("Technician");
        else if (/construction|steel|mason|carpenter/i.test(sch.profession)) setSelectedCategory("Construction");
        else if (/clean|packaging|helper|indoor/i.test(sch.profession)) setSelectedCategory("Indoor Worker");
        else if (/hospitality|hotel|waiter|cook/i.test(sch.profession)) setSelectedCategory("Hospitality");
        else setSelectedCategory("Technician");
      }

      // 4. Auto-fill Interview Status & File Status
      setInterviewStatus("Waiting For Interview");
      setFileStatus("Pre-Confirmed");

      if (showToast) {
        toast.success(`Auto-filled details for "${sch.title}"`, {
          id: "schedule-autofill",
          icon: "✨",
        });
      }
    }
  };

  const [dbCountries, setDbCountries] = useState<Array<{ id: string; name: string; code: string; active: boolean }>>([]);

  useEffect(() => {
    const urlScheduleId = searchParams.get("scheduleId") ?? "";
    if (urlScheduleId) setSelectedScheduleId(urlScheduleId);

    void fetch("/api/countries")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        if (body?.data?.length) {
          setDbCountries(body.data.filter((c: any) => c.active));
        }
      });

    void fetch("/api/agents?pageSize=100")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        if (body?.data?.length) {
          setAgents(body.data);
        }
      });

    void fetch("/api/interviews?pageSize=100")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((body) => {
        if (body.data?.length) {
          setSchedules(body.data);
          if (urlScheduleId && !hasAutoFilledUrlRef.done) {
            hasAutoFilledUrlRef.done = true;
            const match = (body.data as Schedule[]).find((s) => s.id === urlScheduleId);
            if (match) {
              handleScheduleChange(urlScheduleId, false);
            }
          }
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    void fetch(`/api/candidate-options?country=${encodeURIComponent(selectedCountry)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Could not load candidate options");
        return body.data;
      })
      .then((data) => {
        if (cancelled) return;
        const nextCategories = (data?.categories ?? []) as CandidateCategoryOption[];
        const nextCompanies = (data?.companies ?? []) as CandidateCompanyOption[];
        const nextStatuses = (data?.fileStatuses ?? []) as CandidateStatusOption[];
        setCategories(nextCategories);
        setCompanies(nextCompanies);
        setFileStatuses(nextStatuses);
        setSelectedCategory((current) =>
          nextCategories.some((category) => category.name === current) ? current : "",
        );
        setSelectedSubCategory((current) =>
          nextCategories.some((category) =>
            category.professions.some((profession) => profession.name === current),
          )
            ? current
            : "",
        );
        setSelectedCompany((current) =>
          nextCompanies.some((company) => company.name === current) ? current : "",
        );
        setFileStatus((current) =>
          nextStatuses.some((status) => status.name === current) ? current : "",
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setCategories([]);
        setCompanies([]);
        setFileStatuses([]);
        toast.error(error instanceof Error ? error.message : "Could not load candidate options");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  const handleQuickCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingAgent(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        name: String(form.get("agentName") || "").trim(),
        contactPerson: String(form.get("contactPerson") || "").trim() || undefined,
        phone: String(form.get("phone") || "").trim(),
        country: String(form.get("district") || "").trim() || "Dhaka",
        status: "Active",
      };

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create agent");

      const created = json.data;
      const newOption: AgentOption = {
        id: created.id,
        code: created.code,
        name: created.name,
        phone: created.phone,
        district: created.country || "Dhaka",
      };
      setAgents((prev) => [newOption, ...prev]);
      setSelectedAgent(created.name);
      setShowAgentModal(false);
      toast.success(`Agent "${created.name}" created & assigned!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent");
    } finally {
      setCreatingAgent(false);
    }
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, unknown>;
    payload.country = selectedCountry;
    payload.interviewOption = [
      selectedScheduleId,
      interviewDate,
      selectedCompany,
      selectedCategory,
      selectedSubCategory,
      interviewStatus,
      fileStatus,
    ].some(Boolean)
      ? "With Interview"
      : "";
    payload.agent = selectedAgent || String(form.get("agent") || "") || "Direct";
    payload.callSource = selectedAgent ? "Agent Partner" : "Direct";
    payload.priority = 3;
    payload.callPurpose = "Overseas Employment";
    payload.behaviorTag = "Highly Interested";
    payload.callStatus = "New";
    payload.officeVisit = "Scheduled";
    payload.proposedRate = "350000";
    payload.additionalPhones = phones.filter(Boolean);
    payload.workerComments = workerComments;
    payload.executiveComments = executiveComments;
    payload.adminComments = adminComments;

    const response = await fetch("/api/work-calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setSaving(false);
      toast.error(body.error?.message ?? body.error ?? "Could not create candidate");
      return;
    }

    if (candidatePhotoFile && body.data?.candidateId) {
      try {
        const photoForm = new FormData();
        photoForm.set("file", candidatePhotoFile);
        const photoRes = await fetch(`/api/candidates/${body.data.candidateId}/photo`, {
          method: "POST",
          body: photoForm,
        });
        if (!photoRes.ok) {
          const photoJson = await photoRes.json();
          console.error("Photo upload warning:", photoJson.error?.message);
        }
      } catch (photoErr) {
        console.error("Photo upload network error:", photoErr);
      }
    }

    setSaving(false);
    toast.success(`Candidate ${body.data?.leadNo ? `(${body.data.leadNo})` : ""} registered successfully!`);
    router.push(moduleItemPath("call-center", "Registration & interviews"));
  }

  const categoryOptions = categories.map((category) => category.name);
  const selectedCategoryOption = categories.find(
    (category) => category.name === selectedCategory,
  );
  const interviewProfessionList = [
    ...new Set([
      ...(selectedCategoryOption?.professions.map((row) => row.name) ??
        categories.flatMap((category) => category.professions.map((row) => row.name))),
      ...schedules.map((schedule) => schedule.profession).filter((value): value is string => Boolean(value)),
    ]),
  ];
  const interviewCompanyList = [
    ...new Set([
      ...companies.map((company) => company.name),
      ...schedules.map((schedule) => schedule.company).filter((value): value is string => Boolean(value)),
    ]),
  ];

  return (
    <div className="work-call-page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div className="page-head compact" style={{ marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Candidates / Create Candidate
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Create Candidate</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Register and onboard a new candidate with interview preferences and target country pipeline.</p>
        </div>
        <Link
          prefetch={true}
          href={moduleItemPath("call-center", "Registration & interviews")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 16px",
            borderRadius: "10px",
            background: "#f0edff",
            border: "1px solid #dcd5fb",
            color: "#7258e8",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <List size={16} /> Registration &amp; Interviews
        </Link>
      </div>

      <form className="work-call-form" onSubmit={submit} style={{ display: "grid", gap: "18px" }}>
        {/* 1. INTERVIEW & DRIVE OPTIONS */}
        <section
          className="work-form-section"
          style={{
            background: "#fff",
            border: "1px solid #e8e5f1",
            borderRadius: "16px",
            padding: "24px 26px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: interviewSectionOpen ? "18px" : 0,
              borderBottom: interviewSectionOpen ? "1px solid #f1edf8" : "none",
              paddingBottom: interviewSectionOpen ? "14px" : 0,
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede8ff 100%)",
                  border: "1px solid #e0d7fe",
                  color: "#7258e8",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Calendar size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  1. Interview &amp; Drive Options <span style={{ background: "#f3f0ff", color: "#7258e8", border: "1px solid #ddd6fe", padding: "2px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>(Optional)</span>
                </h2>
                <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: "12.5px" }}>
                  Skip this section now if not applicable. These details can also be added or updated later from the candidate profile.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {selectedScheduleId && (
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#059669",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "4px 11px",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Sparkles size={13} /> Auto-filled from Schedule
                </span>
              )}
              <button
                type="button"
                onClick={() => setInterviewSectionOpen((open) => !open)}
                aria-expanded={interviewSectionOpen}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 13px",
                  borderRadius: "9px",
                  border: "1px solid #dcd5fb",
                  background: interviewSectionOpen ? "#fff" : "#f8f7ff",
                  color: "#7258e8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {interviewSectionOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {interviewSectionOpen ? "Hide Fields" : "Show Fields"}
              </button>
            </div>
          </div>

          {interviewSectionOpen && (
            <div style={{ display: "grid", gap: "18px" }}>
              {/* Interview Schedule - Prominent Feature Field */}
              <div
                style={{
                  background: "#fbfaff",
                  border: "1px solid #ede8f8",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <label
                    htmlFor="interviewScheduleId"
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "var(--ink)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Calendar size={15} color="#7258e8" /> Interview Schedule
                  </label>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Selecting a schedule automatically fills trade, company &amp; date
                  </span>
                </div>
                <select
                  id="interviewScheduleId"
                  name="interviewScheduleId"
                  value={selectedScheduleId}
                  onChange={(e) => handleScheduleChange(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "9px",
                    border: "1px solid #dcd5fb",
                    padding: "0 13px",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                >
                  <option value="">None / Open Candidate (Select Interview Schedule)</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title} · {new Date(schedule.scheduledAt).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6 Core Candidate Preference Fields */}
              <div className="work-form-grid" style={{ gap: "16px 20px" }}>
                <label>
                  <span>Interested Work Category</span>
                  <select
                    name="workCategory"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategory("");
                    }}
                    disabled={optionsLoading}
                  >
                    <option value="">Select Interested Work Category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Interested Work Sub Category / Trade</span>
                  <select
                    name="workSubCategory"
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                  >
                    <option value="">Select Interested Work Sub Category</option>
                    {interviewProfessionList.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Interested Company</span>
                  <select
                    name="company"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">Select Interested Company</option>
                    {interviewCompanyList.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Interview Date</span>
                  <input
                    name="interviewDate"
                    type="datetime-local"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                  />
                </label>

                <label>
                  <span>Interview Status</span>
                  <select
                    name="interviewStatus"
                    value={interviewStatus}
                    onChange={(e) => setInterviewStatus(e.target.value)}
                  >
                    <option value="">Select Interview Status</option>
                    <option value="Waiting For Interview">Waiting For Interview</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Absent">Absent</option>
                  </select>
                </label>

                <label>
                  <span>File Processing Status</span>
                  <select
                    name="fileStatus"
                    value={fileStatus}
                    onChange={(e) => setFileStatus(e.target.value)}
                  >
                    <option value="">Select File Status</option>
                    {fileStatuses.map((status) => (
                      <option key={status.id} value={status.name}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

            </div>
          )}
        </section>

        {/* 2. AGENT PARTNER ASSIGNMENT */}
        <section
          className="work-form-section"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #faf9ff 100%)",
            border: "1px solid #e2dcfb",
            borderRadius: "16px",
            padding: "22px 26px",
            boxShadow: "0 4px 20px rgba(91, 71, 180, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              paddingBottom: "14px",
              marginBottom: "16px",
              borderBottom: "1px solid #eeeafd",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #f0edff 0%, #e7e0ff 100%)",
                  border: "1px solid #dcd5fb",
                  color: "#7258e8",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  2. Link / Assign Agent Partner
                  <span style={{ background: "#f3f0ff", color: "#7258e8", border: "1px solid #ddd6fe", padding: "2px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>(Optional)</span>
                </h2>
                <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: "12.5px" }}>
                  Link this candidate to a registered agency partner or keep them as a direct office candidate.
                </p>
              </div>
            </div>

            <Link
              href="/module/agents"
              prefetch={true}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "9px",
                background: "#f0edff",
                color: "#7258e8",
                border: "1px solid #dcd5fb",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <UserPlus size={14} /> Create New Agent
            </Link>
          </div>

          <label style={{ display: "grid", gap: "7px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
              Select Agent Partner
            </span>
            <select
              name="agent"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "10px",
                border: "1px solid #cfc7ee",
                padding: "0 14px",
                fontSize: "13px",
                fontWeight: 600,
                outline: "none",
                background: "#fff",
                color: "var(--ink)",
              }}
            >
              <option value="">Direct Office Candidate (No Agent)</option>
              <optgroup label="── Registered Agency Partners & Brokers ──">
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.name}>
                    [{ag.code}] {ag.name} · 📞 {ag.phone} ({ag.district})
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          {selectedAgent && selectedAgent !== "Direct Office Candidate (No Agent)" && (
            <div style={{ marginTop: "10px", padding: "9px 12px", borderRadius: "9px", background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: "11.5px", color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Check size={14} /> This lead and resulting files will be automatically attributed to "{selectedAgent}".
            </div>
          )}
        </section>

        {/* BASIC QUESTION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            3. Basic Candidate Information
          </h2>

          <div style={{ marginBottom: "18px" }}>
            <CandidateProfileImageField
              candidateName={candidateFullName || "New Candidate"}
              selectedFile={candidatePhotoFile}
              onFileChange={setCandidatePhotoFile}
              disabled={saving}
            />
          </div>

          <div className="work-form-grid">
            <label>
              <span>Full Name <sup style={{ color: "#e11d48", fontSize: "14px" }}>*</sup></span>
              <input
                name="fullName"
                placeholder="Enter candidate full name"
                required
                value={candidateFullName}
                onChange={(e) => setCandidateFullName(e.target.value)}
              />
            </label>
            <label>
              <span>Phone <sup style={{ color: "#e11d48", fontSize: "14px" }}>*</sup></span>
              <input name="phone" placeholder="e.g. 01700000000" required />
            </label>
            <div className="dynamic-field full" style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#747083", marginBottom: "6px", display: "block" }}>Additional Phone Numbers</span>
              {phones.map((phone, index) => (
                <input
                  key={index}
                  value={phone}
                  onChange={(event) =>
                    setPhones(phones.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                  }
                  placeholder="Additional phone"
                  style={{ marginBottom: "8px" }}
                />
              ))}
              <button
                type="button"
                onClick={() => setPhones([...phones, ""])}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "#f0edff",
                  border: "1px solid #dcd5fb",
                  color: "#7258e8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                <Plus size={15} /> Add Another Phone
              </button>
            </div>
            <label>
              <span>Date of Birth</span>
              <input name="dob" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
            </label>
            <label>
              <span>Age</span>
              <input name="age" placeholder="Auto-calculated age" readOnly value={age ? `${age} Years` : ""} />
            </label>
            <label>
              <span>Passport Status</span>
              <select name="passportStatus" defaultValue="Available">
                <option value="Available">Available</option>
                <option value="Applied">Applied</option>
                <option value="Not Available">Not Available</option>
                <option value="Expired">Expired</option>
                <option value="Renewal Required">Renewal Required</option>
              </select>
            </label>
            <label>
              <span>Passport No</span>
              <input name="passportNo" placeholder="Passport Number" />
            </label>
            <label>
              <span>Expert In / Skill</span>
              <input name="expertIn" placeholder="e.g. Electrician, Pipe Fitter, Driver" />
            </label>
          </div>
        </section>

        {/* PREFER COUNTRY & DESTINATION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            4. Prefer Country &amp; Target Destination
          </h2>

          <div className="work-form-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              <span>Target Country <sup style={{ color: "#e11d48", fontSize: "14px" }}>*</sup></span>
              <select
                name="countrySelect"
                required
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{ fontSize: "14px", fontWeight: 700, height: "46px" }}
              >
                {dbCountries.length > 0 ? (
                  dbCountries.map((dc) => (
                    <option key={dc.id || dc.name} value={dc.name}>
                      {getCountryFlagEmoji(dc.code, dc.name)} {dc.name} ({dc.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Saudi Arabia">🇸🇦 Saudi Arabia (KSA)</option>
                    <option value="Dubai">🇦🇪 Dubai (UAE)</option>
                    <option value="Qatar">🇶🇦 Qatar (QA)</option>
                    <option value="Kuwait">🇰🇼 Kuwait (KW)</option>
                    <option value="Oman">🇴🇲 Oman (OM)</option>
                    <option value="Bahrain">🇧🇭 Bahrain (BH)</option>
                    <option value="Malaysia">🇲🇾 Malaysia (MY)</option>
                    <option value="Singapore">🇸🇬 Singapore (SG)</option>
                    <option value="Romania">🇷🇴 Romania (RO)</option>
                  </>
                )}
              </select>
              <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "5px", display: "block" }}>
                Target overseas destination pipeline where this candidate will be processed upon lead confirmation.
              </small>
            </label>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            5. Personal Information
          </h2>
          <div className="work-form-grid">
            <label>
              <span>Country / Nationality</span>
              <select name="nationality" defaultValue="Bangladesh">
                <option value="Bangladesh">🇧🇩 Bangladesh</option>
                <option value="India">🇮🇳 India</option>
                <option value="Nepal">🇳🇵 Nepal</option>
                <option value="Pakistan">🇵🇰 Pakistan</option>
                <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                <option value="Other">🌍 Other</option>
              </select>
            </label>
            <label>
              <span>Present District</span>
              <select name="district" defaultValue="Dhaka">
                <option value="Dhaka">Dhaka</option>
                <option value="Chattogram">Chattogram</option>
                <option value="Cumilla">Cumilla</option>
                <option value="Noakhali">Noakhali</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
                <option value="Barishal">Barishal</option>
                <option value="Rangpur">Rangpur</option>
                <option value="Mymensingh">Mymensingh</option>
              </select>
            </label>
            <label>
              <span>Marital Status</span>
              <select name="maritalStatus" defaultValue="Single">
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </label>
            <label>
              <span>Last Education</span>
              <input name="education" placeholder="e.g. SSC / HSC / Diploma" />
            </label>
            <label>
              <span>Passing Year</span>
              <input name="passingYear" placeholder="e.g. 2020" type="number" />
            </label>
            <label>
              <span>Bank Loan</span>
              <select name="bankLoan" defaultValue="Not Required">
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
                <option value="Interested">Interested</option>
                <option value="Not Eligible">Not Eligible</option>
              </select>
            </label>
            <label>
              <span>X-Bidesh Registration</span>
              <select name="xBidesh" defaultValue="Not Registered">
                <option value="Registered">Registered</option>
                <option value="Not Registered">Not Registered</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </label>
            <label>
              <span>Email Address</span>
              <input name="email" placeholder="email@example.com" type="email" />
            </label>
          </div>
        </section>

        {/* COMMENTS & NOTES */}
        <section className="work-form-section" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "22px 26px", boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
            6. Comments, Notes &amp; Activity Log
          </h2>
          <div className="comment-grid">
            <div className="comment-group">
              <span>Worker Comment</span>
              {workerComments.map((value, index) => (
                <textarea
                  key={index}
                  name="workerComments"
                  value={value}
                  onChange={(event) =>
                    setWorkerComments(
                      workerComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type worker comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setWorkerComments([...workerComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
            <div className="comment-group">
              <span>Executive Comment</span>
              {executiveComments.map((value, index) => (
                <textarea
                  key={index}
                  name="executiveComments"
                  value={value}
                  onChange={(event) =>
                    setExecutiveComments(
                      executiveComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type executive comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setExecutiveComments([...executiveComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
            <div className="comment-group">
              <span>Admin Comment</span>
              {adminComments.map((value, index) => (
                <textarea
                  key={index}
                  name="adminComments"
                  value={value}
                  onChange={(event) =>
                    setAdminComments(
                      adminComments.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                    )
                  }
                  placeholder="Type admin comment..."
                  rows={3}
                />
              ))}
              <button type="button" onClick={() => setAdminComments([...adminComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
          </div>
        </section>

        {/* STICKY FOOTER ACTIONS */}
        <div
          className="work-form-actions"
          style={{
            position: "sticky",
            bottom: "16px",
            zIndex: 10,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Work Call List")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(114,88,232,0.3)",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Send size={16} />
            {saving ? "Creating Candidate..." : "Submit Candidate"}
          </button>
        </div>
      </form>

      {/* QUICK CREATE AGENT MODAL */}
      {showAgentModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => !creatingAgent && setShowAgentModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "min(500px, 100%)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="#7258e8" />
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                  Quick Register Agent Partner
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentModal(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateAgent} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                    Agent / Agency Name *
                  </label>
                  <input
                    name="agentName"
                    required
                    placeholder="e.g. Al-Falah Overseas"
                    style={{ width: "100%", height: "38px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", fontSize: "12px", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                      Phone Number *
                    </label>
                    <input
                      name="phone"
                      required
                      placeholder="e.g. 01711223344"
                      style={{ width: "100%", height: "38px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", fontSize: "12px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                      District / City
                    </label>
                    <input
                      name="district"
                      defaultValue="Dhaka"
                      placeholder="e.g. Sylhet, Cumilla"
                      style={{ width: "100%", height: "38px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", fontSize: "12px", outline: "none" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                    Owner / Contact Person (Optional)
                  </label>
                  <input
                    name="contactPerson"
                    placeholder="e.g. Kamal Uddin"
                    style={{ width: "100%", height: "38px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0 10px", fontSize: "12px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button
                  type="button"
                  disabled={creatingAgent}
                  onClick={() => setShowAgentModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAgent}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: creatingAgent ? "not-allowed" : "pointer",
                  }}
                >
                  <Plus size={13} /> {creatingAgent ? "Creating..." : "Create & Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
