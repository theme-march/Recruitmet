"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Globe,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Users,
  Coins,
  Clock,
  MapPin,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Plane,
  FileCheck,
  Building2,
  Calendar,
  UserCheck,
  Receipt,
  Paperclip,
  FileSignature,
  AlignLeft,
  Binary,
  ListFilter,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  MASTER_STAGES,
  PIPELINE_TEMPLATES,
  getStageIcon,
} from "@/lib/country-pipeline";
import { getCountryFlagEmoji, type CountryRecord } from "@/components/modules/country-management-page";

export type CustomStageField = {
  id: string;
  label: string;
  type: "text" | "number" | "textarea" | "date" | "file" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string; // Comma-separated options for select dropdown
};

export function parseStageDescription(raw: string | null | undefined): {
  text: string;
  fields: CustomStageField[];
} {
  if (!raw) return { text: "", fields: [] };
  let str = String(raw).trim();

  // Robust multi-level JSON unwrapper
  for (let i = 0; i < 3; i++) {
    if (str.startsWith("{") || str.startsWith('"')) {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === "object" && parsed !== null) {
          return {
            text: parsed.text || "",
            fields: Array.isArray(parsed.fields) ? parsed.fields : [],
          };
        }
        if (typeof parsed === "string") {
          str = parsed.trim();
          continue;
        }
      } catch (e) {
        break;
      }
    }
  }
  return { text: raw, fields: [] };
}

export function serializeStageDescription(text: string, fields: CustomStageField[]): string {
  return JSON.stringify({
    text: text || "",
    fields: Array.isArray(fields) ? fields : [],
  });
}

const AVAILABLE_ICONS = [
  { name: "FileText", label: "Document", icon: FileText },
  { name: "ShieldCheck", label: "Security / Med", icon: ShieldCheck },
  { name: "CreditCard", label: "Payment", icon: CreditCard },
  { name: "Receipt", label: "Invoice", icon: Receipt },
  { name: "GraduationCap", label: "Skill / Test", icon: GraduationCap },
  { name: "Globe", label: "Embassy / Visa", icon: Globe },
  { name: "FileCheck", label: "Approval", icon: FileCheck },
  { name: "FileSignature", label: "Contract", icon: FileSignature },
  { name: "Plane", label: "Flight", icon: Plane },
  { name: "Building2", label: "Company / Lab", icon: Building2 },
  { name: "UserCheck", label: "Interview", icon: UserCheck },
  { name: "Calendar", label: "Appointment", icon: Calendar },
  { name: "MapPin", label: "Location", icon: MapPin },
  { name: "Sparkles", label: "Special", icon: Sparkles },
  { name: "Paperclip", label: "Attachment", icon: Paperclip },
];

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "🔤 Input Text (Short Text)", icon: FileText },
  { value: "number", label: "🔢 Input Number (Amount / Number)", icon: Binary },
  { value: "textarea", label: "📝 Textarea (Multi-line Text)", icon: AlignLeft },
  { value: "date", label: "📅 Date Picker (Date Selection)", icon: Calendar },
  { value: "file", label: "📎 File Upload (Attachment/PDF)", icon: Paperclip },
  { value: "select", label: "📋 Dropdown Select (Options List)", icon: ListFilter },
];

export function CountryPipelineDetail({ countryId }: { countryId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const rawId = (countryId || (params?.id as string) || "").trim();
  const id = decodeURIComponent(rawId).trim();
  const hasRedirectedRef = useRef(false);

  const [country, setCountry] = useState<CountryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("GENERAL");
  const [stagesState, setStagesState] = useState<
    Array<{
      code: string;
      id: string;
      label: string;
      subtitle: string;
      description: string;
      fields: CustomStageField[];
      iconName: string;
      active: boolean;
      required: boolean;
      isCustom?: boolean;
    }>
  >([]);
  const [savingPipeline, setSavingPipeline] = useState(false);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState<{
    label: string;
    subtitle: string;
    description: string;
    fields: CustomStageField[];
    iconName: string;
    active: boolean;
  }>({
    label: "",
    subtitle: "",
    description: "",
    fields: [],
    iconName: "FileText",
    active: true,
  });

  const fetchCountryData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/countries");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load countries");

      const allCountries = (json.data as CountryRecord[]) || [];
      const lower = id.toLowerCase();

      const found = allCountries.find((c) => {
        if (!c) return false;
        const cId = (c.id || "").trim();
        const cCode = (c.code || "").trim().toLowerCase();
        const cName = (c.name || "").trim().toLowerCase();

        if (cId === rawId || cId === id) return true;
        if (cCode === lower) return true;
        if (cName === lower) return true;

        if (
          (lower.includes("saudi") || lower === "ksa" || lower === "sa") &&
          (cName.includes("saudi") || cCode === "sa" || cCode === "ksa")
        ) {
          return true;
        }
        if (
          (lower.includes("dubai") || lower === "uae" || lower === "ae") &&
          (cName.includes("dubai") || cCode === "ae" || cCode === "uae")
        ) {
          return true;
        }
        if (cName.replace(/\s+/g, "") === lower.replace(/\s+/g, "")) {
          return true;
        }
        return false;
      });

      if (!found) {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          toast.error("Destination country not found");
          router.replace("/module/country-setup");
        }
        return;
      }

      setCountry(found);
      const templateKey = found.workflowType || "GENERAL";
      setSelectedTemplate(templateKey);

      const existingStages = (found.workflow || []) as any[];
      const hasCustomConfig = existingStages.length > 0;

      if (hasCustomConfig) {
        // Build from existing database records preserving order
        const loadedStages = existingStages.map((ex: any) => {
          const master = MASTER_STAGES.find((m) => m.code === ex.code);
          const parsed = parseStageDescription(ex.description || master?.description);
          return {
            code: ex.code,
            id: master?.id || ex.name,
            label: ex.name,
            subtitle: ex.subtitle || master?.subtitle || "Milestone",
            description: parsed.text || "Processing milestone requirement.",
            fields: parsed.fields || [],
            iconName: ex.icon || master?.iconName || "FileText",
            active: Boolean(ex.active),
            required: Boolean(master?.required),
            isCustom: Boolean(ex.isCustom || !master),
          };
        });

        // Add any missing master stages as inactive so admin can easily enable them
        MASTER_STAGES.forEach((m) => {
          if (!loadedStages.some((s) => s.code === m.code)) {
            loadedStages.push({
              code: m.code,
              id: m.id,
              label: m.label,
              subtitle: m.subtitle,
              description: m.description,
              fields: [],
              iconName: m.iconName,
              active: false,
              required: Boolean(m.required),
              isCustom: false,
            });
          }
        });

        setStagesState(loadedStages);
      } else {
        const template = PIPELINE_TEMPLATES[templateKey] || PIPELINE_TEMPLATES.GENERAL;
        const initialStages = MASTER_STAGES.map((m) => ({
          code: m.code,
          id: m.id,
          label: m.label,
          subtitle: m.subtitle,
          description: m.description,
          fields: [],
          iconName: m.iconName,
          active: Boolean(m.required || template.stageCodes.includes(m.code)),
          required: Boolean(m.required),
          isCustom: false,
        }));
        setStagesState(initialStages);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load country pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCountryData();
    }
  }, [id]);

  const persistStagesDirectly = async (stagesToSave: typeof stagesState, showToast = false) => {
    if (!country) return;
    try {
      const allOrderedStages = stagesToSave.map((s, idx) => ({
        code: s.code,
        name: s.label,
        subtitle: s.subtitle || "",
        description: serializeStageDescription(s.description, s.fields),
        icon: s.iconName,
        isCustom: Boolean(s.isCustom),
        sortOrder: idx + 1,
        active: Boolean(s.active),
        terminal: s.code === "FLIGHT",
      }));

      const res = await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: country.id,
          workflowType: selectedTemplate,
          stages: allOrderedStages,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save pipeline configuration");

      if (showToast) {
        toast.success(`Pipeline saved & synced to database!`);
      }
    } catch (err: any) {
      console.error("Auto-persist error:", err);
    }
  };

  const applyTemplateToStages = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = PIPELINE_TEMPLATES[templateKey] || PIPELINE_TEMPLATES.GENERAL;

    const nextStages = stagesState.map((s) => ({
      ...s,
      active: s.required || template.stageCodes.includes(s.code as any),
    }));
    setStagesState(nextStages);
    persistStagesDirectly(nextStages, false);
    toast.info(`Applied "${template.name}" workflow preset (${template.stageCodes.length} stages)`);
  };

  const toggleStageActive = (code: string) => {
    const nextStages = stagesState.map((s) => {
      if (s.code === code) {
        if (s.required) {
          toast.info(`Stage "${s.label}" is mandatory for compliance.`);
          return s;
        }
        return { ...s, active: !s.active };
      }
      return s;
    });
    setStagesState(nextStages);
    persistStagesDirectly(nextStages, false);
  };

  const openAddModal = () => {
    setModalMode("ADD");
    setEditingCode(null);
    setStageForm({
      label: "",
      subtitle: "",
      description: "",
      fields: [],
      iconName: "FileCheck",
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (stage: (typeof stagesState)[0]) => {
    setModalMode("EDIT");
    setEditingCode(stage.code);
    setStageForm({
      label: stage.label,
      subtitle: stage.subtitle || "",
      description: stage.description || "",
      fields: Array.isArray(stage.fields) ? [...stage.fields] : [],
      iconName: stage.iconName || "FileText",
      active: stage.active,
    });
    setModalOpen(true);
  };

  const addCustomField = () => {
    const count = stageForm.fields.length + 1;
    const newField: CustomStageField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: `Field ${count}`,
      type: "text",
      placeholder: `Enter field ${count} value...`,
      required: false,
      options: "",
    };
    setStageForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const updateCustomField = (index: number, patch: Partial<CustomStageField>) => {
    setStageForm((prev) => {
      const copy = [...prev.fields];
      copy[index] = { ...copy[index], ...patch };
      return { ...prev, fields: copy };
    });
  };

  const removeCustomField = (index: number) => {
    setStageForm((prev) => {
      const copy = [...prev.fields];
      copy.splice(index, 1);
      return { ...prev, fields: copy };
    });
  };

  const handleSaveStageForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.label.trim()) {
      toast.error("Please enter a stage name/label");
      return;
    }

    // Ensure all fields have valid labels and fallback if blank
    const validFields = stageForm.fields.map((f, idx) => {
      let label = (f.label || "").trim();
      if (!label) {
        label = (f.placeholder || "").trim() || (
          f.type === "file" ? `Document Attachment ${idx + 1}` :
          f.type === "number" ? `Amount / Number ${idx + 1}` :
          f.type === "date" ? `Date Selection ${idx + 1}` :
          f.type === "textarea" ? `Remarks / Notes ${idx + 1}` :
          f.type === "select" ? `Selection Option ${idx + 1}` :
          `Input Field ${idx + 1}`
        );
      }
      return {
        ...f,
        label,
        placeholder: f.placeholder?.trim() || "",
        options: f.options?.trim() || "",
      };
    });

    let updatedStagesList: typeof stagesState = [];

    if (modalMode === "ADD") {
      const customCode = `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const newStageItem = {
        code: customCode,
        id: stageForm.label.trim(),
        label: stageForm.label.trim(),
        subtitle: stageForm.subtitle.trim() || "Custom Step",
        description: stageForm.description.trim() || "Custom recruitment stage requirement.",
        fields: validFields,
        iconName: stageForm.iconName,
        active: stageForm.active,
        required: false,
        isCustom: true,
      };

      // Place before Flight (terminal step) if present
      const flightIdx = stagesState.findIndex((s) => s.code === "FLIGHT");
      if (flightIdx !== -1) {
        const copy = [...stagesState];
        copy.splice(flightIdx, 0, newStageItem);
        updatedStagesList = copy;
      } else {
        updatedStagesList = [...stagesState, newStageItem];
      }

      setStagesState(updatedStagesList);
      persistStagesDirectly(updatedStagesList, true);
      toast.success(`Custom stage "${newStageItem.label}" added & saved (${validFields.length} input fields configured)`);
    } else if (modalMode === "EDIT" && editingCode) {
      updatedStagesList = stagesState.map((s) =>
        s.code === editingCode
          ? {
              ...s,
              id: stageForm.label.trim(),
              label: stageForm.label.trim(),
              subtitle: stageForm.subtitle.trim() || s.subtitle,
              description: stageForm.description.trim() || s.description,
              fields: validFields,
              iconName: stageForm.iconName,
              active: s.required ? true : stageForm.active,
            }
          : s
      );

      setStagesState(updatedStagesList);
      persistStagesDirectly(updatedStagesList, true);
      toast.success(`Stage "${stageForm.label}" updated & saved (${validFields.length} input fields configured)`);
    }

    setModalOpen(false);
  };

  const handleDeleteStage = (code: string, label: string) => {
    if (!confirm(`Are you sure you want to delete stage "${label}"?`)) return;
    const nextStages = stagesState.filter((s) => s.code !== code);
    setStagesState(nextStages);
    persistStagesDirectly(nextStages, true);
    toast.success(`Stage "${label}" removed from pipeline`);
  };

  const moveStageUp = (index: number) => {
    if (index === 0) return;
    const copy = [...stagesState];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setStagesState(copy);
    persistStagesDirectly(copy, false);
  };

  const moveStageDown = (index: number) => {
    if (index >= stagesState.length - 1) return;
    const copy = [...stagesState];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setStagesState(copy);
    persistStagesDirectly(copy, false);
  };

  const handleSavePipelineConfig = async () => {
    if (!country) return;
    setSavingPipeline(true);
    try {
      await persistStagesDirectly(stagesState, false);
      const activeCount = stagesState.filter((s) => s.active).length;
      toast.success(`Pipeline for "${country.name}" saved with ${activeCount} active stages!`);
      await fetchCountryData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update pipeline stages");
    } finally {
      setSavingPipeline(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
        <p style={{ fontSize: "14px", fontWeight: 600 }}>Loading destination pipeline configuration...</p>
      </div>
    );
  }

  if (!country) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Country not found.</p>
        <Link data-action-ui="neutral" data-action-size="normal" href="/module/country-setup" style={{ color: "var(--purple)", fontWeight: 700 }}>
          ← Back to Destination Countries
        </Link>
      </div>
    );
  }

  const activeStagesList = stagesState.filter((s) => s.active);
  const flag = getCountryFlagEmoji(country.code, country.name);

  return (
    <div className="country-pipeline-container country-design-page country-pipeline-design-page">
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb">
        Dashboard / <Link href="/module/country-setup">Destination Country Management</Link> / {country.name} Pipeline
      </nav>

      <header className="country-design-heading country-pipeline-heading">
        <div>
          <div className="country-pipeline-title-row">
            <h1>{flag} {country.name} Pipeline</h1>
            <span className="country-pipeline-code">{country.code}</span>
            <span className={`country-pipeline-status ${country.active ? "active" : "inactive"}`}>
              {country.active ? "● Active Pipeline" : "○ Inactive"}
            </span>
          </div>
          <p>Customize and manage the candidate processing workflow, custom input fields &amp; milestones for {country.name}.</p>
        </div>
        <div className="country-design-actions country-pipeline-actions">
          <Link data-action-ui="neutral" data-action-size="normal" href="/module/country-setup"><ArrowLeft size={14} /> Back to Countries</Link>
          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => applyTemplateToStages(selectedTemplate)}><RefreshCw size={14} /> Reset Defaults</button>
          <button data-action-ui="primary" data-action-size="normal" type="button" className="country-pipeline-primary" disabled={savingPipeline} onClick={handleSavePipelineConfig}>
            <Save size={14} /> {savingPipeline ? "Saving..." : "Save Pipeline Configuration"}
          </button>
        </div>
      </header>

      <div className="country-design-metrics country-pipeline-metrics">
        <div className="country-design-metric">
          <div><span>Total {country.name} Candidates</span><Users size={16} className="country-pipeline-blue" /></div>
          <b>{country.candidateCount}</b><p>Registered candidate files</p>
        </div>
        <div className="country-design-metric">
          <div><span>Active Processing Stages</span><Layers size={16} className="country-pipeline-purple" /></div>
          <b>{activeStagesList.length}</b><p>{stagesState.length} available milestones</p>
        </div>
        <div className="country-design-metric country-pipeline-text-metric">
          <div><span>Country Currency</span><Coins size={16} className="country-pipeline-green" /></div>
          <b>{country.currency}</b><p>Destination currency</p>
        </div>
        <div className="country-design-metric country-pipeline-text-metric">
          <div><span>Local Timezone</span><Clock size={16} className="country-pipeline-orange" /></div>
          <b>{country.timezone}</b><p>Destination local time</p>
        </div>
      </div>

      <section className="country-pipeline-panel country-template-panel" aria-labelledby="pipeline-templates-title">
        <div className="country-pipeline-panel-heading">
          <div>
            <h2 id="pipeline-templates-title">1-Click Workflow Preset Templates</h2>
            <p>Switch or apply standard recruitment pipelines across Gulf, European or East Asian destinations.</p>
          </div>
          <span className="country-pipeline-badge">Template: {selectedTemplate}</span>
        </div>
        <div className="country-template-grid">
          {Object.values(PIPELINE_TEMPLATES).map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button key={tmpl.id} type="button" aria-pressed={isSelected}
                className={`country-template-card ${isSelected ? "selected" : ""}`}
                onClick={() => applyTemplateToStages(tmpl.id)}>
                <div className="country-template-title">
                  <strong>{tmpl.flag} {tmpl.badge}</strong>
                  {isSelected && <span className="country-template-active">Active</span>}
                </div>
                <p>{tmpl.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="country-pipeline-panel country-stepper-ribbon" aria-labelledby="pipeline-preview-title">
        <div className="country-pipeline-panel-heading">
          <div>
            <h2 id="pipeline-preview-title">Active Stepper Sequence Flow ({activeStagesList.length} Stages Active)</h2>
            <p>Preview the processing sequence shown in candidate dossiers.</p>
          </div>
          <span className="country-pipeline-badge">Candidate Dossier Stepper Preview</span>
        </div>
        <div className="country-pipeline-sequence" role="region" aria-label="Active stage sequence" tabIndex={0}>
          {activeStagesList.map((st, idx) => (
            <div key={st.code} className="country-pipeline-sequence-step">
              <span className="country-pipeline-step-number">{idx + 1}</span>
              <strong>{st.label}</strong>
              {idx < activeStagesList.length - 1 && <ArrowRight size={14} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <section className="country-pipeline-panel country-master-stages-panel" aria-labelledby="pipeline-stages-title">
        <div className="country-pipeline-panel-heading">
          <div>
            <h2 id="pipeline-stages-title">Master Recruitment Stages ({stagesState.length} Stages Available)</h2>
            <p>Toggle stages ON / OFF. Use arrows (↑ / ↓) to re-order the processing sequence.</p>
          </div>
          <div className="country-pipeline-stage-actions">
            <button data-action-ui="primary" data-action-size="normal" type="button" className="country-pipeline-primary" onClick={openAddModal}><Plus size={14} /> Add Custom Stage</button>
            <span className="country-pipeline-enabled">● {activeStagesList.length} Enabled</span>
            <span className="country-pipeline-disabled">● {stagesState.length - activeStagesList.length} Disabled</span>
          </div>
        </div>
        <div className="country-stage-grid">
          {stagesState.map((st, index) => {
            const IconComponent = getStageIcon(st.iconName);
            const fieldCount = st.fields?.length || 0;
            return (
              <div key={st.code} className={`country-stage-card ${st.active ? "enabled" : "disabled"}`}>
                <div className="country-stage-card-heading">
                  <div className="country-stage-identity">
                    <div className="country-stage-icon"><IconComponent size={18} /></div>
                    <div>
                      <div className="country-stage-title"><h3>{st.label}</h3>{st.isCustom && <span className="country-pipeline-badge">Custom</span>}</div>
                      <small>{st.subtitle}</small>
                    </div>
                  </div>
                  {st.required ? <span className="country-stage-required">Required</span> : (
                    <button type="button" className="country-stage-toggle" aria-pressed={st.active}
                      aria-label={`${st.active ? "Disable" : "Enable"} ${st.label}`}
                      onClick={() => toggleStageActive(st.code)}>{st.active ? "ON" : "OFF"}</button>
                  )}
                </div>
                <p>{st.description}</p>
                {fieldCount > 0 && <span className="country-pipeline-badge country-stage-field-count">📋 {fieldCount} Custom Input Field{fieldCount > 1 ? "s" : ""} Configured</span>}
                <div className="country-stage-card-footer">
                  <div className="country-stage-reorder">
                    <button data-action-ui="secondary" data-action-size="icon" type="button" disabled={index === 0} onClick={() => moveStageUp(index)}
                      title="Move stage earlier in sequence" aria-label={`Move ${st.label} earlier`}><ArrowUp size={14} /></button>
                    <button data-action-ui="secondary" data-action-size="icon" type="button" disabled={index === stagesState.length - 1} onClick={() => moveStageDown(index)}
                      title="Move stage later in sequence" aria-label={`Move ${st.label} later`}><ArrowDown size={14} /></button>
                    <span>Pos #{index + 1}</span>
                  </div>
                  <div className="country-stage-edit-actions">
                    <button data-action-ui="secondary" data-action-size="normal" type="button" onClick={() => openEditModal(st)} title="Edit stage & custom input fields"
                      aria-label={`Edit ${st.label}`}><Edit2 size={12} /> Edit {fieldCount > 0 ? `(${fieldCount})` : ""}</button>
                    {st.isCustom && <button data-action-ui="danger" data-action-size="normal" type="button" className="country-stage-delete" onClick={() => handleDeleteStage(st.code, st.label)}
                      title="Delete custom stage"><Trash2 size={12} /> Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="country-bottom-bar">
        <Link href="/module/country-setup">Cancel &amp; Return</Link>
        <button data-action-ui="primary" data-action-size="normal" type="button" className="country-pipeline-primary" disabled={savingPipeline} onClick={handleSavePipelineConfig}>
          <CheckCircle2 size={14} /> {savingPipeline ? "Saving Pipeline..." : "Save Pipeline Configuration"}
        </button>
      </div>

      {/* 7. ADD / EDIT STAGE & CUSTOM FIELD BUILDER MODAL */}
      {modalOpen && (
        <div aria-label="Dialog" className="master-modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="country-modal-card master-modal-card master-modal-panel"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <b style={{ fontSize: "16px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "#007aff" }} />
                {modalMode === "ADD" ? "Add Custom Recruitment Stage" : `Configure Stage: ${stageForm.label}`}
              </b>
              <button data-action-ui="neutral" data-action-size="icon" className="master-modal-close"
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close stage editor"
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleSaveStageForm} style={{ padding: "22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Basic Info */}
              <div className="country-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    Stage Name / Title <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biometric & Fingerprint, Contract Sign"
                    value={stageForm.label}
                    onChange={(e) => setStageForm({ ...stageForm, label: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--line)",
                      background: "#fafafd",
                      fontSize: "13px",
                      color: "var(--ink)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                    Subtitle / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VFS Appointment, Agreement Verification"
                    value={stageForm.subtitle}
                    onChange={(e) => setStageForm({ ...stageForm, subtitle: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--line)",
                      background: "#fafafd",
                      fontSize: "13px",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Description / Milestone Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what documents, tests, or clearances are verified at this stage..."
                  value={stageForm.description}
                  onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    background: "#fafafd",
                    fontSize: "13px",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink)", display: "block", marginBottom: "8px" }}>
                  Select Stage Icon
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                  {AVAILABLE_ICONS.map((ic) => {
                    const IconComp = ic.icon;
                    const isSelected = stageForm.iconName === ic.name;
                    return (
                      <button aria-pressed={isSelected}
                        key={ic.name}
                        type="button"
                        onClick={() => setStageForm({ ...stageForm, iconName: ic.name })}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          padding: "8px 4px",
                          borderRadius: "8px",
                          border: `1.5px solid ${isSelected ? "#007aff" : "#e2e8f0"}`,
                          background: isSelected ? "#eaf2ff" : "#ffffff",
                          color: isSelected ? "#007aff" : "#475569",
                          cursor: "pointer",
                          fontSize: "10.5px",
                          fontWeight: isSelected ? 800 : 600,
                        }}
                      >
                        <IconComp size={16} />
                        <span style={{ fontSize: "10px", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                          {ic.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM FORM FIELDS BUILDER SECTION */}
              <div className="master-modal-panel"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ fontSize: "13px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckSquare size={16} style={{ color: "#007aff" }} />
                      Custom Processing Form Fields (Add Input Field)
                    </b>
                    <small style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                      Define input text, number, textarea, date or file upload fields for this stage
                    </small>
                  </div>
                  <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
                    type="button"
                    onClick={addCustomField}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      background: "#007aff",
                      color: "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={13} /> Add Input Field
                  </button>
                </div>

                {stageForm.fields.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "10px", color: "var(--muted)", fontSize: "12px" }}>
                    No custom fields added yet. Click <b>&quot;+ Add Input Field&quot;</b> to add Text, Number, Textarea, Date or File upload fields.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {stageForm.fields.map((field, fIdx) => (
                      <div className="master-modal-panel"
                        key={field.id || fIdx}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr auto", gap: "10px", alignItems: "center" }}>
                          {/* Field Label */}
                          <input
                            type="text"
                            placeholder="Field Label (e.g. VFS Token No, Test Score)"
                            value={field.label}
                            onChange={(e) => updateCustomField(fIdx, { label: e.target.value })}
                            style={{
                              height: "36px",
                              padding: "0 10px",
                              borderRadius: "8px",
                              border: "1px solid var(--line)",
                              fontSize: "12.5px",
                              fontWeight: 700,
                            }}
                          />

                          {/* Field Type Selector */}
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newType = e.target.value as any;
                              const patch: any = { type: newType };
                              if (!field.label || field.label.startsWith("Field ")) {
                                if (newType === "file") patch.label = "Document / File Upload";
                                else if (newType === "number") patch.label = "Amount / Number";
                                else if (newType === "date") patch.label = "Appointment / Milestone Date";
                                else if (newType === "textarea") patch.label = "Special Remarks & Notes";
                                else if (newType === "select") patch.label = "Status / Result Option";
                                else patch.label = "Text Input Field";
                              }
                              updateCustomField(fIdx, patch);
                            }}
                            style={{
                              height: "36px",
                              padding: "0 10px",
                              borderRadius: "8px",
                              border: "1px solid var(--line)",
                              background: "#f8fafc",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--ink)",
                            }}
                          >
                            {FIELD_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {/* Delete Field */}
                          <button data-action-ui="danger" data-action-size="icon" className="master-modal-danger"
                            type="button"
                            onClick={() => removeCustomField(fIdx)}
                            title="Remove field"
                            style={{
                              background: "#fff1f2",
                              border: "1px solid #fecdd3",
                              color: "#e11d48",
                              borderRadius: "6px",
                              padding: "6px 8px",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Extra Field Settings Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Hint or Placeholder text (Optional)"
                            value={field.placeholder || ""}
                            onChange={(e) => updateCustomField(fIdx, { placeholder: e.target.value })}
                            style={{
                              height: "32px",
                              padding: "0 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--line)",
                              fontSize: "11.5px",
                            }}
                          />

                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) => updateCustomField(fIdx, { required: e.target.checked })}
                              style={{ accentColor: "#007aff" }}
                            />
                            Required
                          </label>
                        </div>

                        {field.type === "select" && (
                          <div>
                            <input
                              type="text"
                              placeholder="Comma-separated options (e.g. Fit, Unfit, Pending Approval)"
                              value={field.options || ""}
                              onChange={(e) => updateCustomField(fIdx, { options: e.target.value })}
                              style={{
                                width: "100%",
                                height: "32px",
                                padding: "0 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "11.5px",
                                background: "#fafafd",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Switch */}
              <div className="master-modal-panel" style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <input
                  type="checkbox"
                  id="stageActiveCheck"
                  checked={stageForm.active}
                  onChange={(e) => setStageForm({ ...stageForm, active: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "#007aff", cursor: "pointer" }}
                />
                <label htmlFor="stageActiveCheck" style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}>
                  Enable this stage in active candidate processing pipeline
                </label>
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                <button data-action-ui="neutral" data-action-size="normal"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "#ffffff",
                    color: "var(--ink)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
                  type="submit"
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "#007aff",
                    color: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,122,255,0.3)",
                  }}
                >
                  {modalMode === "ADD" ? "Add Stage to Pipeline" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
