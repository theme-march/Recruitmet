"use client";

import React, { useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { countriesKey, countriesQueryOptions, countryStatusKey, countryStatusMutationOptions, type CountryRecord } from "@/lib/queries/countries";
import { useAccess } from "@/hooks/use-access";
export type { CountryRecord } from "@/lib/queries/countries";
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
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  MASTER_STAGES,
  PIPELINE_TEMPLATES,
  MasterStageDefinition,
  getStageIcon,
  getDefaultStagesForCountry,
} from "@/lib/country-pipeline";



import {
  PRESET_COUNTRIES,
  ALL_WORLD_COUNTRIES,
  POPULAR_FLAGS,
  PresetCountry,
  resolveCountryFlagEmoji,
} from "@/lib/country-data";
import { getCountryFlagEmoji } from "@/lib/country-pipeline";
export { getCountryFlagEmoji } from "@/lib/country-pipeline";

export function CountryManagementPage() {
  const queryClient = useQueryClient();
  const countryQuery = useQuery(countriesQueryOptions());
  const countries = countryQuery.data ?? [];
  const loading = countryQuery.isPending;
  const { allows } = useAccess();
  const statusMutation = useMutation(countryStatusMutationOptions(queryClient));
  const pendingCountryIds = useMutationState({
    filters: { mutationKey: countryStatusKey, status: "pending" },
    select: mutation => (mutation.state.variables as { id: string }).id,
  });
  const pendingClicks = useRef(new Set<string>());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal States
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [editingCountry, setEditingCountry] = useState<CountryRecord | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    flag: "🌐",
    currency: "USD",
    timezone: "UTC",
    phoneCode: "",
    workflowType: "GENERAL",
    active: true,
  });
  const [showFlagPalette, setShowFlagPalette] = useState(false);
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

  // Packages Management Modal State
  const [packagesCountry, setPackagesCountry] = useState<CountryRecord | null>(null);
  const [countryPackages, setCountryPackages] = useState<Array<{ id: string; name: string; price: number; description?: string | null; isDefault: boolean; active: boolean }>>([]);
  const [countryDemands, setCountryDemands] = useState<Array<{ id: string; demandNo: string; title: string; profession: string; company: string; visaRate: number }>>([]);
  const [fetchingPackages, setFetchingPackages] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgPrice, setNewPkgPrice] = useState("");
  const [newPkgDesc, setNewPkgDesc] = useState("");
  const [newPkgDefault, setNewPkgDefault] = useState(false);
  const [addingPkg, setAddingPkg] = useState(false);

  const openPackagesModal = async (country: CountryRecord) => {
    setPackagesCountry(country);
    setFetchingPackages(true);
    setNewPkgName("");
    setNewPkgPrice("");
    setNewPkgDesc("");
    setNewPkgDefault(false);
    setCountryDemands([]);
    try {
      const res = await fetch(`/api/country-packages?countryId=${country.id}`);
      const data = await res.json();
      if (data.data) setCountryPackages(data.data);
      if (data.demands) setCountryDemands(data.demands);
    } catch {
      toast.error("Failed to load country packages.");
    } finally {
      setFetchingPackages(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packagesCountry || !newPkgName.trim() || !newPkgPrice) return;
    setAddingPkg(true);
    try {
      const res = await fetch("/api/country-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId: packagesCountry.id,
          name: newPkgName.trim(),
          price: Number(newPkgPrice),
          description: newPkgDesc.trim() || undefined,
          isDefault: newPkgDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create package");
      toast.success("Package added successfully!");
      setNewPkgName("");
      setNewPkgPrice("");
      setNewPkgDesc("");
      setNewPkgDefault(false);
      // Refresh packages
      const refRes = await fetch(`/api/country-packages?countryId=${packagesCountry.id}`);
      const refData = await refRes.json();
      if (refData.data) setCountryPackages(refData.data);
      if (refData.demands) setCountryDemands(refData.demands);
      void queryClient.invalidateQueries({ queryKey: countriesKey });
    } catch (err: any) {
      toast.error(err.message || "Failed to add package");
    } finally {
      setAddingPkg(false);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch(`/api/country-packages?id=${pkgId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete package");
      toast.success("Package deleted successfully!");
      setCountryPackages((prev) => prev.filter((p) => p.id !== pkgId));
      void queryClient.invalidateQueries({ queryKey: countriesKey });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package");
    }
  };

  const handleSetDefaultPackage = async (pkgId: string) => {
    try {
      const res = await fetch("/api/country-packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pkgId, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to set default package");
      toast.success("Default baseline package updated!");
      setCountryPackages((prev) =>
        prev.map((p) => ({ ...p, isDefault: p.id === pkgId }))
      );
      void queryClient.invalidateQueries({ queryKey: countriesKey });
    } catch (err: any) {
      toast.error(err.message || "Failed to update package");
    }
  };

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: countriesKey }),
      queryClient.invalidateQueries({ queryKey: ["nav-counts"] }),
    ]);
  };

  const openCreateModal = () => {
    setEditingCountry(null);
    setShowFlagPalette(false);
    setFormData({
      name: "",
      code: "",
      flag: "🌐",
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
    setShowFlagPalette(false);
    setFormData({
      name: country.name,
      code: country.code,
      flag: country.flag || getCountryFlagEmoji(country.code, country.name, country.flag),
      currency: country.currency || "USD",
      timezone: country.timezone || "UTC",
      phoneCode: country.phoneCode || "",
      workflowType: country.workflowType || "GENERAL",
      active: country.active,
    });
    setModalMode("EDIT");
  };

  const applyPresetCountry = (preset: PresetCountry) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      flag: preset.flag,
      currency: preset.currency,
      timezone: preset.timezone,
      phoneCode: preset.phoneCode,
      workflowType: preset.workflowType,
    }));
    setShowFlagPalette(false);
  };

  const handleNameChange = (nameInput: string) => {
    const trimmed = nameInput.trim();
    const matched = ALL_WORLD_COUNTRIES.find(
      (p) =>
        p.name.toLowerCase() === trimmed.toLowerCase() ||
        p.code.toLowerCase() === trimmed.toLowerCase() ||
        p.aliases?.some((a) => a.toLowerCase() === trimmed.toLowerCase())
    );

    if (matched) {
      setFormData((prev) => ({
        ...prev,
        name: nameInput,
        flag: matched.flag,
        code: prev.code && prev.code !== "QA" && prev.code !== "KW" ? prev.code : matched.code,
        currency: prev.currency === "USD" || !prev.currency ? matched.currency : prev.currency,
        timezone: prev.timezone === "UTC" || !prev.timezone ? matched.timezone : prev.timezone,
        phoneCode: !prev.phoneCode ? matched.phoneCode : prev.phoneCode,
        workflowType: prev.workflowType === "GENERAL" ? matched.workflowType : prev.workflowType,
      }));
    } else {
      const autoFlag = resolveCountryFlagEmoji(formData.code, nameInput);
      setFormData((prev) => ({
        ...prev,
        name: nameInput,
        flag: autoFlag !== "🌐" ? autoFlag : prev.flag,
      }));
    }
  };

  const handleCodeChange = (codeInput: string) => {
    const upper = codeInput.toUpperCase();
    const autoFlag = resolveCountryFlagEmoji(upper, formData.name);
    setFormData((prev) => ({
      ...prev,
      code: upper,
      flag: autoFlag !== "🌐" ? autoFlag : prev.flag,
    }));
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
    if (pendingClicks.current.has(country.id) || !allows("country-setup", "edit")) return;
    pendingClicks.current.add(country.id);
    try {
      await statusMutation.mutateAsync({ id: country.id, active: !country.active });
      toast.success(`Country "${country.name}" is now ${!country.active ? "Active" : "Inactive"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      pendingClicks.current.delete(country.id);
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
    <div className="country-management-page country-design-page management-design-page country-setup-design-page">
      <div className="country-design-breadcrumb">Dashboard / Administration / Country Setup</div>
      <header className="country-design-heading"><div><h1>Destination Country Management</h1><p>Create, update, and manage international destination countries. Changes automatically reflect in sidebar navigation and candidate forms.</p></div><div className="country-design-actions"><button data-action-ui="neutral" data-action-size="normal" type="button" onClick={fetchCountries} disabled={countryQuery.isFetching}><RefreshCw size={13} className={countryQuery.isFetching ? "animate-spin" : ""} /> Refresh</button><button data-action-ui="primary" data-action-size="normal" type="button" onClick={openCreateModal} className="management-primary"><Plus size={13} /> Add Destination Country</button></div></header>
      <section className="country-design-metrics management-metrics-three">
        <article className="country-design-metric"><div><span>Total Destinations</span><Globe size={16} color="#007aff" /></div><b>{totalCountries}</b><p>Registered countries</p></article>
        <article className="country-design-metric"><div><span>Active Pipelines</span><CheckCircle2 size={16} color="#28c653" /></div><b>{activeCount}</b><p>Active destination pipelines</p></article>
        <article className="country-design-metric"><div><span>Total Candidates</span><Users size={16} color="#6855e8" /></div><b>{totalCandidatesAcrossAll}</b><p>Candidate files across countries</p></article>
      </section>

      {/* 3. CONTROLS TOOLBAR & COUNTRY GRID */}
      <div className="country-controls-card country-design-workspace">
        <div className="country-toolbar-row">
          {/* Segmented Filter Tabs */}
          <div className="country-filter-tabs">
            <button  
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`country-tab-btn ${filterTab === "ALL" ? "active all" : ""}`}
            >
              <span className="tab-label-full">All Countries</span>
              <span className="tab-label-short">All</span>
              <span className="country-tab-pill">{totalCountries}</span>
            </button>
            <button  
              type="button"
              onClick={() => setFilterTab("ACTIVE")}
              className={`country-tab-btn ${filterTab === "ACTIVE" ? "active active-corridors" : ""}`}
            >
              <span className="tab-label-full">Active</span>
              <span className="tab-label-short">Active</span>
              <span className="country-tab-pill">{activeCount}</span>
            </button>
            <button  
              type="button"
              onClick={() => setFilterTab("INACTIVE")}
              className={`country-tab-btn ${filterTab === "INACTIVE" ? "active inactive-corridors" : ""}`}
            >
              <span className="tab-label-full">Inactive</span>
              <span className="tab-label-short">Inactive</span>
              <span className="country-tab-pill">{totalCountries - activeCount}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="country-search-wrap">
            <Search size={16} className="country-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by country, code, currency..."
              className="country-search-input"
              style={{ paddingLeft: "38px", paddingRight: "34px" }}
            />
            {searchQuery && (
              <button data-action-ui="ghost" data-action-size="icon"
                type="button"
                onClick={() => setSearchQuery("")}
                className="country-search-clear"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="country-design-count">Showing {filteredCountries.length} of {totalCountries} Total Destination Countries</div>
        {/* Countries Table / Cards */}
        {countryQuery.isError && !countryQuery.data ? (
          <div role="alert" className="country-error-alert">
            <div className="country-error-alert-content">
              <AlertCircle size={22} style={{ flexShrink: 0 }} />
              <div>
                <p className="country-error-alert-title">Destination country data could not be loaded</p>
                <p className="country-error-alert-desc">{countryQuery.error?.message || "Failed to fetch international corridors."}</p>
              </div>
            </div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => countryQuery.refetch()} className="country-error-retry-btn">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
            <p>Loading destination countries...</p>
          </div>
        ) : filteredCountries.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--line)" }}>
            <Globe size={32} style={{ color: "var(--muted)", margin: "0 auto 10px" }} />
            <b style={{ color: "var(--ink)", fontSize: "15px" }}>No Destination Countries Found</b>
            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "4px" }}>
              {searchQuery ? "No countries match your search query." : "Click 'Add Destination Country' to create your first country pipeline."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-country-table management-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>DESTINATION COUNTRY</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CODE &amp; PHONE</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CURRENCY &amp; TIMEZONE</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>PIPELINE TYPE</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>PACKAGES &amp; RATES</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>CANDIDATES</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>STATUS</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCountries.map((c) => {
                    const flag = c.flag || getCountryFlagEmoji(c.code, c.name, c.flag);
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
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

                        {/* Packages & Rates */}
                        <td style={{ padding: "14px 16px" }}>
                          <div>
                            {c.packages && c.packages.length > 0 ? (
                              <>
                                <b style={{ fontSize: "13px", color: "#059669", display: "block" }}>
                                  ৳ {Number(c.packages.find((p) => p.isDefault)?.price || c.packages[0].price).toLocaleString()} BDT
                                </b>
                                <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>
                                  {c.packages.length} Package{c.packages.length > 1 ? "s" : ""}
                                </span>
                              </>
                            ) : (
                              <>
                                <b style={{ fontSize: "13px", color: "#64748b", display: "block" }}>
                                  ৳ {(/dubai/i.test(c.name) ? 300000 : 350000).toLocaleString()} BDT
                                </b>
                                <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>
                                  Standard Baseline
                                </span>
                              </>
                            )}
                          </div>
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
                            disabled={pendingCountryIds.includes(c.id) || !allows("country-setup", "edit")}
                            aria-busy={pendingCountryIds.includes(c.id)}
                            aria-label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`}
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
                            {pendingCountryIds.includes(c.id) ? "Saving…" : c.active ? "Active" : "Inactive"}
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

                            <button data-action-ui="secondary" data-action-size="compact"
                              type="button"
                              onClick={() => openPackagesModal(c)}
                              title={`Manage custom packages & rates for ${c.name}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 10px",
                                borderRadius: "7px",
                                border: "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                color: "#15803d",
                                fontSize: "12px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              <Coins size={12} /> Packages ({c.packages?.length || 1})
                            </button>

                            <button data-action-ui="secondary" data-action-size="compact"
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

                            <button data-action-ui="danger" data-action-size="compact"
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

            {/* Mobile Stream View (Stitch Spec: dd52cdcb5891488da2e76e3586cbdbf7) */}
            <div className="mobile-country-stream">
              {filteredCountries.map((c) => {
                const flag = c.flag || getCountryFlagEmoji(c.code, c.name, c.flag);
                return (
                  <div key={c.id} className="country-mobile-card">
                    <div className="country-mobile-card-top">
                      <div className="country-mobile-card-brand">
                        <div className="country-mobile-flag">{flag}</div>
                        <div className="country-mobile-title-block">
                          <div className="country-mobile-name-row">
                            <h3 className="country-mobile-name">{c.name}</h3>
                            <span className="country-mobile-code-badge">{c.code}</span>
                          </div>
                          <span className="country-mobile-sub">Pipeline • {c.workflowType}</span>
                        </div>
                      </div>
                      <button  
                        type="button"
                        disabled={pendingCountryIds.includes(c.id) || !allows("country-setup", "edit")}
                        aria-label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`}
                        onClick={() => handleToggleActive(c)}
                        className="country-mobile-status-toggle"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3.5px",
                          padding: "2px 8px",
                          height: "26px",
                          borderRadius: "6px",
                          border: `1px solid ${c.active ? "#a7f3d0" : "#fecdd3"}`,
                          background: c.active ? "#ecfdf5" : "#fff1f2",
                          color: c.active ? "#059669" : "#e11d48",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {c.active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {pendingCountryIds.includes(c.id) ? "Saving…" : c.active ? "Active" : "Inactive"}
                      </button>
                    </div>

                    <div className="country-mobile-grid">
                      <div className="country-mobile-grid-item">
                        <Coins size={14} style={{ color: "#059669", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span className="country-mobile-grid-val">{c.currency}</span>
                          <span className="country-mobile-grid-lbl">{c.phoneCode ? `${c.phoneCode} • ` : ""}{c.timezone}</span>
                        </div>
                      </div>
                      <div className="country-mobile-grid-item">
                        <Users size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span className="country-mobile-grid-val">{c.candidateCount} Candidates</span>
                          <span className="country-mobile-grid-lbl">Corridor Intake</span>
                        </div>
                      </div>
                    </div>

                    <div className="country-mobile-actions">
                      <Link data-action-ui="secondary" data-action-size="normal"
                        href={`/country-pipeline/${c.id}`}
                        className="country-mobile-stages-btn"
                      >
                        <SlidersHorizontal size={13} />
                        <span>{c.workflow ? c.workflow.filter((w) => w.active).length : 7} Stages</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => openPackagesModal(c)}
                        className="country-mobile-stages-btn"
                        style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}
                      >
                        <Coins size={13} />
                        <span>Packages ({c.packages?.length || 1})</span>
                      </button>

                      <div className="country-mobile-btn-group">
                        <button data-action-ui="secondary" data-action-size="normal"
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="country-mobile-action-btn edit"
                          title="Edit Country"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button data-action-ui="danger" data-action-size="normal"
                          type="button"
                          onClick={() => setDeletingCountry(c)}
                          className="country-mobile-action-btn delete"
                          title="Delete Country"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. CREATE / EDIT COUNTRY MODAL */}
      {modalMode && (
        <div aria-label="Dialog" className="master-modal-overlay"
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
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
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
            <div className="master-modal-header" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Globe className="master-modal-accent" size={20} style={{ color: "#7258e8" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>
                  {modalMode === "CREATE" ? "+ Add Destination Country" : `Edit Country: ${editingCountry?.name}`}
                </h3>
              </div>
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog"
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: "transparent", border: "none", fontSize: "18px", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCountry} style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Quick Presets Bar */}
              <div className="master-modal-panel" style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  ⚡ Quick Destination Presets (Click to autofill):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "80px", overflowY: "auto" }}>
                  {PRESET_COUNTRIES.slice(0, 18).map((preset) => (
                    <button aria-pressed={formData.name.toLowerCase() === preset.name.toLowerCase()}
                      key={preset.code}
                      type="button"
                      onClick={() => applyPresetCountry(preset)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${formData.name.toLowerCase() === preset.name.toLowerCase() ? "#7258e8" : "#e2e8f0"}`,
                        background: formData.name.toLowerCase() === preset.name.toLowerCase() ? "#f0edff" : "#ffffff",
                        color: formData.name.toLowerCase() === preset.name.toLowerCase() ? "#7258e8" : "var(--ink)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>{preset.flag}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Country Name & Flag */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Destination Country Name &amp; Flag <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Flag selector trigger */}
                  <button data-action-ui="secondary" data-action-size="normal"
                    type="button"
                    onClick={() => setShowFlagPalette(!showFlagPalette)}
                    title="Click to choose Flag Emoji"
                    style={{
                      width: "48px",
                      height: "42px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      background: "#f8fafc",
                      fontSize: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {formData.flag || "🌐"}
                  </button>

                  <input
                    type="text"
                    title="Country Flag Emoji"
                    value={formData.flag}
                    onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                    placeholder="🌐"
                    maxLength={6}
                    style={{
                      width: "56px",
                      height: "42px",
                      textAlign: "center",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  />

                  {/* Country Name input with datalist */}
                  <input
                    type="text"
                    required
                    list="country-presets-list"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Russia, Kuwait, Japan, Croatia"
                    style={{
                      flex: 1,
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "9px",
                      border: "1px solid var(--line)",
                      fontSize: "13.5px",
                      fontWeight: 700,
                    }}
                  />
                  <datalist id="country-presets-list">
                    {ALL_WORLD_COUNTRIES.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.flag} {p.name} ({p.code})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Optional flag picker palette */}
                {showFlagPalette && (
                  <div className="master-modal-panel" style={{ marginTop: "8px", background: "#f8fafc", border: "1px solid #dcd5fb", borderRadius: "10px", padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
                        Select Flag Emoji:
                      </span>
                      <button data-action-ui="neutral" data-action-size="normal"
                        type="button"
                        onClick={() => setShowFlagPalette(false)}
                        style={{ border: "none", background: "transparent", fontSize: "11px", color: "var(--muted)", cursor: "pointer", fontWeight: 700 }}
                      >
                        Close ✕
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))", gap: "5px" }}>
                      {POPULAR_FLAGS.map((pf) => (
                        <button aria-pressed={formData.flag === pf.flag}
                          key={pf.code}
                          type="button"
                          title={pf.label}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, flag: pf.flag }));
                            setShowFlagPalette(false);
                          }}
                          style={{
                            height: "34px",
                            fontSize: "20px",
                            border: "1px solid #e2e8f0",
                            background: formData.flag === pf.flag ? "#f0edff" : "#ffffff",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {pf.flag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="e.g. RU, QA, KW, JP, RUS"
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
                <button data-action-ui="neutral" data-action-size="normal"
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
                <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
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
        <div aria-label="Delete Country “ ”?" className="master-modal-overlay"
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
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
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
            <div className="master-modal-icon" style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>
              Delete Country &ldquo;{deletingCountry.name}&rdquo;?
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px", lineHeight: "1.5" }}>
              Are you sure you want to delete or deactivate this destination country? If candidate records exist for this country, it will be safely deactivated to protect financial ledgers.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button data-action-ui="neutral" data-action-size="normal"
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
              <button data-action-ui="danger" data-action-size="normal" className="master-modal-danger"
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

      {/* 5. COUNTRY PACKAGES MANAGEMENT MODAL */}
      {packagesCountry && (
        <div aria-label="Dialog" className="master-modal-overlay"
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
          onClick={() => setPackagesCountry(null)}
        >
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--line)",
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="master-modal-header" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{packagesCountry.flag || "🌍"}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>
                    {packagesCountry.name} — Packages &amp; Pricing
                  </h3>
                  <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Configure multiple packages &amp; standard rates for this destination country
                  </small>
                </div>
              </div>
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog"
                type="button"
                onClick={() => setPackagesCountry(null)}
                style={{ background: "transparent", border: "none", fontSize: "18px", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Packages List */}
              <div>
                <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Current Packages ({countryPackages.length})
                </span>

                {fetchingPackages ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading packages...
                  </div>
                ) : countryPackages.length === 0 ? (
                  <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed var(--line)", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
                    No custom packages yet. System standard baseline (৳ {/dubai/i.test(packagesCountry.name) ? "300,000" : "350,000"} BDT) applies.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {countryPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: `1px solid ${pkg.isDefault ? "#a7f3d0" : "var(--line)"}`,
                          background: pkg.isDefault ? "#f0fdf4" : "#ffffff",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <b style={{ fontSize: "13.5px", color: "var(--ink)" }}>{pkg.name}</b>
                            {pkg.isDefault ? (
                              <span style={{ fontSize: "10px", fontWeight: 800, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "4px" }}>
                                ⭐ Default Baseline
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultPackage(pkg.id)}
                                style={{ fontSize: "10px", color: "#4f46e5", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                              >
                                Set as Default
                              </button>
                            )}
                            {(/works.*demand|quota/i.test(pkg.name) || /demand|quota/i.test(pkg.description || "")) && (
                              <span style={{ fontSize: "10px", fontWeight: 800, background: "#ede9fe", color: "#6d28d9", padding: "1px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                📋 Work &amp; Demand
                              </span>
                            )}
                          </div>
                          {pkg.description && (
                            <small style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                              {pkg.description}
                            </small>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <b style={{ fontSize: "14px", color: "#059669", fontWeight: 800 }}>
                            ৳ {pkg.price.toLocaleString()} BDT
                          </b>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id)}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            title="Delete package"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Package Form */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "8px" }}>
                  + Add New Package for {packagesCountry.name}
                </span>

                {/* Quick Presets */}
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>
                    Quick Presets:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {/* Country-Specific Active Works & Demands Presets */}
                    {countryDemands.map((dm) => (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() => {
                          setNewPkgName(dm.title);
                          setNewPkgPrice(String(dm.visaRate || ""));
                          setNewPkgDesc(`Work & Demand quota package for ${dm.title} (${dm.demandNo})`);
                        }}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #c4b5fd",
                          background: "#f5f3ff",
                          color: "#6d28d9",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        📋 + {dm.title} (৳{(dm.visaRate || 0).toLocaleString()})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewPkgName("Free Visa / Direct");
                        setNewPkgPrice("380000");
                        setNewPkgDesc("Open freelance or direct sponsor package");
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Free Visa / Direct
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPkgName("Driver Visa");
                        setNewPkgPrice("320000");
                        setNewPkgDesc("Heavy / Light commercial driver visa package");
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Driver Visa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPkgName("VIP Express Visa");
                        setNewPkgPrice("450000");
                        setNewPkgDesc("Fast-track VIP processing package");
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + VIP Express Visa
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCreatePackage} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Package Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Driver Visa, VIP Express"
                        value={newPkgName}
                        onChange={(e) => setNewPkgName(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--line)", fontSize: "12.5px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Rate (BDT) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        placeholder="e.g. 350000"
                        value={newPkgPrice}
                        onChange={(e) => setNewPkgPrice(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--line)", fontSize: "12.5px", fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Includes visa, medical, and flight processing"
                      value={newPkgDesc}
                      onChange={(e) => setNewPkgDesc(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", border: "1px solid var(--line)", fontSize: "12px" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={newPkgDefault}
                        onChange={(e) => setNewPkgDefault(e.target.checked)}
                      />
                      <span>Set as default baseline package for {packagesCountry.name}</span>
                    </label>

                    <button
                      type="submit"
                      disabled={addingPkg}
                      data-action-ui="primary"
                      data-action-size="compact"
                      style={{ background: "#7258e8", color: "#fff", padding: "6px 14px", borderRadius: "7px", fontWeight: 800, border: "none", cursor: "pointer" }}
                    >
                      {addingPkg ? "Adding..." : "+ Add Package"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button
                type="button"
                data-action-ui="neutral"
                data-action-size="normal"
                onClick={() => setPackagesCountry(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
