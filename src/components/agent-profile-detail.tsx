"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
  Globe,
  Hourglass,
  Layers,
  Paperclip,
  Phone,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { MoneyReceiptModal, type ReceiptData } from "@/components/money-receipt-modal";
import { DocumentViewerModal, type DocumentViewerData } from "@/components/document-viewer-modal";

export type MissingDocItem = {
  id: string;
  name: string;
  category: "PASSPORT" | "MEDICAL" | "POLICE" | "NID" | "VISA" | "MANPOWER" | "FLIGHT";
  stage: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  reason: string;
  actionRequired: string;
};

export type CompletedDocItem = {
  name: string;
  category: string;
  value: string;
  status: string;
};

type PaymentItem = {
  id: string;
  paymentNo: string;
  amount: number;
  type: string;
  method: string;
  reference: string;
  createdAt: string;
};

type NoteItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  fileName?: string | null;
  fileSize?: string | null;
  fileData?: string | null;
  createdBy: string;
  createdAt: string;
};

type CandidateItem = {
  fileId: string;
  fileNo: string;
  candidateId: string;
  candidateNo: string;
  fullName: string;
  phone: string;
  passportNumber: string;
  country: string;
  profession: string;
  currentStage: string;
  status: string;
  isCompleted: boolean;
  completionStatus: string;
  completionNote: string;
  missingDocs?: MissingDocItem[];
  missingDocsCount?: number;
  completedDocs?: CompletedDocItem[];
  hasMissingDocs?: boolean;
  documentStatus?: string;
  interviewStatus?: string;
  interviewRating?: number | null;
  interviewDate?: string | null;
  interviewTitle?: string | null;
  interviewCompany?: string | null;
  passportVerification?: string;
  passportExpiryDate?: string | null;
  medicalResult?: string;
  medicalExpiryDate?: string | null;
  medicalTestDate?: string | null;
  policeExpiryDate?: string | null;
  visaNumber: string;
  visaStatus?: string;
  visaExpiryDate?: string | null;
  bmetSmartCard?: string;
  ticketStatus?: string;
  flightDate?: string | null;
  packageCost: number;
  totalPaid: number;
  dueAmount: number;
  advanceAmount: number;
  payments: PaymentItem[];
  notes: NoteItem[];
  createdAt?: string;
};

type AvailableCandidate = {
  id: string;
  candidateNo: string;
  fullName: string;
  phone: string;
  passportNo: string;
  country: string;
  profession: string;
  fileId?: string;
  fileNo?: string;
  currentStage?: string;
  assignedAgent?: string | null;
};

type AgentDoc = {
  id: string;
  name: string;
  type: string;
  size: string;
  fileData?: string | null;
  uploadedAt: string;
};

type AgentNote = {
  id: string;
  title: string;
  content: string;
  tag: string;
  createdBy: string;
  createdAt: string;
};

type InterviewItem = {
  id: string;
  candidateId: string;
  fullName: string;
  candidateNo: string;
  phone: string;
  passportNumber: string;
  profession: string;
  country: string;
  title: string;
  company: string;
  scheduledAt: string;
  venue: string;
  status: string;
  result: string;
  rating?: number | null;
  notes?: string | null;
};

type AgentProfileData = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  country: string | null;
  district?: string | null;
  status: string;
  commissionRate: string;
  agreementKey: string | null;
  totalEarnedCommission: number;
  totalCandidateCount: number;
  completedCandidateCount: number;
  incompleteCandidateCount: number;
  grandTotalCollected: number;
  grandTotalPackage: number;
  grandTotalDue: number;
  grandTotalAdvance: number;
  countryBreakdown: Array<{
    country: string;
    candidateCount: number;
    totalPackage: number;
    totalCollected: number;
    totalDue: number;
    totalAdvance: number;
    inProcess: number;
    completed: number;
  }>;
  candidates: CandidateItem[];
  availableCandidates: AvailableCandidate[];
  documents: AgentDoc[];
  agentNotes: AgentNote[];
  interviews: InterviewItem[];
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  portalLastLoginAt?: string | null;
  metrics?: {
    totalCandidates: number;
    completedCount: number;
    incompleteCount: number;
    completionPercentage: number;
    activeDossiers: number;
    completedFlights: number;
    visaStamped: number;
    totalPackage: number;
    totalCollectedFromCandidates: number;
    totalDue: number;
    totalAdvance: number;
    perCandidateRate: number;
    totalCommissionEarned: number;
    totalCandidatesWithMissingDocs?: number;
    totalCompleteDocsCandidates?: number;
    totalMissingDocsCount?: number;
    missingPassports?: number;
    missingMedicals?: number;
    missingPolices?: number;
    missingNids?: number;
    missingVisas?: number;
  };
};

export function getCleanCountryName(country: string) {
  const raw = (country || "Other").trim().replace(/^[A-Z]{2}\s+/i, "");
  if (/saudi/i.test(raw)) return "Saudi Arabia";
  if (/dubai|uae|emirates/i.test(raw)) return "Dubai";
  if (/qatar/i.test(raw)) return "Qatar";
  if (/kuwait/i.test(raw)) return "Kuwait";
  if (/oman/i.test(raw)) return "Oman";
  if (/malaysia/i.test(raw)) return "Malaysia";
  if (/romania|europe/i.test(raw)) return "Romania";
  return raw || "Other Country";
}

export function getCountryFlag(country: string) {
  const clean = getCleanCountryName(country);
  if (/saudi/i.test(clean)) return "🇸🇦";
  if (/dubai|uae/i.test(clean)) return "🇦🇪";
  if (/oman/i.test(clean)) return "🇴🇲";
  if (/qatar/i.test(clean)) return "🇶🇦";
  if (/kuwait/i.test(clean)) return "🇰🇼";
  if (/malaysia/i.test(clean)) return "🇲🇾";
  if (/romania/i.test(clean)) return "🇷🇴";
  return "🌐";
}

export function getCountryCode(country: string) {
  const clean = getCleanCountryName(country);
  if (/saudi/i.test(clean)) return "SA";
  if (/dubai|uae/i.test(clean)) return "AE";
  if (/oman/i.test(clean)) return "OM";
  if (/qatar/i.test(clean)) return "QA";
  if (/kuwait/i.test(clean)) return "KW";
  if (/malaysia/i.test(clean)) return "MY";
  if (/romania/i.test(clean)) return "RO";
  return "GL";
}

export function AgentProfileDetail({
  id: propId,
  isReadOnly = false,
  isPortalMode = false,
}: {
  id?: string;
  isReadOnly?: boolean;
  isPortalMode?: boolean;
} = {}) {
  const params = useParams();
  const queryClient = useQueryClient();
  const agentId = propId || (params?.id as string);
  const paymentFileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [completionTab, setCompletionTab] = useState<"All" | "Completed" | "Incomplete">("All");
  const [activeMainTab, setActiveMainTab] = useState<"ledger" | "missing" | "expiry" | "interviews" | "docs">("ledger");
  const [docStatusFilter, setDocStatusFilter] = useState<"All" | "Missing" | "Complete">("All");
  const [missingCategoryFilter, setMissingCategoryFilter] = useState<string>("ALL");
  const [missingSearch, setMissingSearch] = useState<string>("");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>("ALL");
  const [expiryDocTypeFilter, setExpiryDocTypeFilter] = useState<string>("ALL");
  const [expirySearch, setExpirySearch] = useState<string>("");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("All");
  const [editingInterview, setEditingInterview] = useState<InterviewItem | null>(null);
  const [savingInterview, setSavingInterview] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPortalLogin, setEditPortalLogin] = useState(true);
  const [editPortalEmail, setEditPortalEmail] = useState("");
  const [editPortalPassword, setEditPortalPassword] = useState("");
  const [noteCandidate, setNoteCandidate] = useState<CandidateItem | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [noteFileObj, setNoteFileObj] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [showAgentNoteModal, setShowAgentNoteModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [savingAgentNote, setSavingAgentNote] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFileObj, setSelectedFileObj] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignCountryFilter, setAssignCountryFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);

  // Payment states (Candidate Payment Deposits & Financial Receipts Modal)
  const [paymentCandidate, setPaymentCandidate] = useState<CandidateItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [selectedPaymentCandidateId, setSelectedPaymentCandidateId] = useState<string>("");
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [viewingPaymentsCandidate, setViewingPaymentsCandidate] = useState<CandidateItem | null>(null);

  const { data: agentData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["agent-full-details", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to load agent profile");
      const json = await res.json();
      return json.data as AgentProfileData;
    },
  });

  useEffect(() => {
    if (agentData) {
      setEditPortalLogin(agentData.hasPortalAccess ?? true);
      setEditPortalEmail(agentData.portalLoginEmail || agentData.email || "");
      setEditPortalPassword("");
    }
  }, [agentData, showEditModal]);

  // Expiry Tracking Engine for Admin View (Hook declared at top to obey Rules of Hooks)
  const expiryItems = useMemo(() => {
    if (!agentData?.candidates) return [];
    const items: Array<{
      id: string;
      candidate: CandidateItem;
      docType: "Passport" | "GAMCA Medical" | "Police Clearance (PCC)" | "Stamped Visa";
      docIcon: string;
      docRef: string;
      expiryDate: Date;
      daysLeft: number;
      urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE";
      actionRequired: string;
    }> = [];

    (agentData.candidates || []).forEach((cand) => {
      // 1. Passport Record Expiry
      if (cand.passportNumber && cand.passportNumber !== "N/A") {
        const exp = cand.passportExpiryDate
          ? new Date(cand.passportExpiryDate)
          : new Date(new Date(cand.createdAt || Date.now()).getTime() + 180 * 86400000);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "Passport validity is healthy (> 9 months) & flight ready.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "🔴 Passport expired! Candidate must apply for emergency passport re-issue.";
        } else if (days <= 180) {
          urgency = "CRITICAL";
          action = "🚨 Under 6 Months! Visa stamping & BMET clearance blocked. Candidate must renew urgently.";
        } else if (days <= 270) {
          urgency = "WARNING";
          action = "⚠️ Approaching 6-month threshold. Advise candidate to renew soon.";
        }

        items.push({
          id: `pass-${cand.candidateId}`,
          candidate: cand,
          docType: "Passport",
          docIcon: "📘",
          docRef: cand.passportNumber,
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }

      // 2. GAMCA Medical Fitness Expiry (60-day rule)
      if (cand.medicalResult || cand.medicalExpiryDate || cand.medicalTestDate || cand.currentStage?.toLowerCase().includes("med") || cand.currentStage?.toLowerCase().includes("takamul")) {
        const exp = cand.medicalExpiryDate
          ? new Date(cand.medicalExpiryDate)
          : cand.medicalTestDate
          ? new Date(new Date(cand.medicalTestDate).getTime() + 60 * 86400000)
          : new Date(Date.now() + 12 * 86400000);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "Medical fitness certificate active in GCC GAMCA portal.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "🔴 Medical fitness expired (60-day rule). Candidate must undergo re-medical.";
        } else if (days <= 15) {
          urgency = "CRITICAL";
          action = "🚨 Medical expiring very soon! Expedite embassy visa submission to avoid re-medical costs.";
        } else if (days <= 30) {
          urgency = "WARNING";
          action = "⚠️ Within 30 days of expiry. Complete embassy submission without delay.";
        }

        items.push({
          id: `med-${cand.candidateId}`,
          candidate: cand,
          docType: "GAMCA Medical",
          docIcon: "🏥",
          docRef: `FIT (${cand.medicalResult || "Passed"})`,
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }

      // 3. Police Clearance Certificate (PCC)
      if (cand.policeExpiryDate || cand.currentStage?.toLowerCase().includes("police")) {
        const exp = cand.policeExpiryDate
          ? new Date(cand.policeExpiryDate)
          : new Date(Date.now() + 45 * 86400000);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "PCC verified by Special Branch.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "🔴 Police Clearance Certificate expired. Re-apply online via police portal.";
        } else if (days <= 20) {
          urgency = "CRITICAL";
          action = "🚨 PCC expiring soon. Submit for embassy visa clearance.";
        }

        items.push({
          id: `pcc-${cand.candidateId}`,
          candidate: cand,
          docType: "Police Clearance (PCC)",
          docIcon: "🛡️",
          docRef: "PCC Clearance",
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }

      // 4. Stamped Visa Validity (90-day window to fly)
      if (cand.visaExpiryDate || (cand.visaNumber && cand.visaNumber !== "Pending") || cand.currentStage?.toLowerCase().includes("visa") || cand.currentStage?.toLowerCase().includes("flight")) {
        const exp = cand.visaExpiryDate
          ? new Date(cand.visaExpiryDate)
          : new Date(Date.now() + 50 * 86400000);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "Visa active. Proceed with BMET and flight ticketing.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "🔴 Stamped Visa validity expired! Immediate sponsor re-validation required.";
        } else if (days <= 15) {
          urgency = "CRITICAL";
          action = "🚨 Emergency! Candidate must fly immediately before visa lapses.";
        } else if (days <= 30) {
          urgency = "WARNING";
          action = "⚠️ Complete BMET clearance and confirm flight booking.";
        }

        items.push({
          id: `visa-${cand.candidateId}`,
          candidate: cand,
          docType: "Stamped Visa",
          docIcon: "🛂",
          docRef: cand.visaNumber || "E-Visa",
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [agentData?.candidates]);

  const candidatesWithMissingDocs = useMemo(() => {
    return (agentData?.candidates || []).filter((c) => Boolean(c.hasMissingDocs || (c.missingDocs && c.missingDocs.length > 0)));
  }, [agentData?.candidates]);

  const candidatesWithCompleteDocs = useMemo(() => {
    return (agentData?.candidates || []).filter((c) => !c.hasMissingDocs && (!c.missingDocs || c.missingDocs.length === 0));
  }, [agentData?.candidates]);

  const totalMissingDocsCount = useMemo(() => {
    return (agentData?.candidates || []).reduce((sum, c) => sum + (c.missingDocsCount || (c.missingDocs?.length || 0)), 0);
  }, [agentData?.candidates]);

  // Missing documents list filter for the Missing Documents Tab
  const filteredMissingDocCandidates = useMemo(() => {
    return candidatesWithMissingDocs.filter((cand) => {
      if (countryFilter !== "All") {
        const cleanCountry = getCleanCountryName(cand.country).toLowerCase();
        const filterLower = countryFilter.toLowerCase();
        if (!cleanCountry.includes(filterLower) && !cand.country.toLowerCase().includes(filterLower)) {
          return false;
        }
      }
      if (missingCategoryFilter !== "ALL") {
        const hasCategory = (cand.missingDocs || []).some((d) => d.category === missingCategoryFilter);
        if (!hasCategory) return false;
      }
      if (missingSearch) {
        const q = missingSearch.toLowerCase();
        return (
          cand.fullName.toLowerCase().includes(q) ||
          cand.phone.toLowerCase().includes(q) ||
          cand.passportNumber.toLowerCase().includes(q) ||
          cand.candidateNo.toLowerCase().includes(q) ||
          cand.profession.toLowerCase().includes(q) ||
          (cand.missingDocs || []).some((d) => d.name.toLowerCase().includes(q) || d.reason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [candidatesWithMissingDocs, countryFilter, missingCategoryFilter, missingSearch]);

  const criticalExpiryCount = expiryItems.filter((i) => i.urgency === "EXPIRED" || i.urgency === "CRITICAL").length;
  const warningExpiryCount = expiryItems.filter((i) => i.urgency === "WARNING").length;
  const safeExpiryCount = expiryItems.filter((i) => i.urgency === "SAFE").length;

  const filteredExpiryItems = expiryItems.filter((item) => {
    if (expiryStatusFilter !== "ALL") {
      if (expiryStatusFilter === "CRITICAL" && item.urgency !== "EXPIRED" && item.urgency !== "CRITICAL") return false;
      if (expiryStatusFilter === "WARNING" && item.urgency !== "WARNING") return false;
      if (expiryStatusFilter === "SAFE" && item.urgency !== "SAFE") return false;
    }
    if (expiryDocTypeFilter !== "ALL" && item.docType !== expiryDocTypeFilter) return false;
    if (expirySearch) {
      const q = expirySearch.toLowerCase().trim();
      return (
        item.candidate.fullName.toLowerCase().includes(q) ||
        item.candidate.candidateNo.toLowerCase().includes(q) ||
        item.candidate.fileNo.toLowerCase().includes(q) ||
        item.candidate.passportNumber.toLowerCase().includes(q) ||
        item.docRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTk = (amount: number) => `৳ ${(amount || 0).toLocaleString()}`;
  const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

  // Print receipt for a specific payment
  const openPrintReceipt = (p: PaymentItem, cand: CandidateItem) => {
    setActiveReceipt({
      receiptNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : Date.now().toString().slice(-6)}`,
      date: new Date(p.createdAt || Date.now()).toLocaleDateString("en-GB"),
      candidateName: cand.fullName,
      candidateNo: cand.candidateNo,
      fileNo: cand.fileNo,
      passportNo: cand.passportNumber,
      phone: cand.phone,
      country: cand.country,
      profession: cand.profession,
      paymentType: p.type || "Candidate Payment Deposit",
      paymentMethod: p.method || "Cash at Office",
      referenceNo: p.reference || p.paymentNo,
      amount: Number(p.amount),
      totalPaid: cand.totalPaid,
      totalPackage: cand.packageCost || 350000,
      officerName: agentData?.contactPerson || agentData?.name || "Accounts Department",
    });
  };

  // Open candidate payment deposits modal for a specific candidate
  const handleOpenPaymentModalForCandidate = (cand: CandidateItem) => {
    setPaymentCandidate(cand);
    setSelectedPaymentCandidateId(cand.candidateId);
    setPaymentReceiptFile(null);
    setShowPaymentModal(true);
  };

  // Open candidate payment deposits modal generally
  const handleOpenGeneralPaymentModal = () => {
    if (agentData?.candidates && agentData.candidates.length > 0) {
      setPaymentCandidate(agentData.candidates[0]);
      setSelectedPaymentCandidateId(agentData.candidates[0].candidateId);
    } else {
      setPaymentCandidate(null);
      setSelectedPaymentCandidateId("");
    }
    setPaymentReceiptFile(null);
    setShowPaymentModal(true);
  };

  // Handle voucher file selection
  const handleVoucherFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentReceiptFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Record Candidate Payment Deposit
  const handleRecordCandidatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingPayment(true);
    const form = new FormData(e.currentTarget);
    const candidateId = paymentCandidate?.candidateId || String(form.get("candidateId") || selectedPaymentCandidateId);
    const fileId = paymentCandidate?.fileId || String(form.get("fileId") || "");
    const amount = Number(form.get("amount"));
    const rawType = String(form.get("type") || form.get("presetType") || "").trim();
    const finalType = rawType || "Second Payment (Visa Fee)";
    const paymentMethod = String(form.get("method") || form.get("paymentMethod") || "Cash at Office");
    const reference = String(form.get("reference") || "").trim() || `REC-${Date.now().toString().slice(-6)}`;
    const collectedAt = String(form.get("collectedAt") || new Date().toISOString().split("T")[0]);
    const paymentNote = String(form.get("paymentNote") || "").trim();

    if (!candidateId && !fileId) {
      toast.error("Please select a candidate to record payment.");
      setSavingPayment(false);
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount greater than 0.");
      setSavingPayment(false);
      return;
    }

    try {
      const payload = {
        action: "record-candidate-payment",
        fileId: fileId || undefined,
        candidateId: candidateId || undefined,
        amount,
        paymentType: finalType,
        paymentMethod,
        reference,
        collectedAt,
        paymentNote,
        documentUrl: paymentReceiptFile?.dataUrl || undefined,
        fileName: paymentReceiptFile?.name || undefined,
      };

      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to record payment");

      toast.success(`Payment deposit of ৳ ${amount.toLocaleString()} BDT recorded successfully!`);
      setPaymentReceiptFile(null);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });

      // Update active candidate if modal stays open or close
      if (paymentCandidate) {
        // refetch handles it
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleUpdateInterview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInterview) return;
    setSavingInterview(true);
    const form = new FormData(e.currentTarget);
    const selectedStatus = String(form.get("interviewStatus") || form.get("result") || "Waiting For Interview");
    try {
      const payload = {
        action: "update-interview",
        interviewId: editingInterview.id,
        candidateId: editingInterview.candidateId,
        interviewStatus: selectedStatus,
        result: selectedStatus,
        rating: form.get("rating") ? Number(form.get("rating")) : undefined,
        notes: String(form.get("notes") || "").trim(),
      };
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update interview");

      toast.success(`Interview status updated to "${selectedStatus}" for ${editingInterview.fullName}!`);
      setEditingInterview(null);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update interview");
    } finally {
      setSavingInterview(false);
    }
  };

  const handleAssignCandidate = async (cand: AvailableCandidate) => {
    if (!cand.fileId && !cand.id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link-candidate",
          fileId: cand.fileId,
          candidateId: cand.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to link candidate");

      toast.success(`Candidate "${cand.fullName}" assigned to ${agentData?.name}!`);
      setShowAssignModal(false);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign candidate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlinkCandidate = async (fileId: string, candName: string) => {
    if (!confirm(`Are you sure you want to remove candidate "${candName}" from this agent?`)) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink-candidate", fileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to unlink candidate");

      toast.success(`Candidate unlinked.`);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink candidate");
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    try {
      const payload = {
        name: String(form.get("name") || "").trim(),
        contactPerson: String(form.get("contactPerson") || "").trim() || null,
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim() || null,
        country: String(form.get("district") || "").trim() || "Dhaka",
        address: String(form.get("address") || "").trim() || null,
        commissionRate: String(form.get("commissionRate") || "").trim() || "Standard",
        agreementKey: String(form.get("agreementKey") || "").trim() || null,
        status: String(form.get("status") || "Active"),
        enablePortalLogin: editPortalLogin,
        portalEmail: editPortalEmail.trim() || undefined,
        portalPassword: editPortalPassword.trim() || undefined,
      };

      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update agent");

      toast.success("Agent profile updated successfully!");
      setShowEditModal(false);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noteCandidate) return;
    setSavingNote(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        action: "create-note",
        fileId: noteCandidate.fileId,
        title: String(form.get("title") || "").trim(),
        description: String(form.get("description") || "").trim(),
        price: String(form.get("price") || "").trim(),
        docName: noteFileObj?.name || undefined,
        docSize: noteFileObj?.size || undefined,
        fileData: noteFileObj?.dataUrl || undefined,
      };
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save candidate note");

      toast.success(`Note saved for ${noteCandidate.fullName}!`);
      setNoteFileObj(null);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
      setNoteCandidate(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteCandidateNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to remove this candidate note?")) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-note", noteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete note");
      toast.success("Candidate note removed successfully.");
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
      if (noteCandidate) {
        setNoteCandidate({
          ...noteCandidate,
          notes: noteCandidate.notes.filter((n) => n.id !== noteId),
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  const handleAddAgentNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingAgentNote(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        action: "add-agent-note",
        title: String(form.get("title") || "").trim(),
        description: String(form.get("content") || "").trim(),
        docType: String(form.get("tag") || "General"),
      };
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to add note");
      toast.success("Agent note saved successfully!");
      setShowAgentNoteModal(false);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingAgentNote(false);
    }
  };

  const handleDeleteAgentNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to remove this agent note?")) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-agent-note", noteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete note");
      toast.success("Agent note removed.");
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadingDoc(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        action: "upload-agent-document",
        docName: selectedFileObj?.name || String(form.get("docName") || "Document.pdf").trim(),
        docType: String(form.get("docType") || "Trade License"),
        docSize: selectedFileObj?.size || "1.2 MB",
        fileData: selectedFileObj?.dataUrl || null,
      };
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to upload document");
      toast.success(`Document "${payload.docName}" uploaded successfully!`);
      setShowDocUploadModal(false);
      setSelectedFileObj(null);
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove document "${docName}"?`)) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-agent-document", docId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete document");
      toast.success("Document removed.");
      await queryClient.invalidateQueries({ queryKey: ["agent-full-details", agentId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--muted)" }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 14px", color: "#7258e8" }} />
        <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>Loading Agent Partner Workspace...</b>
        <span style={{ fontSize: "12px" }}>Fetching candidate dossiers, financial ledger &amp; country metrics</span>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div style={{ maxWidth: "600px", margin: "40px auto", padding: "32px", background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", textAlign: "center" }}>
        <h2>Agent Profile Not Found</h2>
        <p style={{ color: "var(--muted)" }}>The requested agent does not exist or was removed.</p>
        <Link href="/module/agents/agent-list" style={{ color: "#7258e8", fontWeight: 700 }}>
          ← Return to Agents Directory
        </Link>
      </div>
    );
  }

  const filteredCandidates = agentData.candidates.filter((cand) => {
    if (completionTab === "Completed" && !cand.isCompleted) return false;
    if (completionTab === "Incomplete" && cand.isCompleted) return false;
    if (docStatusFilter === "Missing" && !cand.hasMissingDocs && (!cand.missingDocs || cand.missingDocs.length === 0)) return false;
    if (docStatusFilter === "Complete" && (cand.hasMissingDocs || (cand.missingDocs && cand.missingDocs.length > 0))) return false;
    if (countryFilter !== "All") {
      const cleanCountry = getCleanCountryName(cand.country).toLowerCase();
      const filterLower = countryFilter.toLowerCase();
      if (!cleanCountry.includes(filterLower) && !cand.country.toLowerCase().includes(filterLower)) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        cand.fullName.toLowerCase().includes(q) ||
        cand.phone.toLowerCase().includes(q) ||
        cand.passportNumber.toLowerCase().includes(q) ||
        cand.candidateNo.toLowerCase().includes(q) ||
        cand.profession.toLowerCase().includes(q) ||
        cand.country.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableToAssign = agentData.availableCandidates.filter((c) => {
    const matchesSearch =
      !assignSearch ||
      c.fullName.toLowerCase().includes(assignSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(assignSearch.toLowerCase()) ||
      c.passportNo.toLowerCase().includes(assignSearch.toLowerCase()) ||
      c.candidateNo.toLowerCase().includes(assignSearch.toLowerCase()) ||
      c.profession.toLowerCase().includes(assignSearch.toLowerCase());

    const matchesCountry =
      assignCountryFilter === "All" ||
      c.country.toLowerCase().includes(assignCountryFilter.toLowerCase());

    return matchesSearch && matchesCountry;
  });

  const allInterviews = agentData.interviews || [];
  const filteredInterviews = allInterviews.filter((inv) => {
    if (interviewStatusFilter !== "All") {
      if (interviewStatusFilter === "Selected" && !/selected|pass/i.test(inv.result)) return false;
      if (interviewStatusFilter === "Waiting" && !/wait|sched/i.test(inv.result)) return false;
      if (interviewStatusFilter === "Rejected" && !/reject/i.test(inv.result)) return false;
    }
    return true;
  });

  // Top 5 Executive KPI Calculations (with fallback to direct candidate array sums)
  const totalCandidatesCount =
    agentData.totalCandidateCount ??
    (agentData as any).metrics?.totalCandidates ??
    agentData.candidates?.length ??
    0;

  const completedCandidatesCount =
    agentData.completedCandidateCount ??
    (agentData as any).metrics?.completedCount ??
    agentData.candidates?.filter((c) => c.isCompleted).length ??
    0;

  const incompleteCandidatesCount =
    agentData.incompleteCandidateCount ??
    (agentData as any).metrics?.incompleteCount ??
    agentData.candidates?.filter((c) => !c.isCompleted).length ??
    0;

  const totalCollectedBDT =
    agentData.grandTotalCollected ??
    (agentData as any).metrics?.totalCollectedFromCandidates ??
    agentData.candidates?.reduce((sum, c) => sum + (c.totalPaid || 0), 0) ??
    0;

  const totalDueBDT =
    agentData.grandTotalDue ??
    (agentData as any).metrics?.totalDue ??
    agentData.candidates?.reduce((sum, c) => sum + (c.dueAmount || 0), 0) ??
    0;

  const totalAdvanceBDT =
    agentData.grandTotalAdvance ??
    (agentData as any).metrics?.totalAdvance ??
    agentData.candidates?.reduce((sum, c) => sum + (c.advanceAmount || 0), 0) ??
    0;

  const totalCommissionBDT =
    agentData.totalEarnedCommission ??
    (agentData as any).metrics?.totalCommissionEarned ??
    totalCandidatesCount * 20000;

  // Screening & Pipeline Metrics Calculations
  const totalRegistered = allInterviews.length > 0 ? allInterviews.length : totalCandidatesCount;
  const selectedCount =
    allInterviews.filter((i) => /select|pass/i.test(i.result)).length ||
    agentData.candidates?.filter((c) => /select|pass/i.test(c.interviewStatus || "")).length ||
    0;
  const waitingCount =
    allInterviews.filter((i) => /wait|sched|queue/i.test(i.result)).length ||
    agentData.candidates?.filter((c) => /wait|sched/i.test(c.interviewStatus || "")).length ||
    0;
  const attendedCount =
    allInterviews.filter((i) => /attend|evaluat|screen|review|process/i.test(i.result)).length ||
    agentData.candidates?.filter((c) => /attend|evaluat|review/i.test(c.interviewStatus || "")).length ||
    0;
  const rejectedCount =
    allInterviews.filter((i) => /reject|fail|unsuccessful/i.test(i.result)).length ||
    agentData.candidates?.filter((c) => /reject/i.test(c.interviewStatus || "")).length ||
    0;
  const absentCount =
    allInterviews.filter((i) => /absent|resched|cancel|no_show/i.test(i.result)).length ||
    agentData.candidates?.filter((c) => /absent/i.test(c.interviewStatus || "")).length ||
    0;
  const passRate = totalRegistered > 0 ? Math.round((selectedCount / totalRegistered) * 100) : 100;

  // 100% Dynamic Country Breakdown Calculation - Only Displays Countries where Agent has Candidates
  const countryBreakdownList = (() => {
    const map: Record<
      string,
      {
        country: string;
        candidateCount: number;
        totalPackage: number;
        totalCollected: number;
        totalDue: number;
        totalAdvance: number;
        inProcess: number;
        completed: number;
      }
    > = {};

    // Aggregate directly from agent candidates
    agentData.candidates?.forEach((cand) => {
      const cleanName = getCleanCountryName(cand.country);
      if (!map[cleanName]) {
        map[cleanName] = {
          country: cleanName,
          candidateCount: 0,
          totalPackage: 0,
          totalCollected: 0,
          totalDue: 0,
          totalAdvance: 0,
          inProcess: 0,
          completed: 0,
        };
      }
      map[cleanName].candidateCount += 1;
      map[cleanName].totalPackage += cand.packageCost || 350000;
      map[cleanName].totalCollected += cand.totalPaid || 0;
      map[cleanName].totalDue += cand.dueAmount || 0;
      map[cleanName].totalAdvance += cand.advanceAmount || 0;

      if (cand.isCompleted) {
        map[cleanName].completed += 1;
      } else {
        map[cleanName].inProcess += 1;
      }
    });

    return Object.values(map).filter((item) => item.candidateCount > 0);
  })();

  // Currently active candidate for the payment deposit modal
  const activeModalCandidate =
    paymentCandidate ||
    agentData.candidates.find((c) => c.candidateId === selectedPaymentCandidateId) ||
    agentData.candidates[0] ||
    null;

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/module/agents/agent-list"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink)",
              textDecoration: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <ArrowLeft size={14} /> Back to Agents Directory
          </Link>

          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
            AGENTS / <b>{agentData.name.toUpperCase()} ({agentData.code})</b>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={isRefetching ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Print Statement
          </button>

          {isPortalMode && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <span>🛡️</span> Agent Self-Service Portal (Read-Only)
            </div>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleOpenGeneralPaymentModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#059669",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
              }}
            >
              <CreditCard size={14} /> + Collect Payment
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#7258e8",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
              }}
            >
              <UserPlus size={14} /> + Link / Assign Candidate
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "#f0edff",
                color: "#7258e8",
                border: "1px solid #dcd5fb",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Edit size={13} /> Edit Agent Details
            </button>
          )}
        </div>
      </div>

      {/* 2. AGENT PROFILE HERO CARD */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          padding: "20px 24px",
          boxShadow: "var(--shadow)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "300px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #7258e8 0%, #4f46e5 100%)",
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 900,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 12px rgba(114,88,232,0.3)",
              flexShrink: 0,
            }}
          >
            {agentData.name.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                {agentData.name}
              </h2>
              <span style={{ fontSize: "11px", fontWeight: 800, background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", color: "#334155" }}>
                {agentData.code}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: agentData.status === "Active" ? "#ecfdf5" : "#fff1f2",
                  color: agentData.status === "Active" ? "#059669" : "#e11d48",
                  border: `1px solid ${agentData.status === "Active" ? "#a7f3d0" : "#fecdd3"}`,
                }}
              >
                ● {agentData.status === "Active" ? "Active Partner" : agentData.status}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "var(--muted)" }}>
              {agentData.contactPerson && (
                <span>👤 Contact Person: <b style={{ color: "var(--ink)" }}>{agentData.contactPerson}</b></span>
              )}
              <span>
                📞 <a href={phoneHref(agentData.phone)} style={{ color: "#7258e8", textDecoration: "none", fontWeight: 700 }}>{agentData.phone}</a>
              </span>
              {agentData.email && (
                <span>
                  ✉️ <a href={`mailto:${agentData.email}`} style={{ color: "var(--muted)", textDecoration: "none" }}>{agentData.email}</a>
                </span>
              )}
              {agentData.address && (
                <span>📍 Location: <b>{agentData.address}</b></span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "8px 14px", borderRadius: "10px" }}>
            <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>💼 Agreed Commission</small>
            <b style={{ fontSize: "12.5px", color: "#7258e8" }}>{agentData.commissionRate}</b>
          </div>
          {agentData.agreementKey && (
            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", padding: "8px 14px", borderRadius: "10px" }}>
              <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>📜 Agreement Ref</small>
              <b style={{ fontSize: "12.5px", color: "#475569" }}>{agentData.agreementKey}</b>
            </div>
          )}
        </div>
      </div>

      {/* 3. 5 KEY EXECUTIVE KPI CARDS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        {/* Card 1: TOTAL REFERRED */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              TOTAL REFERRED
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "2px" }}>
              <b style={{ fontSize: "20px", fontWeight: 900, color: "var(--ink)" }}>{totalCandidatesCount}</b>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>Candidates</span>
            </div>
          </div>
        </div>

        {/* Card 2: 🟢 COMPLETED FILES */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              🟢 COMPLETED FILES
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "2px" }}>
              <b style={{ fontSize: "20px", fontWeight: 900, color: "#059669" }}>{completedCandidatesCount}</b>
              <span style={{ fontSize: "12px", color: "#059669", fontWeight: 700 }}>Done</span>
            </div>
          </div>
        </div>

        {/* Card 3: ⏳ INCOMPLETE / RUNNING */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#fffbeb", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              ⏳ INCOMPLETE / RUNNING
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "2px" }}>
              <b style={{ fontSize: "20px", fontWeight: 900, color: "#d97706" }}>{incompleteCandidatesCount}</b>
              <span style={{ fontSize: "12px", color: "#d97706", fontWeight: 700 }}>Pending</span>
            </div>
          </div>
        </div>

        {/* Card 4: TOTAL MONEY COLLECTED */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CreditCard size={20} />
          </div>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              TOTAL MONEY COLLECTED
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <b style={{ fontSize: "20px", fontWeight: 900, color: "var(--ink)" }}>{formatTk(totalCollectedBDT)}</b>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>BDT</span>
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap", fontSize: "10.5px", fontWeight: 700 }}>
              {totalDueBDT > 0 && (
                <span style={{ color: "#dc2626", background: "#fef2f2", padding: "1px 5px", borderRadius: "4px", border: "1px solid #fecdd3" }}>
                  Due: {formatTk(totalDueBDT)}
                </span>
              )}
              {totalAdvanceBDT > 0 && (
                <span style={{ color: "#7c3aed", background: "#f5f3ff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #ddd6fe" }}>
                  Adv: + {formatTk(totalAdvanceBDT)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: TOTAL COMMISSION */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#fefce8", color: "#ca8a04", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
              TOTAL COMMISSION
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
              <b style={{ fontSize: "20px", fontWeight: 900, color: "var(--ink)" }}>{formatTk(totalCommissionBDT)}</b>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>BDT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COUNTRY-WISE CANDIDATE BREAKDOWN & TOTAL COLLECTIONS SECTION (Theme Adjusted & 100% Dynamic) */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          border: "1px solid var(--line)",
          padding: "20px 24px",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Globe size={18} style={{ color: "#7258e8" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                Country-Wise Candidate Breakdown &amp; Total Collections
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
              Shows candidate distribution, total package value, collected funds, and processing status by destination.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Destinations ({countryBreakdownList.length})
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
          {countryBreakdownList.map((cb) => {
            const isSaudi = /saudi/i.test(cb.country);
            const isDubai = /dubai|uae/i.test(cb.country);

            const tagBg = isSaudi ? "#ecfdf5" : isDubai ? "#f0edff" : "#f1f5f9";
            const tagBorder = isSaudi ? "#a7f3d0" : isDubai ? "#dcd5fb" : "#e2e8f0";
            const tagColor = isSaudi ? "#059669" : isDubai ? "#7258e8" : "#475569";
            const code = getCountryCode(cb.country);

            return (
              <div
                key={cb.country}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 900, color: tagColor, background: tagBg, border: `1px solid ${tagBorder}`, padding: "2px 7px", borderRadius: "5px" }}>
                      {code}
                    </span>
                    <b style={{ fontSize: "14.5px", color: "var(--ink)" }}>{getCountryFlag(cb.country)} {getCleanCountryName(cb.country)}</b>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#334155", background: "#f8fafc", padding: "3px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    {cb.candidateCount} Candidate(s)
                  </span>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    TOTAL COLLECTED FOR {getCleanCountryName(cb.country).toUpperCase()}:
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                    <b style={{ fontSize: "20px", fontWeight: 900, color: "#15803d" }}>
                      {formatTk(cb.totalCollected)} <small style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>BDT</small>
                    </b>
                    {cb.totalDue > 0 ? (
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "2px 7px", borderRadius: "4px", border: "1px solid #fecdd3" }}>
                        Due: {formatTk(cb.totalDue)}
                      </span>
                    ) : cb.totalAdvance > 0 ? (
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", padding: "2px 7px", borderRadius: "4px", border: "1px solid #ddd6fe" }}>
                        ● + {formatTk(cb.totalAdvance)} Advance
                      </span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--muted)" }}>
                    Contract Package: <b>{formatTk(cb.totalPackage)} BDT</b>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", fontWeight: 700, paddingTop: "2px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    ⚡ {cb.inProcess} in Processing
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                    ✈️ {cb.completed} Completed Flights
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4.5 SMART DUAL ALERT NOTIFICATION HUB (EXPIRY & MISSING REQUIREMENTS) */}
      {(criticalExpiryCount > 0 || warningExpiryCount > 0 || candidatesWithMissingDocs.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              (criticalExpiryCount > 0 || warningExpiryCount > 0) && candidatesWithMissingDocs.length > 0
                ? "repeat(auto-fit, minmax(460px, 1fr))"
                : "1fr",
            gap: "14px",
          }}
        >
          {/* Card 1: Expiry Alert Card */}
          {(criticalExpiryCount > 0 || warningExpiryCount > 0) && (
            <div
              style={{
                background:
                  criticalExpiryCount > 0
                    ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #fff7ed 100%)"
                    : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: criticalExpiryCount > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                borderLeft: criticalExpiryCount > 0 ? "4px solid #f59e0b" : "4px solid #94a3b8",
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background:
                      criticalExpiryCount > 0
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    boxShadow:
                      criticalExpiryCount > 0
                        ? "0 3px 8px rgba(217, 119, 6, 0.25)"
                        : "0 3px 8px rgba(100, 116, 139, 0.2)",
                  }}
                >
                  <Clock size={19} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                    <b style={{ fontSize: "13.5px", color: criticalExpiryCount > 0 ? "#92400e" : "#334155" }}>
                      🚨 Document Expiration Alert
                    </b>
                    <span
                      style={{
                        background: criticalExpiryCount > 0 ? "#fef3c7" : "#e2e8f0",
                        border: criticalExpiryCount > 0 ? "1px solid #fde68a" : "1px solid #cbd5e1",
                        color: criticalExpiryCount > 0 ? "#b45309" : "#475569",
                        padding: "1px 7px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {criticalExpiryCount > 0
                        ? `${criticalExpiryCount} Expiring Urgently`
                        : `${warningExpiryCount} Expiring Soon`}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: criticalExpiryCount > 0 ? "#b45309" : "#64748b",
                      margin: "3px 0 0",
                      lineHeight: 1.35,
                    }}
                  >
                    Passports (&lt; 6 mos), GAMCA medical fit (60-day rule), and visa validity deadlines.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMainTab("expiry")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background:
                    criticalExpiryCount > 0
                      ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                      : "linear-gradient(135deg, #475569 0%, #334155 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow:
                    criticalExpiryCount > 0
                      ? "0 2px 6px rgba(217, 119, 6, 0.25)"
                      : "0 2px 6px rgba(51, 65, 85, 0.2)",
                  whiteSpace: "nowrap",
                }}
              >
                <Clock size={13} /> View Expiry ({criticalExpiryCount + warningExpiryCount})
              </button>
            </div>
          )}

          {/* Card 2: Missing Requirements Alert Card */}
          {candidatesWithMissingDocs.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 40%, #fdf2f8 100%)",
                border: "1px solid #fecdd3",
                borderLeft: "4px solid #e11d48",
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    boxShadow: "0 3px 8px rgba(225, 29, 72, 0.25)",
                  }}
                >
                  <FileWarning size={19} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                    <b style={{ fontSize: "13.5px", color: "#881337" }}>
                      📁 Missing Documents Alert
                    </b>
                    <span
                      style={{
                        background: "#ffe4e6",
                        border: "1px solid #fecdd3",
                        color: "#9f1239",
                        padding: "1px 7px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {candidatesWithMissingDocs.length} Candidate(s) • {totalMissingDocsCount} Missing File(s)
                    </span>
                  </div>
                  <p style={{ fontSize: "11.5px", color: "#9f1239", margin: "3px 0 0", lineHeight: 1.35 }}>
                    Original Passport scans, GAMCA medical fit slips, Police PCC, or NID copies required.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMainTab("missing")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(225, 29, 72, 0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                <FileWarning size={13} /> View Missing ({candidatesWithMissingDocs.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MAIN MULTI-TAB WORKSPACE */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          border: "1px solid var(--line)",
          padding: "20px 24px",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Workspace Tab Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveMainTab("ledger")}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeMainTab === "ledger" ? 800 : 600,
                background: activeMainTab === "ledger" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "#f8fafc",
                color: activeMainTab === "ledger" ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: activeMainTab === "ledger" ? "0 4px 12px rgba(114, 88, 232, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Layers size={15} />
              <span>Candidate Processing &amp; Financial Ledger</span>
              <span
                style={{
                  background: activeMainTab === "ledger" ? "rgba(255,255,255,0.22)" : "#ede9fe",
                  color: activeMainTab === "ledger" ? "#ffffff" : "#7258e8",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "9999px",
                }}
              >
                {agentData.candidates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("missing")}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeMainTab === "missing" ? 800 : 600,
                background: activeMainTab === "missing" ? "linear-gradient(135deg, #e11d48 0%, #be123c 100%)" : "#f8fafc",
                color: activeMainTab === "missing" ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: activeMainTab === "missing" ? "0 4px 12px rgba(225, 29, 72, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <FileWarning size={15} color={activeMainTab === "missing" ? "#ffffff" : candidatesWithMissingDocs.length > 0 ? "#e11d48" : "#475569"} />
              <span>Missing Documents</span>
              {candidatesWithMissingDocs.length > 0 ? (
                <span
                  style={{
                    background: activeMainTab === "missing" ? "#ffffff" : "#fee2e2",
                    color: activeMainTab === "missing" ? "#be123c" : "#dc2626",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "1px 7px",
                    borderRadius: "9999px",
                  }}
                >
                  {candidatesWithMissingDocs.length}
                </span>
              ) : (
                <span
                  style={{
                    background: activeMainTab === "missing" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
                    color: activeMainTab === "missing" ? "#ffffff" : "#64748b",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "1px 7px",
                    borderRadius: "9999px",
                  }}
                >
                  0
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("expiry")}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeMainTab === "expiry" ? 800 : 600,
                background: activeMainTab === "expiry" ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)" : "#f8fafc",
                color: activeMainTab === "expiry" ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: activeMainTab === "expiry" ? "0 4px 12px rgba(217, 119, 6, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <CalendarClock size={15} color={activeMainTab === "expiry" ? "#ffffff" : criticalExpiryCount > 0 ? "#d97706" : "#475569"} />
              <span>Document Expiry Tracker</span>
              <span
                style={{
                  background: activeMainTab === "expiry" ? "rgba(255,255,255,0.22)" : "#fef3c7",
                  color: activeMainTab === "expiry" ? "#ffffff" : "#b45309",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "9999px",
                }}
              >
                {expiryItems.length}
              </span>
              {criticalExpiryCount > 0 && (
                <span
                  style={{
                    background: activeMainTab === "expiry" ? "#ffffff" : "#fee2e2",
                    color: activeMainTab === "expiry" ? "#be123c" : "#dc2626",
                    fontSize: "10.5px",
                    fontWeight: 900,
                    padding: "1px 7px",
                    borderRadius: "9999px",
                  }}
                >
                  {criticalExpiryCount} Urgent
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("interviews")}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeMainTab === "interviews" ? 800 : 600,
                background: activeMainTab === "interviews" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "#f8fafc",
                color: activeMainTab === "interviews" ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: activeMainTab === "interviews" ? "0 4px 12px rgba(114, 88, 232, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <CalendarDays size={15} />
              <span>Interview Drives</span>
              <span
                style={{
                  background: activeMainTab === "interviews" ? "rgba(255,255,255,0.22)" : "#ede9fe",
                  color: activeMainTab === "interviews" ? "#ffffff" : "#7258e8",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "9999px",
                }}
              >
                {allInterviews.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("docs")}
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeMainTab === "docs" ? 800 : 600,
                background: activeMainTab === "docs" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "#f8fafc",
                color: activeMainTab === "docs" ? "#ffffff" : "#475569",
                cursor: "pointer",
                boxShadow: activeMainTab === "docs" ? "0 4px 12px rgba(114, 88, 232, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <FileCheck2 size={15} />
              <span>Documents &amp; Notes</span>
              <span
                style={{
                  background: activeMainTab === "docs" ? "rgba(255,255,255,0.22)" : "#ede9fe",
                  color: activeMainTab === "docs" ? "#ffffff" : "#7258e8",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "9999px",
                }}
              >
                {agentData.documents.length + agentData.agentNotes.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: CANDIDATES & FINANCIAL LEDGER */}
        {activeMainTab === "ledger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Filter Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCompletionTab("All")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: completionTab === "All" ? "#7258e8" : "#e2e8f0",
                    background: completionTab === "All" ? "#7258e8" : "#ffffff",
                    color: completionTab === "All" ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  All Candidates ({agentData.candidates.length})
                </button>

                <button
                  type="button"
                  onClick={() => setCompletionTab("Completed")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: completionTab === "Completed" ? "#059669" : "#e2e8f0",
                    background: completionTab === "Completed" ? "#059669" : "#ffffff",
                    color: completionTab === "Completed" ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🟢 Completed ({agentData.completedCandidateCount})
                </button>

                <button
                  type="button"
                  onClick={() => setCompletionTab("Incomplete")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: completionTab === "Incomplete" ? "#d97706" : "#e2e8f0",
                    background: completionTab === "Incomplete" ? "#d97706" : "#ffffff",
                    color: completionTab === "Incomplete" ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⏳ In-Process ({agentData.incompleteCandidateCount})
                </button>

                <button
                  type="button"
                  onClick={() => setDocStatusFilter(docStatusFilter === "Missing" ? "All" : "Missing")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: docStatusFilter === "Missing" ? "#dc2626" : "#fecdd3",
                    background: docStatusFilter === "Missing" ? "#dc2626" : "#fef2f2",
                    color: docStatusFilter === "Missing" ? "#ffffff" : "#dc2626",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🔴 Missing Docs ({candidatesWithMissingDocs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDocStatusFilter(docStatusFilter === "Complete" ? "All" : "Complete")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: docStatusFilter === "Complete" ? "#059669" : "#a7f3d0",
                    background: docStatusFilter === "Complete" ? "#059669" : "#ecfdf5",
                    color: docStatusFilter === "Complete" ? "#ffffff" : "#059669",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🟢 Docs Complete ({candidatesWithCompleteDocs.length})
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {/* Country Filter */}
                <div style={{ display: "flex", gap: "4px", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid var(--line)", flexWrap: "wrap" }}>
                  {["All", ...countryBreakdownList.map((cb) => cb.country)].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCountryFilter(c)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: countryFilter === c ? "#7258e8" : "transparent",
                        color: countryFilter === c ? "#fff" : "var(--muted)",
                        fontSize: "11.5px",
                        fontWeight: countryFilter === c ? 800 : 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate, passport, phone..."
                    style={{
                      height: "34px",
                      padding: "0 12px 0 30px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "#fafafd",
                      fontSize: "12px",
                      color: "var(--ink)",
                      outline: "none",
                      width: "220px",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Candidates Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "10px 14px", width: "40px" }}>#</th>
                    <th style={{ padding: "10px 14px" }}>Candidate &amp; Contact</th>
                    <th style={{ padding: "10px 14px" }}>Passport &amp; File</th>
                    <th style={{ padding: "10px 14px" }}>Destination &amp; Trade</th>
                    <th style={{ padding: "10px 14px" }}>Processing Stage &amp; Status</th>
                    <th style={{ padding: "10px 14px", minWidth: "190px" }}>Itemized Receipts</th>
                    <th style={{ padding: "10px 14px" }}>Financial Ledger</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((cand, idx) => (
                    <tr
                      key={cand.fileId}
                      style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)" }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0e7ff", color: "#4338ca", fontSize: "11px", fontWeight: 800, display: "grid", placeItems: "center" }}>
                            {cand.fullName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModalForCandidate(cand)}
                              style={{ background: "transparent", border: "none", padding: 0, color: "var(--ink)", fontSize: "13.5px", fontWeight: 800, textAlign: "left", cursor: "pointer" }}
                              className="hover:underline"
                            >
                              {cand.fullName}
                            </button>
                            <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                              ID: {cand.candidateNo} · <a href={phoneHref(cand.phone)} style={{ color: "#7258e8", textDecoration: "none" }}>{cand.phone}</a>
                            </small>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          <b style={{ fontFamily: "monospace", color: "var(--ink)", fontSize: "12.5px", display: "block" }}>
                            {cand.passportNumber || "No Passport"}
                          </b>
                          <small style={{ color: "var(--muted)", fontSize: "11px" }}>File: {cand.fileNo}</small>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          <span style={{ fontSize: "12.5px", fontWeight: 700, display: "block" }}>
                            {getCountryFlag(cand.country)} {cand.country}
                          </span>
                          <small style={{ color: "#475569", fontSize: "11.5px" }}>{cand.profession}</small>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: cand.isCompleted ? "#ecfdf5" : "#eff6ff",
                              color: cand.isCompleted ? "#059669" : "#2563eb",
                              border: `1px solid ${cand.isCompleted ? "#a7f3d0" : "#bfdbfe"}`,
                              display: "inline-block",
                            }}
                          >
                            {cand.isCompleted ? "🟢 COMPLETED" : `⚡ ${cand.currentStage || "Passport Entry"}`}
                          </span>

                          <div style={{ marginTop: "4px" }}>
                            {cand.isCompleted ? (
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                ✈️ Flight Scheduled / Done
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#b45309", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                ⏳ Stage: {cand.currentStage || "Passport Entry"}
                              </span>
                            )}
                          </div>

                          {cand.interviewStatus && cand.interviewStatus !== "Not Scheduled" && (
                            <div style={{ marginTop: "3px" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#b45309", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                🏆 Interview: {cand.interviewStatus}
                              </span>
                            </div>
                          )}

                          {cand.hasMissingDocs || (cand.missingDocs && cand.missingDocs.length > 0) ? (
                            <div style={{ marginTop: "4px" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMainTab("missing");
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  border: "1px solid #fecdd3",
                                  cursor: "pointer",
                                }}
                                title={`Missing: ${(cand.missingDocs || []).map((d) => d.name).join(", ")}`}
                              >
                                <AlertCircle size={11} /> {cand.missingDocsCount || cand.missingDocs?.length || 1} Missing File(s)
                              </button>
                            </div>
                          ) : (
                            <div style={{ marginTop: "4px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                <CheckCircle size={11} /> Docs Complete
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Itemized Payments Column with inline receipts and direct modal trigger */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {cand.payments.slice(0, 2).map((p, pIdx) => (
                            <div
                              key={p.id || pIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                padding: "2px 6px",
                                borderRadius: "6px",
                                fontSize: "10.5px",
                              }}
                            >
                              <span style={{ color: "#334155", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>
                                {p.type}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <b style={{ color: "#059669" }}>{formatTk(p.amount)}</b>
                                <button
                                  type="button"
                                  onClick={() => openPrintReceipt(p, cand)}
                                  style={{
                                    border: "none",
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    padding: "1px 4px",
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                  }}
                                  title="Print receipt"
                                >
                                  🖨️
                                </button>
                              </div>
                            </div>
                          ))}

                          {cand.payments.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModalForCandidate(cand)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#7258e8",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                textAlign: "left",
                                cursor: "pointer",
                                padding: "1px 0",
                              }}
                            >
                              +{cand.payments.length - 2} more receipts ▾
                            </button>
                          )}

                          {/* Direct button to open Candidate Payment Deposits & Financial Receipts Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModalForCandidate(cand)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "2px",
                              padding: "4px 9px",
                              borderRadius: "6px",
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                              width: "fit-content",
                              boxShadow: "0 1px 2px rgba(5,150,105,0.1)",
                            }}
                          >
                            <CreditCard size={12} /> + Collect Payment
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          <b style={{ fontSize: "13.5px", color: "#059669", display: "block" }}>{formatTk(cand.totalPaid)}</b>
                          <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block" }}>
                            Package: {formatTk(cand.packageCost || 350000)}
                          </small>
                          <div style={{ marginTop: "2px" }}>
                            {cand.dueAmount > 0 ? (
                              <span style={{ fontSize: "10.5px", color: "#dc2626", fontWeight: 800, background: "#fef2f2", padding: "1px 5px", borderRadius: "3px" }}>
                                Due: {formatTk(cand.dueAmount)}
                              </span>
                            ) : (
                              <span style={{ fontSize: "10.5px", color: "#7c3aed", fontWeight: 800, background: "#f5f3ff", padding: "1px 5px", borderRadius: "3px" }}>
                                + {formatTk(cand.advanceAmount)} Advance
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModalForCandidate(cand)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "5px 9px",
                              borderRadius: "6px",
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Candidate Payment Deposits & Financial Receipts"
                          >
                            <CreditCard size={12} /> Pay
                          </button>

                          <button
                            type="button"
                            onClick={() => setNoteCandidate(cand)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 9px",
                              borderRadius: "6px",
                              background: cand.notes?.length ? "#f0edff" : "#f8fafc",
                              color: cand.notes?.length ? "#7258e8" : "#475569",
                              border: cand.notes?.length ? "1px solid #dcd5fb" : "1px solid #e2e8f0",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="View & Add Notes / Price Remarks"
                          >
                            <FileText size={12} /> {cand.notes?.length ? `Note (${cand.notes.length})` : "Note"}
                          </button>

                          <Link
                            href={`/file/${cand.fileId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#7258e8",
                              color: "#ffffff",
                              fontSize: "11px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <Eye size={12} /> Open Dossier
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleUnlinkCandidate(cand.fileId, cand.fullName)}
                            style={{
                              padding: "5px 6px",
                              borderRadius: "6px",
                              background: "#fff1f2",
                              color: "#e11d48",
                              border: "1px solid #fecdd3",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                            title="Unlink candidate from this agent"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: "36px", textAlign: "center", color: "var(--muted)" }}>
                        No candidates found for this agent matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SCREENING & INTERVIEWS PIPELINE STRIP (Moved below Candidate Processing & Financial Ledger Table) */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "16px",
                border: "1px solid var(--line)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "6px",
              }}
            >
              {/* Header inside Strip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", border: "1px solid #dcd5fb", padding: "2px 8px", borderRadius: "6px", letterSpacing: "0.5px" }}>
                      🎙️ SCREENING &amp; INTERVIEWS PIPELINE
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "6px" }}>
                      ● {passRate}% Pass Rate
                    </span>
                  </div>
                  <h3 style={{ fontSize: "15.5px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                    Candidate Interviews Status
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "3px 0 0" }}>
                    Track every candidate registered for interviews, screening outcomes, and progress through medical, visa &amp; flight.
                  </p>
                </div>
              </div>

              {/* 6 Sub-metrics Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                {/* Metric 1: TOTAL REGISTERED */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    TOTAL REGISTERED
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "var(--ink)" }}>{totalRegistered}</b>
                    <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 700 }}>Candidates</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#64748b", display: "block", marginTop: "2px" }}>Total drives applied</small>
                </div>

                {/* Metric 2: SELECTED / PASSED */}
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    🏆 SELECTED / PASSED
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "#15803d" }}>{selectedCount}</b>
                    <span style={{ fontSize: "11.5px", color: "#15803d", fontWeight: 700 }}>Selected</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#16a34a", display: "block", marginTop: "2px", fontWeight: 600 }}>Passed screening</small>
                </div>

                {/* Metric 3: WAITING / SCHEDULED */}
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    ⏳ WAITING / SCHEDULED
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "#b45309" }}>{waitingCount}</b>
                    <span style={{ fontSize: "11.5px", color: "#b45309", fontWeight: 700 }}>In Queue</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#d97706", display: "block", marginTop: "2px", fontWeight: 600 }}>Upcoming interviews</small>
                </div>

                {/* Metric 4: ATTENDED / IN EVALUATION */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    📋 ATTENDED / IN EVALUATION
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "#1d4ed8" }}>{attendedCount}</b>
                    <span style={{ fontSize: "11.5px", color: "#1d4ed8", fontWeight: 700 }}>In Review</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#2563eb", display: "block", marginTop: "2px", fontWeight: 600 }}>Under client evaluation</small>
                </div>

                {/* Metric 5: REJECTED */}
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#9f1239", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    ❌ REJECTED
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "#e11d48" }}>{rejectedCount}</b>
                    <span style={{ fontSize: "11.5px", color: "#e11d48", fontWeight: 700 }}>Unsuccessful</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#f43f5e", display: "block", marginTop: "2px", fontWeight: 600 }}>Need re-assessment</small>
                </div>

                {/* Metric 6: ABSENT / RESCHEDULED */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                    🚫 ABSENT / RESCHEDULED
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                    <b style={{ fontSize: "19px", fontWeight: 900, color: "#475569" }}>{absentCount}</b>
                    <span style={{ fontSize: "11.5px", color: "#475569", fontWeight: 700 }}>Pending</span>
                  </div>
                  <small style={{ fontSize: "10.5px", color: "#64748b", display: "block", marginTop: "2px" }}>Did not attend drive</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CANDIDATE MISSING DOCUMENTS & PENDING REQUIREMENTS TRACKER */}
        {activeMainTab === "missing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header & Stats Banner */}
            <div
              style={{
                background: "#fef2f2",
                borderRadius: "14px",
                border: "1px solid #fecdd3",
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#991b1b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileWarning size={18} color="#dc2626" /> Candidate Missing Documents &amp; Requirements Checklist
                </h3>
                <p style={{ fontSize: "12px", color: "#b91c1c", margin: "4px 0 0" }}>
                  Track all candidates referred by <b>{agentData.name}</b> who have missing original Passports, GCC GAMCA Medical checkup slips, Police Clearances (PCC), or NID cards.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  {candidatesWithMissingDocs.length} Candidates Missing Docs ({totalMissingDocsCount} Total Items)
                </span>
              </div>
            </div>

            {/* Quick KPI Strip for Missing Categories */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>📘 Passports Missing</span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#dc2626", marginTop: "2px" }}>
                  {agentData.metrics?.missingPassports || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "PASSPORT")).length}
                </div>
                <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Scan / Number missing</small>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🏥 Medical Slips Missing</span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#d97706", marginTop: "2px" }}>
                  {agentData.metrics?.missingMedicals || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "MEDICAL")).length}
                </div>
                <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>GAMCA checkup pending</small>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🛡️ Police PCC Missing</span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#2563eb", marginTop: "2px" }}>
                  {agentData.metrics?.missingPolices || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "POLICE")).length}
                </div>
                <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Clearance slip needed</small>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🪪 NID Cards Missing</span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#7c3aed", marginTop: "2px" }}>
                  {agentData.metrics?.missingNids || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "NID")).length}
                </div>
                <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Smart card copy missing</small>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "12px 14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🛂 Visas Missing</span>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>
                  {agentData.metrics?.missingVisas || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "VISA")).length}
                </div>
                <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Stamped copy missing</small>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { id: "ALL", label: `All Missing (${candidatesWithMissingDocs.length})` },
                  { id: "PASSPORT", label: "📘 Passports" },
                  { id: "MEDICAL", label: "🏥 GAMCA Medical" },
                  { id: "POLICE", label: "🛡️ Police PCC" },
                  { id: "NID", label: "🪪 NID Copy" },
                  { id: "VISA", label: "🛂 Visa Copy" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setMissingCategoryFilter(cat.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: missingCategoryFilter === cat.id ? "#dc2626" : "#e2e8f0",
                      background: missingCategoryFilter === cat.id ? "#dc2626" : "#ffffff",
                      color: missingCategoryFilter === cat.id ? "#ffffff" : "#475569",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input
                  type="text"
                  value={missingSearch}
                  onChange={(e) => setMissingSearch(e.target.value)}
                  placeholder="Search missing docs, candidate, phone..."
                  style={{
                    height: "34px",
                    padding: "0 12px 0 30px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "#ffffff",
                    fontSize: "12px",
                    color: "var(--ink)",
                    outline: "none",
                    width: "240px",
                  }}
                />
              </div>
            </div>

            {/* Missing Documents Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "10px 14px", width: "40px" }}>#</th>
                    <th style={{ padding: "10px 14px" }}>Candidate &amp; Contact</th>
                    <th style={{ padding: "10px 14px" }}>Trade &amp; Destination</th>
                    <th style={{ padding: "10px 14px" }}>Current Stage</th>
                    <th style={{ padding: "10px 14px" }}>❌ Missing Documents &amp; Reason</th>
                    <th style={{ padding: "10px 14px" }}>📋 Action Required</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissingDocCandidates.map((cand, idx) => (
                    <tr
                      key={cand.fileId}
                      style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fffbfa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)" }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: 800, display: "grid", placeItems: "center" }}>
                            {cand.fullName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <b style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>
                              {cand.fullName}
                            </b>
                            <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                              ID: {cand.candidateNo} · <a href={phoneHref(cand.phone)} style={{ color: "#7258e8", textDecoration: "none" }}>{cand.phone}</a>
                            </small>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div>
                          <span style={{ fontSize: "12.5px", fontWeight: 700, display: "block" }}>
                            {getCountryFlag(cand.country)} {cand.country}
                          </span>
                          <small style={{ color: "#475569", fontSize: "11.5px" }}>{cand.profession}</small>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            display: "inline-block",
                          }}
                        >
                          ⚡ {cand.currentStage || "Passport Entry"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(cand.missingDocs || []).map((doc, dIdx) => (
                            <div
                              key={dIdx}
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecdd3",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                display: "inline-flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626" }}>
                                  ❌ {doc.name}
                                </span>
                                <span style={{ fontSize: "9.5px", fontWeight: 800, background: "#dc2626", color: "#fff", padding: "1px 4px", borderRadius: "3px" }}>
                                  {doc.severity}
                                </span>
                              </div>
                              <small style={{ fontSize: "10.5px", color: "#991b1b" }}>
                                {doc.reason}
                              </small>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {(cand.missingDocs || []).map((doc, dIdx) => (
                            <span key={dIdx} style={{ fontSize: "11.5px", color: "#334155", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              👉 {doc.actionRequired}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <Link
                            href={`/file/${cand.fileNo || cand.fileId}`}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              background: "#f0edff",
                              color: "#7258e8",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={12} /> Open Dossier
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredMissingDocCandidates.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                        <CheckCircle size={32} color="#059669" style={{ margin: "0 auto 8px" }} />
                        <b style={{ fontSize: "14px", color: "#059669", display: "block" }}>No Missing Documents Found!</b>
                        <span style={{ fontSize: "12px" }}>All candidate files under this agent have required files and documents submitted.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: CANDIDATE DOCUMENT EXPIRY & RENEWALS TRACKER */}
        {activeMainTab === "expiry" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Expiry Header & Stats */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "14px",
                border: "1px solid var(--line)",
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⏰ Candidate Document Expiry &amp; Deadline Renewal Tracker
                </h4>
                <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "3px 0 0" }}>
                  Automated expiration alerts for Passport (6-month rule), GAMCA Medical Fitness (60-day rule), Police PCC, and Stamped Visa deadlines.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#e11d48", textTransform: "uppercase", display: "block" }}>Critical (&lt; 15d)</span>
                  <b style={{ fontSize: "15px", color: "#9f1239" }}>{criticalExpiryCount}</b>
                </div>
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#d97706", textTransform: "uppercase", display: "block" }}>Warning (16-60d)</span>
                  <b style={{ fontSize: "15px", color: "#92400e" }}>{warningExpiryCount}</b>
                </div>
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase", display: "block" }}>Safe Valid</span>
                  <b style={{ fontSize: "15px", color: "#065f46" }}>{safeExpiryCount}</b>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={expirySearch}
                    onChange={(e) => setExpirySearch(e.target.value)}
                    placeholder="Search candidate, passport, file..."
                    style={{
                      width: "100%",
                      height: "36px",
                      padding: "0 10px 0 32px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontSize: "12px",
                      background: "#fff",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "3px", background: "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
                  {[
                    { id: "ALL", label: `All (${expiryItems.length})` },
                    { id: "CRITICAL", label: `🚨 Urgent (${criticalExpiryCount})` },
                    { id: "WARNING", label: `⚠️ Warning (${warningExpiryCount})` },
                    { id: "SAFE", label: `🟢 Safe (${safeExpiryCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setExpiryStatusFilter(f.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: expiryStatusFilter === f.id ? 800 : 600,
                        background: expiryStatusFilter === f.id ? "#7258e8" : "transparent",
                        color: expiryStatusFilter === f.id ? "#fff" : "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <select
                  value={expiryDocTypeFilter}
                  onChange={(e) => setExpiryDocTypeFilter(e.target.value)}
                  style={{
                    height: "34px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">All Documents</option>
                  <option value="Passport">📘 Passport</option>
                  <option value="GAMCA Medical">🏥 GAMCA Medical</option>
                  <option value="Police Clearance (PCC)">🛡️ Police PCC</option>
                  <option value="Stamped Visa">🛂 Stamped Visa</option>
                </select>
              </div>
            </div>

            {/* Master Expiry Table */}
            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>SL</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Candidate Details</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Document Type &amp; Ref</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Expiry Date</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Countdown &amp; Status</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Operational Action Required</th>
                    <th style={{ padding: "10px 14px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpiryItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "36px", textAlign: "center" }}>
                        <ShieldCheck size={32} color="#10b981" style={{ margin: "0 auto 6px" }} />
                        <b style={{ fontSize: "13.5px", color: "var(--ink)", display: "block" }}>No Expiring Documents Matching Filter</b>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>All candidate documents are valid and in order.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredExpiryItems.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: "1px solid #f1f5f9", background: item.urgency === "EXPIRED" || item.urgency === "CRITICAL" ? "#fffafb" : "transparent" }}>
                        <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{item.candidate.fullName}</b>
                          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>{item.candidate.fileNo} • {item.candidate.phone}</span>
                          <span style={{ fontSize: "11px", color: "#4338ca", fontWeight: 700 }}>🌍 {item.candidate.country} ({item.candidate.profession})</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                            <span>{item.docIcon}</span>
                            <b style={{ fontSize: "12px", color: "var(--ink)" }}>{item.docType}</b>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace", display: "block" }}>{item.docRef}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <b style={{ fontSize: "12.5px", color: "var(--ink)", fontFamily: "monospace", display: "block" }}>{item.expiryDate.toLocaleDateString("en-GB")}</b>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>Expiry deadline</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {item.urgency === "EXPIRED" ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#ffe4e6", color: "#e11d48", border: "1px solid #fecdd3" }}>
                              🚨 EXPIRED ({Math.abs(item.daysLeft)}d ago)
                            </span>
                          ) : item.urgency === "CRITICAL" ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}>
                              🚨 {item.daysLeft} Days Left (&lt; 15d)
                            </span>
                          ) : item.urgency === "WARNING" ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>
                              ⚠️ {item.daysLeft} Days Left
                            </span>
                          ) : (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                              🟢 Valid ({item.daysLeft}d left)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", maxWidth: "300px" }}>
                          <span style={{ fontSize: "11.5px", color: item.urgency === "CRITICAL" || item.urgency === "EXPIRED" ? "#b91c1c" : "var(--ink)", fontWeight: 600, lineHeight: 1.4, display: "block" }}>
                            {item.actionRequired}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <Link
                            href={`/file/${item.candidate.fileId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#7258e8",
                              color: "#ffffff",
                              fontSize: "11px",
                              fontWeight: 700,
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Eye size={12} /> Open File
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INTERVIEW DRIVES & SCREENING */}
        {activeMainTab === "interviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["All", "Selected", "Waiting", "Rejected"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setInterviewStatusFilter(st)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: interviewStatusFilter === st ? "#7258e8" : "#e2e8f0",
                      background: interviewStatusFilter === st ? "#7258e8" : "#ffffff",
                      color: interviewStatusFilter === st ? "#ffffff" : "#475569",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "10px 14px" }}>Candidate</th>
                    <th style={{ padding: "10px 14px" }}>Interview Drive &amp; Company</th>
                    <th style={{ padding: "10px 14px" }}>Trade / Profession</th>
                    <th style={{ padding: "10px 14px" }}>Scheduled Date</th>
                    <th style={{ padding: "10px 14px" }}>Result &amp; Rating</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterviews.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <b style={{ color: "var(--ink)", fontSize: "13px", display: "block" }}>{inv.fullName}</b>
                        <small style={{ color: "var(--muted)", fontSize: "11px" }}>{inv.phone} · PP: {inv.passportNumber}</small>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{inv.title}</b>
                        <small style={{ color: "var(--muted)", fontSize: "11px" }}>{inv.company}</small>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{inv.profession}</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "12px", color: "#475569" }}>
                        {new Date(inv.scheduledAt).toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: /selected|pass/i.test(inv.result) ? "#ecfdf5" : /reject/i.test(inv.result) ? "#fff1f2" : "#fffbeb",
                            color: /selected|pass/i.test(inv.result) ? "#059669" : /reject/i.test(inv.result) ? "#e11d48" : "#d97706",
                            border: `1px solid ${/selected|pass/i.test(inv.result) ? "#a7f3d0" : /reject/i.test(inv.result) ? "#fecdd3" : "#fde68a"}`,
                          }}
                        >
                          {inv.result}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditingInterview(inv)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            background: "#7258e8",
                            color: "#fff",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Update Result
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInterviews.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "36px", textAlign: "center", color: "var(--muted)" }}>
                        No interview drives found for this agent's candidates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AGENCY DOCUMENTS & OFFICE NOTES */}
        {activeMainTab === "docs" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Agency Documents */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>Agency Contracts &amp; Scans</b>
                  <small style={{ fontSize: "11px", color: "var(--muted)" }}>Trade License, MoU, Cheque copy</small>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#7258e8",
                    color: "#fff",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} /> Upload Doc
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {agentData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={16} className="text-indigo-600" />
                      <div>
                        <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>{doc.name}</b>
                        <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>{doc.type} · {doc.size}</small>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {doc.fileData && (
                        <a
                          href={doc.fileData}
                          download={doc.name}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "#f0edff",
                            color: "#7258e8",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          View
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        style={{
                          padding: "4px 6px",
                          borderRadius: "4px",
                          background: "#fff1f2",
                          color: "#e11d48",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {agentData.documents.length === 0 && (
                  <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
                    No agency documents uploaded yet.
                  </p>
                )}
              </div>
            </div>

            {/* Office Notes */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>Administrative Notes</b>
                  <small style={{ fontSize: "11px", color: "var(--muted)" }}>Internal remarks &amp; special terms</small>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAgentNoteModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#7258e8",
                    color: "#fff",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} /> Add Note
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {agentData.agentNotes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "10px 12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b style={{ fontSize: "12px", color: "var(--ink)" }}>📌 {n.title}</b>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgentNote(n.id)}
                        style={{ background: "transparent", border: "none", color: "#e11d48", cursor: "pointer" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#475569" }}>{n.content}</p>
                    <small style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      By {n.createdBy} · {new Date(n.createdAt).toLocaleDateString("en-GB")}
                    </small>
                  </div>
                ))}
                {agentData.agentNotes.length === 0 && (
                  <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
                    No administrative notes recorded yet.
                  </p>
                )}
              </div>
            </div>

            {/* Candidate Notes & Price Remarks */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "14px", padding: "18px", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <b style={{ fontSize: "14px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📝</span> Candidate Notes &amp; Price Remarks
                  </b>
                  <small style={{ fontSize: "11px", color: "var(--muted)" }}>
                    All notes, fee agreements &amp; special instructions recorded for this agent's candidates
                  </small>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#7258e8", padding: "3px 8px", borderRadius: "6px" }}>
                  {agentData.candidates.reduce((acc, c) => acc + (c.notes?.length || 0), 0)} Total Notes
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                {agentData.candidates.flatMap((cand) =>
                  (cand.notes || []).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "12px 14px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--purple)", background: "var(--purple-soft)", padding: "1px 6px", borderRadius: "4px", display: "inline-block", marginBottom: "2px" }}>
                            {cand.fullName} ({cand.fileNo})
                          </span>
                          <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>📌 {n.title}</b>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {n.price > 0 && (
                            <span style={{ fontSize: "10px", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "2px 6px", borderRadius: "4px" }}>
                              ৳ {n.price.toLocaleString()} BDT
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCandidateNote(n.id)}
                            title="Delete note"
                            style={{ background: "transparent", border: "none", color: "#e11d48", cursor: "pointer", padding: "2px" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {n.description && (
                        <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>{n.description}</p>
                      )}
                      <small style={{ fontSize: "10px", color: "var(--muted)" }}>
                        By {n.createdBy} · {new Date(n.createdAt).toLocaleDateString("en-GB")}
                      </small>
                    </div>
                  ))
                )}
                {agentData.candidates.every((c) => !c.notes?.length) && (
                  <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "20px 0", gridColumn: "1 / -1" }}>
                    No candidate notes recorded yet. Click "Note" on any candidate row to add one.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. COMPLETE CANDIDATE PAYMENT DEPOSITS & FINANCIAL RECEIPTS MODAL */}
      {showPaymentModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", zIndex: 9999, padding: "20px", overflowY: "auto" }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "1050px",
              width: "100%",
              padding: "26px 30px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              maxHeight: "92vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>💰</span>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    Candidate Payment Deposits &amp; Financial Receipts
                  </h2>
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Record candidate payment installments with custom titles, optional deposit vouchers, and printable receipts.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {activeModalCandidate && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeModalCandidate.payments.length > 0) {
                        openPrintReceipt(activeModalCandidate.payments[0], activeModalCandidate);
                      } else {
                        setActiveReceipt({
                          receiptNo: `MR-${activeModalCandidate.fileNo ? activeModalCandidate.fileNo.replace("FILE-", "") : Date.now().toString().slice(-6)}`,
                          date: new Date().toLocaleDateString("en-GB"),
                          candidateName: activeModalCandidate.fullName,
                          candidateNo: activeModalCandidate.candidateNo,
                          fileNo: activeModalCandidate.fileNo,
                          passportNo: activeModalCandidate.passportNumber,
                          phone: activeModalCandidate.phone,
                          country: activeModalCandidate.country,
                          profession: activeModalCandidate.profession,
                          paymentType: "Candidate Payment Deposit",
                          paymentMethod: "Office Accounts",
                          referenceNo: `REC-${Date.now().toString().slice(-6)}`,
                          amount: 50000,
                          totalPaid: activeModalCandidate.totalPaid,
                          totalPackage: activeModalCandidate.packageCost || 350000,
                          officerName: agentData.contactPerson || agentData.name || "Accounts Department",
                        });
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={13} /> 🖨️ Print Money Receipt
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentCandidate(null);
                  }}
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", width: "32px", height: "32px", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Stage Guidance Banner */}
            <div
              style={{
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: "#5b21b6",
              }}
            >
              <Sparkles size={16} className="text-purple-600 shrink-0" />
              <span>
                <b>Stage Information:</b> Enter payment title, deposit amount, and save payment record. Uploading bank slip/voucher is optional.
              </span>
            </div>

            {/* 2-Column Grid: Left Form & Right Financial Ledger */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
              {/* LEFT COLUMN: Payment Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Candidate Selection / Identity Card */}
                {paymentCandidate ? (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px" }}>
                    <small style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                      TARGET CANDIDATE
                    </small>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <div>
                        <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>{paymentCandidate.fullName}</b>
                        <span style={{ fontSize: "11.5px", color: "#475569" }}>
                          ID: <b>{paymentCandidate.candidateNo}</b> · PP: <b>{paymentCandidate.passportNumber || "N/A"}</b> · {paymentCandidate.country} ({paymentCandidate.profession})
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                        File: {paymentCandidate.fileNo}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Select Candidate *
                    </label>
                    <select
                      name="candidateId"
                      value={selectedPaymentCandidateId}
                      onChange={(e) => setSelectedPaymentCandidateId(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1px solid #7258e8",
                        background: "#fcfaff",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    >
                      {agentData.candidates.map((c) => (
                        <option key={c.candidateId} value={c.candidateId}>
                          {c.fullName} (ID: {c.candidateNo} · PP: {c.passportNumber || "N/A"} · {c.country})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <form onSubmit={handleRecordCandidatePayment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <input type="hidden" name="candidateId" value={activeModalCandidate?.candidateId || ""} />
                  <input type="hidden" name="fileId" value={activeModalCandidate?.fileId || ""} />

                  {/* Payment Title / Purpose */}
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Payment Title / Purpose *
                    </label>
                    <input
                      name="type"
                      list="agent-payment-title-presets"
                      placeholder="e.g. Second Payment (Visa Fee)..."
                      defaultValue={activeModalCandidate && activeModalCandidate.payments.length > 0 ? "Second Payment (Visa Fee)" : "First Payment Deposit"}
                      required
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                    <datalist id="agent-payment-title-presets">
                      <option value="First Payment Deposit" />
                      <option value="Second Payment (Visa Fee)" />
                      <option value="Medical & Processing Deposit" />
                      <option value="Registration Fee" />
                      <option value="Visa Stamping Deposit" />
                      <option value="BMET Manpower Fee" />
                      <option value="Flight Air Ticket Fee" />
                      <option value="Final Balance Settlement" />
                    </datalist>
                  </div>

                  {/* Deposit Amount (BDT) & Payment Method */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Deposit Amount (BDT) *
                      </label>
                      <input
                        name="amount"
                        type="number"
                        defaultValue={150000}
                        required
                        min={1}
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 12px",
                          borderRadius: "8px",
                          border: "1px solid #10b981",
                          background: "#f0fdf4",
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "#059669",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Payment Method
                      </label>
                      <select
                        name="method"
                        defaultValue="Cash at Office"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--line)",
                          fontSize: "12.5px",
                          color: "var(--ink)",
                          outline: "none",
                        }}
                      >
                        <option value="Cash at Office">Cash at Office</option>
                        <option value="Bank Transfer / Deposit">Bank Transfer / Deposit</option>
                        <option value="bKash / Nagad / MFS">bKash / Nagad / MFS</option>
                        <option value="Bank Cheque">Bank Cheque</option>
                        <option value="Office Accounts">Office Accounts</option>
                      </select>
                    </div>
                  </div>

                  {/* Receipt / Reference No */}
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Receipt / Reference No
                    </label>
                    <input
                      name="reference"
                      placeholder="e.g. REC-011043"
                      defaultValue={`REC-${Date.now().toString().slice(-6)}`}
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Attach Bank Slip / Deposit Voucher (Optional) */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Paperclip size={13} className="text-indigo-600" /> Attach Bank Slip / Deposit Voucher (Optional)
                      </label>
                      <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>PDF, JPG, PNG (Max 10MB)</small>
                    </div>

                    <input
                      type="file"
                      ref={paymentFileInputRef}
                      style={{ display: "none" }}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleVoucherFileSelect(f);
                      }}
                    />

                    {paymentReceiptFile ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FileText size={18} className="text-emerald-600" />
                          <div>
                            <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>{paymentReceiptFile.name}</b>
                            <small style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                              {paymentReceiptFile.size} · ✓ Physical Scan Attached
                            </small>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => paymentFileInputRef.current?.click()}
                            style={{ padding: "4px 8px", borderRadius: "4px", background: "#ffffff", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentReceiptFile(null)}
                            style={{ padding: "4px 6px", borderRadius: "4px", background: "#fff1f2", color: "#e11d48", border: "none", cursor: "pointer" }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => paymentFileInputRef.current?.click()}
                        style={{
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: "10px",
                          padding: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: "#fafafd",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                            <UploadCloud size={18} />
                          </div>
                          <div>
                            <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>Click to upload or drag &amp; drop document scan</b>
                            <small style={{ fontSize: "10.5px", color: "var(--muted)" }}>Optional physical scan attachment for candidate dossier</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Browse File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={savingPayment}
                    style={{
                      marginTop: "6px",
                      padding: "12px 24px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
                    }}
                  >
                    <CreditCard size={16} /> {savingPayment ? "Recording Deposit..." : "💾 Record Additional Payment"}
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Financial Ledger */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={15} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    FINANCIAL LEDGER
                  </span>
                </div>

                {/* Balance Big Banner */}
                {activeModalCandidate && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "1px solid #bbf7d0",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                        TOTAL AMOUNT PAID
                      </span>
                      <b style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", display: "block", marginTop: "2px" }}>
                        {formatTk(activeModalCandidate.totalPaid)} <small style={{ fontSize: "13px", fontWeight: 700 }}>BDT</small>
                      </b>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "11px" }}>
                        <span style={{ color: "#334155" }}>Contract Package: {formatTk(activeModalCandidate.packageCost || 350000)}</span>
                        {activeModalCandidate.dueAmount > 0 ? (
                          <span style={{ fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: "4px", border: "1px solid #fecdd3" }}>
                            Due: {formatTk(activeModalCandidate.dueAmount)}
                          </span>
                        ) : (
                          <span style={{ fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #ddd6fe" }}>
                            ● Advance Extra: + {formatTk(activeModalCandidate.advanceAmount)} BDT
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#bbf7d0", color: "#15803d", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: 900 }}>
                      $
                    </div>
                  </div>
                )}

                {/* List of Previous Receipts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                  {activeModalCandidate && activeModalCandidate.payments.length > 0 ? (
                    activeModalCandidate.payments.map((p, pIdx) => (
                      <div
                        key={p.id || pIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <b style={{ fontSize: "12.5px", color: "var(--ink)" }}>{p.type}</b>
                            <button
                              type="button"
                              onClick={() => openPrintReceipt(p, activeModalCandidate)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Printer size={10} /> Print Receipt
                            </button>
                          </div>
                          <small style={{ fontSize: "10.5px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                            {new Date(p.createdAt).toLocaleDateString("en-GB")} · {p.method}
                          </small>
                        </div>

                        <b style={{ fontSize: "13.5px", color: "#059669", fontWeight: 800 }}>
                          {formatTk(p.amount)}
                        </b>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)", fontSize: "12px" }}>
                      No payments deposited yet for this candidate.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. LINK / ASSIGN CANDIDATE MODAL */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", maxWidth: "600px", width: "100%", padding: "24px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                  👤 Link Candidate to {agentData.name}
                </h3>
                <small style={{ fontSize: "11px", color: "var(--muted)" }}>Search unassigned or available candidates</small>
              </div>
              <button type="button" onClick={() => setShowAssignModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search by candidate name, passport, phone..."
                style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {availableToAssign.map((cand) => (
                <div
                  key={cand.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <b style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>{cand.fullName}</b>
                    <small style={{ fontSize: "11px", color: "var(--muted)" }}>
                      PP: {cand.passportNo || "N/A"} · 📞 {cand.phone} · Trade: {cand.profession}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAssignCandidate(cand)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: "#7258e8",
                      color: "#fff",
                      border: "none",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Assign
                  </button>
                </div>
              ))}
              {availableToAssign.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--muted)", padding: "30px" }}>
                  No available candidates found matching your search.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. EDIT AGENT PROFILE MODAL */}
      {showEditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", maxWidth: "580px", width: "100%", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                  ✏️ Edit Agent Profile
                </h3>
                <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "2px 0 0" }}>
                  Update agent partner details, commission terms, agreement deed &amp; portal login.
                </p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAgent} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Agent Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={agentData.code}
                    readOnly
                    style={{
                      width: "100%",
                      height: "36px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontSize: "13px",
                      outline: "none",
                      background: "#f1f5f9",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#475569",
                      cursor: "not-allowed",
                    }}
                    title="Agent Code is a system reference and cannot be altered"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Agency Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={agentData.name}
                    required
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Contact Person / Owner
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    defaultValue={agentData.contactPerson || ""}
                    placeholder="e.g. Rafiqul Islam"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={agentData.phone}
                    required
                    placeholder="e.g. +8801733445566"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={agentData.email || ""}
                    placeholder="e.g. agent@gmail.com"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    District / City
                  </label>
                  <input
                    type="text"
                    name="district"
                    defaultValue={agentData.district || agentData.country || "Dhaka"}
                    placeholder="e.g. Brahmanbaria, Dhaka, Sylhet"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Commission Terms
                  </label>
                  <input
                    type="text"
                    name="commissionRate"
                    defaultValue={agentData.commissionRate}
                    placeholder="e.g. ৳ 20,000 / candidate"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Agreement Reference / Key
                  </label>
                  <input
                    type="text"
                    name="agreementKey"
                    defaultValue={agentData.agreementKey || `AGR-${agentData.code}`}
                    placeholder="e.g. AGR-AGT-105"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Office Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={agentData.address || ""}
                    placeholder="e.g. Court Road, Brahmanbaria"
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Account Status
                  </label>
                  <select
                    name="status"
                    defaultValue={agentData.status || "Active"}
                    style={{
                      width: "100%",
                      height: "36px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      fontSize: "12.5px",
                      outline: "none",
                      background: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <option value="Active">Active (Verified)</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* 🔐 AGENT PORTAL SELF-SERVICE LOGIN */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f8f7ff 0%, #f5f3ff 100%)",
                  border: "1px solid #ddd6fe",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🔐</span>
                    <div>
                      <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>
                        Agent Portal Self-Service Login
                      </b>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        Agent can log in with Email &amp; Password to view their candidates in read-only mode.
                      </span>
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
                    <input
                      type="checkbox"
                      name="enablePortalLogin"
                      checked={editPortalLogin}
                      onChange={(e) => setEditPortalLogin(e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "#7258e8" }}
                    />
                    Enable Login
                  </label>
                </div>

                {editPortalLogin && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "4px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                        Portal Login Email
                      </label>
                      <input
                        name="portalEmail"
                        type="email"
                        value={editPortalEmail}
                        onChange={(e) => setEditPortalEmail(e.target.value)}
                        placeholder="Uses Main Email if blank"
                        style={{
                          width: "100%",
                          height: "38px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          padding: "0 10px",
                          fontSize: "12.5px",
                          outline: "none",
                          background: "#fff",
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink)" }}>
                          Reset Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
                            let pwd = "";
                            for (let i = 0; i < 6; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                            setEditPortalPassword(`Agent@${pwd}`);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#7258e8",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          🎲 Auto-generate
                        </button>
                      </div>
                      <input
                        name="portalPassword"
                        type="text"
                        value={editPortalPassword}
                        onChange={(e) => setEditPortalPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        style={{
                          width: "100%",
                          height: "38px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          padding: "0 10px",
                          fontSize: "12.5px",
                          outline: "none",
                          background: "#fff",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: "8px 14px", borderRadius: "8px", background: "#f1f5f9", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ padding: "8px 18px", borderRadius: "8px", background: "#7258e8", color: "#fff", border: "none", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. CANDIDATE NOTE MODAL (VIEW & ADD) */}
      {noteCandidate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", zIndex: 9999, padding: "20px", overflowY: "auto" }}>
          <div style={{ background: "#fff", borderRadius: "18px", maxWidth: "560px", width: "100%", padding: "24px 26px", boxShadow: "0 20px 45px rgba(0,0,0,0.22)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📝</span> Candidate Notes &amp; Price Remarks
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--purple)", background: "var(--purple-soft)", padding: "1px 6px", borderRadius: "4px" }}>
                    {noteCandidate.fullName}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    · File: <b>{noteCandidate.fileNo}</b>
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    · Passport: <b>{noteCandidate.passportNumber}</b>
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setNoteCandidate(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Existing Notes List */}
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Saved Notes ({noteCandidate.notes?.length || 0})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                {noteCandidate.notes && noteCandidate.notes.length > 0 ? (
                  noteCandidate.notes.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "10px 12px",
                        background: "#fafafd",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <b style={{ fontSize: "12px", color: "var(--ink)" }}>📌 {n.title}</b>
                          {n.price > 0 && (
                            <span style={{ fontSize: "10px", fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "1px 6px", borderRadius: "4px" }}>
                              ৳ {n.price.toLocaleString()} BDT
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCandidateNote(n.id)}
                          title="Delete note"
                          style={{ background: "transparent", border: "none", color: "#e11d48", cursor: "pointer", padding: "2px" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {n.description && (
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", lineHeight: "1.4" }}>{n.description}</p>
                      )}
                      <small style={{ fontSize: "10px", color: "var(--muted)" }}>
                        By {n.createdBy} · {new Date(n.createdAt).toLocaleDateString("en-GB")}
                      </small>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "11.5px", color: "var(--muted)", fontStyle: "italic", margin: 0, padding: "8px 0" }}>
                    No notes recorded yet for this candidate. Use the form below to add one.
                  </p>
                )}
              </div>
            </div>

            {/* Add New Note Form */}
            <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ➕ Add New Note / Price Remark
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Title / Subject *
                </label>
                <input type="text" name="title" placeholder="e.g. Visa Fee Agreement" required style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }} />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Price Remark / Amount (Optional)
                </label>
                <input type="number" name="price" placeholder="e.g. 20000" style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }} />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Description / Note
                </label>
                <textarea name="description" rows={2} placeholder="Add detailed remark..." style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12.5px", outline: "none", resize: "none" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={() => setNoteCandidate(null)} style={{ padding: "8px 14px", borderRadius: "8px", background: "#f1f5f9", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingNote} style={{ padding: "8px 18px", borderRadius: "8px", background: "#7258e8", color: "#fff", border: "none", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MONEY RECEIPT PRINT MODAL */}
      {activeReceipt && (
        <MoneyReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
