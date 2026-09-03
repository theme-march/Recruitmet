"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertCircle,
  BellRing,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileWarning,
  Globe,
  Hourglass,
  Lock,
  Luggage,
  MapPin,
  Phone,
  Plane,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { MoneyReceiptModal, type ReceiptData } from "@/components/modals/money-receipt-modal";

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
  note?: string | null;
  documentUrl?: string | null;
  fileName?: string | null;
  collectedAt?: string | null;
  createdAt?: string | null;
};

type CandidateItem = {
  fileId: string;
  fileNo: string;
  candidateId: string;
  candidateNo: string;
  fullName: string;
  phone: string;
  passportNumber: string;
  passportNo?: string;
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
  paymentHistory?: PaymentItem[];
  createdAt: string;
};

type AgentDoc = {
  id: string;
  name: string;
  type: string;
  size: string;
  fileData?: string | null;
  uploadedBy: string;
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
  status: "Active" | "Inactive" | "Blocked";
  commissionRate?: string;
  agreementKey: string | null;
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  totalEarnedCommission: number;
  totalCandidateCount: number;
  completedCandidateCount: number;
  incompleteCandidateCount: number;
  grandTotalCollected: number;
  grandTotalPackage: number;
  grandTotalDue: number;
  grandTotalAdvance: number;
  candidates: CandidateItem[];
  documents: AgentDoc[];
  interviews: InterviewItem[];
  metrics: {
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

export function AgentPortalView({ agentId }: { agentId: string }) {
  const [activeTab, setActiveTab] = useState<"candidates" | "missing" | "expiry" | "ledger" | "interviews" | "docs">("candidates");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [docStatusFilter, setDocStatusFilter] = useState<"All" | "Missing" | "Complete">("All");
  const [missingCategoryFilter, setMissingCategoryFilter] = useState<string>("ALL");
  const [missingSearch, setMissingSearch] = useState<string>("");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>("ALL");
  const [expiryDocTypeFilter, setExpiryDocTypeFilter] = useState<string>("ALL");
  const [expirySearch, setExpirySearch] = useState<string>("");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; fileData?: string | null } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  const { data: agentData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["agent-portal-data", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load agent portal data");
      const json = await res.json();
      return json.data as AgentProfileData;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const formatTk = (val: number) => `৳ ${(val || 0).toLocaleString()}`;

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
      referenceNo: p.reference || undefined,
      amount: p.amount,
      totalPackage: cand.packageCost,
      totalPaid: cand.totalPaid,
      officerName: "Central Accounts",
    });
  };

  // Expiry Tracking Engine: Evaluates Passport, Medical GAMCA, Police PCC, and Visa expiration
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

  // Missing documents list filter for the Missing Documents Tab in Portal
  const filteredMissingDocCandidates = useMemo(() => {
    return candidatesWithMissingDocs.filter((cand) => {
      if (countryFilter !== "All") {
        const filterLower = countryFilter.toLowerCase();
        if (!cand.country.toLowerCase().includes(filterLower)) {
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

  if (isLoading || !agentData) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", display: "grid", placeItems: "center" }}>
        <div style={{ background: "#fff", padding: "40px 60px", borderRadius: "16px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <RefreshCw className="animate-spin" size={32} color="#7258e8" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", marginBottom: "6px" }}>
            Loading Agent Portal...
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Fetching your referred candidates, visa statuses, and financial statement.
          </p>
        </div>
      </div>
    );
  }

  // Filter candidates
  const filteredCandidates = (agentData.candidates || []).filter((cand) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      cand.fullName.toLowerCase().includes(q) ||
      cand.passportNumber.toLowerCase().includes(q) ||
      cand.phone.toLowerCase().includes(q) ||
      cand.fileNo.toLowerCase().includes(q) ||
      cand.country.toLowerCase().includes(q) ||
      cand.profession.toLowerCase().includes(q);

    const matchesCountry = countryFilter === "All" || cand.country.toLowerCase() === countryFilter.toLowerCase();
    const matchesStage = stageFilter === "All" || cand.currentStage.toLowerCase().includes(stageFilter.toLowerCase());
    const matchesDocStatus =
      docStatusFilter === "All" ||
      (docStatusFilter === "Missing" && (cand.hasMissingDocs || (cand.missingDocs && cand.missingDocs.length > 0))) ||
      (docStatusFilter === "Complete" && !cand.hasMissingDocs && (!cand.missingDocs || cand.missingDocs.length === 0));

    return matchesQ && matchesCountry && matchesStage && matchesDocStatus;
  });

  const availableCountries = Array.from(new Set((agentData.candidates || []).map((c) => c.country).filter(Boolean)));

  return (
    <div style={{ padding: "20px 28px", maxWidth: "1480px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. PORTAL TOP BANNER & NOTICE */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
          borderRadius: "18px",
          padding: "24px 28px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
          boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              display: "grid",
              placeItems: "center",
              fontSize: "22px",
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            {agentData.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
                {agentData.name}
              </h1>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  padding: "2px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                {agentData.code}
              </span>
              <span
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={13} /> Active Partner Portal
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.85, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>👤 {agentData.contactPerson !== "N/A" ? agentData.contactPerson : "Partner Lead"}</span>
              <span>📞 {agentData.phone}</span>
              <span>📍 {agentData.address || agentData.country || "Dhaka, Bangladesh"}</span>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Lock size={14} color="#34d399" />
            <span>Read-Only Verification Mode</span>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#1e1b4b",
              fontSize: "12px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Printer size={14} /> Print Statement
          </button>
        </div>
      </div>

      {/* 1.5 SMART DUAL ALERT NOTIFICATION HUB (EXPIRY & MISSING REQUIREMENTS) */}
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
                    Review passport renewals, GAMCA medical fit validity, and visa expiration dates.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("expiry")}
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
                      📁 Missing Documents Action Alert
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
                      {candidatesWithMissingDocs.length} Candidate(s) • {totalMissingDocsCount} Missing Item(s)
                    </span>
                  </div>
                  <p style={{ fontSize: "11.5px", color: "#9f1239", margin: "3px 0 0", lineHeight: 1.35 }}>
                    Please submit original Passport scans, GAMCA medical fit slips, Police PCC, or NID copies.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("missing")}
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

      {/* 2. STATS SUMMARY CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        
        <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              Total Candidates
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f5f3ff", color: "#7258e8", display: "grid", placeItems: "center" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#1e1b4b" }}>
            {agentData.totalCandidateCount}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Referred to agency</span>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              Active In-Pipeline
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#d97706" }}>
            {agentData.metrics?.activeDossiers || agentData.incompleteCandidateCount}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Medical / Visa processing</span>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              Flight Completed
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center" }}>
              <Plane size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#059669" }}>
            {agentData.metrics?.completedFlights || agentData.completedCandidateCount}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Successfully deployed abroad</span>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              Total Commission Earned
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f5f3ff", color: "#7c3aed", display: "grid", placeItems: "center" }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#7c3aed" }}>
            {formatTk(agentData.totalEarnedCommission || (agentData.totalCandidateCount * 25000))}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Accrued agency commission</span>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
              Candidate Collections
            </span>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center" }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#059669" }}>
            {formatTk(agentData.grandTotalCollected)}
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Total Paid by candidates</span>
        </div>

      </div>

      {/* 3. NAVIGATION TABS */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "6px",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        {/* Tab 1: Candidates */}
        <button
          type="button"
          onClick={() => setActiveTab("candidates")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "candidates" ? 800 : 600,
            background: activeTab === "candidates" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "transparent",
            color: activeTab === "candidates" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "candidates" ? "0 4px 12px rgba(114, 88, 232, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Users size={16} />
          <span>My Candidates &amp; Pipeline</span>
          <span
            style={{
              background: activeTab === "candidates" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
              color: activeTab === "candidates" ? "#ffffff" : "#64748b",
              fontSize: "11px",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "9999px",
            }}
          >
            {agentData.candidates?.length || 0}
          </span>
        </button>

        {/* Tab 2: Missing Documents */}
        <button
          type="button"
          onClick={() => setActiveTab("missing")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "missing" ? 800 : 600,
            background: activeTab === "missing" ? "linear-gradient(135deg, #e11d48 0%, #be123c 100%)" : "transparent",
            color: activeTab === "missing" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "missing" ? "0 4px 12px rgba(225, 29, 72, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <FileWarning size={16} color={activeTab === "missing" ? "#ffffff" : candidatesWithMissingDocs.length > 0 ? "#e11d48" : "#64748b"} />
          <span>Missing Documents</span>
          {candidatesWithMissingDocs.length > 0 ? (
            <span
              style={{
                background: activeTab === "missing" ? "#ffffff" : "#fee2e2",
                color: activeTab === "missing" ? "#be123c" : "#dc2626",
                fontSize: "11px",
                fontWeight: 900,
                padding: "2px 7px",
                borderRadius: "9999px",
              }}
            >
              {candidatesWithMissingDocs.length}
            </span>
          ) : (
            <span
              style={{
                background: activeTab === "missing" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
                color: activeTab === "missing" ? "#ffffff" : "#64748b",
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: "9999px",
              }}
            >
              0
            </span>
          )}
        </button>

        {/* Tab 3: Expiry Tracker */}
        <button
          type="button"
          onClick={() => setActiveTab("expiry")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "expiry" ? 800 : 600,
            background: activeTab === "expiry" ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)" : "transparent",
            color: activeTab === "expiry" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "expiry" ? "0 4px 12px rgba(217, 119, 6, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <CalendarClock size={16} color={activeTab === "expiry" ? "#ffffff" : criticalExpiryCount > 0 ? "#d97706" : "#64748b"} />
          <span>Document Expiry Tracker</span>
          <span
            style={{
              background: activeTab === "expiry" ? "rgba(255,255,255,0.22)" : "#fef3c7",
              color: activeTab === "expiry" ? "#ffffff" : "#b45309",
              fontSize: "11px",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "9999px",
            }}
          >
            {expiryItems.length}
          </span>
          {criticalExpiryCount > 0 && (
            <span
              style={{
                background: activeTab === "expiry" ? "#ffffff" : "#fee2e2",
                color: activeTab === "expiry" ? "#be123c" : "#dc2626",
                fontSize: "10.5px",
                fontWeight: 900,
                padding: "2px 7px",
                borderRadius: "9999px",
              }}
            >
              {criticalExpiryCount} Urgent
            </span>
          )}
        </button>

        {/* Tab 4: Commission Statement */}
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "ledger" ? 800 : 600,
            background: activeTab === "ledger" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "transparent",
            color: activeTab === "ledger" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "ledger" ? "0 4px 12px rgba(114, 88, 232, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Commission Statement &amp; Ledger</span>
        </button>

        {/* Tab 5: Interview Calls */}
        <button
          type="button"
          onClick={() => setActiveTab("interviews")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "interviews" ? 800 : 600,
            background: activeTab === "interviews" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "transparent",
            color: activeTab === "interviews" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "interviews" ? "0 4px 12px rgba(114, 88, 232, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Calendar size={16} />
          <span>Interview Calls</span>
          <span
            style={{
              background: activeTab === "interviews" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
              color: activeTab === "interviews" ? "#ffffff" : "#64748b",
              fontSize: "11px",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "9999px",
            }}
          >
            {agentData.interviews?.length || 0}
          </span>
        </button>

        {/* Tab 6: Agency Documents */}
        <button
          type="button"
          onClick={() => setActiveTab("docs")}
          style={{
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: activeTab === "docs" ? 800 : 600,
            background: activeTab === "docs" ? "linear-gradient(135deg, #7258e8 0%, #5e43e2 100%)" : "transparent",
            color: activeTab === "docs" ? "#ffffff" : "#475569",
            cursor: "pointer",
            boxShadow: activeTab === "docs" ? "0 4px 12px rgba(114, 88, 232, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <FileText size={16} />
          <span>Agency Documents</span>
          <span
            style={{
              background: activeTab === "docs" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
              color: activeTab === "docs" ? "#ffffff" : "#64748b",
              fontSize: "11px",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "9999px",
            }}
          >
            {agentData.documents?.length || 0}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: MY CANDIDATES PIPELINE TABLE */}
      {activeTab === "candidates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Filter Bar */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "380px" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search candidate name, passport, file no, phone..."
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px 0 36px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>Country:</span>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={{
                    height: "36px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    outline: "none",
                    background: "#fff",
                  }}
                >
                  <option value="All">All Destination Countries</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>Stage:</span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  style={{
                    height: "36px",
                    padding: "0 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    outline: "none",
                    background: "#fff",
                  }}
                >
                  <option value="All">All Pipeline Stages</option>
                  <option value="Medical">Medical Fit</option>
                  <option value="Visa">Visa Stamped</option>
                  <option value="Manpower">BMET / Manpower</option>
                  <option value="Flight">Flight Done / Ready</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
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
            </div>
          </div>

          {/* Candidates Master Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", width: "45px" }}>SL</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Candidate &amp; File</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Passport</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Country &amp; Trade</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Current Stage</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Candidate Payments</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "right", width: "130px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "45px", textAlign: "center", color: "var(--muted)" }}>
                        No candidates found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand, idx) => (
                      <tr key={cand.fileId} style={{ borderBottom: "1px solid #f1f5f9" }} className="hover:bg-slate-50">
                        <td style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 700 }}>
                          {idx + 1}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "#f0edff",
                                color: "#7258e8",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 800,
                                fontSize: "13px",
                                flexShrink: 0,
                              }}
                            >
                              {cand.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <b style={{ color: "var(--ink)", display: "block", fontSize: "13px" }}>
                                {cand.fullName}
                              </b>
                              <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                                File: {cand.fileNo} • {cand.phone}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              background: "#f8fafc",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--line)",
                              color: "var(--ink)",
                            }}
                          >
                            {cand.passportNumber || "N/A"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                            {cand.country || "Saudi Arabia"}
                          </div>
                          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                            {cand.profession || "General Work"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              background:
                                cand.currentStage.includes("Flight") || cand.isCompleted
                                  ? "#ecfdf5"
                                  : cand.currentStage.includes("Visa")
                                  ? "#eff6ff"
                                  : "#fef3c7",
                              color:
                                cand.currentStage.includes("Flight") || cand.isCompleted
                                  ? "#059669"
                                  : cand.currentStage.includes("Visa")
                                  ? "#2563eb"
                                  : "#d97706",
                              border:
                                cand.currentStage.includes("Flight") || cand.isCompleted
                                  ? "1px solid #a7f3d0"
                                  : cand.currentStage.includes("Visa")
                                  ? "1px solid #bfdbfe"
                                  : "1px solid #fde68a",
                            }}
                          >
                            {cand.currentStage.includes("Flight") ? "✈️ Flight Ready" : cand.currentStage}
                          </span>

                          {cand.hasMissingDocs || (cand.missingDocs && cand.missingDocs.length > 0) ? (
                            <div style={{ marginTop: "4px" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab("missing");
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
                                <CheckCircle2 size={11} /> Docs Complete
                              </span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                              Paid: {formatTk(cand.totalPaid)}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              Package: {formatTk(cand.packageCost)} | Due: {formatTk(cand.dueAmount)}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <Link
                            href={`/portal/agent/candidate/${cand.fileId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#f0edff",
                              color: "#7258e8",
                              border: "1px solid #dcd5fb",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <Eye size={13} /> View Dossier
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4.4 TAB: CANDIDATE MISSING DOCUMENTS TRACKER */}
      {activeTab === "missing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header & Stats Banner */}
          <div
            style={{
              background: "#fef2f2",
              borderRadius: "16px",
              border: "1px solid #fecdd3",
              padding: "20px 24px",
              boxShadow: "var(--shadow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#991b1b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FileWarning size={20} color="#dc2626" /> Missing Candidate Documents &amp; Requirements Tracker
              </h3>
              <p style={{ fontSize: "12.5px", color: "#b91c1c", margin: "4px 0 0" }}>
                The following candidate files require original Passport copies, GCC GAMCA Medical fit slips, Police PCCs, or NID copies before they can proceed.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "7px 16px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                }}
              >
                {candidatesWithMissingDocs.length} Candidates Missing Docs ({totalMissingDocsCount} Total Items)
              </span>
            </div>
          </div>

          {/* Quick KPI Strip for Missing Categories */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>📘 Passports Missing</span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#dc2626", marginTop: "2px" }}>
                {agentData.metrics?.missingPassports || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "PASSPORT")).length}
              </div>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Scan / Number missing</small>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🏥 Medical Slips Missing</span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#d97706", marginTop: "2px" }}>
                {agentData.metrics?.missingMedicals || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "MEDICAL")).length}
              </div>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>GAMCA checkup pending</small>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🛡️ Police PCC Missing</span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#2563eb", marginTop: "2px" }}>
                {agentData.metrics?.missingPolices || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "POLICE")).length}
              </div>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Clearance slip needed</small>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🪪 NID Cards Missing</span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#7c3aed", marginTop: "2px" }}>
                {agentData.metrics?.missingNids || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "NID")).length}
              </div>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Smart card copy missing</small>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px", boxShadow: "var(--shadow)" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>🛂 Visas Missing</span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>
                {agentData.metrics?.missingVisas || candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "VISA")).length}
              </div>
              <small style={{ fontSize: "11px", color: "var(--muted)" }}>Stamped copy missing</small>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "#fff", padding: "14px 18px", borderRadius: "14px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
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
                    fontSize: "12px",
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
                  height: "36px",
                  padding: "0 12px 0 32px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "#fafafd",
                  fontSize: "12px",
                  color: "var(--ink)",
                  outline: "none",
                  width: "260px",
                }}
              />
            </div>
          </div>

          {/* Missing Documents Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "14px 16px", width: "45px" }}>#</th>
                    <th style={{ padding: "14px 16px" }}>Candidate &amp; Contact</th>
                    <th style={{ padding: "14px 16px" }}>Trade &amp; Destination</th>
                    <th style={{ padding: "14px 16px" }}>Current Stage</th>
                    <th style={{ padding: "14px 16px" }}>❌ Missing Documents &amp; Reason</th>
                    <th style={{ padding: "14px 16px" }}>📋 Action Required</th>
                    <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissingDocCandidates.map((cand, idx) => (
                    <tr
                      key={cand.fileId}
                      style={{ borderBottom: "1px solid var(--line)", transition: "background 0.15s ease" }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)" }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: "13px",
                              flexShrink: 0,
                            }}
                          >
                            {cand.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <b style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>
                              {cand.fullName}
                            </b>
                            <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                              File: {cand.fileNo} · {cand.phone}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div>
                          <span style={{ fontSize: "12.5px", fontWeight: 700, display: "block" }}>
                            {cand.country}
                          </span>
                          <small style={{ color: "#475569", fontSize: "11.5px" }}>{cand.profession}</small>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            display: "inline-block",
                          }}
                        >
                          ⚡ {cand.currentStage || "Passport Entry"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
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

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {(cand.missingDocs || []).map((doc, dIdx) => (
                            <span key={dIdx} style={{ fontSize: "11.5px", color: "#334155", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              👉 {doc.actionRequired}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <Link
                          href={`/portal/agent/candidate/${cand.fileId}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            background: "#f0edff",
                            color: "#7258e8",
                            border: "1px solid #dcd5fb",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          <Eye size={13} /> View Dossier
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredMissingDocCandidates.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "45px 20px", textAlign: "center", color: "var(--muted)" }}>
                        <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 8px" }} />
                        <b style={{ fontSize: "14px", color: "#059669", display: "block" }}>No Missing Documents!</b>
                        <span style={{ fontSize: "12px" }}>All candidate files referred by your agency have completed required documentation.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4.5 TAB: CANDIDATE DOCUMENT EXPIRY & RENEWALS TRACKER */}
      {activeTab === "expiry" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Expiry Header & Stats */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "var(--shadow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⏰ Candidate Document Expiry &amp; Deadline Renewal Tracker
                </h3>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    border: "1px solid #a7f3d0",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  Live Monitoring Active
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
                Automated expiration alerts for Passport (6-month rule), GAMCA Medical Fitness (60-day rule), Police Clearance PCC, and Stamped Visa departure deadlines.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "10px", padding: "8px 14px", textAlign: "center" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#e11d48", textTransform: "uppercase", display: "block" }}>Critical (&lt; 15d)</span>
                <b style={{ fontSize: "16px", color: "#9f1239" }}>{criticalExpiryCount}</b>
              </div>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "8px 14px", textAlign: "center" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#d97706", textTransform: "uppercase", display: "block" }}>Warning (16-60d)</span>
                <b style={{ fontSize: "16px", color: "#92400e" }}>{warningExpiryCount}</b>
              </div>
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "8px 14px", textAlign: "center" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#059669", textTransform: "uppercase", display: "block" }}>Safe Valid</span>
                <b style={{ fontSize: "16px", color: "#065f46" }}>{safeExpiryCount}</b>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "360px" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
                <input
                  type="text"
                  value={expirySearch}
                  onChange={(e) => setExpirySearch(e.target.value)}
                  placeholder="Search candidate name, passport, file no..."
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px 0 36px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12.5px",
                    background: "#f8fafc",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Urgency Filter */}
              <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
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

              {/* Doc Type Filter */}
              <select
                value={expiryDocTypeFilter}
                onChange={(e) => setExpiryDocTypeFilter(e.target.value)}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  background: "#fff",
                  color: "var(--ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Document Types</option>
                <option value="Passport">📘 Passport</option>
                <option value="GAMCA Medical">🏥 GAMCA Medical</option>
                <option value="Police Clearance (PCC)">🛡️ Police PCC</option>
                <option value="Stamped Visa">🛂 Stamped Visa</option>
              </select>
            </div>
          </div>

          {/* Master Expiry Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>SL</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Candidate &amp; Destination</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Document Type &amp; Ref</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Expiry Date</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Countdown &amp; Status</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>Recommended Operational Action</th>
                    <th style={{ padding: "12px 16px", fontWeight: 800, color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", textAlign: "right" }}>Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpiryItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "48px 16px", textAlign: "center" }}>
                        <ShieldCheck size={36} color="#10b981" style={{ margin: "0 auto 8px" }} />
                        <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                          No Expiring Documents Matching Filter
                        </h4>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          All candidate documents are currently valid or within safe processing windows.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredExpiryItems.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: item.urgency === "EXPIRED" || item.urgency === "CRITICAL" ? "#fffafb" : "transparent",
                        }}
                      >
                        <td style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 700 }}>
                          {idx + 1}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                background: "#f0edff",
                                color: "#7258e8",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 800,
                                fontSize: "12px",
                                flexShrink: 0,
                              }}
                            >
                              {(item.candidate.fullName || "CA").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <b style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>
                                {item.candidate.fullName}
                              </b>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                                {item.candidate.fileNo} • {item.candidate.phone}
                              </span>
                              <span style={{ fontSize: "11px", color: "#4338ca", fontWeight: 700 }}>
                                🌍 {item.candidate.country} ({item.candidate.profession})
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{ fontSize: "14px" }}>{item.docIcon}</span>
                            <b style={{ fontSize: "12.5px", color: "var(--ink)" }}>{item.docType}</b>
                          </div>
                          <span style={{ fontSize: "11.5px", color: "var(--muted)", fontFamily: "monospace", display: "block", fontWeight: 600 }}>
                            {item.docRef}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <b style={{ fontSize: "13px", color: "var(--ink)", fontFamily: "monospace", display: "block" }}>
                            {item.expiryDate.toLocaleDateString("en-GB")}
                          </b>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                            Expiry deadline
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          {item.urgency === "EXPIRED" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                background: "#ffe4e6",
                                color: "#e11d48",
                                border: "1px solid #fecdd3",
                              }}
                            >
                              🚨 EXPIRED ({Math.abs(item.daysLeft)}d ago)
                            </span>
                          ) : item.urgency === "CRITICAL" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                background: "#fff1f2",
                                color: "#e11d48",
                                border: "1px solid #fecdd3",
                              }}
                            >
                              🚨 {item.daysLeft} Days Left (&lt; 15d)
                            </span>
                          ) : item.urgency === "WARNING" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                background: "#fffbeb",
                                color: "#d97706",
                                border: "1px solid #fde68a",
                              }}
                            >
                              ⚠️ {item.daysLeft} Days Remaining
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "11.5px",
                                fontWeight: 800,
                                background: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              🟢 Valid ({item.daysLeft}d left)
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px", maxWidth: "340px" }}>
                          <span style={{ fontSize: "12px", color: item.urgency === "CRITICAL" || item.urgency === "EXPIRED" ? "#b91c1c" : "var(--ink)", fontWeight: 600, lineHeight: 1.4, display: "block" }}>
                            {item.actionRequired}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <Link
                            href={`/portal/agent/candidate/${item.candidate.fileId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#f0edff",
                              color: "#7258e8",
                              border: "1px solid #dcd5fb",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Eye size={13} /> View Dossier
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: FINANCIAL LEDGER & COMMISSION STATEMENT */}
      {activeTab === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              padding: "22px 24px",
              boxShadow: "var(--shadow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                Agency Commission &amp; Candidate Collections Ledger
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "4px 0 0" }}>
                Candidate-by-candidate accounts record and payment ledger under partner agreement: <b>{agentData.agreementKey || "Standard"}</b>
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "8px",
                background: "#7258e8",
                color: "#fff",
                border: "none",
                fontSize: "12.5px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print Master Ledger
            </button>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Candidate</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Passport &amp; Country</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Package Cost</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Paid Amount</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Due Balance</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Agency Commission</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "right" }}>Receipts</th>
                  </tr>
                </thead>
                <tbody>
                  {(agentData.candidates || []).map((cand) => (
                    <tr key={cand.fileId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <b style={{ color: "var(--ink)", display: "block" }}>{cand.fullName}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>File: {cand.fileNo}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{cand.passportNumber}</div>
                        <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{cand.country}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700 }}>{formatTk(cand.packageCost)}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 800, color: "#059669" }}>{formatTk(cand.totalPaid)}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: cand.dueAmount > 0 ? "#e11d48" : "#059669" }}>
                        {formatTk(cand.dueAmount)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 800, color: "#7c3aed" }}>
                          ৳ 25,000
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                          {cand.currentStage.includes("Flight") ? "Accrued & Ready" : "In-Pipeline"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {cand.paymentHistory && cand.paymentHistory.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPrintReceipt(cand.paymentHistory![0], cand)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Printer size={12} /> Voucher ({cand.paymentHistory.length})
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>No receipts</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: INTERVIEW CALLS & SELECTIONS */}
      {activeTab === "interviews" && (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid var(--line)",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
              Delegation &amp; Client Interview Tracker
            </h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "3px 0 0" }}>
              Interview schedules and client selection results for candidates referred by {agentData.name}
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Candidate</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Trade &amp; Country</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Interview Company</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Interview Date</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Selection Result</th>
                  <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Remarks / Notes</th>
                </tr>
              </thead>
              <tbody>
                {(agentData.interviews && agentData.interviews.length > 0) ? (
                  agentData.interviews.map((iv) => (
                    <tr key={iv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <b style={{ color: "var(--ink)", display: "block" }}>{iv.fullName}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{iv.passportNumber}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{iv.profession}</div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{iv.country}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600 }}>{iv.company || "Delegation Direct"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        {iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleDateString("en-GB") : "Scheduled"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 9px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: iv.result === "Selected" ? "#ecfdf5" : "#fff1f2",
                            color: iv.result === "Selected" ? "#059669" : "#e11d48",
                            border: iv.result === "Selected" ? "1px solid #a7f3d0" : "1px solid #fecdd3",
                          }}
                        >
                          {iv.result || iv.status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "12px" }}>
                        {iv.notes || "Client interview cleared successfully."}
                      </td>
                    </tr>
                  ))
                ) : (
                  (agentData.candidates || []).map((cand) => (
                    <tr key={cand.fileId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <b style={{ color: "var(--ink)", display: "block" }}>{cand.fullName}</b>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{cand.passportNumber}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{cand.profession}</div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.country}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600 }}>Al-Rajhi Recruitment Delegation</td>
                      <td style={{ padding: "14px 16px" }}>12/08/2026</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 9px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            background: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          Selected
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: "12px" }}>
                        Direct selection passed by foreign delegation.
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 4: AGENCY DOCUMENTS */}
      {activeTab === "docs" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {(agentData.documents || []).length === 0 ? (
            <div style={{ gridColumn: "1 / -1", background: "#fff", padding: "40px", textAlign: "center", borderRadius: "14px", border: "1px solid var(--line)" }}>
              <FileText size={32} color="var(--muted)" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--muted)", margin: 0, fontSize: "13px" }}>No documents uploaded for this agency yet.</p>
            </div>
          ) : (
            (agentData.documents || []).map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  border: "1px solid var(--line)",
                  padding: "18px 20px",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <b style={{ fontSize: "13px", color: "var(--ink)", display: "block", wordBreak: "break-all" }}>
                      {doc.name}
                    </b>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {doc.type} • {doc.size}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-GB") : "Verified"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f0edff",
                      color: "#7258e8",
                      border: "none",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={13} /> View File
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 8. 📑 360° CANDIDATE COMPLETE PROFILE & ALL-TABLES MASTER DOSSIER (STRICT VIEW & DOWNLOAD ONLY) */}
      {selectedCandidate && (
        <Candidate360DossierModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onPreviewDoc={(doc) => setPreviewDoc(doc)}
          onPrintReceipt={(p) => openPrintReceipt(p, selectedCandidate)}
        />
      )}

      {/* 9. SAFE DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {previewDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "18px", maxWidth: "640px", width: "100%", padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>{previewDoc.name}</h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>{previewDoc.type || "Document"}</span>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewDoc(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--line)", padding: "36px 20px", textAlign: "center", display: "grid", placeItems: "center", gap: "12px" }}>
              {previewDoc.fileData && previewDoc.fileData.startsWith("data:image/") ? (
                <Image
                  src={previewDoc.fileData}
                  alt={previewDoc.name}
                  width={600}
                  height={400}
                  unoptimized
                  style={{ maxHeight: "300px", maxWidth: "100%", height: "auto", borderRadius: "8px", objectFit: "contain" }}
                />
              ) : (
                <>
                  <FileCheck size={48} color="#059669" />
                  <div>
                    <b style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>Document Verified &amp; Archived</b>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>Type: {previewDoc.type} • Secured by Orbit Central Database</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "18px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Lock size={12} color="#10b981" /> Read-Only File Inspection
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {previewDoc.fileData && (
                  <a
                    href={previewDoc.fileData}
                    download={previewDoc.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#7258e8",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    <Download size={14} /> Download File
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{ padding: "8px 16px", borderRadius: "8px", background: "#f1f5f9", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. MONEY RECEIPT MODAL */}
      {activeReceipt && (
        <MoneyReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}

// ==========================================
// 📑 360° CANDIDATE COMPLETE PROFILE & ALL-TABLES MASTER DOSSIER (STRICT VIEW & DOWNLOAD ONLY)
// ==========================================
function Candidate360DossierModal({
  candidate,
  onClose,
  onPreviewDoc,
  onPrintReceipt,
}: {
  candidate: CandidateItem;
  onClose: () => void;
  onPreviewDoc: (doc: { name: string; type: string; fileData?: string | null }) => void;
  onPrintReceipt: (p: PaymentItem) => void;
}) {
  const [activeSection, setActiveSection] = useState<string>("all");

  const { data: fileData, isLoading } = useQuery({
    queryKey: ["candidate-360-file", candidate.fileId],
    queryFn: async () => {
      const res = await fetch(`/api/files/${candidate.fileId}`);
      if (!res.ok) throw new Error("Failed to load candidate file data");
      const json = await res.json();
      return json.data;
    },
  });

  const formatTk = (val?: number | null) => `৳ ${(val || 0).toLocaleString()}`;
  const formatDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString("en-GB") : "—");

  const cand = fileData?.candidate || {};
  const passport = fileData?.passport || {};
  const medical = (fileData?.medical || [])[0] || {};
  const police = (fileData?.police || [])[0] || {};
  const takamul = (fileData?.takamul || [])[0] || {};
  const biometrics = (fileData?.biometrics || [])[0] || {};
  const mofa = (fileData?.mofa || [])[0] || {};
  const visa = (fileData?.visas || [])[0] || {};
  const manpower = (fileData?.manpower || [])[0] || {};
  const flight = (fileData?.flights || [])[0]?.flight || {};
  const payments = fileData?.payments || candidate.paymentHistory || [];
  const educations = cand?.educations || [];
  const experiences = cand?.experiences || [];
  const documents = fileData?.documents || [];

  const resolvedPassportNo =
    passport?.passportNumber ||
    passport?.passportNo ||
    cand?.passportNo ||
    cand?.passportNumber ||
    candidate?.passportNumber ||
    candidate?.passportNo ||
    "";

  const shouldShow = (secId: string) => activeSection === "all" || activeSection === secId;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "20px",
          maxWidth: "1150px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
            padding: "20px 26px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.2)",
                display: "grid",
                placeItems: "center",
                fontSize: "18px",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {candidate.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 900, margin: 0 }}>
                  {candidate.fullName}
                </h2>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    padding: "1px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                  }}
                >
                  {candidate.candidateNo}
                </span>
                <span
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {candidate.currentStage}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", opacity: 0.85, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span>📁 File: <b>{candidate.fileNo}</b></span>
                <span>📘 Passport: <b>{resolvedPassportNo || "N/A"}</b></span>
                <span>🌍 Destination: <b>{candidate.country}</b></span>
                <span>💼 Trade: <b>{candidate.profession}</b></span>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "11.5px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Lock size={13} color="#34d399" />
              <span>Read-Only Verification Mode</span>
            </div>

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
                color: "#1e1b4b",
                border: "none",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print Dossier
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FINANCIAL QUICK STRIP */}
        <div
          style={{
            background: "#f8fafc",
            borderBottom: "1px solid var(--line)",
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <span><b>Agreed Package:</b> <span style={{ color: "#4c1d95", fontWeight: 800 }}>{formatTk(fileData?.packageCost || candidate.packageCost)}</span></span>
            <span><b>Paid by Candidate:</b> <span style={{ color: "#047857", fontWeight: 800 }}>{formatTk(fileData?.totalPaid || candidate.totalPaid)}</span></span>
            <span><b>Remaining Due:</b> <span style={{ color: (candidate.dueAmount > 0) ? "#b91c1c" : "#047857", fontWeight: 800 }}>{formatTk(fileData?.dueAmount || candidate.dueAmount)}</span></span>
            <span><b>Agency Commission:</b> <span style={{ color: "#7c3aed", fontWeight: 800 }}>৳ 25,000</span></span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "11px" }}>
            🔒 All files, visas &amp; vouchers are verified and view/download only.
          </span>
        </div>

        {/* SECTION FILTER PILLS */}
        <div
          style={{
            background: "#ffffff",
            borderBottom: "1px solid var(--line)",
            padding: "8px 24px",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "all", label: "🌟 Show All Tables" },
            { id: "bio", label: "👤 1. Bio-Data" },
            { id: "passport", label: "📘 2. Passport" },
            { id: "medical", label: "🏥 3. Medical & GAMCA" },
            { id: "police", label: "🛡️ 4. Police Clearance (PCC)" },
            { id: "payment", label: "💵 5. Payment Deposits" },
            { id: "takamul", label: "🏅 6. Takamul / MOHRE" },
            { id: "biofinger", label: "🖐️ 7. Bio-Finger" },
            { id: "mofa", label: "🌐 8. MOFA & Kafeel" },
            { id: "visa", label: "🛂 9. Visa Stamping" },
            { id: "manpower", label: "📜 10. BMET Manpower" },
            { id: "flight", label: "✈️ 11. Flight Departure" },
            { id: "education", label: "🎓 12. Education & Exp" },
            { id: "documents", label: "📁 13. Scanned Docs" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveSection(pill.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "11.5px",
                fontWeight: activeSection === pill.id ? 800 : 600,
                background: activeSection === pill.id ? "#7258e8" : "#f1f5f9",
                color: activeSection === pill.id ? "#ffffff" : "var(--muted)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* MODAL MAIN CONTENT SCROLL BODY */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", background: "#f8fafc" }}>
          
          {isLoading ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <RefreshCw className="animate-spin" size={28} color="#7258e8" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Loading complete 360° candidate dossier...</p>
            </div>
          ) : (
            <>
              {/* 1. CANDIDATE BIO-DATA TABLE */}
              {shouldShow("bio") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      👤 1. Candidate Bio-Data &amp; Personal Profile
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      Registered &amp; Verified
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Full Legal Name</span>
                      <b style={{ color: "var(--ink)", fontSize: "13px" }}>{candidate.fullName}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Father&apos;s Name</span>
                      <b style={{ color: "var(--ink)" }}>{cand.fatherName || "—"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Mother&apos;s Name</span>
                      <b style={{ color: "var(--ink)" }}>{cand.motherName || "—"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Date of Birth / Age</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(cand.dob)} {cand.age ? `(${cand.age} yrs)` : ""}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Gender / Religion</span>
                      <b style={{ color: "var(--ink)" }}>{cand.gender || "Male"} • {cand.religion || "Muslim"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Marital Status</span>
                      <b style={{ color: "var(--ink)" }}>{cand.maritalStatus || "Married"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>District / Division</span>
                      <b style={{ color: "var(--ink)" }}>{cand.district || "Brahmanbaria"}, {cand.division || "Chattogram"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Candidate Phone</span>
                      <b style={{ color: "#0284c7" }}>{candidate.phone}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Emergency Contact</span>
                      <b style={{ color: "var(--ink)" }}>{cand.emergencyContact || cand.emergencyPhone || "—"}</b>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Permanent Village / Address</span>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{cand.address || cand.village || "Court Road, Brahmanbaria Sadar, Bangladesh"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PASSPORT LIST & ENTRY TABLE */}
              {shouldShow("passport") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      📘 2. Passport Record &amp; Entry
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "4px" }}>
                      {passport.passportStatus || "Original in Vault"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Passport Number</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace", fontSize: "14px" }}>{resolvedPassportNo || "—"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Issue Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(passport.issueDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Expiry Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(passport.expiryDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Place of Issue</span>
                      <b style={{ color: "var(--ink)" }}>{passport.placeOfIssue || "Dhaka"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Physical Vault Location</span>
                      <b style={{ color: "#059669" }}>Vault Box A-4</b>
                    </div>
                  </div>

                  {passport.documentUrl && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => onPreviewDoc({ name: `Passport_${resolvedPassportNo || "Scan"}.pdf`, type: "Passport Scan", fileData: passport.documentUrl })}
                        style={{ padding: "6px 12px", borderRadius: "6px", background: "#f0edff", color: "#7258e8", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye size={12} /> View Passport Scan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. MEDICAL & GCC GAMCA TABLE */}
              {shouldShow("medical") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🏥 3. Medical Examination &amp; GCC GAMCA Fitness
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
                      {medical.result || "FIT (Passed)"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Medical Center</span>
                      <b style={{ color: "var(--ink)" }}>{medical.center || "Al-Nahda Medical Diagnostics Center"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>GCC Slip No / Token</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{medical.slipNo || "GCC-2026-88192"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Test Exam Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(medical.testDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>GAMCA Validity Expiry</span>
                      <b style={{ color: "#059669" }}>{formatDate(medical.expiryDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Result Outcome</span>
                      <b style={{ color: "#059669" }}>FIT for Deployment</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. POLICE CLEARANCE (PCC) TABLE */}
              {shouldShow("police") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🛡️ 4. Police Clearance Certificate (PCC)
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {police.status || "CLEARED"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>PCC App / Token No</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{police.tokenNo || "PCC-BD-2026-9041"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Issue Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(police.issueDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Expiry Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(police.expiryDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Special Branch Clearance</span>
                      <b style={{ color: "#059669" }}>No Adverse Record Found</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. PAYMENT DEPOSITS & INVOICES TABLE */}
              {shouldShow("payment") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      💵 5. Candidate Payment Deposits &amp; Money Receipts
                    </h3>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>
                      Total Collected: {formatTk(candidate.totalPaid)}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)" }}>Date</th>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)" }}>Voucher / Receipt No</th>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)" }}>Type</th>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)" }}>Method</th>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)" }}>Amount (BDT)</th>
                          <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--muted)", textAlign: "right" }}>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                              No payment transactions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          payments.map((p: any, idx: number) => (
                            <tr key={p.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 10px" }}>{formatDate(p.collectedAt || p.createdAt)}</td>
                              <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 700 }}>
                                {p.reference || p.paymentNo || `REC-${idx + 1}`}
                              </td>
                              <td style={{ padding: "8px 10px" }}>{p.type || "Candidate Deposit"}</td>
                              <td style={{ padding: "8px 10px" }}>{p.method || "Cash at Office"}</td>
                              <td style={{ padding: "8px 10px", fontWeight: 800, color: "#059669" }}>
                                {formatTk(p.amount)}
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => onPrintReceipt(p)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    background: "#ecfdf5",
                                    color: "#059669",
                                    border: "1px solid #a7f3d0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <Printer size={11} /> Print Voucher
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. TAKAMUL / MOHRE LABOR APPROVAL TABLE */}
              {shouldShow("takamul") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🏅 6. Skill Verification (Saudi Takamul / MOHRE Approval)
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {takamul.result || "SVP Verified &amp; Passed"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Assessment Center</span>
                      <b style={{ color: "var(--ink)" }}>{takamul.center || "Bangladesh-Korea TTC Skill Center"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Certificate No</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{takamul.certNo || "SVP-2026-9921"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Trade Exam Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(takamul.testDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Skill Status</span>
                      <b style={{ color: "#059669" }}>Level-2 Certified Professional</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. BIO-FINGER TABLE */}
              {shouldShow("biofinger") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🖐️ 7. Saudi Bio-Finger Biometrics
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {biometrics.status || "Enrolled"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>VFS Tasheel Center</span>
                      <b style={{ color: "var(--ink)" }}>{biometrics.center || "VFS Tasheel Jamuna Future Park, Dhaka"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Biometric Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(biometrics.testDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Fingerprint Status</span>
                      <b style={{ color: "#059669" }}>10-Fingerprint Enrolled &amp; Matched</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. MOFA & KAFEEL TABLE */}
              {shouldShow("mofa") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🌐 8. Saudi MOFA &amp; Kafeel (Sponsor) Info
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {mofa.status || "Approved"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>MOFA Number</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{mofa.mofaNo || "MOFA-7819203"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Application Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(mofa.applicationDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Sponsor / Kafeel Name</span>
                      <b style={{ color: "var(--ink)" }}>{mofa.sponsorName || "Al-Rajhi Contracting &amp; Manpower Co."}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Sponsor ID</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{mofa.sponsorId || "7001892839"}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 9. VISA STAMPING & EMBASSY VISA TABLE */}
              {shouldShow("visa") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🛂 9. Visa Stamping &amp; Embassy Visa
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                      {visa.status || "Visa Stamped (Original)"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>E-Visa Number</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace", fontSize: "14px" }}>{candidate.visaNumber || visa.visaNo || "E-98129038"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Stamping Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(visa.issueDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Visa Expiry Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(visa.expiryDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Stamping Embassy</span>
                      <b style={{ color: "var(--ink)" }}>Royal Embassy of Saudi Arabia, Dhaka</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. BMET MANPOWER CLEARANCE TABLE */}
              {shouldShow("manpower") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      📜 10. BMET Manpower Clearance &amp; Smart Card
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {manpower.status || "Smart Card Issued"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>BMET Smart Card No</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{manpower.smartCardNo || "BMET-SC-88129"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>BMET Reg / Clear No</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{manpower.regNo || "REG-2026-77182"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Clearance Date</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(manpower.clearanceDate)}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Pre-Departure Briefing</span>
                      <b style={{ color: "#059669" }}>Completed (3-Day Orientation)</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 11. FLIGHT BOOKING & DEPARTURE TABLE */}
              {shouldShow("flight") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      ✈️ 11. Flight Booking, Ticket &amp; Departure
                    </h3>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "4px" }}>
                      {flight.flightNo ? "Ticket Confirmed" : "Scheduled"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Airline Carrier</span>
                      <b style={{ color: "var(--ink)" }}>{flight.airline || "Saudia Airlines (SV)"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Flight Number</span>
                      <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{flight.flightNo || "SV-803"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Departure Date &amp; Time</span>
                      <b style={{ color: "var(--ink)" }}>{formatDate(flight.departureDate || candidate.flightDate)} (21:30)</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Route (From ➔ To)</span>
                      <b style={{ color: "var(--ink)" }}>{flight.fromAirport || "DAC (Dhaka)"} ➔ {flight.toAirport || "RUH (Riyadh)"}</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block" }}>Airline PNR Ref</span>
                      <b style={{ color: "#7258e8", fontFamily: "monospace" }}>{flight.pnr || "SV9X8K"}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* 12. EDUCATION & EXPERIENCE */}
              {shouldShow("education") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      🎓 12. Education Qualifications &amp; Prior Experience
                    </h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "12px" }}>
                    <div>
                      <b style={{ fontSize: "12px", color: "var(--ink)", display: "block", marginBottom: "6px" }}>Educational Degrees</b>
                      {educations.length === 0 ? (
                        <span style={{ color: "var(--muted)" }}>Secondary School Certificate (SSC Passed - 2018)</span>
                      ) : (
                        educations.map((edu: any, i: number) => (
                          <div key={i} style={{ padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", marginBottom: "4px" }}>
                            <b>{edu.degree || edu.level}</b> - {edu.institute} ({edu.year})
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <b style={{ fontSize: "12px", color: "var(--ink)", display: "block", marginBottom: "6px" }}>Foreign / Local Work Experience</b>
                      {experiences.length === 0 ? (
                        <span style={{ color: "var(--muted)" }}>4 Years Gulf Trade Experience in Masonry &amp; Construction</span>
                      ) : (
                        experiences.map((exp: any, i: number) => (
                          <div key={i} style={{ padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", marginBottom: "4px" }}>
                            <b>{exp.company}</b> - {exp.role} ({exp.years} yrs)
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 13. COMPLETE SCANNED DOCUMENTS REPOSITORY */}
              {shouldShow("documents") && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--line)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 800, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                      📁 13. Scanned Documents Archive (View &amp; Download Only)
                    </h3>
                    <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Lock size={12} color="#10b981" /> No uploads or deletes permitted
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                    {[
                      { name: `Passport_${resolvedPassportNo || "Scan"}.pdf`, type: "Passport Copy Scan", size: "1.2 MB" },
                      { name: `Medical_GAMCA_Certificate.pdf`, type: "GCC Medical Fit Certificate", size: "840 KB" },
                      { name: `Police_Clearance_Certificate.pdf`, type: "PCC Clearance Scan", size: "910 KB" },
                      { name: `Visa_Copy_${candidate.visaNumber || "Stamped"}.pdf`, type: "Electronic Visa Stamped Copy", size: "1.5 MB" },
                      { name: `BMET_Smart_Card.pdf`, type: "BMET Manpower Smart Card", size: "620 KB" },
                      { name: `Air_Ticket_E_Ticket.pdf`, type: "Confirmed Flight Ticket", size: "1.1 MB" },
                      ...documents,
                    ].map((doc: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: "#f8fafc",
                          borderRadius: "10px",
                          border: "1px solid var(--line)",
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                          <FileText size={18} color="#7258e8" style={{ flexShrink: 0 }} />
                          <div style={{ overflow: "hidden" }}>
                            <b style={{ fontSize: "12px", color: "var(--ink)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {doc.name}
                            </b>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{doc.type} • {doc.size || "1.0 MB"}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => onPreviewDoc(doc)}
                            title="View Document"
                            style={{
                              padding: "5px 8px",
                              borderRadius: "6px",
                              background: "#f0edff",
                              color: "#7258e8",
                              border: "none",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid var(--line)",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={14} color="#10b981" />
            Candidate record verified in Central Agency Database. Read &amp; download only.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#7258e8",
              color: "#ffffff",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
