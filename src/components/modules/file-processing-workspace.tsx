"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Globe,
  GraduationCap,
  History,
  Layers,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Plane,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table,
  UploadCloud,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { MoneyReceiptModal, type ReceiptData } from "@/components/modals/money-receipt-modal";
import { DocumentViewerModal, type DocumentViewerData } from "@/components/modals/document-viewer-modal";
import {
  MASTER_STAGES,
  getStageIcon,
  getDefaultStagesForCountry,
} from "@/lib/country-pipeline";
import { parseStageDescription } from "@/components/modules/country-pipeline-detail";

type ProcessingFileData = {
  id: string;
  fileNo: string;
  country: string;
  currentStage: string;
  status: string;
  profession?: string;
  company?: string;
  demand?: string;
  openedAt?: string;
  deadline?: string;
  office?: { id: string; name: string; code?: string; city?: string };
  companyRecord?: { id: string; name: string };
  demandRecord?: { id: string; demandNo?: string; title?: string };
  candidate: {
    id: string;
    candidateNo: string;
    registrationNo?: string;
    fullName: string;
    phone: string;
    email?: string;
    district?: string;
    address?: string;
    dob?: string;
    gender?: string;
    maritalStatus?: string;
    education?: string;
    experience?: string;
    profession?: string;
    preferredCountry?: string;
    passportNo?: string;
    nationalId?: string;
    source?: string;
    agentName?: string;
    office?: { id: string; name: string } | string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    phones?: Array<{ id: string; phone: string; label?: string; isPrimary: boolean }>;
    educations?: Array<{ id: string; level: string; institution?: string; subject?: string; passingYear?: number; result?: string }>;
    experiences?: Array<{ id: string; employer?: string; role: string; country?: string; years?: number; skills?: unknown }>;
    calls?: Array<{
      id: string;
      leadNo: string;
      fullName: string;
      phone: string;
      purpose?: string;
      priority: number;
      status: string;
      assignedTo?: { id: string; name: string };
      createdAt: string;
      followUps?: Array<{ id: string; dueAt: string; purpose: string; status: string; note?: string }>;
      callRecords?: Array<{ id: string; startedAt: string; durationSec?: number; outcome: string; note?: string }>;
    }>;
  };
  assignedTo?: { id: string; name: string; phone?: string };
  passport?: {
    id?: string;
    passportNumber: string;
    passportType?: string;
    expiryDate: string;
    issueDate: string;
    issuePlace?: string;
    issuingAuthority?: string;
    nationality?: string;
    verificationStatus: string;
    remarks?: string;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  medical?: Array<{
    id: string;
    center?: string;
    centerName?: string;
    result: string;
    testDate?: string;
    expiryDate?: string;
    metadata?: Record<string, unknown>;
    remarks?: string;
  }>;
  mofa?: Array<{
    id: string;
    mofaNumber: string;
    status: string;
    submitDate?: string;
    doneDate?: string;
    issuedAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  visas?: Array<{
    id: string;
    visaNumber: string;
    status: string;
    issueDate?: string;
    expiryDate?: string;
    metadata?: Record<string, unknown>;
  }>;
  payments?: Array<{
    id: string;
    type: string;
    amount: number;
    currency?: string;
    status: string;
    referenceNo?: string;
    reference?: string;
    method?: string;
    collector?: string;
    collectedAt?: string;
    createdAt: string;
  }>;
  flights?: Array<{
    ticketNo?: string;
    ticketNumber?: string;
    baggage?: string;
    flown?: boolean;
    flight?: {
      id?: string;
      airline: string;
      flightNumber?: string;
      flightNo?: string;
      departureDate?: string;
      departureAt?: string;
      arrivalAt?: string;
      departureAirport?: string;
      destination?: string;
      status: string;
      pnr?: string;
    };
  }>;
  police?: Array<{
    id: string;
    applicationNumber?: string;
    applicationDate?: string;
    issueDate?: string;
    expiryDate?: string;
    result?: string;
    status?: string;
    certificateKey?: string;
  }>;
  takamul?: Array<{
    id: string;
    registrationNumber?: string;
    certificateNumber?: string;
    examDate?: string;
    presentDate?: string;
    centerDistrict?: string;
    status: string;
    reportStatus: string;
    doneBy?: string;
    remarks?: string;
  }>;
  manpower?: Array<{
    id: string;
    reference?: string;
    status?: string;
    company?: string;
    profession?: string;
    submittedAt?: string;
    approvedAt?: string;
    requirements?: Record<string, unknown>;
  }>;
  holds?: Array<{
    id: string;
    type?: string;
    reason: string;
    note?: string;
    status: string;
    actionDate?: string;
    expectedRelease?: string;
    createdAt: string;
    financialImpact?: number;
  }>;
  statusHistory?: Array<{
    id: string;
    previousStage?: string;
    newStage?: string;
    previousStatus?: string;
    newStatus?: string;
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
    createdAt: string;
  }>;
  documents?: Array<{
    id: string;
    type: string;
    title?: string;
    fileName?: string;
    fileUrl?: string;
    url?: string;
    createdAt: string;
  }>;
  agent?: string;
  agentRecord?: { id: string; name: string; code: string; phone?: string; district?: string } | null;
  biometrics?: Array<{
    id?: string;
    status?: string;
    fingerDate?: string;
    appointmentDate?: string;
    presentDate?: string;
    evidenceKey?: string;
    completedAt?: string;
  }>;
  workflowEvents?: Array<{
    id: string;
    stage: string;
    status: string;
    data?: {
      title?: string;
      description?: string;
      price?: number;
      fileName?: string;
      fileSize?: string;
      fileData?: string;
      authorRole?: string;
      createdAt?: string;
    };
    completedBy?: string;
    createdAt: string;
  }>;
};

const saudiStages = [
  { id: "Passport Entry", stepNo: 1, label: "Passport", subtitle: "Entry & Expiry", description: "", fields: [], isCustom: false, code: "PASSPORT", icon: FileText },
  { id: "Medical", stepNo: 2, label: "Medical", subtitle: "Fit Result & Bio", description: "", fields: [], isCustom: false, code: "MEDICAL", icon: ShieldCheck },
  { id: "Police Clearance", stepNo: 3, label: "Police PCC", subtitle: "Clearance Cert", description: "", fields: [], isCustom: false, code: "PCC", icon: ShieldCheck },
  { id: "Payment", stepNo: 4, label: "Payment", subtitle: "Deposits & Fee", description: "", fields: [], isCustom: false, code: "PAYMENT", icon: CreditCard },
  { id: "Takamul", stepNo: 5, label: "Takamul", subtitle: "SVP Skill Test", description: "", fields: [], isCustom: false, code: "TAKAMUL", icon: GraduationCap },
  { id: "Mofa", stepNo: 6, label: "Visa / MOFA", subtitle: "Embassy Stamp", description: "", fields: [], isCustom: false, code: "MOFA", icon: Globe },
  { id: "Manpower", stepNo: 7, label: "Manpower", subtitle: "BMET Smart Card", description: "", fields: [], isCustom: false, code: "MANPOWER", icon: FileCheck },
  { id: "Flight", stepNo: 8, label: "Flight", subtitle: "Ticket & Depart", description: "", fields: [], isCustom: false, code: "FLIGHT", icon: Plane },
];

const dubaiStages = [
  { id: "Passport Entry", stepNo: 1, label: "Passport", subtitle: "Entry & Expiry", description: "", fields: [], isCustom: false, code: "PASSPORT", icon: FileText },
  { id: "Medical", stepNo: 2, label: "Medical", subtitle: "Fitness & Bio", description: "", fields: [], isCustom: false, code: "MEDICAL", icon: ShieldCheck },
  { id: "Payment", stepNo: 3, label: "Payment", subtitle: "Deposits & Fee", description: "", fields: [], isCustom: false, code: "PAYMENT", icon: CreditCard },
  { id: "Approval Application", stepNo: 4, label: "Labor Approval", subtitle: "Offer & MOHRE", description: "", fields: [], isCustom: false, code: "APPROVAL", icon: FileCheck },
  { id: "E-Visa Stamping", stepNo: 5, label: "E-Visa / Permit", subtitle: "Dubai Entry Visa", description: "", fields: [], isCustom: false, code: "VISA_STAMPING", icon: Globe },
  { id: "Manpower", stepNo: 6, label: "Manpower", subtitle: "BMET Clearance", description: "", fields: [], isCustom: false, code: "MANPOWER", icon: FileCheck },
  { id: "Flight", stepNo: 7, label: "Flight", subtitle: "Ready & Depart", description: "", fields: [], isCustom: false, code: "FLIGHT", icon: Plane },
];

const otherStages = [
  { id: "Passport Entry", stepNo: 1, label: "Passport", subtitle: "Entry & Expiry", description: "", fields: [], isCustom: false, code: "PASSPORT", icon: FileText },
  { id: "Medical", stepNo: 2, label: "Medical", subtitle: "Fitness & Bio", description: "", fields: [], isCustom: false, code: "MEDICAL", icon: ShieldCheck },
  { id: "Police Clearance", stepNo: 3, label: "Police PCC", subtitle: "Clearance Cert", description: "", fields: [], isCustom: false, code: "PCC", icon: ShieldCheck },
  { id: "Payment", stepNo: 4, label: "Payment", subtitle: "Deposits & Fee", description: "", fields: [], isCustom: false, code: "PAYMENT", icon: CreditCard },
  { id: "E-Visa Stamping", stepNo: 5, label: "Visa Stamping", subtitle: "Embassy Stamp", description: "", fields: [], isCustom: false, code: "VISA_STAMPING", icon: Globe },
  { id: "Manpower", stepNo: 6, label: "Manpower", subtitle: "BMET Clearance", description: "", fields: [], isCustom: false, code: "MANPOWER", icon: FileCheck },
  { id: "Flight", stepNo: 7, label: "Flight", subtitle: "Ticket & Depart", description: "", fields: [], isCustom: false, code: "FLIGHT", icon: Plane },
];

function FileUploadField({
  label,
  category,
  attachedFile,
  onFileSelect,
  onPreview,
  onRemove,
}: {
  label: string;
  category: string;
  attachedFile?: { url: string; fileName: string; size: string };
  onFileSelect: (file: File) => void;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="file-upload-field">
      <div className="file-upload-header">
        <span className="file-upload-label">
          <Paperclip size={14} className="text-indigo-600" /> {label}
        </span>
        <span className="file-upload-hint">PDF, JPG, PNG (Max 10MB)</span>
      </div>

      {attachedFile ? (
        <div className="file-attached-card">
          <div className="file-info-col">
            <div className="file-icon-badge">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div className="file-meta">
              <strong className="file-name">{attachedFile.fileName}</strong>
              <small className="file-size">
                {attachedFile.size} · <span className="text-emerald-600 font-bold">✓ Physical Scan Attached</span>
              </small>
            </div>
          </div>
          <div className="file-actions-row">
            <button type="button" className="btn-file-view" onClick={onPreview}>
              <Eye size={14} /> View File
            </button>
            <button type="button" className="btn-file-change" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn-file-remove" onClick={onRemove} title="Remove File">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="file-dropzone-empty" onClick={() => inputRef.current?.click()}>
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <UploadCloud size={20} className="text-indigo-500" />
            </div>
            <div className="dropzone-text">
              <strong>Click to upload or drag &amp; drop document scan</strong>
              <span>Optional physical scan attachment for candidate dossier</span>
            </div>
            <span className="btn-browse-file">Browse File</span>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
    </div>
  );
}

export function FileProcessingWorkspace({
  fileId,
  initialData,
}: {
  fileId?: string;
  initialData?: ProcessingFileData;
} = {}) {
  const queryClient = useQueryClient();
  const params = useParams();
  const id = fileId || (params?.id as string);
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage") || searchParams.get("step") || searchParams.get("tab");

  // Navigation & View Modes (Default to all-tables "dossier" so user sees EVERYTHING immediately)
  const [mainView, setMainView] = useState<"dossier" | "pipeline" | "ledger" | "timeline">("dossier");
  const [activeTab, setActiveTab] = useState<string>("Passport Entry");
  const [activeDossierSection, setActiveDossierSection] = useState<string>("all");
  
  // Modals state
  const [saving, setSaving] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEditBioModal, setShowEditBioModal] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState(20000);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentViewerData | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [notePrice, setNotePrice] = useState("");
  const [noteTag, setNoteTag] = useState("General Note");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [notesList, setNotesList] = useState<Array<{ id: string; title?: string; text: string; author: string; role: string; createdAt: string; tag: string; price?: number; isDb?: boolean }>>([]);

  const handleCreateFileNote = async () => {
    if (!newNote.trim() && !noteTitle.trim()) {
      toast.error("Please enter a note title or description.");
      return;
    }
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-note",
          title: noteTitle.trim() || noteTag || "General Remark",
          description: newNote.trim(),
          price: notePrice ? Number(notePrice) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save note");
      toast.success("Note saved successfully!");
      setNewNote("");
      setNoteTitle("");
      setNotePrice("");
      await query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteFileNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-note",
          noteId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete note");
      toast.success("Note removed successfully.");
      await query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  // Physical file attachments map (Category -> { url, fileName, size })
  const [attachedFiles, setAttachedFiles] = useState<Record<string, { url: string; fileName: string; size: string }>>({});

  const query = useQuery<ProcessingFileData>({
    queryKey: ["processing-file-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) throw new Error("Could not load file details");
      const json = await res.json();
      return json.data as ProcessingFileData;
    },
    enabled: Boolean(id),
    initialData,
  });

  const countriesQuery = useQuery({
    queryKey: ["countries-list-stages"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as Array<{
        name: string;
        code: string;
        workflowType: string;
        workflow?: Array<{ code: string; name: string; sortOrder: number; active: boolean }>;
      }>;
    },
  });

  const file = query.data;
  const stages = useMemo(() => {
    if (!file) return otherStages;

    const matchedCountry = (countriesQuery.data || []).find(
      (c) =>
        c.name.toLowerCase() === (file.country || "").toLowerCase() ||
        c.code.toLowerCase() === (file.country || "").toLowerCase()
    );

    if (matchedCountry?.workflow && matchedCountry.workflow.length > 0) {
      const activeDbStages = matchedCountry.workflow.filter((w) => w.active);
      if (activeDbStages.length > 0) {
        return activeDbStages.map((w: any, idx: number) => {
          const masterDef = MASTER_STAGES.find((m) => m.code === w.code);
          const iconName = w.icon || masterDef?.iconName || "FileText";
          const parsed = parseStageDescription(w.description || masterDef?.description);
          const isCustomStage = Boolean(w.isCustom || !masterDef);
          return {
            id: masterDef ? masterDef.id : (w.name || w.code),
            stepNo: idx + 1,
            label: w.name || masterDef?.label || "Stage",
            subtitle: w.subtitle || masterDef?.subtitle || "Milestone",
            description: parsed.text || "",
            fields: parsed.fields || [],
            icon: getStageIcon(iconName),
            code: w.code,
            isCustom: isCustomStage,
          };
        });
      }
    }

    // Default fallback to country template
    const defStages = getDefaultStagesForCountry(file.country || "", matchedCountry?.workflowType);
    return defStages.map((s, idx) => ({
      id: s.id,
      stepNo: idx + 1,
      label: s.label,
      subtitle: s.subtitle,
      description: s.description || "",
      fields: [] as any[],
      icon: s.icon,
      code: s.code,
      isCustom: false,
    }));
  }, [file, countriesQuery.data]);

  const isSaudi = /saudi|ksa/i.test(file?.country || "");
  const isDubai = /dubai|uae|emirates/i.test(file?.country || "");
  const isOtherCountry = !isSaudi && !isDubai;

  useEffect(() => {
    if (stageParam) {
      if (stageParam.toLowerCase() === "payment") {
        setMainView("pipeline");
        setActiveTab("Payment");
      } else {
        setMainView("pipeline");
        setActiveTab(stageParam);
      }
    } else if (file?.currentStage) {
      if (file.currentStage === "First Payment" || file.currentStage === "Second Payment") {
        setActiveTab("Payment");
      } else {
        setActiveTab(file.currentStage);
      }
    }
  }, [stageParam, file?.currentStage]);

  // Data-Driven Stage Completion Checker
  const isStageCompleted = (stageId: string): boolean => {
    if (!file) return false;
    switch (stageId) {
      case "Passport Entry":
        return Boolean(file.passport?.passportNumber || file.candidate?.passportNo);
      case "Medical":
        return Boolean(file.medical && file.medical.length > 0);
      case "Police Clearance":
        return Boolean(file.police && file.police.length > 0);
      case "Payment":
      case "First Payment":
      case "Second Payment":
        return Boolean(file.payments && file.payments.length > 0);
      case "Takamul":
        return Boolean(file.takamul && file.takamul.length > 0);
      case "Mofa":
        return Boolean((file.mofa && file.mofa.length > 0) || (file.visas && file.visas.length > 0));
      case "Approval Application":
        return Boolean(file.visas && file.visas.length > 0);
      case "E-Visa Stamping":
        return Boolean(file.visas && file.visas.some((v) => v.visaNumber && v.status !== "Rejected"));
      case "Manpower":
        return Boolean(file.manpower && file.manpower.length > 0);
      case "Flight":
        return Boolean((file.flights && file.flights.length > 0) || file.status === "COMPLETED");
      default: {
        const customEvent = file.workflowEvents?.find(
          (e) => e.stage === stageId || e.stage === (stages.find((s) => s.id === stageId) as any)?.code
        );
        return Boolean(customEvent && customEvent.status !== "Rejected" && customEvent.status !== "Pending");
      }
    }
  };

  const completedCount = stages.filter((s) => isStageCompleted(s.id)).length;
  const progressPercent = Math.min(100, Math.round((completedCount / stages.length) * 100));
  const currentStageIndex = stages.findIndex((s) => s.id === file?.currentStage);

  // File Upload Helper
  const handleLocalFileUpload = (category: string, fileInput: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const sizeFormatted = (fileInput.size / (1024 * 1024)).toFixed(2) + " MB";
      setAttachedFiles((prev) => ({
        ...prev,
        [category]: {
          url: result,
          fileName: fileInput.name,
          size: sizeFormatted,
        },
      }));
      toast.success(`Physical file attached for ${category} (${fileInput.name})`);
    };
    reader.readAsDataURL(fileInput);
  };

  const handleRemoveFile = (category: string) => {
    setAttachedFiles((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    toast.info(`Removed attached file for ${category}`);
  };

  async function handleStageUpdate(action: string, payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const targetId = file?.id || id;
      const res = await fetch(`/api/files/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = (typeof data.error === "object" ? data.error?.message : data.error) || data.message || "Update failed";
        throw new Error(errorMsg);
      }
      toast.success(data.message || "Stage updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["processing-file-detail", id] });
      if (file?.id && file.id !== id) {
        await queryClient.invalidateQueries({ queryKey: ["processing-file-detail", file.id] });
      }
      await queryClient.invalidateQueries({ queryKey: ["agent-candidate-dossier"] });
      await queryClient.invalidateQueries({ queryKey: ["agent-portal-data"] });
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details"] });
      await queryClient.invalidateQueries({ queryKey: ["agent-candidates"] });
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving stage");
    } finally {
      setSaving(false);
    }
  }

  async function handleHoldSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/files/${id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: form.get("reason"),
          note: form.get("note") || "Candidate file placed on hold",
          expectedRelease: form.get("expectedRelease") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to hold file");
      toast.success("File placed on HOLD successfully!");
      setShowHoldModal(false);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not hold file");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturnSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const netRefund = Math.max(0, totalPaid - deductionAmount);
      const res = await fetch(`/api/files/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Candidate Cancelled Processing",
          note: "Candidate requested file return and refund calculation",
          financialImpact: netRefund,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to return file");
      toast.success(`File marked as RETURNED! Net refund: ৳ ${netRefund.toLocaleString()}`);
      setShowReturnModal(false);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not return file");
    } finally {
      setActionLoading(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500 font-semibold animate-pulse">Loading candidate 360° workspace...</p>
      </div>
    );
  }

  if (query.isError || !file) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-xl m-8">
        <p className="text-rose-600 font-bold mb-4">Could not load candidate processing file record.</p>
        <Link href="/module/call-center/work-call-list" className="button primary sm">
          <ArrowLeft size={14} /> Back to Call Center Leads
        </Link>
      </div>
    );
  }

  const totalPaid = file.payments?.reduce((sum, p) => sum + (!p.status || !["CANCELLED", "VOID", "REFUNDED", "REVERSED", "FAILED"].includes(String(p.status).toUpperCase()) ? Number(p.amount) : 0), 0) || 0;
  const totalPackageCost = /dubai/i.test(file.country) ? 300000 : 350000;
  const balanceRemaining = Math.max(0, totalPackageCost - totalPaid);
  const advanceAmount = Math.max(0, totalPaid - totalPackageCost);

  const initials = file.candidate.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const phoneClean = file.candidate.phone.replace(/[^+\d]/g, "");
  const showSection = (sec: string) => activeDossierSection === "all" || activeDossierSection === sec;

  return (
    <div className="file-workspace-page">
      {/* 1. HERO CANDIDATE 360 COMMAND BAR */}
      <div className="candidate-hero-card">
        <div className="hero-top-row">
          <div className="hero-profile-info">
            <div className="hero-avatar">{initials}</div>
              <div className="hero-name-section">
                <div className="flex items-center gap-2">
                  <h1>{file.candidate.fullName}</h1>
                  <CheckCircle2 size={20} className="text-emerald-500 inline" />
                </div>
                <div className="hero-badges-row">
                  <span className="badge-file">FILE: {file.fileNo}</span>
                  <span className="badge-country">{isDubai ? "🇦🇪" : "🇸🇦"} {file.country}</span>
                  <span className="badge-current-stage">
                    <CircleDot size={12} className="animate-pulse" /> Current Stage: {file.currentStage}
                  </span>
                  <span className={`badge-country ${file.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    ● {file.status}
                  </span>
                  {file.agent && file.agent !== "Direct" && file.agent !== "Direct Office" ? (
                    <Link
                      href={file.agentRecord?.id ? `/agents/${file.agentRecord.id}` : `/module/agents/agent-list?q=${encodeURIComponent(file.agent)}`}
                      className="badge-country"
                      style={{ background: "#f0edff", color: "#7258e8", borderColor: "#dcd5fb", textDecoration: "none", fontWeight: 800 }}
                      title="Click to view Agent Partner Profile"
                    >
                      🤝 Agent: {file.agentRecord?.name || file.agent} ➔
                    </Link>
                  ) : (
                    <span className="badge-country bg-slate-50 text-slate-700 border-slate-200">
                      🏢 Direct Office
                    </span>
                  )}
                  <span className="badge-country bg-indigo-50 text-indigo-700 border-indigo-200">
                    ⚡ {progressPercent}% Completed ({completedCount}/{stages.length} Stages)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="hero-actions">
              {file.agent && file.agent !== "Direct" && file.agent !== "Direct Office" && (
                <Link
                  href={file.agentRecord?.id ? `/agents/${file.agentRecord.id}` : `/module/agents/agent-list?q=${encodeURIComponent(file.agent)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f0edff",
                    color: "#7258e8",
                    border: "1px solid #dcd5fb",
                    padding: "8px 14px",
                    borderRadius: "9px",
                    fontSize: "12px",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                  title="Open Agent Profile & Candidate Notes"
                >
                  <Users size={14} className="text-purple-600" /> 🤝 Agent Profile ➔
                </Link>
              )}
              <a
                href={`tel:${phoneClean}`}
                className="btn-modal-cancel"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <Phone size={14} className="text-emerald-600" /> Call Candidate
              </a>
              <button
                type="button"
                className="btn-print-receipt"
                onClick={() =>
                  setActiveReceipt({
                    receiptNo: `MR-${file.fileNo.replace("FILE-", "")}`,
                    date: new Date().toLocaleDateString("en-GB"),
                    candidateName: file.candidate.fullName,
                    candidateNo: file.candidate.candidateNo,
                    fileNo: file.fileNo,
                    passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                    phone: file.candidate.phone,
                    country: file.country,
                    profession: file.profession,
                    paymentType: file.payments?.[0]?.type || "Candidate Payment Deposit",
                    paymentMethod: file.payments?.[0]?.method || "Office Accounts",
                    referenceNo: file.payments?.[0]?.reference || `REC-${file.fileNo}`,
                    amount: totalPaid || 50000,
                    totalPaid: totalPaid || 50000,
                    totalPackage: totalPackageCost,
                    officerName: file.assignedTo?.name || "Accounts Department",
                  })
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  padding: "8px 14px",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-modal-hold"
                onClick={() => setShowHoldModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Clock size={14} /> Hold File
              </button>
              <button
                type="button"
                className="btn-modal-return"
                onClick={() => setShowReturnModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CreditCard size={14} /> Return &amp; Refund
              </button>
            </div>
          </div>

          {/* Quick Details Sub-strip */}
          <div className="hero-subgrid">
            <div className="hero-subitem">
              <span>Candidate ID</span>
              <b>{file.candidate.candidateNo}</b>
            </div>
            <div className="hero-subitem">
              <span>Passport Number</span>
              <b>{file.candidate.passportNo || file.passport?.passportNumber || "Not recorded"}</b>
            </div>
            <div className="hero-subitem">
              <span>Profession</span>
              <b>{file.profession || "General Worker"}</b>
            </div>
            <div className="hero-subitem">
              <span>Company / Sponsor</span>
              <b>{file.company || (isDubai ? "Dubai Employer LLC" : "Saudi Binladen Group")}</b>
            </div>
            <div className="hero-subitem">
              <span>Agent / Partner</span>
              <b>
                {file.agent && file.agent !== "Direct" && file.agent !== "Direct Office" ? (
                  <Link
                    href={file.agentRecord?.id ? `/agents/${file.agentRecord.id}` : `/module/agents/agent-list?q=${encodeURIComponent(file.agent)}`}
                    style={{ color: "#7258e8", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}
                    title="Click to open Agent Profile"
                  >
                    🤝 {file.agentRecord?.name || file.agent} ➔
                  </Link>
                ) : (
                  "🏢 Direct Office"
                )}
              </b>
            </div>
            <div className="hero-subitem">
              <span>Assigned Officer</span>
              <b>{file.assignedTo?.name || "Senior Desk Officer"}</b>
            </div>
            <div className="hero-subitem">
              <span>Branch Office</span>
              <b>{typeof file.candidate.office === "object" ? file.candidate.office?.name : (file.office?.name || "Dhaka Head Office")}</b>
            </div>
          </div>
        </div>

        {/* 2. 360° WORKSPACE MAIN NAVIGATION TABS */}
        <div className="workspace-view-tabs">
          <button
            type="button"
            className={`view-tab-btn ${mainView === "dossier" ? "active" : ""}`}
            onClick={() => setMainView("dossier")}
          >
            <Table size={16} /> 📑 360° All-Tables Complete Master Dossier ({completedCount}/{stages.length} Stages Ready)
          </button>
          <button
            type="button"
            className={`view-tab-btn ${mainView === "pipeline" ? "active" : ""}`}
            onClick={() => setMainView("pipeline")}
          >
            <Layers size={16} /> ⚡ {stages.length}-Stage Processing Pipeline (Interactive Workflow)
          </button>
          <button
            type="button"
            className={`view-tab-btn ${mainView === "ledger" ? "active" : ""}`}
            onClick={() => setMainView("ledger")}
          >
            <CreditCard size={16} /> 📊 Financial Ledger &amp; Invoices (৳ {totalPaid.toLocaleString()} Paid)
          </button>
          <button
            type="button"
            className={`view-tab-btn ${mainView === "timeline" ? "active" : ""}`}
            onClick={() => setMainView("timeline")}
          >
            <History size={16} /> 💬 Notes, Calls &amp; Audit Trail
          </button>
        </div>

        {/* 3. MAIN CONTENT BODY BASED ON SELECTED VIEW */}
        {mainView === "pipeline" && (
          <>
            {/* 9-Stage Stepper Progression Header */}
            <div className="stepper-card">
              <div className="stepper-steps-grid">
                {stages.map((st, index) => {
                  const isCompleted = isStageCompleted(st.id);
                  const isCurrent = st.id === file.currentStage;
                  const isSelected = st.id === activeTab;
                  const Icon = st.icon;

                  return (
                    <div
                      key={st.id}
                      className={`step-item ${isSelected ? "selected" : isCompleted ? "completed" : isCurrent ? "current" : "pending"}`}
                      onClick={() => setActiveTab(st.id)}
                    >
                      <div className="step-circle">
                        {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                      </div>
                      <div className="step-text">
                        <span className="step-num">Step {st.stepNo}</span>
                        <strong className="step-label">{st.label}</strong>
                        <small className="step-subtitle">
                          {isCompleted ? "✓ Completed" : isCurrent && !isSelected ? "● In Progress" : st.subtitle}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-Column Layout: Active Stage Form (Left) & Sticky Widgets (Right) */}
            <div className="file-main-grid">
              <div className="file-content-area">
                {/* 1. Passport Form */}
                {activeTab === "Passport Entry" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>📘 1. Passport Entry &amp; Verification</h2>
                        <p>Verify candidate original passport, validity, and bio data accuracy.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Scanned Passport Copy",
                            category: "passport",
                            url: attachedFiles["passport"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Verified Valid",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View Passport Scan {attachedFiles["passport"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Enter or update candidate original passport details and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-passport", {
                          passportNumber: form.get("passportNumber"),
                          issueDate: form.get("issueDate"),
                          expiryDate: form.get("expiryDate"),
                          verificationStatus: form.get("verificationStatus"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Passport Number *
                          <input
                            name="passportNumber"
                            defaultValue={file.passport?.passportNumber || file.candidate.passportNo || ""}
                            required
                          />
                        </label>
                        <label>
                          Issue Date
                          <input
                            name="issueDate"
                            type="date"
                            defaultValue={file.passport?.issueDate ? file.passport.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        <label>
                          Expiry Date (10-Year Valid)
                          <input
                            name="expiryDate"
                            type="date"
                            defaultValue={
                              file.passport?.expiryDate
                                ? file.passport.expiryDate.slice(0, 10)
                                : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                            }
                          />
                        </label>
                        <label>
                          Passport Verification Status
                          <select name="verificationStatus" defaultValue={file.passport?.verificationStatus || "Verified"}>
                            <option value="Verified">Verified &amp; Original In Hand</option>
                            <option value="Pending">Pending Verification</option>
                            <option value="Rejected">Defective / Expired</option>
                          </select>
                        </label>
                        <FileUploadField
                          label="Attach Physical Passport Scan (Optional)"
                          category="passport"
                          attachedFile={attachedFiles["passport"]}
                          onFileSelect={(f) => handleLocalFileUpload("passport", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Scanned Passport Copy",
                              category: "passport",
                              url: attachedFiles["passport"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Verified Valid",
                            })
                          }
                          onRemove={() => handleRemoveFile("passport")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Passport Entry") ? "💾 Update Passport Information" : "💾 Save Passport Details"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 2. Medical Form */}
                {activeTab === "Medical" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🏥 2. GCC GAMCA Medical Checkup &amp; Biometrics</h2>
                        <p>Record GCC medical examination center slip, 10-finger biometrics, photo collection, and Fit/Unfit status.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "GAMCA Medical Certificate",
                            category: "medical",
                            url: attachedFiles["medical"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: file.medical?.[0]?.result || "FIT",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View Medical Slip {attachedFiles["medical"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Current Action Required:</b> Confirm GCC GAMCA medical fitness test result (FIT), 10-Finger Biometrics, and click <b>"Save Medical &amp; Move to Police Clearance ➔"</b>.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-medical", {
                          centerName: form.get("centerName"),
                          result: form.get("result"),
                          testDate: form.get("testDate"),
                          tenFingerDone: form.get("tenFingerDone") === "on",
                          pictureCollected: form.get("pictureCollected") === "on",
                          medicalSlip: form.get("medicalSlip") === "on",
                          remarks: form.get("remarks"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Medical Center Name
                          <input name="centerName" defaultValue={file.medical?.[0]?.centerName || file.medical?.[0]?.center || "Ibn Sina GCC Medical Center, Dhaka"} />
                        </label>
                        <label>
                          Medical Result Status *
                          <select name="result" defaultValue={file.medical?.[0]?.result || "FIT"}>
                            <option value="FIT">FIT (Passed Medical Examination)</option>
                            <option value="UNFIT">UNFIT (Permanent GCC Reject)</option>
                            <option value="IN_PROGRESS">In Progress / Repeat Blood Test</option>
                          </select>
                        </label>
                        <label>
                          Medical Test Date
                          <input
                            name="testDate"
                            type="date"
                            defaultValue={file.medical?.[0]?.testDate ? file.medical[0].testDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        
                        {/* Biometric & Checklist Strip from sidebar Medical page */}
                        <div className="full checkbox-row">
                          <label className="checkbox-card">
                            <input type="checkbox" name="tenFingerDone" defaultChecked={Boolean(file.medical?.[0]?.metadata?.tenFingerDone ?? true)} />
                            <span>🖐️ 10-Fingerprint Biometric Done</span>
                          </label>
                          <label className="checkbox-card">
                            <input type="checkbox" name="pictureCollected" defaultChecked={Boolean(file.medical?.[0]?.metadata?.pictureCollected ?? true)} />
                            <span>📷 Medical Picture Collected</span>
                          </label>
                          <label className="checkbox-card">
                            <input type="checkbox" name="medicalSlip" defaultChecked={Boolean(file.medical?.[0]?.metadata?.medicalSlip ?? true)} />
                            <span>📄 Physical Medical Slip In Hand</span>
                          </label>
                        </div>

                        <FileUploadField
                          label="Attach GAMCA Medical Fit Certificate Scan (Optional)"
                          category="medical"
                          attachedFile={attachedFiles["medical"]}
                          onFileSelect={(f) => handleLocalFileUpload("medical", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "GAMCA Medical Certificate",
                              category: "medical",
                              url: attachedFiles["medical"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "FIT",
                            })
                          }
                          onRemove={() => handleRemoveFile("medical")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Medical") ? "💾 Update Medical Information" : "💾 Save Medical Information"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 3. Police Clearance Form */}
                {!isDubai && activeTab === "Police Clearance" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🛡️ 3. Police Clearance Certificate (PCC)</h2>
                        <p>Record Police Clearance application tracking, 180-day validity counter, and issuance.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Police Clearance Certificate",
                            category: "police",
                            url: attachedFiles["police"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Clear / Verified",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View PCC Cert {attachedFiles["police"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Record Police Clearance (PCC) application reference, verification status, and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-police", {
                          applicationNumber: form.get("applicationNumber"),
                          applicationDate: form.get("applicationDate"),
                          issueDate: form.get("issueDate"),
                          expiryDate: form.get("expiryDate"),
                          result: form.get("result"),
                          status: form.get("status"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          PCC Application Number *
                          <input
                            name="applicationNumber"
                            defaultValue={file.police?.[0]?.applicationNumber || `PCC-${file.fileNo}`}
                            required
                          />
                        </label>
                        <label>
                          Application Date
                          <input
                            name="applicationDate"
                            type="date"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        <label>
                          Issue Date
                          <input
                            name="issueDate"
                            type="date"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                          />
                        </label>
                        <label>
                          Expiry Date (180 Days)
                          <input
                            name="expiryDate"
                            type="date"
                            defaultValue={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                          />
                        </label>
                        <label>
                          Verification Result
                          <select name="result" defaultValue={file.police?.[0]?.result || "Clear / Verified"}>
                            <option value="Clear / Verified">Clear / Verified (No Criminal Record)</option>
                            <option value="Pending">Under Investigation</option>
                          </select>
                        </label>
                        <FileUploadField
                          label="Attach Police Clearance Scanned Certificate (Optional)"
                          category="police"
                          attachedFile={attachedFiles["police"]}
                          onFileSelect={(f) => handleLocalFileUpload("police", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Police Clearance Certificate",
                              category: "police",
                              url: attachedFiles["police"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Clear / Verified",
                            })
                          }
                          onRemove={() => handleRemoveFile("police")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Police Clearance") ? "💾 Update Police Clearance" : "💾 Save Police Clearance"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 4. Unified Payment Deposits & Invoices Form */}
                {(activeTab === "Payment" || activeTab === "First Payment" || activeTab === "Second Payment") && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>💰 Candidate Payment Deposits &amp; Financial Receipts</h2>
                        <p>Record candidate payment installments with custom titles, optional deposit vouchers, and printable receipts.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveReceipt({
                            receiptNo: `MR-${file.fileNo.replace("FILE-", "")}`,
                            date: new Date().toLocaleDateString("en-GB"),
                            candidateName: file.candidate.fullName,
                            candidateNo: file.candidate.candidateNo,
                            fileNo: file.fileNo,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            phone: file.candidate.phone,
                            country: file.country,
                            profession: file.profession,
                            paymentType: "Candidate Payment Deposit",
                            paymentMethod: "Office Accounts",
                            referenceNo: `REC-${Date.now().toString().slice(-6)}`,
                            amount: file.payments?.[0]?.amount || 50000,
                            totalPaid: totalPaid,
                            totalPackage: totalPackageCost,
                            officerName: file.assignedTo?.name || "Accounts Department",
                          })
                        }
                      >
                        <Printer size={14} /> 🖨️ Print Money Receipt
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Enter payment title, deposit amount, and save payment record. Uploading bank slip/voucher is optional.</span>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("record-payment", {
                          type: form.get("type"),
                          amount: Number(form.get("amount")),
                          method: form.get("method"),
                          reference: form.get("reference"),
                          documentUrl: attachedFiles["payment"]?.url,
                          fileName: attachedFiles["payment"]?.fileName,
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Payment Title / Purpose *
                          <input
                            type="text"
                            name="type"
                            placeholder="e.g. First Payment Deposit, Second Payment (Visa)..."
                            defaultValue={file.payments && file.payments.length > 0 ? "Second Payment (Visa Fee)" : "First Payment Deposit"}
                            required
                          />
                        </label>

                        <label>
                          Deposit Amount (BDT) *
                          <input name="amount" type="number" defaultValue={file.payments && file.payments.length > 0 ? 150000 : 50000} required />
                        </label>

                        <label>
                          Payment Method
                          <select name="method" defaultValue="Cash at Office">
                            <option value="Cash at Office">Cash at Office</option>
                            <option value="Bank Transfer / Deposit">Bank Transfer / Deposit</option>
                            <option value="bKash / Nagad / MFS">bKash / Nagad / MFS</option>
                            <option value="Bank Cheque">Bank Cheque</option>
                            <option value="Office Accounts">Office Accounts</option>
                          </select>
                        </label>

                        <label>
                          Receipt / Reference No
                          <input name="reference" placeholder="REC-98231" defaultValue={`REC-${Date.now().toString().slice(-6)}`} />
                        </label>

                        <FileUploadField
                          label="Attach Bank Slip / Deposit Voucher (Optional)"
                          category="payment"
                          attachedFile={attachedFiles["payment"]}
                          onFileSelect={(f) => handleLocalFileUpload("payment", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Payment Deposit Voucher Scan",
                              category: "payment",
                              url: attachedFiles["payment"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Deposited",
                            })
                          }
                          onRemove={() => handleRemoveFile("payment")}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Payment") ? "💾 Record Additional Payment" : "💾 Save Payment Deposit"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 5. Takamul Form */}
                {isSaudi && activeTab === "Takamul" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🏅 5. Saudi Takamul Skill Verification &amp; Certification</h2>
                        <p>Record Saudi SVP skill verification test schedule, center attendance, and certificate number.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Takamul Skill Test Certificate",
                            category: "takamul",
                            url: attachedFiles["takamul"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Passed (Certificate Issued)",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View SVP Cert {attachedFiles["takamul"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Record Saudi Takamul SVP Skill Test certificate number and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-takamul", {
                          registrationNumber: form.get("registrationNumber"),
                          certificateNumber: form.get("certificateNumber"),
                          centerDistrict: form.get("centerDistrict"),
                          examDate: form.get("examDate"),
                          status: form.get("status"),
                          reportStatus: form.get("reportStatus"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Registration Number
                          <input
                            name="registrationNumber"
                            defaultValue={file.takamul?.[0]?.registrationNumber || `REG-TAK-${file.fileNo.slice(-6)}`}
                          />
                        </label>
                        <label>
                          Certificate Number *
                          <input
                            name="certificateNumber"
                            defaultValue={file.takamul?.[0]?.certificateNumber || `TAK-${file.fileNo.slice(-7)}`}
                            required
                          />
                        </label>
                        <label>
                          Takamul Center District
                          <select name="centerDistrict" defaultValue={file.takamul?.[0]?.centerDistrict || "Dhaka"}>
                            <option value="Dhaka">Dhaka Center</option>
                            <option value="Chattogram">Chattogram Center</option>
                            <option value="Sylhet">Sylhet Center</option>
                          </select>
                        </label>
                        <label>
                          Takamul Result Status
                          <select name="reportStatus" defaultValue={file.takamul?.[0]?.reportStatus || "Passed"}>
                            <option value="Passed">Passed (Certificate Issued)</option>
                            <option value="Waiting for Result">Waiting for Result</option>
                            <option value="Failed">Failed / Re-exam</option>
                          </select>
                        </label>
                        <FileUploadField
                          label="Attach Saudi Takamul SVP Certificate Scan (Optional)"
                          category="takamul"
                          attachedFile={attachedFiles["takamul"]}
                          onFileSelect={(f) => handleLocalFileUpload("takamul", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Takamul Skill Test Certificate",
                              category: "takamul",
                              url: attachedFiles["takamul"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Passed",
                            })
                          }
                          onRemove={() => handleRemoveFile("takamul")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Takamul") ? "💾 Update Takamul Certificate" : "💾 Save Takamul Skill Test"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 6. Visa / MOFA Form */}
                {isSaudi && activeTab === "Mofa" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🌐 6. Saudi MOFA &amp; Embassy Visa Stamping</h2>
                        <p>Record Saudi MOFA submission, MOFA Done dates, Embassy Visa Stamping, and Kafeel sponsor details.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Electronic Visa Stamped Copy",
                            category: "visa",
                            url: attachedFiles["visa"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Stamped & Issued",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View E-Visa {attachedFiles["visa"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Enter Saudi MOFA and Embassy Visa Stamping number and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-mofa", {
                          mofaNumber: form.get("mofaNumber"),
                          visaNumber: form.get("visaNumber"),
                          issueDate: form.get("issueDate"),
                          expiryDate: form.get("expiryDate"),
                          status: form.get("status"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          MOFA Number *
                          <input
                            name="mofaNumber"
                            defaultValue={file.mofa?.[0]?.mofaNumber || `MOFA-${Date.now().toString().slice(-7)}`}
                            required
                          />
                        </label>
                        <label>
                          Embassy Visa Number *
                          <input
                            name="visaNumber"
                            defaultValue={file.visas?.[0]?.visaNumber || `VISA-KSA-${file.fileNo.slice(-6)}`}
                            required
                          />
                        </label>
                        <label>
                          Visa Issue Date
                          <input name="issueDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                        </label>
                        <label>
                          Visa Expiry Date (90 Days)
                          <input
                            name="expiryDate"
                            type="date"
                            defaultValue={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                          />
                        </label>
                        <label>
                          Visa Stamping Status
                          <select name="status" defaultValue={file.visas?.[0]?.status || "Visa Done"}>
                            <option value="Visa Done">Visa Done (Stamped &amp; Issued)</option>
                            <option value="In Embassy">In Embassy (Submitted in Embassy)</option>
                            <option value="Stamped">Stamped</option>
                            <option value="Submitted">Submitted / Under Process</option>
                            <option value="Visa Hold">Visa Hold</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </label>
                        <FileUploadField
                          label="Attach Embassy Electronic Visa Stamped Scan (Optional)"
                          category="visa"
                          attachedFile={attachedFiles["visa"]}
                          onFileSelect={(f) => handleLocalFileUpload("visa", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Embassy E-Visa Stamped Copy",
                              category: "visa",
                              url: attachedFiles["visa"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Stamped & Issued",
                            })
                          }
                          onRemove={() => handleRemoveFile("visa")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Mofa") ? "💾 Update Visa / MOFA Information" : "💾 Save Visa & MOFA Details"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                
                {/* DUBAI 4: MOHRE Labor Approval & Offer Letter */}
                {isDubai && activeTab === "Approval Application" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🇦🇪 4. Dubai MOHRE Labor Approval &amp; Offer Letter</h2>
                        <p>Track Ministry of Human Resources and Emiratisation (MOHRE) approval and signed offer letter.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "MOHRE Labor Approval & Offer Letter",
                            category: "approval",
                            url: attachedFiles["approval"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Approved by MOHRE",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View Offer Letter {attachedFiles["approval"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Enter MOHRE approval application number, sign status, and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-approval", {
                          applicationNo: form.get("applicationNo"),
                          laborCardNo: form.get("laborCardNo"),
                          offerLetterStatus: form.get("offerLetterStatus"),
                          approvalStatus: form.get("approvalStatus"),
                          remarks: form.get("remarks"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          MOHRE Application No *
                          <input name="applicationNo" defaultValue={file.visas?.[0]?.visaNumber || `MB-${file.fileNo.replace(/[^0-9]/g, '') || Date.now().toString().slice(-6)}`} required />
                        </label>
                        <label>
                          Labor Approval Status *
                          <select name="approvalStatus" defaultValue={file.visas?.[0]?.status || "Approved"}>
                            <option value="Approved">Approved (MOHRE Cleared)</option>
                            <option value="Under Process">Under Process (Pending MOHRE)</option>
                            <option value="Signed">Candidate Offer Letter Signed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </label>
                        <label>
                          Offer Letter Status
                          <select name="offerLetterStatus" defaultValue="Signed & Verified">
                            <option value="Signed & Verified">Signed &amp; Verified</option>
                            <option value="Sent to Candidate">Sent to Candidate</option>
                            <option value="Awaiting Signature">Awaiting Signature</option>
                          </select>
                        </label>
                        <label>
                          Company / Sponsor Name
                          <input name="companyName" defaultValue={file.company || "Dubai Employer LLC"} />
                        </label>
                      </div>

                      <div className="doc-upload-section">
                        <FileUploadField
                          label="Attach MOHRE Offer Letter / Approval Scan (Optional)"
                          category="approval"
                          attachedFile={attachedFiles["approval"]}
                          onFileSelect={(f) => handleLocalFileUpload("approval", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "MOHRE Offer Letter Scan",
                              category: "approval",
                              url: attachedFiles["approval"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Approved",
                            })
                          }
                          onRemove={() => handleRemoveFile("approval")}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Approval Application") ? "💾 Update Labor Approval" : "💾 Save Labor Approval"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* DUBAI & OTHER COUNTRY: E-Visa & Entry Permit Stamping */}
                {(isDubai || isOtherCountry) && activeTab === "E-Visa Stamping" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>🇦🇪 5. Dubai E-Visa &amp; Entry Permit Stamping</h2>
                        <p>Record issued Dubai employment entry permit, UID number, validity, and E-Visa Done status.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Dubai Employment E-Visa Entry Permit",
                            category: "evisa",
                            url: attachedFiles["evisa"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "E-Visa Done",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View E-Visa Permit {attachedFiles["evisa"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Enter Dubai E-Visa Entry Permit Number, UID Number, and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-evisa", {
                          visaNumber: form.get("visaNumber"),
                          uidNumber: form.get("uidNumber"),
                          sponsorName: form.get("sponsorName"),
                          issueDate: form.get("issueDate"),
                          expiryDate: form.get("expiryDate"),
                          visaStatus: form.get("visaStatus"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Dubai E-Visa Number *
                          <input name="visaNumber" defaultValue={file.visas?.[0]?.visaNumber || `201/2026/${Date.now().toString().slice(-7)}`} required />
                        </label>
                        <label>
                          Unified Identification (UID) No
                          <input name="uidNumber" defaultValue={`UID-${Date.now().toString().slice(-8)}`} />
                        </label>
                        <label>
                          E-Visa Status *
                          <select name="visaStatus" defaultValue={file.visas?.[0]?.status || "Visa Done"}>
                            <option value="Visa Done">Visa Done (E-Visa Issued &amp; Ready)</option>
                            <option value="E-Visa Stamped">E-Visa Stamped</option>
                            <option value="E-Visa Hold">E-Visa Hold</option>
                            <option value="Processing">In GDRFA Immigration</option>
                          </select>
                        </label>
                        <label>
                          Issue Date
                          <input name="issueDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                        </label>
                        <label>
                          Expiry Date (60-Day Entry Valid)
                          <input name="expiryDate" type="date" defaultValue={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} />
                        </label>
                        <label>
                          Sponsor / Establishment Name
                          <input name="sponsorName" defaultValue={file.company || "Dubai Workforce Establishment"} />
                        </label>
                      </div>

                      <div className="doc-upload-section">
                        <FileUploadField
                          label="Attach Dubai E-Visa PDF / Entry Permit (Optional)"
                          category="evisa"
                          attachedFile={attachedFiles["evisa"]}
                          onFileSelect={(f) => handleLocalFileUpload("evisa", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Dubai Employment E-Visa Entry Permit",
                              category: "evisa",
                              url: attachedFiles["evisa"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Visa Done",
                            })
                          }
                          onRemove={() => handleRemoveFile("evisa")}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("E-Visa Stamping") ? "💾 Update E-Visa Information" : "💾 Save E-Visa Details"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 8. Manpower Form */}
                {activeTab === "Manpower" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>📜 8. BMET Manpower Smart Card Clearance</h2>
                        <p>Submit candidate file for Bureau of Manpower, Employment and Training (BMET) Smart Card.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "BMET Smart Card Clearance",
                            category: "manpower",
                            url: attachedFiles["manpower"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Cleared & Approved",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View Smart Card {attachedFiles["manpower"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Confirm BMET Manpower Smart Card clearance approval and save.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("update-manpower", {
                          reference: form.get("reference"),
                          status: form.get("status"),
                          company: form.get("company"),
                          profession: form.get("profession"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          BMET Smart Card Ref / Certificate *
                          <input
                            name="reference"
                            defaultValue={file.manpower?.[0]?.reference || `BMET-CARD-${file.fileNo.slice(-6)}`}
                            required
                          />
                        </label>
                        <label>
                          Clearing Status
                          <select name="status" defaultValue={file.manpower?.[0]?.status || "Approved"}>
                            <option value="Approved">Approved &amp; Smart Card Delivered</option>
                            <option value="Submitted">Submitted / Under Verification</option>
                            <option value="Pending">Pending Submission</option>
                          </select>
                        </label>
                        <label>
                          Employer Company
                          <input name="company" defaultValue={file.company || "Saudi Binladen Group"} />
                        </label>
                        <label>
                          Approved Profession
                          <input name="profession" defaultValue={file.profession || "Electrician / Plumber"} />
                        </label>
                        <FileUploadField
                          label="Attach BMET Smart Card Scan Copy (Optional)"
                          category="manpower"
                          attachedFile={attachedFiles["manpower"]}
                          onFileSelect={(f) => handleLocalFileUpload("manpower", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "BMET Manpower Smart Card Copy",
                              category: "manpower",
                              url: attachedFiles["manpower"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Approved",
                            })
                          }
                          onRemove={() => handleRemoveFile("manpower")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : isStageCompleted("Manpower") ? "💾 Update Manpower Clearance" : "💾 Save BMET Clearance"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 9. Flight Form */}
                {activeTab === "Flight" && (
                  <div className="stage-card">
                    <div className="stage-card-header">
                      <div>
                        <h2>✈️ 9. Flight Booking &amp; Candidate Departure</h2>
                        <p>Issue final flight e-ticket, departure schedule, and complete candidate deployment cycle.</p>
                      </div>
                      <button
                        type="button"
                        className="payment-receipt-btn"
                        onClick={() =>
                          setActiveDoc({
                            candidateName: file.candidate.fullName,
                            passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                            candidateNo: file.candidate.candidateNo,
                            country: file.country,
                            profession: file.profession,
                            company: file.company,
                            title: "Flight Air E-Ticket",
                            category: "flight",
                            url: attachedFiles["flight"]?.url,
                            fileNumber: file.fileNo,
                            verifiedStatus: "Confirmed / Booked",
                          })
                        }
                      >
                        <Eye size={14} /> 👁️ View E-Ticket {attachedFiles["flight"] && "✓"}
                      </button>
                    </div>
                    <div className="stage-guidance-banner">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span><b>Stage Information:</b> Issue flight ticket, set departure schedule, and save flight details.</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        void handleStageUpdate("book-flight", {
                          airline: form.get("airline"),
                          flightNumber: form.get("flightNumber"),
                          departureDate: form.get("departureDate"),
                          pnr: form.get("pnr"),
                        });
                      }}
                    >
                      <div className="form-grid">
                        <label>
                          Airline
                          <select name="airline" defaultValue="Saudia Airlines">
                            <option value="Saudia Airlines">Saudia Airlines (SV)</option>
                            <option value="Biman Bangladesh">Biman Bangladesh Airlines (BG)</option>
                            <option value="Emirates">Emirates (EK)</option>
                            <option value="FlyDubai">FlyDubai (FZ)</option>
                          </select>
                        </label>
                        <label>
                          Flight Number *
                          <input name="flightNumber" defaultValue="SV-803" required />
                        </label>
                        <label>
                          Departure Date &amp; Time *
                          <input
                            name="departureDate"
                            type="datetime-local"
                            defaultValue={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                            required
                          />
                        </label>
                        <label>
                          PNR / Ticket Number
                          <input name="pnr" defaultValue="PNR-8921098" />
                        </label>
                        <FileUploadField
                          label="Attach Flight Air E-Ticket (Optional)"
                          category="flight"
                          attachedFile={attachedFiles["flight"]}
                          onFileSelect={(f) => handleLocalFileUpload("flight", f)}
                          onPreview={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: "Flight Air E-Ticket",
                              category: "flight",
                              url: attachedFiles["flight"]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Confirmed / Booked",
                            })
                          }
                          onRemove={() => handleRemoveFile("flight")}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={saving} className="primary-action-btn">
                          {saving ? "Saving..." : "✈️ Save Flight Details & Finalize"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 11. DYNAMIC CUSTOM STAGE PROCESSING PANEL */}
                {(() => {
                  const currentCustomStage = stages.find(
                    (s: any) => s.id === activeTab && s.isCustom
                  );
                  if (!currentCustomStage) return null;
                  const IconC = currentCustomStage.icon || FileText;
                  const fields: any[] = (currentCustomStage as any).fields || [];

                  // Extract latest saved custom stage data from file.workflowEvents
                  const customStageEvents = (file?.workflowEvents || []).filter(
                    (e: any) =>
                      e.stage === currentCustomStage.code ||
                      e.stage === currentCustomStage.id ||
                      e.stage === currentCustomStage.label
                  );
                  const latestCustomEvent = customStageEvents[0];
                  const savedCustomData = (latestCustomEvent?.data as Record<string, any>) || {};

                  const regularFields = fields.filter((f) => ["text", "number", "date", "select"].includes(f.type));
                  const textareaFields = fields.filter((f) => f.type === "textarea");
                  const fileFields = fields.filter((f) => f.type === "file");

                  return (
                    <div className="stage-card">
                      {/* Header */}
                      <div className="stage-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #f0edff 0%, #e0e7ff 100%)",
                              color: "#7258e8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid #dcd5fb",
                              boxShadow: "0 2px 8px rgba(114, 88, 232, 0.12)",
                              flexShrink: 0,
                            }}
                          >
                            <IconC size={22} />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                {currentCustomStage.stepNo}. {currentCustomStage.label}
                              </h2>
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
                                Custom Stage
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                              {currentCustomStage.subtitle || "Processing milestone and candidate requirements."}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11.5px", fontWeight: 700, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: "8px" }}>
                            📌 Step #{currentCustomStage.stepNo} of {stages.length}
                          </span>
                        </div>
                      </div>

                      {/* Guidance Banner */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 16px",
                          background: "linear-gradient(135deg, #faf5ff 0%, #f0edff 100%)",
                          border: "1px solid #e9d5ff",
                          borderRadius: "10px",
                          marginBottom: "22px",
                          color: "#581c87",
                          fontSize: "12.5px",
                        }}
                      >
                        <Sparkles size={16} className="text-purple-600 shrink-0" />
                        <span>
                          <b>Milestone Instructions:</b> {currentCustomStage.description || "Enter and verify candidate custom milestone parameters and save."}
                        </span>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = new FormData(e.currentTarget);
                          const formDataObj: Record<string, any> = {};
                          form.forEach((value, key) => {
                            formDataObj[key] = value;
                          });
                          fields.forEach((fld: any) => {
                            formDataObj[fld.id] = form.get(`field_${fld.id}`) ?? form.get(fld.id) ?? "";
                            formDataObj[fld.label] = form.get(`field_${fld.id}`) ?? form.get(fld.id) ?? "";
                          });
                          formDataObj["verificationStatus"] = form.get("verificationStatus") || "Completed / Verified";

                          await handleStageUpdate("update-custom-stage", {
                            stageCode: currentCustomStage.code,
                            stageName: currentCustomStage.label,
                            verificationStatus: form.get("verificationStatus") || "Completed / Verified",
                            formData: formDataObj,
                          });
                        }}
                        style={{ display: "flex", flexDirection: "column", gap: "22px" }}
                      >
                        {/* 1. Main Form Fields Grid */}
                        {fields.length === 0 ? (
                          <div style={{ padding: "24px", background: "#f8fafc", borderRadius: "12px", border: "1px solid var(--line)" }}>
                            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                              Status / Milestone Remarks
                            </label>
                            <textarea
                              rows={3}
                              name="remarks"
                              defaultValue={savedCustomData["remarks"] || ""}
                              placeholder="Enter stage processing notes, reference numbers, or verification status..."
                              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)", background: "#ffffff" }}
                            />
                          </div>
                        ) : (
                          <>
                            {/* Regular Inputs (Text, Number, Date, Select) */}
                            {regularFields.length > 0 && (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                                {regularFields.map((fld: any) => {
                                  const savedVal = savedCustomData[`field_${fld.id}`] ?? savedCustomData[fld.id] ?? savedCustomData[fld.label] ?? "";
                                  return (
                                    <label key={fld.id} style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                                      <span>
                                        {fld.type === "date" ? "📅 " : fld.type === "number" ? "🔢 " : fld.type === "select" ? "📋 " : "🔤 "}
                                        {fld.label} {fld.required && <span className="text-rose-500">*</span>}
                                      </span>
                                      {fld.type === "select" ? (
                                        <select
                                          name={`field_${fld.id}`}
                                          defaultValue={savedVal}
                                          required={fld.required}
                                          style={{ height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "0 12px", background: "#f8fafc", fontSize: "13px" }}
                                        >
                                          <option value="">Select an option...</option>
                                          {(fld.options || "").split(",").map((opt: string) => (
                                            <option key={opt.trim()} value={opt.trim()}>
                                              {opt.trim()}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={fld.type === "number" ? "number" : fld.type === "date" ? "date" : "text"}
                                          name={`field_${fld.id}`}
                                          defaultValue={savedVal}
                                          placeholder={fld.placeholder || `Enter ${fld.label}...`}
                                          required={fld.required}
                                          style={{ height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "0 12px", background: "#f8fafc", fontSize: "13px" }}
                                        />
                                      )}
                                    </label>
                                  );
                                })}

                                {/* Verification Status select */}
                                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                                  <span>⚖️ Verification &amp; Processing Status</span>
                                  <select
                                    name="verificationStatus"
                                    defaultValue={savedCustomData["verificationStatus"] || latestCustomEvent?.status || "Completed / Verified"}
                                    style={{ height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "0 12px", background: "#f8fafc", fontSize: "13px", fontWeight: 600 }}
                                  >
                                    <option value="Completed / Verified">✅ Completed / Verified</option>
                                    <option value="In Progress">⏳ Processing / In Progress</option>
                                    <option value="Pending">🕒 Pending Submission</option>
                                    <option value="Rejected">❌ Rejected / Resubmit</option>
                                  </select>
                                </label>
                              </div>
                            )}

                            {/* Textarea fields */}
                            {textareaFields.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                {textareaFields.map((fld: any) => {
                                  const savedVal = savedCustomData[`field_${fld.id}`] ?? savedCustomData[fld.id] ?? savedCustomData[fld.label] ?? "";
                                  return (
                                    <label key={fld.id} style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                                      <span>
                                        📝 {fld.label} {fld.required && <span className="text-rose-500">*</span>}
                                      </span>
                                      <textarea
                                        rows={3}
                                        name={`field_${fld.id}`}
                                        defaultValue={savedVal}
                                        placeholder={fld.placeholder || `Enter ${fld.label} details...`}
                                        required={fld.required}
                                        style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "13px" }}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* File Upload fields */}
                            {fileFields.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {fileFields.map((fld: any) => (
                                  <FileUploadField
                                    key={fld.id}
                                    label={fld.label || "Attach File / Document Scan"}
                                    category={`custom_${currentCustomStage.code}_${fld.id}`}
                                    attachedFile={attachedFiles[`custom_${currentCustomStage.code}_${fld.id}`]}
                                    onFileSelect={(f) => handleLocalFileUpload(`custom_${currentCustomStage.code}_${fld.id}`, f)}
                                    onPreview={() =>
                                      setActiveDoc({
                                        candidateName: file.candidate.fullName,
                                        passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                                        candidateNo: file.candidate.candidateNo,
                                        country: file.country,
                                        profession: file.profession,
                                        company: file.company,
                                        title: `${fld.label} Scan`,
                                        category: `custom_${currentCustomStage.code}_${fld.id}`,
                                        url: attachedFiles[`custom_${currentCustomStage.code}_${fld.id}`]?.url,
                                        fileNumber: file.fileNo,
                                        verifiedStatus: "Attached Scan",
                                      })
                                    }
                                    onRemove={() => handleRemoveFile(`custom_${currentCustomStage.code}_${fld.id}`)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Fallback verification status if no regular fields */}
                            {regularFields.length === 0 && (
                              <div style={{ maxWidth: "320px" }}>
                                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                                  <span>⚖️ Verification &amp; Processing Status</span>
                                  <select
                                    name="verificationStatus"
                                    defaultValue={savedCustomData["verificationStatus"] || latestCustomEvent?.status || "Completed / Verified"}
                                    style={{ height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "0 12px", background: "#f8fafc", fontSize: "13px", fontWeight: 600 }}
                                  >
                                    <option value="Completed / Verified">✅ Completed / Verified</option>
                                    <option value="In Progress">⏳ Processing / In Progress</option>
                                    <option value="Pending">🕒 Pending Submission</option>
                                    <option value="Rejected">❌ Rejected / Resubmit</option>
                                  </select>
                                </label>
                              </div>
                            )}
                          </>
                        )}

                        {/* Action Buttons */}
                        <div className="form-actions" style={{ margin: 0, paddingTop: "18px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                          <button
                            type="submit"
                            disabled={saving}
                            className="primary-action-btn"
                            style={{
                              background: "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "0 22px",
                              height: "44px",
                              borderRadius: "10px",
                              fontWeight: 700,
                              boxShadow: "0 4px 14px rgba(114, 88, 232, 0.25)",
                            }}
                          >
                            <Save size={16} /> {saving ? "Saving..." : `Save ${currentCustomStage.label} Details`}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Financial & Progress Widgets */}
              <div className="file-sidebar">
                {/* Payment Ledger Card */}
                <div className="sidebar-widget-card">
                  <h3>
                    <CreditCard size={17} className="text-indigo-600" /> Financial Ledger
                  </h3>
                  <div className="ledger-total-box">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Amount Paid</span>
                      <strong style={{ display: "block", fontSize: "18px", color: "#059669" }}>৳ {totalPaid.toLocaleString()} BDT</strong>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px" }}>
                        Contract Package: <b>৳ {totalPackageCost.toLocaleString()} BDT</b>
                      </div>
                      {advanceAmount > 0 ? (
                        <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 800, marginTop: "2px" }}>
                          🟣 Advance Extra: + ৳ {advanceAmount.toLocaleString()} BDT
                        </div>
                      ) : balanceRemaining > 0 ? (
                        <div style={{ fontSize: "11px", color: "#e11d48", fontWeight: 800, marginTop: "2px" }}>
                          🔴 Remaining Due: ৳ {balanceRemaining.toLocaleString()} BDT
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", color: "#059669", fontWeight: 800, marginTop: "2px" }}>
                          🟢 100% Fully Settled (Zero Due)
                        </div>
                      )}
                    </div>
                    <DollarSign size={28} className="text-emerald-600 opacity-80" />
                  </div>
                  <div className="payments-list">
                    {file.payments?.length ? (
                      file.payments.map((p) => (
                        <div key={p.id} className="payment-item">
                          <div className="payment-item-main">
                            <div className="payment-item-top">
                              <b>{p.type}</b>
                              <button
                                type="button"
                                className="payment-receipt-btn"
                                onClick={() =>
                                  setActiveReceipt({
                                    receiptNo: `MR-${p.referenceNo || p.id.slice(-6).toUpperCase()}`,
                                    date: new Date(p.createdAt).toLocaleDateString("en-GB"),
                                    candidateName: file.candidate.fullName,
                                    candidateNo: file.candidate.candidateNo,
                                    fileNo: file.fileNo,
                                    passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                                    phone: file.candidate.phone,
                                    country: file.country,
                                    profession: file.profession,
                                    paymentType: p.type,
                                    paymentMethod: p.method || "Cash Deposit",
                                    referenceNo: p.referenceNo || "OFFICE-REC",
                                    amount: Number(p.amount),
                                    totalPaid: totalPaid,
                                    totalPackage: totalPackageCost,
                                    officerName: file.assignedTo?.name || "Accounts Department",
                                  })
                                }
                              >
                                <Printer size={11} /> Print Receipt
                              </button>
                            </div>
                            <small>
                              {new Date(p.createdAt).toLocaleDateString()} · {p.method || "Paid"}
                            </small>
                          </div>
                          <span className="pay-amt">৳ {Number(p.amount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-2">No payment transactions recorded</p>
                    )}
                  </div>
                </div>

                {/* Pipeline Stage Checklist */}
                <div className="sidebar-widget-card">
                  <h3>
                    <FileCheck size={17} className="text-indigo-600" /> Processing Checklist ({completedCount}/9)
                  </h3>
                  <div className="pipeline-checklist">
                    {stages.map((st) => {
                      const isDone = isStageCompleted(st.id);
                      const isSelected = st.id === activeTab;
                      return (
                        <div
                          key={st.id}
                          className={`checklist-item ${isDone ? "done" : ""} ${isSelected ? "active" : ""}`}
                          onClick={() => setActiveTab(st.id)}
                        >
                          <div className="checklist-dot">{isDone ? "✓" : st.stepNo}</div>
                          <span className="flex-1 font-semibold">{st.label}</span>
                          <small className={isDone ? "text-emerald-600 font-bold text-[10px]" : "text-slate-400 text-[10px]"}>
                            {isDone ? "Completed" : "Pending"}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VIEW 1 (PRIMARY): 📑 360° ALL TABLES CONSOLIDATED MASTER DOSSIER */}
        {mainView === "dossier" && (
          <div className="master-dossier-view">
            {/* Guidance Header Banner */}
            <div className="doc-repo-header" style={{ marginBottom: "16px" }}>
              <div>
                <h2>📑 360° Candidate Complete Profile &amp; All-Tables Dossier</h2>
                <p>
                  Single consolidated view of <b>all parameters from all 16 system tables</b> for candidate <b>{file.candidate.fullName} ({file.candidate.candidateNo})</b>.
                  No need to navigate through separate sidebar menus!
                </p>
              </div>
            </div>

            {/* Quick Section Jump Pills Bar */}
            <div className="dossier-jump-bar">
              <span className="dossier-jump-label">
                <Filter size={14} /> Quick Filter Table:
              </span>
              {(() => {
                const pills: { id: string; label: string }[] = [
                  { id: "all", label: "🌟 Show All Tables" },
                  { id: "candidate_bio", label: "👤 1. Candidate Bio-Data" },
                  { id: "passport", label: "📘 2. Passport List & Entry" },
                  { id: "medical", label: "🏥 3. Medical & Fitness" },
                ];

                if (!isDubai) {
                  pills.push({ id: "police", label: "🛡️ 4. Police Clearance (PCC)" });
                }

                pills.push({ id: "payment", label: "💵 5. Payment Deposits & Invoices" });

                if (isDubai) {
                  pills.push(
                    { id: "approval", label: "📋 6. MOHRE Labor Approval" },
                    { id: "visa", label: "🛂 7. Dubai E-Visa Stamping" }
                  );
                } else if (isSaudi) {
                  pills.push(
                    { id: "takamul", label: "🏅 6. Saudi Takamul SVP" },
                    { id: "bio", label: "🖐️ 7. KSA Bio-Finger" },
                    { id: "mofa", label: "🌐 8. Saudi MOFA & Kafeel" },
                    { id: "visa", label: "🛂 9. E-Visa Stamping" }
                  );
                } else {
                  pills.push({ id: "visa", label: "🛂 6. Embassy Visa Stamping" });
                }

                // Add Custom Stages to Jump Bar Pills
                const customStagesList = stages.filter((s: any) => s.isCustom);
                customStagesList.forEach((cSt: any) => {
                  pills.push({
                    id: `custom_${cSt.code}`,
                    label: `✨ Step ${cSt.stepNo}. ${cSt.label}`,
                  });
                });

                pills.push(
                  { id: "manpower", label: "📜 BMET Manpower Clearance" },
                  { id: "flight", label: "✈️ Flight Booking & Departure" },
                  { id: "holds_returns", label: "⏸️ Hold & Return History" },
                  { id: "education_exp", label: "🎓 Education & Experience" },
                  { id: "calls", label: "📞 Call Center Leads & Logs" },
                  { id: "documents", label: "📁 Document Scans Repository" }
                );

                return pills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setActiveDossierSection(pill.id)}
                    className={`dossier-jump-pill ${activeDossierSection === pill.id ? "active" : ""}`}
                  >
                    {pill.label}
                  </button>
                ));
              })()}
            </div>

            {/* SECTION 1: CANDIDATE BIO-DATA & MASTER PROFILE */}
            {showSection("candidate_bio") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 1</span>
                    <h3 className="dossier-table-title">👤 Candidate Bio-Data &amp; Master Registration Profile</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="dossier-badge-done">● Registered Candidate</span>
                    <button
                      type="button"
                      onClick={() => setShowEditBioModal(true)}
                      style={{
                        background: "linear-gradient(135deg, #f0edff 0%, #ede9fe 100%)",
                        color: "#6d28d9",
                        border: "1px solid #c4b5fd",
                        fontWeight: 800,
                        padding: "5px 12px",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11.5px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(109, 40, 217, 0.08)",
                      }}
                      title="Edit Candidate Registration Details"
                    >
                      ✏️ Edit Registration Info
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Candidate ID</span><b className="dossier-field-value highlight-purple">{file.candidate.candidateNo}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Registration No</span><b className="dossier-field-value">{file.candidate.registrationNo || file.candidate.candidateNo}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Full Name</span><b className="dossier-field-value">{file.candidate.fullName}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Primary Phone</span><b className="dossier-field-value highlight-green">{file.candidate.phone}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Alternate Phone</span><b className="dossier-field-value">{file.candidate.phones?.[0]?.phone || "N/A"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Passport Number</span><b className="dossier-field-value">{file.candidate.passportNo || file.passport?.passportNumber || "N/A"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">National ID (NID)</span><b className="dossier-field-value">{file.candidate.nationalId || "N/A"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Email Address</span><b className="dossier-field-value">{file.candidate.email || "N/A"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">District / Hometown</span><b className="dossier-field-value">{file.candidate.district || "Dhaka"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Present Address</span><b className="dossier-field-value">{file.candidate.address || "Dhaka, Bangladesh"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Date of Birth</span><b className="dossier-field-value">{file.candidate.dob ? new Date(file.candidate.dob).toLocaleDateString("en-GB") : "12 Jan 1996"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Gender &amp; Marital Status</span><b className="dossier-field-value">{file.candidate.gender || "Male"} · {file.candidate.maritalStatus || "Married"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Profession Category</span><b className="dossier-field-value highlight-purple">{file.profession || file.candidate.profession || "General Worker"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Target Country</span><b className="dossier-field-value">{file.country}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Agent / Referral Partner</span><b className="dossier-field-value">{file.agent && file.agent !== "Direct" && file.agent !== "Direct Office" ? (
                    <Link
                      href={file.agentRecord?.id ? `/agents/${file.agentRecord.id}` : `/module/agents/agent-list?q=${encodeURIComponent(file.agent)}`}
                      style={{ color: "#7258e8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 800 }}
                      title="Open Agent Profile"
                    >
                      🤝 {file.agentRecord?.name || file.agent} {file.agentRecord?.code ? `(${file.agentRecord.code})` : ""} ➔
                    </Link>
                  ) : (
                    file.candidate.source || file.agent || "🏢 Direct Office Registration"
                  )}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Branch Office</span><b className="dossier-field-value">{typeof file.candidate.office === "object" ? file.candidate.office?.name : (file.office?.name || "Dhaka Head Office")}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 2: PASSPORT LIST & PASSPORT ENTRY */}
            {showSection("passport") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 2</span>
                    <h3 className="dossier-table-title">📘 Passport List &amp; Passport Entry Verification</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Passport Entry") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {isStageCompleted("Passport Entry") ? "✓ Verified & Original In Hand" : "● Pending Verification"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Scanned Passport Copy",
                          category: "passport",
                          url: attachedFiles["passport"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Verified Valid",
                        })
                      }
                    >
                      <Eye size={13} /> View Passport Scan {attachedFiles["passport"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Passport Number</span><b className="dossier-field-value highlight-purple">{file.passport?.passportNumber || file.candidate.passportNo || "N/A"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Passport Type</span><b className="dossier-field-value">{file.passport?.passportType || "Ordinary (E-Passport)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Issue Date</span><b className="dossier-field-value">{file.passport?.issueDate ? new Date(file.passport.issueDate).toLocaleDateString("en-GB") : "01 Jan 2024"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Expiry Date (10-Year Valid)</span><b className="dossier-field-value highlight-green">{file.passport?.expiryDate ? new Date(file.passport.expiryDate).toLocaleDateString("en-GB") : "01 Jan 2034"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Issuing Authority / Place</span><b className="dossier-field-value">{file.passport?.issuingAuthority || "DIP Dhaka, Bangladesh"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Verification Status</span><b className="dossier-field-value highlight-green">{file.passport?.verificationStatus || "Verified & Original In Hand"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Verified By Officer</span><b className="dossier-field-value">{file.assignedTo?.name || "Call Center Officer"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Physical Scan Attached</span><b className={`dossier-field-value ${attachedFiles["passport"] ? "highlight-green" : ""}`}>{attachedFiles["passport"] ? "✓ Scan Attached" : "Digital Record"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 3: MEDICAL SUBMIT & GCC GAMCA CHECKUP */}
            {showSection("medical") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 3</span>
                    <h3 className="dossier-table-title">🏥 GCC GAMCA Medical Checkup &amp; Biometrics Submit</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Medical") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {file.medical?.[0]?.result ? `✓ Result: ${file.medical[0].result}` : "● Medical In Progress"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "GAMCA Medical Certificate",
                          category: "medical",
                          url: attachedFiles["medical"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: file.medical?.[0]?.result || "FIT",
                        })
                      }
                    >
                      <Eye size={13} /> View Medical Slip {attachedFiles["medical"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Medical Center Name</span><b className="dossier-field-value">{file.medical?.[0]?.centerName || file.medical?.[0]?.center || "Ibn Sina GCC Medical Center, Dhaka"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Fitness Result Status</span><b className="dossier-field-value highlight-green">{file.medical?.[0]?.result || "FIT (Passed)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Medical Test Date</span><b className="dossier-field-value">{file.medical?.[0]?.testDate ? new Date(file.medical[0].testDate).toLocaleDateString("en-GB") : "20 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Medical Expiry Date</span><b className="dossier-field-value">{file.medical?.[0]?.expiryDate ? new Date(file.medical[0].expiryDate).toLocaleDateString("en-GB") : "18 Nov 2026 (90 Days)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">10-Finger Biometric Done</span><b className="dossier-field-value highlight-green">✓ YES (Completed)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Medical Picture Collected</span><b className="dossier-field-value highlight-green">✓ YES (Collected)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Physical Medical Slip in Hand</span><b className="dossier-field-value highlight-green">✓ YES (In Hand)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Re-Medical File</span><b className="dossier-field-value">NO (Normal 1st Medical)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Contact Medical Done By</span><b className="dossier-field-value">{file.assignedTo?.name || "Call Center Officer"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Fit Card Status</span><b className="dossier-field-value highlight-green">Fit Card Issued</b></div>
                  <div className="dossier-field span-2"><span className="dossier-field-label">Officer Medical Remarks</span><b className="dossier-field-value">{file.medical?.[0]?.remarks || "GAMCA medical passed with clear blood tests and X-ray."}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 4: POLICE CLEARANCE CERTIFICATE (PCC) */}
            {showSection("police") && !isDubai && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 4</span>
                    <h3 className="dossier-table-title">🛡️ Police Clearance Certificate (PCC) Records</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Police Clearance") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {isStageCompleted("Police Clearance") ? "✓ PCC Cleared & Verified" : "● PCC Under Verification"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Police Clearance Certificate",
                          category: "police",
                          url: attachedFiles["police"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Clear / Verified",
                        })
                      }
                    >
                      <Eye size={13} /> View PCC Scan {attachedFiles["police"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">PCC Application No</span><b className="dossier-field-value highlight-purple">{file.police?.[0]?.applicationNumber || `PCC-${file.fileNo}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Application Date</span><b className="dossier-field-value">{file.police?.[0]?.applicationDate ? new Date(file.police[0].applicationDate).toLocaleDateString("en-GB") : "10 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Issue Date</span><b className="dossier-field-value">{file.police?.[0]?.issueDate ? new Date(file.police[0].issueDate).toLocaleDateString("en-GB") : "18 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Expiry Date (180 Days)</span><b className="dossier-field-value highlight-green">{file.police?.[0]?.expiryDate ? new Date(file.police[0].expiryDate).toLocaleDateString("en-GB") : "14 Feb 2027"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Verification Result</span><b className="dossier-field-value highlight-green">{file.police?.[0]?.result || "Clear / Verified (No Criminal Record)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">PCC Processing Status</span><b className="dossier-field-value">{file.police?.[0]?.status || "Verified & Available"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Certificate Reference Key</span><b className="dossier-field-value">{file.police?.[0]?.certificateKey || `CERT-PCC-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Verified Officer</span><b className="dossier-field-value">{file.assignedTo?.name || "Call Center Officer"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 5: PAYMENT DEPOSITS, INSTALLMENTS & FINANCIAL RECEIPTS */}
            {(showSection("payment") || showSection("payment1") || showSection("payment2")) && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">{isDubai ? "TABLE 4" : "TABLE 5"}</span>
                    <h3 className="dossier-table-title">💵 Candidate Payment Deposits, Invoices &amp; Receipts Management</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={advanceAmount > 0 ? "dossier-badge-done" : totalPaid > 0 ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {advanceAmount > 0
                        ? `✓ ৳ ${totalPaid.toLocaleString()} BDT Paid (100% Settled + ৳ ${advanceAmount.toLocaleString()} Advance)`
                        : totalPaid > 0
                        ? `✓ ৳ ${totalPaid.toLocaleString()} BDT Paid (${Math.round((totalPaid / totalPackageCost) * 100)}% - Due: ৳ ${balanceRemaining.toLocaleString()} BDT)`
                        : "● Payment Pending"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveReceipt({
                          receiptNo: `MR-${file.fileNo.replace("FILE-", "")}`,
                          date: new Date().toLocaleDateString("en-GB"),
                          candidateName: file.candidate.fullName,
                          candidateNo: file.candidate.candidateNo,
                          fileNo: file.fileNo,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          phone: file.candidate.phone,
                          country: file.country,
                          profession: file.profession,
                          paymentType: "Master Statement (All Payments)",
                          paymentMethod: "Office Accounts",
                          referenceNo: `STMT-${file.fileNo}`,
                          amount: totalPaid,
                          totalPaid: totalPaid,
                          totalPackage: totalPackageCost,
                          officerName: file.assignedTo?.name || "Accounts Department",
                        })
                      }
                    >
                      <Printer size={13} /> Print Master Receipt
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field">
                    <span className="dossier-field-label">Total Contract Package</span>
                    <b className="dossier-field-value">৳ {totalPackageCost.toLocaleString()} BDT</b>
                  </div>
                  <div className="dossier-field">
                    <span className="dossier-field-label">Total Amount Deposited</span>
                    <b className="dossier-field-value highlight-green">৳ {totalPaid.toLocaleString()} BDT</b>
                  </div>
                  <div className="dossier-field">
                    <span className="dossier-field-label">{advanceAmount > 0 ? "Advance / Extra Surplus" : "Remaining Balance Due"}</span>
                    <b className={`dossier-field-value ${advanceAmount > 0 ? "highlight-purple" : balanceRemaining > 0 ? "highlight-red" : "highlight-green"}`}>
                      {advanceAmount > 0 ? `+ ৳ ${advanceAmount.toLocaleString()} BDT (Advance)` : `৳ ${balanceRemaining.toLocaleString()} BDT`}
                    </b>
                  </div>
                  <div className="dossier-field">
                    <span className="dossier-field-label">Package Settlement</span>
                    <b className={`dossier-field-value ${advanceAmount > 0 ? "highlight-purple" : balanceRemaining === 0 ? "highlight-green" : "highlight-purple"}`}>
                      {Math.round((totalPaid / totalPackageCost) * 100)}% Cleared {advanceAmount > 0 ? "(Advance Surplus)" : balanceRemaining === 0 ? "(Fully Paid)" : `(Due: ৳ ${balanceRemaining.toLocaleString()})`}
                    </b>
                  </div>
                </div>

                {/* All Recorded Transactions Breakdown */}
                {file.payments && file.payments.length > 0 ? (
                  <div style={{ padding: "0 22px 20px 22px" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Transaction Installments &amp; Receipt Slips ({file.payments.length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {file.payments.map((p, idx) => (
                        <div key={p.id || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafd", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px 16px", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <span style={{ fontSize: "10px", fontWeight: 800, background: "var(--purple-soft)", color: "var(--purple)", padding: "2px 6px", borderRadius: "4px", marginRight: "6px" }}>
                              PAYMENT #{idx + 1}
                            </span>
                            <b style={{ fontSize: "13px", color: "var(--ink)" }}>{p.type || "Candidate Deposit"}</b>
                            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                              Ref: {p.reference || p.referenceNo || "N/A"} · Method: {p.method || "Cash"} · Date: {new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB")}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <b style={{ fontSize: "14px", color: "#15803d", fontWeight: 800 }}>
                              ৳ {Number(p.amount).toLocaleString()} BDT
                            </b>
                            <button
                              type="button"
                              className="payment-receipt-btn"
                              style={{ fontSize: "11px" }}
                              onClick={() =>
                                setActiveReceipt({
                                  receiptNo: p.reference || `REC-${idx + 1}`,
                                  date: new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB"),
                                  candidateName: file.candidate.fullName,
                                  candidateNo: file.candidate.candidateNo,
                                  fileNo: file.fileNo,
                                  passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                                  phone: file.candidate.phone,
                                  country: file.country,
                                  profession: file.profession,
                                  paymentType: p.type || "Candidate Deposit",
                                  paymentMethod: p.method || "Office Cash",
                                  referenceNo: p.reference || `REC-${idx + 1}`,
                                  amount: Number(p.amount),
                                  totalPaid: totalPaid,
                                  totalPackage: totalPackageCost,
                                  officerName: file.assignedTo?.name || "Accounts Department",
                                })
                              }
                            >
                              <Printer size={12} /> Print Receipt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "0 22px 20px 22px" }}>
                    <div style={{ padding: "12px", background: "#fafafd", border: "1px solid var(--line)", borderRadius: "8px", color: "var(--muted)", fontSize: "12px" }}>
                      No payment deposits recorded yet for this candidate.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION: DUBAI MOHRE LABOR APPROVAL & OFFER LETTER */}
            {showSection("approval") && isDubai && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 5</span>
                    <h3 className="dossier-table-title">📋 MOHRE Labor Approval &amp; Offer Letter (Dubai)</h3>
                  </div>
                  <span className="dossier-badge-done">✓ MOHRE Approved</span>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Approval Ref No</span><b className="dossier-field-value highlight-purple">{`MOHRE-APP-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Labor Status</span><b className="dossier-field-value highlight-green">Approved &amp; Issued</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Offer Submission Date</span><b className="dossier-field-value">18 Aug 2026</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">MOHRE Approval Date</span><b className="dossier-field-value highlight-green">20 Aug 2026</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Sponsor / Company</span><b className="dossier-field-value">{file.company || "Dubai Employer LLC"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Designated Profession</span><b className="dossier-field-value">{file.profession || "General Worker"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Basic Salary</span><b className="dossier-field-value highlight-purple">1,800 AED / Month</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Food &amp; Accommodation</span><b className="dossier-field-value">Provided by Company</b></div>
                </div>
              </div>
            )}

            {/* SECTION 6: SAUDI TAKAMUL SVP SKILL TEST */}
            {showSection("takamul") && isSaudi && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 6</span>
                    <h3 className="dossier-table-title">🏅 Saudi Takamul Skill Verification Program (SVP)</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Takamul") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {file.takamul?.[0]?.reportStatus ? `✓ ${file.takamul[0].reportStatus}` : "● Takamul In Progress"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Takamul Skill Test Certificate",
                          category: "takamul",
                          url: attachedFiles["takamul"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Passed (Certificate Issued)",
                        })
                      }
                    >
                      <Eye size={13} /> View SVP Certificate {attachedFiles["takamul"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Registration Number</span><b className="dossier-field-value">{file.takamul?.[0]?.registrationNumber || `REG-TAK-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Certificate Number</span><b className="dossier-field-value highlight-purple">{file.takamul?.[0]?.certificateNumber || `TAK-${file.fileNo.slice(-7)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Takamul Exam Status</span><b className="dossier-field-value highlight-green">{file.takamul?.[0]?.status || "Present"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Takamul Report Status</span><b className="dossier-field-value highlight-green">{file.takamul?.[0]?.reportStatus || "Passed (Certificate Issued)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Exam Date</span><b className="dossier-field-value">{file.takamul?.[0]?.examDate ? new Date(file.takamul[0].examDate).toLocaleDateString("en-GB") : "19 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Present Date</span><b className="dossier-field-value">{file.takamul?.[0]?.presentDate ? new Date(file.takamul[0].presentDate).toLocaleDateString("en-GB") : "19 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Center District</span><b className="dossier-field-value">{file.takamul?.[0]?.centerDistrict || "Dhaka Center"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Takamul Done By</span><b className="dossier-field-value">{file.takamul?.[0]?.doneBy || file.assignedTo?.name || "Senior Desk Officer"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Profession</span><b className="dossier-field-value">{file.profession || "Electrician / Plumber"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Takamul Profession</span><b className="dossier-field-value">{file.profession || "Electrician / Plumber"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Sponsor Company</span><b className="dossier-field-value">{file.company || "Saudi Binladen Group"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Physical Scan</span><b className={`dossier-field-value ${attachedFiles["takamul"] ? "highlight-green" : ""}`}>{attachedFiles["takamul"] ? "✓ Attached" : "Not uploaded"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 7: KSA BIOMETRICS & BIO-FINGER */}
            {showSection("bio") && isSaudi && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 7</span>
                    <h3 className="dossier-table-title">🖐️ KSA Biometrics &amp; Bio-Finger Records</h3>
                  </div>
                  <span className="dossier-badge-done">✓ KSA Bio Finger Done</span>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Bio Status</span><b className="dossier-field-value highlight-green">{file.biometrics?.[0]?.status || "Done / Present"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Finger Date</span><b className="dossier-field-value">{file.biometrics?.[0]?.fingerDate ? new Date(file.biometrics[0].fingerDate).toLocaleDateString("en-GB") : "18 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Appointment Date</span><b className="dossier-field-value">{file.biometrics?.[0]?.appointmentDate ? new Date(file.biometrics[0].appointmentDate).toLocaleDateString("en-GB") : "18 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Present Date</span><b className="dossier-field-value">{file.biometrics?.[0]?.presentDate ? new Date(file.biometrics[0].presentDate).toLocaleDateString("en-GB") : "18 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Biometric Evidence Key</span><b className="dossier-field-value">{file.biometrics?.[0]?.evidenceKey || `BIO-KSA-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Officer In Charge</span><b className="dossier-field-value">{file.assignedTo?.name || "Call Center Officer"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Office Center</span><b className="dossier-field-value">{file.office?.name || "Dhaka Head Office"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Completed Date</span><b className="dossier-field-value highlight-green">{file.biometrics?.[0]?.completedAt ? new Date(file.biometrics[0].completedAt).toLocaleDateString("en-GB") : "18 Aug 2026"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 8: SAUDI MOFA & VISA SUBMISSION */}
            {showSection("mofa") && isSaudi && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 8</span>
                    <h3 className="dossier-table-title">🌐 Saudi MOFA Submission &amp; Embassy Visa Processing</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Mofa") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {isStageCompleted("Mofa") ? "✓ MOFA Approved & Done" : "● MOFA Pending"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Electronic Visa Stamped Copy",
                          category: "visa",
                          url: attachedFiles["visa"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Stamped & Issued",
                        })
                      }
                    >
                      <Eye size={13} /> View MOFA / Visa Scan {attachedFiles["visa"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">MOFA Number</span><b className="dossier-field-value highlight-purple">{file.mofa?.[0]?.mofaNumber || `MOFA-${file.fileNo.slice(-7)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">MOFA Status</span><b className="dossier-field-value highlight-green">{file.mofa?.[0]?.status || "Approved / Done"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">MOFA Submit Date</span><b className="dossier-field-value">{file.mofa?.[0]?.submitDate ? new Date(file.mofa[0].submitDate).toLocaleDateString("en-GB") : "20 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">MOFA Done Date</span><b className="dossier-field-value highlight-green">{file.mofa?.[0]?.doneDate ? new Date(file.mofa[0].doneDate).toLocaleDateString("en-GB") : "21 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Medical Fit State</span><b className="dossier-field-value highlight-green">Fit (88 days left)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Profession</span><b className="dossier-field-value">{file.profession || "Electrician / Plumber"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Kafeel / Company</span><b className="dossier-field-value">{file.company || "Saudi Binladen Group"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Re-MOFA File</span><b className="dossier-field-value">NO (Normal MOFA)</b></div>
                </div>
              </div>
            )}

            {/* SECTION 9: E-VISA STAMPING & VISA HOLD */}
            {showSection("visa") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">
                      {isDubai ? "TABLE 6" : isOtherCountry ? "TABLE 6" : "TABLE 9"}
                    </span>
                    <h3 className="dossier-table-title">
                      {isDubai
                        ? "🛂 Dubai Electronic Entry Visa & Work Permit (GDRFA)"
                        : isOtherCountry
                        ? "🛂 Embassy Work Visa Stamping & Permit"
                        : "🛂 E-Visa Stamping & Visa Status (Embassy Stamping)"}
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={file.visas?.[0]?.status === "Stamped" || isStageCompleted("Mofa") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      ✓ E-Visa Stamped &amp; Ready
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Electronic Visa Stamped Copy",
                          category: "visa",
                          url: attachedFiles["visa"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Stamped & Issued",
                        })
                      }
                    >
                      <Eye size={13} /> View E-Visa Scan {attachedFiles["visa"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Visa Number</span><b className="dossier-field-value highlight-purple">{file.visas?.[0]?.visaNumber || `VISA-${file.country.slice(0,3).toUpperCase()}-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Type</span><b className="dossier-field-value">Employment Overseas Work Visa</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Stamping Status</span><b className="dossier-field-value highlight-green">{file.visas?.[0]?.status || "Stamped & Issued"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Issue Date</span><b className="dossier-field-value">{file.visas?.[0]?.issueDate ? new Date(file.visas[0].issueDate).toLocaleDateString("en-GB") : "21 Aug 2026"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Expiry Date</span><b className="dossier-field-value highlight-green">{file.visas?.[0]?.expiryDate ? new Date(file.visas[0].expiryDate).toLocaleDateString("en-GB") : "19 Nov 2026 (90 Days)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Sponsor / Kafeel</span><b className="dossier-field-value">{file.company || "Saudi Binladen Group"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Fit Card Status</span><b className="dossier-field-value highlight-green">Fit Card Received</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Visa Hold Status</span><b className="dossier-field-value highlight-green">None (Active)</b></div>
                </div>
              </div>
            )}

            {/* DYNAMIC CUSTOM RECRUITMENT STAGES SECTIONS IN DOSSIER */}
            {stages
              .filter((s: any) => s.isCustom)
              .map((cStage: any) => {
                if (!showSection("all") && !showSection(`custom_${cStage.code}`)) return null;

                const customEvents = (file?.workflowEvents || []).filter(
                  (e: any) =>
                    e.stage === cStage.code ||
                    e.stage === cStage.id ||
                    e.stage === cStage.label
                );
                const latestEvt = customEvents[0];
                const stageData = (latestEvt?.data as Record<string, any>) || {};
                const fields: any[] = cStage.fields || [];
                const isDone = isStageCompleted(cStage.id);

                return (
                  <div key={cStage.code} className="dossier-section-card">
                    <div className="dossier-section-header">
                      <div className="dossier-title-group">
                        <span className="dossier-table-num">CUSTOM STEP {cStage.stepNo}</span>
                        <h3 className="dossier-table-title">
                          ✨ {cStage.label} ({cStage.subtitle || "Custom Processing Milestone"})
                        </h3>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className={isDone ? "dossier-badge-done" : "dossier-badge-pending"}>
                          {isDone ? `✓ ${stageData["verificationStatus"] || latestEvt?.status || "Completed / Verified"}` : "● Pending Processing"}
                        </span>
                      </div>
                    </div>

                    {fields.length === 0 ? (
                      <div className="dossier-grid-4">
                        <div className="dossier-field">
                          <span className="dossier-field-label">Stage Status</span>
                          <b className="dossier-field-value highlight-purple">{stageData["verificationStatus"] || latestEvt?.status || "Pending Submission"}</b>
                        </div>
                        <div className="dossier-field" style={{ gridColumn: "span 2" }}>
                          <span className="dossier-field-label">Status / Milestone Remarks</span>
                          <b className="dossier-field-value">{stageData["remarks"] || "No notes entered yet."}</b>
                        </div>
                        <div className="dossier-field">
                          <span className="dossier-field-label">Last Updated</span>
                          <b className="dossier-field-value">{latestEvt?.createdAt ? new Date(latestEvt.createdAt).toLocaleDateString("en-GB") : "N/A"}</b>
                        </div>
                      </div>
                    ) : (
                      <div className="dossier-grid-4">
                        <div className="dossier-field">
                          <span className="dossier-field-label">Verification &amp; Processing Status</span>
                          <b className={`dossier-field-value ${isDone ? "highlight-green" : "highlight-purple"}`}>
                            {stageData["verificationStatus"] || latestEvt?.status || "Pending Submission"}
                          </b>
                        </div>

                        {fields.map((fld: any) => {
                          const val = stageData[`field_${fld.id}`] ?? stageData[fld.id] ?? stageData[fld.label];
                          const displayVal = val ? (fld.type === "date" ? new Date(val).toLocaleDateString("en-GB") : String(val)) : "N/A";
                          const isFile = fld.type === "file";
                          const isTextarea = fld.type === "textarea";

                          return (
                            <div
                              key={fld.id}
                              className="dossier-field"
                              style={{ gridColumn: isTextarea ? "span 2" : "span 1" }}
                            >
                              <span className="dossier-field-label">{fld.label}</span>
                              <b className={`dossier-field-value ${val ? "highlight-purple" : ""}`}>
                                {isFile && attachedFiles[`custom_${cStage.code}_${fld.id}`] ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveDoc({
                                        candidateName: file.candidate.fullName,
                                        passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                                        candidateNo: file.candidate.candidateNo,
                                        country: file.country,
                                        profession: file.profession,
                                        company: file.company,
                                        title: `${fld.label} Scan`,
                                        category: `custom_${cStage.code}_${fld.id}`,
                                        url: attachedFiles[`custom_${cStage.code}_${fld.id}`]?.url,
                                        fileNumber: file.fileNo,
                                        verifiedStatus: "Attached Scan",
                                      })
                                    }
                                    style={{ color: "#7258e8", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 800 }}
                                  >
                                    📎 View Attached Document ✓
                                  </button>
                                ) : (
                                  displayVal
                                )}
                              </b>
                            </div>
                          );
                        })}

                        <div className="dossier-field">
                          <span className="dossier-field-label">Processed By</span>
                          <b className="dossier-field-value">{latestEvt?.completedBy || "Processing Desk"}</b>
                        </div>
                        <div className="dossier-field">
                          <span className="dossier-field-label">Last Updated Date</span>
                          <b className="dossier-field-value">{latestEvt?.createdAt ? new Date(latestEvt.createdAt).toLocaleDateString("en-GB") : "N/A"}</b>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* SECTION 10: BMET MANPOWER SMART CARD */}
            {showSection("manpower") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 10</span>
                    <h3 className="dossier-table-title">📜 BMET Manpower Smart Card Clearance</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Manpower") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {isStageCompleted("Manpower") ? "✓ Approved & Smart Card Ready" : "● BMET Under Submission"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "BMET Smart Card Clearance",
                          category: "manpower",
                          url: attachedFiles["manpower"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Approved",
                        })
                      }
                    >
                      <Eye size={13} /> View Smart Card Copy {attachedFiles["manpower"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">BMET Smart Card Ref</span><b className="dossier-field-value highlight-purple">{file.manpower?.[0]?.reference || `BMET-CARD-${file.fileNo.slice(-6)}`}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Manpower Status</span><b className="dossier-field-value highlight-green">{file.manpower?.[0]?.status || "Approved & Smart Card Delivered"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Employer Company</span><b className="dossier-field-value">{file.manpower?.[0]?.company || file.company || "Saudi Binladen Group"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Approved Profession</span><b className="dossier-field-value">{file.manpower?.[0]?.profession || file.profession || "Electrician / Plumber"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">BMET Finger Done</span><b className="dossier-field-value highlight-green">✓ YES (Completed)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">BMET Training Clearance</span><b className="dossier-field-value highlight-green">✓ YES (Completed)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Ready to Flight</span><b className="dossier-field-value highlight-green">✓ YES (Ready)</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Smart Card Scan Attached</span><b className={`dossier-field-value ${attachedFiles["manpower"] ? "highlight-green" : ""}`}>{attachedFiles["manpower"] ? "✓ Attached" : "Not uploaded"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 11: FLIGHT BOOKING & READY FOR FLIGHT */}
            {showSection("flight") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 11</span>
                    <h3 className="dossier-table-title">✈️ Flight Booking, Ready For Flight &amp; Candidate Departure</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={isStageCompleted("Flight") ? "dossier-badge-done" : "dossier-badge-pending"}>
                      {isStageCompleted("Flight") ? "✓ Flight Booked & Ticket Issued" : "● Pending Flight Schedule"}
                    </span>
                    <button
                      type="button"
                      className="payment-receipt-btn"
                      onClick={() =>
                        setActiveDoc({
                          candidateName: file.candidate.fullName,
                          passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                          candidateNo: file.candidate.candidateNo,
                          country: file.country,
                          profession: file.profession,
                          company: file.company,
                          title: "Flight Air E-Ticket",
                          category: "flight",
                          url: attachedFiles["flight"]?.url,
                          fileNumber: file.fileNo,
                          verifiedStatus: "Confirmed / Booked",
                        })
                      }
                    >
                      <Eye size={13} /> View Air Ticket {attachedFiles["flight"] && "✓"}
                    </button>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  <div className="dossier-field"><span className="dossier-field-label">Airline</span><b className="dossier-field-value">{file.flights?.[0]?.flight?.airline || "Saudia Airlines (SV)"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Flight Number</span><b className="dossier-field-value highlight-purple">{file.flights?.[0]?.flight?.flightNumber || file.flights?.[0]?.flight?.flightNo || "SV-803"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Route</span><b className="dossier-field-value">{file.flights?.[0]?.flight?.departureAirport || "DAC (Dhaka)"} ➔ {file.flights?.[0]?.flight?.destination || (isDubai ? "DXB (Dubai)" : "RUH (Riyadh)")}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">PNR / Air Ticket No</span><b className="dossier-field-value">{file.flights?.[0]?.ticketNo || file.flights?.[0]?.flight?.pnr || "PNR-8921098"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Departure Date &amp; Time</span><b className="dossier-field-value highlight-green">{file.flights?.[0]?.flight?.departureDate ? new Date(file.flights[0].flight.departureDate).toLocaleString("en-GB") : (file.flights?.[0]?.flight?.departureAt ? new Date(file.flights[0].flight.departureAt).toLocaleString("en-GB") : "28 Aug 2026, 21:45")}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Baggage Allowance</span><b className="dossier-field-value">{file.flights?.[0]?.baggage || "2x 23KG + 7KG Hand"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Deployment Status</span><b className="dossier-field-value highlight-green">{file.flights?.[0]?.flight?.status || "Confirmed / Scheduled"}</b></div>
                  <div className="dossier-field"><span className="dossier-field-label">Flown Status</span><b className="dossier-field-value">{file.flights?.[0]?.flown ? "Flown / Reached Destination" : "Scheduled For Departure"}</b></div>
                </div>
              </div>
            )}

            {/* SECTION 12: HOLD FILES, RETURN FILES & REFUND SETTLEMENT */}
            {showSection("holds_returns") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 12</span>
                    <h3 className="dossier-table-title">⏸️ Hold File, Return File &amp; Refund Settlement History</h3>
                  </div>
                  <span className={`dossier-badge-${file.holds && file.holds.length > 0 ? "pending" : "done"}`}>
                    {file.holds && file.holds.length > 0 ? `● ${file.holds.length} Exception Event(s)` : "✓ Active / Normal Status"}
                  </span>
                </div>
                <div className="dossier-grid-4">
                  {file.holds && file.holds.length > 0 ? (
                    file.holds.map((h, i) => (
                      <div key={h.id || i} className="dossier-field span-2" style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
                        <span className="dossier-field-label" style={{ color: "#b45309" }}>Event: {h.type || "File Hold"} ({new Date(h.createdAt || Date.now()).toLocaleDateString("en-GB")})</span>
                        <b className="dossier-field-value" style={{ color: "#92400e" }}>Reason: {h.reason}</b>
                        <span style={{ fontSize: "11px", color: "#78350f", marginTop: "2px" }}>Note: {h.note || "No note recorded"}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="dossier-field"><span className="dossier-field-label">Hold File Status</span><b className="dossier-field-value highlight-green">NO (File is Active)</b></div>
                      <div className="dossier-field"><span className="dossier-field-label">Return File Status</span><b className="dossier-field-value highlight-green">NO (In Processing)</b></div>
                      <div className="dossier-field"><span className="dossier-field-label">Refund Incurred</span><b className="dossier-field-value">None (0.00 BDT)</b></div>
                      <div className="dossier-field"><span className="dossier-field-label">Exceptions</span><b className="dossier-field-value highlight-green">0 Hold / Return Events</b></div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 13: CANDIDATE EDUCATION & WORK EXPERIENCE */}
            {showSection("education_exp") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 13</span>
                    <h3 className="dossier-table-title">🎓 Candidate Education &amp; Work Experience History</h3>
                  </div>
                </div>
                <div className="dossier-subbox-grid">
                  <div className="dossier-subbox">
                    <h4>Educational Background</h4>
                    {file.candidate.educations && file.candidate.educations.length > 0 ? (
                      file.candidate.educations.map((edu, idx) => (
                        <div key={edu.id || idx} className="dossier-subbox-item">
                          <b>{edu.level}</b> — {edu.institution || "College / Board"}
                          <span>Subject: {edu.subject || "General"} · Passing Year: {edu.passingYear || "2018"} · Result: {edu.result || "GPA 4.0"}</span>
                        </div>
                      ))
                    ) : (
                      <div className="dossier-subbox-item">
                        <b>Secondary School Certificate (SSC)</b> — Dhaka Board
                        <span>Passing Year: 2018 · Result: Passed</span>
                      </div>
                    )}
                  </div>
                  <div className="dossier-subbox">
                    <h4>Work &amp; Overseas Experience</h4>
                    {file.candidate.experiences && file.candidate.experiences.length > 0 ? (
                      file.candidate.experiences.map((exp, idx) => (
                        <div key={exp.id || idx} className="dossier-subbox-item">
                          <b>{exp.role}</b> at {exp.employer || "Private Electrical Contractor"}
                          <span>Country: {exp.country || "Bangladesh"} · Experience: {exp.years ? `${exp.years} Years` : "3 Years"}</span>
                        </div>
                      ))
                    ) : (
                      <div className="dossier-subbox-item">
                        <b>Electrician / Technical Technician</b> — 3.5 Years Practical Experience in Residential &amp; Commercial Wiring.
                        <span>Country: Bangladesh · Skill: Electrical Maintenance</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 14: CALL CENTER LEADS & CALL LOGS */}
            {showSection("calls") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 14</span>
                    <h3 className="dossier-table-title">📞 Call Center Lead Communications &amp; Officer Call Logs</h3>
                  </div>
                </div>
                <div className="dossier-grid-4">
                  {file.candidate.calls && file.candidate.calls.length > 0 ? (
                    file.candidate.calls.map((call, idx) => (
                      <div key={call.id || idx} className="dossier-field span-2">
                        <span className="dossier-field-label">Lead Ref: {call.leadNo} ({new Date(call.createdAt).toLocaleDateString("en-GB")})</span>
                        <b className="dossier-field-value highlight-purple">Status: {call.status} · Priority: P{call.priority}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Purpose: {call.purpose || "Saudi Arabia Visa Processing Follow-up"}</span>
                      </div>
                    ))
                  ) : (
                    <div className="dossier-field span-2">
                      <span className="dossier-field-label">Lead Ref: LEAD-8921 (20 Aug 2026)</span>
                      <b className="dossier-field-value highlight-green">Status: Converted to Active File</b>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Initial inquiry regarding Saudi Arabia employment demand. Candidate registered and file opened.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 15: PHYSICAL SCANNED DOCUMENTS ARCHIVE */}
            {showSection("documents") && (
              <div className="dossier-section-card">
                <div className="dossier-section-header">
                  <div className="dossier-title-group">
                    <span className="dossier-table-num">TABLE 15</span>
                    <h3 className="dossier-table-title">📁 Complete 360° Scanned Documents &amp; Physical Files Repository</h3>
                  </div>
                </div>
                <div className="dossier-docs-grid">
                  {(isDubai
                    ? [
                        { cat: "passport", title: "1. Original Passport Copy", desc: "Scanned bio page & validity" },
                        { cat: "medical", title: "2. Medical Fitness Certificate", desc: "Fit slip & lab report" },
                        { cat: "payment", title: "3. Payment Deposit Voucher", desc: "Money deposit receipt" },
                        { cat: "evisa", title: "4. Dubai E-Visa Entry Permit", desc: "GDRFA employment permit" },
                        { cat: "manpower", title: "5. BMET Smart Card Copy", desc: "Govt manpower clearance card" },
                        { cat: "flight", title: "6. Flight Air E-Ticket", desc: "Confirmed airline departure ticket" },
                      ]
                    : isOtherCountry
                    ? [
                        { cat: "passport", title: "1. Original Passport Copy", desc: "Scanned bio page & validity" },
                        { cat: "medical", title: "2. Medical Certificate", desc: "Fit slip & lab report" },
                        { cat: "police", title: "3. Police Clearance Certificate", desc: "Official verification PCC" },
                        { cat: "payment", title: "4. Payment Deposit Voucher", desc: "Money deposit receipt" },
                        { cat: "visa", title: "5. Work Visa Stamped Copy", desc: "Embassy stamped visa" },
                        { cat: "manpower", title: "6. BMET Smart Card Copy", desc: "Govt manpower clearance card" },
                        { cat: "flight", title: "7. Flight Air E-Ticket", desc: "Confirmed airline departure ticket" },
                      ]
                    : [
                        { cat: "passport", title: "1. Original Passport Copy", desc: "Scanned bio page & validity" },
                        { cat: "medical", title: "2. GAMCA Medical Certificate", desc: "Fit slip & blood report" },
                        { cat: "police", title: "3. Police Clearance Certificate", desc: "Official verification PCC" },
                        { cat: "payment", title: "4. Payment Bank Voucher / Receipt", desc: "Money deposit voucher & slip" },
                        { cat: "takamul", title: "5. Takamul SVP Certificate", desc: "Saudi skill test certification" },
                        { cat: "visa", title: "6. Electronic Visa Stamped Copy", desc: "Embassy e-visa confirmation" },
                        { cat: "manpower", title: "7. BMET Smart Card Copy", desc: "Govt manpower clearance card" },
                        { cat: "flight", title: "8. Flight Air E-Ticket", desc: "Confirmed airline departure ticket" },
                      ]
                  ).map((doc) => (
                    <div key={doc.cat} className="dossier-doc-card">
                      <div className="dossier-doc-top">
                        <div>
                          <b>{doc.title}</b>
                          <p>{doc.desc}</p>
                        </div>
                        {attachedFiles[doc.cat] ? (
                          <span className="dossier-badge-done">✓ Attached</span>
                        ) : (
                          <span className="dossier-badge-pending">Digital Record</span>
                        )}
                      </div>
                      <div className="dossier-doc-actions">
                        <button
                          type="button"
                          className="payment-receipt-btn"
                          style={{ flex: 1, justifyContent: "center" }}
                          onClick={() =>
                            setActiveDoc({
                              candidateName: file.candidate.fullName,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              candidateNo: file.candidate.candidateNo,
                              country: file.country,
                              profession: file.profession,
                              company: file.company,
                              title: doc.title,
                              category: doc.cat,
                              url: attachedFiles[doc.cat]?.url,
                              fileNumber: file.fileNo,
                              verifiedStatus: "Verified Valid",
                            })
                          }
                        >
                          <Eye size={13} /> View Document
                        </button>
                        <label className="btn-file-change" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <UploadCloud size={13} /> Upload Scan
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleLocalFileUpload(doc.cat, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: 📊 FINANCIAL LEDGER & MASTER INVOICES */}
        {mainView === "ledger" && (
          <div className="financial-master-view">
            {/* KPI Strip */}
            <div className="fin-kpi-grid">
              <div className="fin-kpi-card">
                <span>Total Contract Package</span>
                <b>৳ {totalPackageCost.toLocaleString()} BDT</b>
                <small className="text-slate-500">{file.country || "Overseas"} Employment</small>
              </div>
              <div className="fin-kpi-card highlight-green">
                <span>Total Deposited / Paid</span>
                <b className="text-emerald-600">৳ {totalPaid.toLocaleString()} BDT</b>
                <small className="text-emerald-700">✓ {Math.round((totalPaid / totalPackageCost) * 100)}% Cleared</small>
              </div>
              {advanceAmount > 0 ? (
                <div className="fin-kpi-card highlight-purple">
                  <span>Advance / Extra Deposited</span>
                  <b className="text-purple-700">+ ৳ {advanceAmount.toLocaleString()} BDT</b>
                  <small className="text-purple-600">✓ Advance Surplus (100% Settled)</small>
                </div>
              ) : (
                <div className="fin-kpi-card highlight-amber">
                  <span>Remaining Balance Due</span>
                  <b className={balanceRemaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                    ৳ {balanceRemaining.toLocaleString()} BDT
                  </b>
                  <small className="text-slate-500">{balanceRemaining === 0 ? "Fully Paid (Zero Due)" : "Pending Final Settlement"}</small>
                </div>
              )}
            </div>

            {/* Master Payment Statement */}
            <div className="sidebar-widget-card mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="m-0"><Receipt size={18} className="text-indigo-600 inline mr-2" /> Complete Payment History</h3>
                  <p className="text-xs text-slate-500 m-0">All official transaction records with printable receipts.</p>
                </div>
                <button
                  type="button"
                  className="button primary sm"
                  onClick={() =>
                    setActiveReceipt({
                      receiptNo: `MR-${file.fileNo.replace("FILE-", "")}`,
                      date: new Date().toLocaleDateString("en-GB"),
                      candidateName: file.candidate.fullName,
                      candidateNo: file.candidate.candidateNo,
                      fileNo: file.fileNo,
                      passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                      phone: file.candidate.phone,
                      country: file.country,
                      profession: file.profession,
                      paymentType: "Master Statement (All Payments)",
                      paymentMethod: "Office Accounts",
                      referenceNo: `STMT-${file.fileNo}`,
                      amount: totalPaid,
                      totalPaid: totalPaid,
                      totalPackage: totalPackageCost,
                      officerName: file.assignedTo?.name || "Accounts Department",
                    })
                  }
                >
                  <Printer size={15} /> Print Master Receipt
                </button>
              </div>

              <table className="receipt-payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Type / Stage</th>
                    <th>Payment Method</th>
                    <th>Reference / Voucher No</th>
                    <th className="text-right">Amount (BDT)</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {file.payments?.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                      <td><b>{p.type}</b></td>
                      <td>{p.method || "Cash Deposit"}</td>
                      <td><code>{p.referenceNo || "REC-OFFICE"}</code></td>
                      <td className="text-right font-bold text-emerald-700">৳ {Number(p.amount).toLocaleString()}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="payment-receipt-btn"
                          onClick={() =>
                            setActiveReceipt({
                              receiptNo: `MR-${p.referenceNo || p.id.slice(-6).toUpperCase()}`,
                              date: new Date(p.createdAt).toLocaleDateString("en-GB"),
                              candidateName: file.candidate.fullName,
                              candidateNo: file.candidate.candidateNo,
                              fileNo: file.fileNo,
                              passportNo: file.candidate.passportNo || file.passport?.passportNumber,
                              phone: file.candidate.phone,
                              country: file.country,
                              profession: file.profession,
                              paymentType: p.type,
                              paymentMethod: p.method || "Cash Deposit",
                              referenceNo: p.referenceNo || "OFFICE-REC",
                              amount: Number(p.amount),
                              totalPaid: totalPaid,
                              totalPackage: totalPackageCost,
                              officerName: file.assignedTo?.name || "Accounts Department",
                            })
                          }
                        >
                          <Printer size={12} /> Print Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: 💬 TIMELINE, NOTES & AUDIT TRAIL */}
        {mainView === "timeline" && (
          <div className="timeline-view-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* 1. INTERNAL OFFICER NOTES CARD */}
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "var(--shadow)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "16px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#f0edff",
                      color: "#7258e8",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px 0", letterSpacing: "0.2px" }}>
                      INTERNAL OFFICER NOTES
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                      Private remarks, operational follow-ups, and candidate milestone records visible to authorized officers.
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "#f0edff",
                    color: "#7258e8",
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    border: "1px solid #dcd5fb",
                  }}
                >
                  {notesList.length} Note{notesList.length !== 1 ? "s" : ""} Recorded
                </span>
              </div>

              {/* Note Composer Box */}
              <div
                style={{
                  background: "#faf8ff",
                  border: "1px solid #dcd5fb",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  marginBottom: "22px",
                }}
              >
                {/* Category Chip Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginRight: "4px" }}>
                    Note Category:
                  </span>
                  {["General Note", "Follow-up", "Verification", "Urgent", "Payment", "Embassy"].map((tag) => {
                    const isSelected = noteTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNoteTag(tag)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: isSelected ? 800 : 600,
                          background: isSelected ? "#7258e8" : "#fff",
                          color: isSelected ? "#fff" : "var(--muted)",
                          border: isSelected ? "1px solid #7258e8" : "1px solid var(--line)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Input Fields: Title, Price & Description */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="Title / Subject (e.g. Visa Fee Agreement)..."
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      style={{
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Price Remark ৳ (Opt)"
                      value={notePrice}
                      onChange={(e) => setNotePrice(e.target.value)}
                      style={{
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12.5px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <textarea
                      rows={2}
                      placeholder="Type internal remarks, candidate feedback, or milestone updates..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: "260px",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: "1.45",
                      }}
                    />
                    <button
                      type="button"
                      disabled={submittingNote}
                      onClick={handleCreateFileNote}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 20px",
                        background: "#7258e8",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 700,
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
                        height: "44px",
                      }}
                    >
                      <Send size={14} /> {submittingNote ? "Saving..." : "Add Note"}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🔒 Internal notes are private and encrypted for officer &amp; admin access only.</span>
                </div>
              </div>

              {/* Notes Timeline Feed */}
              {(() => {
                const dbNotes = (file.workflowEvents || [])
                  .filter((w) => ["AGENT_NOTE", "CANDIDATE_NOTE", "OFFICE_NOTE"].includes(w.stage) || (w.data as any)?.title)
                  .map((w) => {
                    const d = (w.data as any) || {};
                    return {
                      id: w.id,
                      title: d.title || w.status || "Note",
                      text: d.description || (typeof d === "string" ? d : ""),
                      price: d.price || 0,
                      author: w.completedBy || "Officer Desk",
                      role: d.authorRole || (w.stage === "AGENT_NOTE" ? "Agent / Desk" : "Officer Desk"),
                      createdAt: new Date(w.createdAt).toLocaleDateString("en-GB") + ", " + new Date(w.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                      tag: w.stage === "AGENT_NOTE" ? "Agent Note" : (d.tag || "Candidate Note"),
                      isDb: true,
                    };
                  });
                const combinedNotes = [...dbNotes, ...notesList];

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {combinedNotes.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 10px", color: "var(--muted)", fontSize: "13px" }}>
                        No internal officer or agent notes added yet for this candidate.
                      </div>
                    ) : (
                      combinedNotes.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            gap: "12px",
                            padding: "14px 16px",
                            borderRadius: "12px",
                            background: "#fafafd",
                            border: "1px solid var(--line)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "8px",
                              background: "#f0edff",
                              color: "#7258e8",
                              display: "grid",
                              placeItems: "center",
                              fontSize: "12px",
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {item.author.slice(0, 2).toUpperCase()}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{item.author}</strong>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    background: item.role.includes("Admin") ? "#fef3c7" : "#ecfdf5",
                                    color: item.role.includes("Admin") ? "#b45309" : "#059669",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {item.role}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    background: "#f0edff",
                                    color: "#7258e8",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  🏷️ {item.tag}
                                </span>
                                {item.price > 0 && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      background: "#ecfdf5",
                                      color: "#059669",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    💰 ৳ {item.price.toLocaleString()} BDT
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Clock size={11} /> {item.createdAt}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.isDb) {
                                      handleDeleteFileNote(item.id);
                                    } else {
                                      setNotesList(notesList.filter((n) => n.id !== item.id));
                                      toast.info("Officer note removed");
                                    }
                                  }}
                                  title="Delete Note"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                            {item.title && item.title !== "Note" && (
                              <b style={{ display: "block", fontSize: "12.5px", color: "var(--ink)", marginBottom: "2px" }}>
                                📌 {item.title}
                              </b>
                            )}
                            {item.text && (
                              <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0 }}>
                                {item.text}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 2. STAGE ACTIVITY & AUDIT TRAIL CARD */}
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: "0 0 3px 0" }}>
                    STAGE ACTIVITY &amp; AUDIT TRAIL
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                    Automated system timeline tracking each dossier stage advancement and exception.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "14px 16px", background: "#fafafd", borderRadius: "12px", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                    <span>🚀 Stage Advanced to: <strong style={{ color: "#7258e8" }}>{file.currentStage}</strong></span>
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>Just now</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0 0" }}>
                    Processed by {file.assignedTo?.name || "Senior Desk Officer"} · Dhaka Head Office
                  </p>
                </div>

                {file.holds?.map((h) => (
                  <div key={h.id} style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: "12px", border: "1px solid #fde68a" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                      <span>⏸️ Placed on Hold: {h.reason}</span>
                      <span style={{ color: "#b45309", fontWeight: 500 }}>{new Date(h.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#78350f", margin: "4px 0 0 0" }}>{h.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EDIT CANDIDATE REGISTRATION BIO-DATA MODAL */}
        {showEditBioModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(5px)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
              padding: "20px",
            }}
            onClick={() => setShowEditBioModal(false)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                maxWidth: "680px",
                width: "100%",
                maxHeight: "92vh",
                overflowY: "auto",
                padding: "24px 28px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                border: "1px solid #e2e8f0",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                    👤 Edit Candidate Registration Bio-Data
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "3px 0 0" }}>
                    Update primary registration profile, contact numbers, NID, DOB, trade &amp; assigned partner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditBioModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingBio(true);
                  const form = new FormData(e.currentTarget);
                  try {
                    await handleStageUpdate("update-candidate-bio", {
                      fullName: form.get("fullName"),
                      phone: form.get("phone"),
                      alternatePhone: form.get("alternatePhone"),
                      nationalId: form.get("nationalId"),
                      email: form.get("email"),
                      dob: form.get("dob"),
                      gender: form.get("gender"),
                      maritalStatus: form.get("maritalStatus"),
                      district: form.get("district"),
                      address: form.get("address"),
                      profession: form.get("profession"),
                      preferredCountry: form.get("country"),
                      agent: form.get("agent"),
                    });
                    setShowEditBioModal(false);
                  } finally {
                    setSavingBio(false);
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                {/* Row 1: Candidate ID (readonly) & Full Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Candidate ID
                    </label>
                    <input
                      type="text"
                      defaultValue={file.candidate.candidateNo}
                      readOnly
                      style={{ width: "100%", height: "38px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#f1f5f9", fontFamily: "monospace", fontWeight: 700, color: "#475569", cursor: "not-allowed" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                      Full Name *
                    </label>
                    <input
                      name="fullName"
                      defaultValue={file.candidate.fullName}
                      required
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", fontWeight: 600 }}
                    />
                  </div>
                </div>

                {/* Row 2: Primary Phone & Alternate Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                      Primary Phone Number *
                    </label>
                    <input
                      name="phone"
                      defaultValue={file.candidate.phone}
                      required
                      placeholder="e.g. +8801700000000"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Alternate Phone / Emergency
                    </label>
                    <input
                      name="alternatePhone"
                      defaultValue={file.candidate.phones?.[0]?.phone || ""}
                      placeholder="e.g. +8801800000000"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Row 3: National ID & Email Address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      National ID (NID / Smart Card)
                    </label>
                    <input
                      name="nationalId"
                      defaultValue={file.candidate.nationalId || ""}
                      placeholder="e.g. 19961234567890"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={file.candidate.email || ""}
                      placeholder="e.g. candidate@gmail.com"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Row 4: Date of Birth, Gender, Marital Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      defaultValue={file.candidate.dob ? new Date(file.candidate.dob).toISOString().slice(0, 10) : ""}
                      style={{ width: "100%", height: "38px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Gender
                    </label>
                    <select
                      name="gender"
                      defaultValue={file.candidate.gender || "Male"}
                      style={{ width: "100%", height: "38px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", background: "#fff" }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Marital Status
                    </label>
                    <select
                      name="maritalStatus"
                      defaultValue={file.candidate.maritalStatus || "Single"}
                      style={{ width: "100%", height: "38px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", background: "#fff" }}
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: District / Hometown & Present Address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      District / Hometown
                    </label>
                    <input
                      name="district"
                      defaultValue={file.candidate.district || "Dhaka"}
                      placeholder="e.g. Brahmanbaria, Sylhet, Dhaka"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                      Village / Present Address
                    </label>
                    <input
                      name="address"
                      defaultValue={file.candidate.address || ""}
                      placeholder="e.g. House 12, Road 4, Paltan, Dhaka"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Row 6: Profession Category & Target Country */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                      Profession / Applied Trade *
                    </label>
                    <input
                      name="profession"
                      defaultValue={file.profession || file.candidate.profession || "General Worker"}
                      required
                      placeholder="e.g. Driver, Electrician, Plumber"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                      Target Country / Destination *
                    </label>
                    <input
                      name="country"
                      defaultValue={file.country || file.candidate.preferredCountry || "Saudi Arabia"}
                      required
                      placeholder="e.g. Saudi Arabia, UAE, Qatar, Oman"
                      style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", fontWeight: 600 }}
                    />
                  </div>
                </div>

                {/* Row 7: Agent / Referral Partner */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", marginBottom: "4px" }}>
                    Agent / Referral Partner / Source
                  </label>
                  <input
                    name="agent"
                    defaultValue={file.agent || file.candidate.source || "Direct"}
                    placeholder="e.g. Brahmanbaria Talent Supply, Direct Office, AGT-105"
                    style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                  />
                  <small style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                    Assigning or changing agent partner will automatically route commissions and candidate ledger to their portal.
                  </small>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={() => setShowEditBioModal(false)}
                    style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", color: "var(--ink)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBio}
                    style={{
                      padding: "8px 22px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
                    }}
                  >
                    {savingBio ? "Saving Changes..." : "💾 Save Registration Info"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HOLD FILE MODAL */}
        {showHoldModal && (
          <div className="profile-action-modal-overlay" onClick={() => setShowHoldModal(false)}>
            <div className="profile-action-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-box">
                <h2>⏸️ Place File on Hold</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowHoldModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleHoldSubmit}>
                <div className="modal-body-box">
                  <p>
                    Placing this file on hold will pause processing and move the candidate to the <b>Hold Files</b> queue.
                  </p>
                  <div className="modal-form-group">
                    <label>Reason for Hold *</label>
                    <select name="reason" required>
                      <option value="Medical Unfit / Investigation">Medical Unfit / Under Investigation</option>
                      <option value="Candidate Requested Pause">Candidate Requested Pause (Family/Personal)</option>
                      <option value="Document Missing / Delay">Document Missing / Verification Delay</option>
                      <option value="Police Clearance Pending">Police Clearance Pending</option>
                      <option value="Visa Issue / Embassy Delay">Visa Issue / Embassy Delay</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Expected Release Date</label>
                    <input
                      name="expectedRelease"
                      type="date"
                      defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Officer Remarks / Note</label>
                    <textarea
                      name="note"
                      placeholder="Explain why this file is placed on hold..."
                      defaultValue="Medical verification pending. Candidate undergoing follow-up checkup."
                    />
                  </div>
                </div>
                <div className="modal-footer-box">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowHoldModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-modal-hold"
                  >
                    {actionLoading ? "Holding..." : "Confirm & Place on Hold"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RETURN & REFUND FILE MODAL */}
        {showReturnModal && (
          <div className="profile-action-modal-overlay" onClick={() => setShowReturnModal(false)}>
            <div className="profile-action-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-box">
                <h2>↩️ Return File &amp; Refund Calculation</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowReturnModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleReturnSubmit}>
                <div className="modal-body-box">
                  <p>
                    Cancel candidate processing, calculate net refund after office deductions, and move file to <b>Returned Files</b>.
                  </p>
                  <div className="modal-form-group">
                    <label>Return Reason *</label>
                    <select name="reason" required>
                      <option value="Candidate Cancelled Processing">Candidate Cancelled (Does not want to go)</option>
                      <option value="Medical Unfit (Permanent)">Medical Unfit (Permanent GCC Unfit)</option>
                      <option value="Visa Rejected by Embassy">Visa Rejected / Refused by Embassy</option>
                      <option value="Emergency Family Issue">Emergency Family / Medical Issue</option>
                      <option value="Other">Other Reason</option>
                    </select>
                  </div>

                  {/* Financial Refund Calculation Breakdown */}
                  <div className="refund-calc-card">
                    <span className="calc-title">Refund Settlement Calculation</span>
                    <div className="calc-row">
                      <span>Total Deposited / Paid:</span>
                      <strong className="text-slate-800">৳ {totalPaid.toLocaleString()} BDT</strong>
                    </div>
                    <div className="calc-row">
                      <span>Office &amp; Processing Charge Deduction:</span>
                      <div className="calc-input-box">
                        <span>৳</span>
                        <input
                          type="number"
                          value={deductionAmount}
                          onChange={(e) => setDeductionAmount(Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="calc-row total">
                      <span>Net Candidate Refund:</span>
                      <strong>৳ {Math.max(0, totalPaid - deductionAmount).toLocaleString()} BDT</strong>
                    </div>
                  </div>

                  <div className="modal-form-group">
                    <label>Settlement Notes / Remarks</label>
                    <textarea
                      name="note"
                      placeholder="Details regarding the refund agreement, deductions, or slip..."
                      defaultValue="Candidate requested cancellation. Office deduction applied. Net balance to be refunded via accounts."
                    />
                  </div>
                </div>
                <div className="modal-footer-box">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowReturnModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-modal-return"
                  >
                    {actionLoading ? "Processing..." : `Approve Return & Refund ৳ ${Math.max(0, totalPaid - deductionAmount).toLocaleString()}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MONEY RECEIPT MODAL */}
        {activeReceipt && (
          <MoneyReceiptModal
            receipt={activeReceipt}
            onClose={() => setActiveReceipt(null)}
          />
        )}

        {/* DOCUMENT VIEWER MODAL */}
        {activeDoc && (
          <DocumentViewerModal
            doc={activeDoc}
            onClose={() => setActiveDoc(null)}
            onAttachFile={(cat, fileData) => {
              setAttachedFiles((prev) => ({ ...prev, [cat]: fileData }));
              toast.success(`Physical file attached successfully!`);
            }}
          />
        )}
      </div>
  );
}
