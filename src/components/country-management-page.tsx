"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Building2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Coins,
  SlidersHorizontal,
  Layers,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  MASTER_STAGES,
  PIPELINE_TEMPLATES,
  MasterStageDefinition,
  getStageIcon,
  getDefaultStagesForCountry,
} from "@/lib/country-pipeline";

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
  workflow?: Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    active: boolean;
    terminal?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
};

const FLAG_MAP: Record<string, string> = {
  sa: "🇸🇦",
  ksa: "🇸🇦",
  ae: "🇦🇪",
  uae: "🇦🇪",
  dxb: "🇦🇪",
  qa: "🇶🇦",
  kw: "🇰🇼",
  om: "🇴🇲",
  bh: "🇧🇭",
  my: "🇲🇾",
  sg: "🇸🇬",
  ro: "🇷🇴",
  it: "🇮🇹",
  pl: "🇵🇱",
  jp: "🇯🇵",
  hr: "🇭🇷",
  ca: "🇨🇦",
  mv: "🇲🇻",
  bd: "🇧🇩",
  in: "🇮🇳",
};

export function getCountryFlagEmoji(code: string, name: string): string {
  const cLower = (code || "").trim().toLowerCase();
  if (FLAG_MAP[cLower]) return FLAG_MAP[cLower];
  const nLower = (name || "").trim().toLowerCase();
  if (nLower.includes("romania") || cLower === "ro") return "🇷🇴";
  if (nLower === "oman" || nLower.startsWith("oman ") || nLower.endsWith(" oman") || cLower === "om") return "🇴🇲";
  if (nLower.includes("saudi") || nLower.includes("ksa") || cLower === "sa" || cLower === "ksa") return "🇸🇦";
  if (nLower.includes("dubai") || nLower.includes("uae") || nLower.includes("emirates") || cLower === "ae" || cLower === "uae") return "🇦🇪";
  if (nLower.includes("qatar") || cLower === "qa") return "🇶🇦";
  if (nLower.includes("kuwait") || cLower === "kw") return "🇰🇼";
  if (nLower.includes("bahrain") || cLower === "bh") return "🇧🇭";
  if (nLower.includes("malaysia") || cLower === "my") return "🇲🇾";
  if (nLower.includes("singapore") || cLower === "sg") return "🇸🇬";
  if (nLower.includes("italy") || cLower === "it") return "🇮🇹";
  if (nLower.includes("poland") || cLower === "pl") return "🇵🇱";
  if (nLower.includes("japan") || cLower === "jp") return "🇯🇵";
  if (nLower.includes("croatia") || cLower === "hr") return "🇭🇷";
  if (nLower.includes("canada") || cLower === "ca") return "🇨🇦";
  if (nLower.includes("maldives") || cLower === "mv") return "🇲🇻";
  return "🌍";
}

export function CountryManagementPage() {
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal States
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [editingCountry, setEditingCountry] = useState<CountryRecord | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    currency: "USD",
    timezone: "UTC",
    phoneCode: "",
    workflowType: "GENERAL",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deletingCountry, setDeletingCountry] = useState<CountryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pipeline Stage Builder Modal State
  const [pipelineCountry, setPipelineCountry] = useState<CountryRecord | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("GENERAL");
  const [stagesState, setStagesState] = useState<
    Array<{
      code: string;
      id: string;
      label: string;
      subtitle: string;
      description: string;
      iconName: string;
      active: boolean;
      required: boolean;
    }>
  >([]);
  const [savingPipeline, setSavingPipeline] = useState(false);

  const openPipelineBuilder = (country: CountryRecord) => {
    setPipelineCountry(country);
    const templateKey = country.workflowType || "GENERAL";
    setSelectedTemplate(templateKey);

    const existingStages = country.workflow || [];
    const hasCustomConfig = existingStages.length > 0;

    const initialStages = MASTER_STAGES.map((m) => {
      let active = false;
      if (hasCustomConfig) {
        const found = existingStages.find((w) => w.code === m.code);
        active = found ? found.active : Boolean(m.defaultActiveIn.includes(templateKey));
      } else {
        const template = PIPELINE_TEMPLATES[templateKey] || PIPELINE_TEMPLATES.GENERAL;
        active = template.stageCodes.includes(m.code);
      }

      if (m.required) active = true;

      return {
        code: m.code,
        id: m.id,
        label: m.label,
        subtitle: m.subtitle,
        description: m.description,
        iconName: m.iconName,
        active,
        required: Boolean(m.required),
      };
    });

    setStagesState(initialStages);
  };

  const applyTemplateToStages = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = PIPELINE_TEMPLATES[templateKey] || PIPELINE_TEMPLATES.GENERAL;

    setStagesState((prev) =>
      prev.map((s) => ({
        ...s,
        active: s.required || template.stageCodes.includes(s.code as any),
      }))
    );
  };

  const toggleStageActive = (code: string) => {
    setStagesState((prev) =>
      prev.map((s) => {
        if (s.code === code) {
          if (s.required) {
            toast.info(`Stage "${s.label}" is mandatory for compliance.`);
            return s;
          }
          return { ...s, active: !s.active };
        }
        return s;
      })
    );
  };

  const handleSavePipelineConfig = async () => {
    if (!pipelineCountry) return;
    setSavingPipeline(true);
    try {
      const activeStages = stagesState
        .filter((s) => s.active)
        .map((s, idx) => ({
          code: s.code,
          name: s.label,
          sortOrder: idx + 1,
          active: true,
          terminal: s.code === "FLIGHT",
        }));

      const res = await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pipelineCountry.id,
          workflowType: selectedTemplate,
          stages: activeStages,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save pipeline configuration");

      toast.success(`Pipeline for "${pipelineCountry.name}" saved with ${activeStages.length} active stages!`);
      setPipelineCountry(null);
      await fetchCountries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update pipeline stages");
    } finally {
      setSavingPipeline(false);
    }
  };

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/countries");
      const json = await res.json();
      if (json.success) {
        setCountries(json.data);
      } else {
        toast.error(json.error || "Failed to load countries");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const openCreateModal = () => {
    setEditingCountry(null);
    setFormData({
      name: "",
      code: "",
      currency: "USD",
      timezone: "UTC",
      phoneCode: "",
      workflowType: "GENERAL",
      active: true,
    });
    setModalMode("CREATE");
  };

  const openEditModal = (country: CountryRecord) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      code: country.code,
      currency: country.currency || "USD",
      timezone: country.timezone || "UTC",
      phoneCode: country.phoneCode || "",
      workflowType: country.workflowType || "GENERAL",
      active: country.active,
    });
    setModalMode("EDIT");
  };

  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Country name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Country code is required");
      return;
    }

    try {
      setSaving(true);
      if (modalMode === "CREATE") {
        const res = await fetch("/api/countries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to create country");
        toast.success(json.message || `Country "${formData.name}" created!`);
      } else if (modalMode === "EDIT" && editingCountry) {
        const res = await fetch("/api/countries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCountry.id, ...formData }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to update country");
        toast.success(json.message || `Country "${formData.name}" updated!`);
      }
      setModalMode(null);
      await fetchCountries();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCountry = async () => {
    if (!deletingCountry) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/countries?id=${deletingCountry.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete country");
      toast.success(json.message || `Country "${deletingCountry.name}" deleted!`);
      setDeletingCountry(null);
      await fetchCountries();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete country");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (country: CountryRecord) => {
    try {
      const res = await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: country.id, active: !country.active }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update status");
      toast.success(`Country "${country.name}" is now ${!country.active ? "Active" : "Inactive"}`);
      await fetchCountries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Filtered countries
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      if (filterTab === "ACTIVE" && !c.active) return false;
      if (filterTab === "INACTIVE" && c.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.currency.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [countries, filterTab, searchQuery]);

  // Statistics
  const totalCountries = countries.length;
  const activeCount = countries.filter((c) => c.active).length;
  const totalCandidatesAcrossAll = countries.reduce((acc, c) => acc + (c.candidateCount || 0), 0);

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "22px", paddingBottom: "40px" }}>
      {/* 1. TOP HEADER & KPI CARDS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", border: "1px solid #dcd5fb", padding: "2px 8px", borderRadius: "6px" }}>
              🌐 MASTER DATA &amp; PIPELINES
            </span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
            Destination Country Management
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
            Create, update, and manage international destination countries. Changes automatically reflect in sidebar navigation and candidate forms.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchCountries}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
              background: "#ffffff",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
            }}
          >
            <Plus size={16} /> + Add Destination Country
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {/* KPI 1 */}
        <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#f0edff", color: "#7258e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Globe size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>TOTAL DESTINATIONS</span>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--ink)", marginTop: "2px" }}>{totalCountries} Countries</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>ACTIVE PIPELINES</span>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>{activeCount} Active</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "var(--shadow)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>TOTAL CANDIDATES PROCESSED</span>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#2563eb", marginTop: "2px" }}>{totalCandidatesAcrossAll} Candidates</div>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS TOOLBAR & COUNTRY GRID */}
      <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px 24px", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px", background: "#f8fafc", padding: "3px", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                background: filterTab === "ALL" ? "#7258e8" : "transparent",
                color: filterTab === "ALL" ? "#ffffff" : "var(--muted)",
                fontSize: "12px",
                fontWeight: filterTab === "ALL" ? 800 : 600,
                cursor: "pointer",
              }}
            >
              All Countries ({totalCountries})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ACTIVE")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                background: filterTab === "ACTIVE" ? "#059669" : "transparent",
                color: filterTab === "ACTIVE" ? "#ffffff" : "var(--muted)",
                fontSize: "12px",
                fontWeight: filterTab === "ACTIVE" ? 800 : 600,
                cursor: "pointer",
              }}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("INACTIVE")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                background: filterTab === "INACTIVE" ? "#e11d48" : "transparent",
                color: filterTab === "INACTIVE" ? "#ffffff" : "var(--muted)",
                fontSize: "12px",
                fontWeight: filterTab === "INACTIVE" ? 800 : 600,
                cursor: "pointer",
              }}
            >
              Inactive ({totalCountries - activeCount})
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", minWidth: "280px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by country name, code, currency..."
              style={{
                width: "100%",
                height: "38px",
                padding: "0 14px 0 34px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                background: "#fafafd",
                fontSize: "12.5px",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Countries Table / Cards */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
            <p>Loading destination countries...</p>
          </div>
        ) : filteredCountries.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--line)" }}>
            <Globe size={32} style={{ color: "var(--muted)", margin: "0 auto 10px" }} />
            <b style={{ color: "var(--ink)", fontSize: "15px" }}>No Destination Countries Found</b>
            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "4px" }}>
              {searchQuery ? "No countries match your search query." : "Click '+ Add Destination Country' to create your first country pipeline."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>DESTINATION COUNTRY</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CODE &amp; PHONE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CURRENCY &amp; TIMEZONE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>PIPELINE TYPE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CANDIDATES</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountries.map((c) => {
                  const flag = getCountryFlagEmoji(c.code, c.name);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafd")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Name & Flag */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "22px" }}>{flag}</span>
                          <div>
                            <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>{c.name}</b>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Destination Pipeline</span>
                          </div>
                        </div>
                      </td>

                      {/* Code & Phone */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11.5px", fontWeight: 900, color: "#7258e8", background: "#f0edff", border: "1px solid #dcd5fb", padding: "2px 7px", borderRadius: "5px" }}>
                            {c.code}
                          </span>
                          {c.phoneCode && <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 600 }}>{c.phoneCode}</span>}
                        </div>
                      </td>

                      {/* Currency & Timezone */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#059669" }}>
                            <Coins size={12} /> {c.currency}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--muted)" }}>
                            <Clock size={11} /> {c.timezone}
                          </span>
                        </div>
                      </td>

                      {/* Workflow Type */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#334155", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                          {c.workflowType}
                        </span>
                      </td>

                      {/* Candidates Count */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: c.candidateCount > 0 ? "#eff6ff" : "#f8fafc", color: c.candidateCount > 0 ? "#1d4ed8" : "var(--muted)", border: `1px solid ${c.candidateCount > 0 ? "#bfdbfe" : "#e2e8f0"}`, padding: "3px 10px", borderRadius: "6px", fontWeight: 800, fontSize: "12px" }}>
                          <Users size={12} /> {c.candidateCount} Candidate{c.candidateCount === 1 ? "" : "s"}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: `1px solid ${c.active ? "#a7f3d0" : "#fecdd3"}`,
                            background: c.active ? "#ecfdf5" : "#fff1f2",
                            color: c.active ? "#059669" : "#e11d48",
                            fontSize: "11.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {c.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {c.active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <Link
                            href={`/country-pipeline/${c.id}`}
                            title="Configure Custom Pipeline Stages & Workflow in Dedicated Page"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 11px",
                              borderRadius: "7px",
                              border: "1px solid #c7d2fe",
                              background: "#eef2ff",
                              color: "#4338ca",
                              fontSize: "12px",
                              fontWeight: 800,
                              textDecoration: "none",
                              cursor: "pointer",
                            }}
                          >
                            <SlidersHorizontal size={13} /> {c.workflow ? c.workflow.filter((w) => w.active).length : 7} Stages
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Edit Country Name & Details"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              border: "1px solid #dcd5fb",
                              background: "#f0edff",
                              color: "#7258e8",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingCountry(c)}
                            title="Delete or Deactivate Country"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. CREATE / EDIT COUNTRY MODAL */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Globe size={20} style={{ color: "#7258e8" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>
                  {modalMode === "CREATE" ? "+ Add Destination Country" : `Edit Country: ${editingCountry?.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: "transparent", border: "none", fontSize: "18px", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCountry} style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Destination Country Name <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Qatar, Kuwait, Japan, Croatia"
                  style={{
                    width: "100%",
                    height: "42px",
                    padding: "0 14px",
                    borderRadius: "9px",
                    border: "1px solid var(--line)",
                    fontSize: "13.5px",
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    ISO Code <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. QA, KW, JP"
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    Currency Code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="e.g. QAR, KWD, USD"
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="e.g. Asia/Qatar, UTC"
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    Phone Code
                  </label>
                  <input
                    type="text"
                    value={formData.phoneCode}
                    onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                    placeholder="e.g. +974, +965"
                    style={{
                      width: "100%",
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Pipeline Workflow Type
                </label>
                <select
                  value={formData.workflowType}
                  onChange={(e) => setFormData({ ...formData, workflowType: e.target.value })}
                  style={{
                    width: "100%",
                    height: "42px",
                    padding: "0 14px",
                    borderRadius: "9px",
                    border: "1px solid var(--line)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <option value="GENERAL">General Overseas Pipeline</option>
                  <option value="KSA">Saudi Arabia (KSA Visa &amp; MOFA)</option>
                  <option value="DUBAI">Dubai / UAE (Labor &amp; Immigration)</option>
                  <option value="EUROPE">European Work Permit Pipeline</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="countryActive"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "#7258e8", cursor: "pointer" }}
                />
                <label htmlFor="countryActive" style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}>
                  Enable this country in Candidate Dropdowns &amp; Sidebar Navigation
                </label>
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "9px",
                    border: "1px solid var(--line)",
                    background: "#ffffff",
                    color: "var(--ink)",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "9px",
                    background: "#7258e8",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(114,88,232,0.3)",
                  }}
                >
                  {saving ? "Saving..." : modalMode === "CREATE" ? "Create Destination Country" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      {deletingCountry && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--line)",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>
              Delete Country &ldquo;{deletingCountry.name}&rdquo;?
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px", lineHeight: "1.5" }}>
              Are you sure you want to delete or deactivate this destination country? If candidate records exist for this country, it will be safely deactivated to protect financial ledgers.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeletingCountry(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "9px",
                  border: "1px solid var(--line)",
                  background: "#ffffff",
                  color: "var(--ink)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCountry}
                disabled={deleting}
                style={{
                  padding: "9px 22px",
                  borderRadius: "9px",
                  background: "#e11d48",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {deleting ? "Deleting..." : "Yes, Delete Country"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
