"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Lock,
  Phone,
  Plane,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DashboardIcon } from "@/components/layout/dashboard-icon";
import { MoneyReceiptModal, type ReceiptData, type ReceiptItem, cleanPaymentType } from "@/components/modals/money-receipt-modal";
import { getCountryFlagEmoji } from "@/lib/country-pipeline";

type CandidateItem = {
  candidateId: string;
  fileId: string;
  candidateNo: string;
  fileNo: string;
  fullName: string;
  passportNumber: string;
  passportNo?: string;
  phone: string;
  country: string;
  profession: string;
  currentStage: string;
  isCompleted: boolean;
  packageCost: number;
  totalPackage?: number;
  grossPackage?: number;
  discount?: number;
  packageTitle?: string | null;
  company?: string;
  agent?: string;
  totalPaid: number;
  dueAmount: number;
  passportExpiryDate?: string | null;
  medicalExpiryDate?: string | null;
  visaExpiryDate?: string | null;
  hasMissingDocs?: boolean;
  missingDocsCount?: number;
  missingDocs?: Array<{
    category: string;
    name: string;
    reason: string;
  }>;
  payments?: PaymentItem[];
  paymentHistory?: PaymentItem[];
};

type PaymentItem = {
  id?: string;
  paymentNo?: string;
  amount: number;
  type?: string;
  method?: string;
  reference?: string;
  createdAt?: string;
  collectedAt?: string;
  notes?: string;
};

type InterviewItem = {
  id: string;
  company?: string;
  profession?: string;
  interviewDate?: string;
  interviewTime?: string;
  venue?: string;
  result?: string;
  status?: string;
  candidateName?: string;
  candidateId?: string;
  fileId?: string;
  phone?: string;
};

type DocumentItem = {
  id: string;
  title: string;
  name?: string;
  type: string;
  url?: string;
  createdAt?: string;
};

type AgentProfileData = {
  id: string;
  name: string;
  code?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  agreementKey?: string;
  totalCandidateCount: number;
  completedCandidateCount: number;
  incompleteCandidateCount: number;
  grandTotalCollected: number;
  grandTotalDue: number;
  candidates: CandidateItem[];
  interviews?: InterviewItem[];
  documents?: DocumentItem[];
  metrics?: {
    activeDossiers?: number;
    completedFlights?: number;
    totalMissingDocsCount?: number;
    missingPassports?: number;
    missingMedicals?: number;
    missingPolices?: number;
    missingNids?: number;
    missingVisas?: number;
    totalDue?: number;
  };
};

export type PortalTab = "dashboard" | "candidates" | "missing" | "expiry" | "ledger" | "interviews" | "docs";

export function AgentPortalView({
  agentId,
  initialTab,
  initialCountry,
}: {
  agentId: string;
  initialTab?: PortalTab;
  initialCountry?: string;
}) {
  const [activeTab, setActiveTab] = useState<PortalTab>(() => {
    if (initialTab && ["dashboard", "candidates", "missing", "expiry", "ledger", "interviews", "docs"].includes(initialTab)) {
      return initialTab;
    }
    if (initialCountry && initialCountry !== "All") {
      return "candidates";
    }
    return "dashboard";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState(initialCountry || "All");
  const [stageFilter, setStageFilter] = useState("All");
  const [missingCategoryFilter, setMissingCategoryFilter] = useState<string>("ALL");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>("ALL");
  const [expiryDocTypeFilter, setExpiryDocTypeFilter] = useState<string>("ALL");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<string>("ALL");

  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; fileData?: string | null } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [activeReceiptsList, setActiveReceiptsList] = useState<ReceiptData[]>([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState<number>(0);

  // Synchronize Tab and Country with URL query params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncWithUrl = () => {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab") as PortalTab | null;
      const c = sp.get("country");
      if (t && ["dashboard", "candidates", "missing", "expiry", "ledger", "interviews", "docs"].includes(t)) {
        setActiveTab(t);
      } else if (c && c.toLowerCase() !== "all") {
        setActiveTab("candidates");
      } else {
        setActiveTab("dashboard");
      }
      if (c && c.toLowerCase() !== "all") {
        setCountryFilter(c);
      } else {
        setCountryFilter("All");
      }
    };
    syncWithUrl();
    window.addEventListener("popstate", syncWithUrl);
    return () => window.removeEventListener("popstate", syncWithUrl);
  }, []);

  const selectTab = (tab: PortalTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (tab === "dashboard") {
        sp.delete("tab");
        sp.delete("country");
        setCountryFilter("All");
      } else {
        sp.set("tab", tab);
        if (tab !== "candidates") {
          sp.delete("country");
          setCountryFilter("All");
        }
      }
      const newUrl = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.pushState(null, "", newUrl);
      window.dispatchEvent(new Event("popstate"));
    }
  };

  const selectCountry = (country: string) => {
    setCountryFilter(country);
    setSearchQuery("");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (country === "All") {
        sp.delete("country");
        sp.set("tab", "candidates");
        setActiveTab("candidates");
      } else {
        sp.set("country", country);
        sp.delete("tab");
        setActiveTab("candidates");
      }
      const newUrl = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.pushState(null, "", newUrl);
      window.dispatchEvent(new Event("popstate"));
    }
  };

  const { data: agentData, isLoading, isError, refetch, isRefetching } = useQuery({
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
  const formatDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString("en-GB") : "—");

  const openPrintReceipt = (cand?: CandidateItem, targetPayment?: PaymentItem, isMasterOnly = false) => {
    if (!cand) return;
    const rawPayments = cand.payments || cand.paymentHistory || [];
    const paymentsToProcess = rawPayments.length > 0 ? rawPayments : targetPayment ? [targetPayment] : [];
    if (paymentsToProcess.length === 0) return;

    // Chronologically sort payments (oldest first) so running previouslyPaid is accurate
    const sorted = [...paymentsToProcess].sort((a, b) => {
      const ta = new Date(a.collectedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.collectedAt || b.createdAt || 0).getTime();
      return ta - tb;
    });

    const candidatePackage = cand.packageCost || cand.totalPackage || 0;
    const agentDisplay = agentData?.name
      ? `${agentData.name}${agentData.code ? ` (${agentData.code})` : ""}`
      : "Al-Ameen Travels & Tours (AGT-001)";

    let runningPaid = 0;
    const allReceipts: ReceiptData[] = sorted.map((p, idx) => {
      const previouslyPaid = runningPaid;
      runningPaid += Number(p.amount);
      const cleanType = cleanPaymentType(p.type);

      return {
        receiptNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : (idx + 1).toString().padStart(6, "0")}`,
        date: new Date(p.collectedAt || p.createdAt || Date.now()).toLocaleDateString("en-GB"),
        candidateName: cand.fullName,
        candidateNo: cand.candidateNo,
        fileNo: cand.fileNo,
        passportNo: cand.passportNumber,
        phone: cand.phone,
        country: cand.country,
        profession: cand.profession,
        agent: agentDisplay,
        company: cand.company || "Awaiting Sponsor",
        paymentType: cleanType,
        paymentMethod: p.method || "Cash at Office",
        referenceNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : "OFFICE"}`,
        amount: Number(p.amount),
        totalPackage: candidatePackage,
        grossPackage: cand.grossPackage,
        discount: cand.discount,
        previouslyPaid,
        totalPaid: runningPaid,
        officerName: "Central Accounts",
        notes: p.notes || (p.type === "MAD" ? "BMET Manpower & Final Processing Fee Settlement" : undefined),
      };
    });

    // Master Consolidated Receipt
    const masterItems: ReceiptItem[] = sorted.map((p, idx) => ({
      sl: idx + 1,
      date: new Date(p.collectedAt || p.createdAt || Date.now()).toLocaleDateString("en-GB"),
      type: cleanPaymentType(p.type),
      method: p.method || "Cash at Office",
      reference: p.reference || (p.paymentNo ? `REC-${p.paymentNo.slice(-6)}` : `REC-${idx + 1}`),
      amount: Number(p.amount),
      notes: p.notes || (p.type === "MAD" ? "BMET Manpower & Final Processing Fee Settlement" : undefined),
    }));

    const totalCollected = cand.totalPaid !== undefined ? cand.totalPaid : runningPaid;
    const masterReceipt: ReceiptData = {
      isMasterReceipt: true,
      receiptNo: `MR-${cand.fileNo.replace("FILE-", "")}`,
      date: new Date().toLocaleDateString("en-GB"),
      candidateName: cand.fullName,
      candidateNo: cand.candidateNo,
      fileNo: cand.fileNo,
      passportNo: cand.passportNumber,
      phone: cand.phone,
      country: cand.country,
      profession: cand.profession,
      agent: agentDisplay,
      company: cand.company || "Awaiting Sponsor",
      paymentType: "Master Statement (All Payments)",
      paymentMethod: "Office Accounts",
      referenceNo: `STMT-${cand.fileNo}`,
      amount: totalCollected,
      totalPaid: totalCollected,
      totalPackage: candidatePackage,
      grossPackage: cand.grossPackage,
      discount: cand.discount,
      officerName: "Central Accounts",
      items: masterItems,
    };

    const combinedList = [masterReceipt, ...allReceipts];

    let targetIdx = 0; // Default to Master Receipt
    if (isMasterOnly) {
      targetIdx = 0;
    } else if (targetPayment) {
      const found = allReceipts.findIndex(
        (r) => r.receiptNo === targetPayment.reference || r.amount === targetPayment.amount
      );
      if (found !== -1) targetIdx = found + 1;
    }

    setActiveReceiptsList(combinedList);
    setActiveReceiptIndex(targetIdx);
    setActiveReceipt(combinedList[targetIdx] || null);
  };

  // Expiry Tracking Engine: Evaluates Passport, Medical GAMCA, Police PCC, and Visa expiration
  const expiryItems = useMemo(() => {
    if (!agentData?.candidates) return [];
    const items: Array<{
      id: string;
      candidate: CandidateItem;
      docType: "Passport" | "GAMCA Medical" | "Police Clearance (PCC)" | "Stamped Visa";
      docRef: string;
      expiryDate: Date;
      daysLeft: number;
      urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE";
      actionRequired: string;
    }> = [];

    (agentData.candidates || []).forEach((cand) => {
      if (cand.passportNumber && cand.passportNumber !== "N/A" && cand.passportExpiryDate) {
        const exp = new Date(cand.passportExpiryDate);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "Passport validity is healthy (> 9 months) & flight ready.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "Passport expired! Candidate must apply for emergency passport re-issue.";
        } else if (days <= 180) {
          urgency = "CRITICAL";
          action = "Under 6 Months! Visa stamping & BMET clearance blocked. Candidate must renew urgently.";
        } else if (days <= 270) {
          urgency = "WARNING";
          action = "Approaching 6-month threshold. Advise candidate to renew soon.";
        }

        items.push({
          id: `pass-${cand.candidateId}`,
          candidate: cand,
          docType: "Passport",
          docRef: cand.passportNumber,
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }

      if (cand.medicalExpiryDate) {
        const exp = new Date(cand.medicalExpiryDate);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "GAMCA medical fitness certificate is valid.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "Medical validity expired! Candidate must re-take GCC medical checkup.";
        } else if (days <= 15) {
          urgency = "CRITICAL";
          action = "Medical expiring in < 15 days! Expedite visa stamping immediately.";
        } else if (days <= 30) {
          urgency = "WARNING";
          action = "Medical validity under 30 days. Priority processing recommended.";
        }

        items.push({
          id: `med-${cand.candidateId}`,
          candidate: cand,
          docType: "GAMCA Medical",
          docRef: `FIT-${cand.fileNo}`,
          expiryDate: exp,
          daysLeft: days,
          urgency,
          actionRequired: action,
        });
      }

      if (cand.visaExpiryDate) {
        const exp = new Date(cand.visaExpiryDate);
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let urgency: "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" = "SAFE";
        let action = "Visa validity active for flight deployment.";
        if (days < 0) {
          urgency = "EXPIRED";
          action = "Entry permit / Visa expired! Extension or re-validation required.";
        } else if (days <= 15) {
          urgency = "CRITICAL";
          action = "Visa expiring in < 15 days! Book flight departure immediately.";
        } else if (days <= 30) {
          urgency = "WARNING";
          action = "Visa expiring soon. Complete BMET clearance and ticketing.";
        }

        items.push({
          id: `visa-${cand.candidateId}`,
          candidate: cand,
          docType: "Stamped Visa",
          docRef: `VISA-${cand.fileNo}`,
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

  // Countries with actual candidates
  const availableCountries = useMemo(() => {
    return Array.from(new Set((agentData?.candidates || []).map((c) => c.country).filter(Boolean)));
  }, [agentData?.candidates]);

  // Destination pipelines breakdown for Dashboard
  const countriesWithStats = useMemo(() => {
    const map = new Map<string, { count: number; inProcess: number; visa: number; flight: number }>();
    (agentData?.candidates || []).forEach((c) => {
      const country = c.country || "Other";
      const current = map.get(country) || { count: 0, inProcess: 0, visa: 0, flight: 0 };
      current.count += 1;
      if (c.isCompleted || c.currentStage.includes("Flight")) {
        current.flight += 1;
      } else if (c.currentStage.toLowerCase().includes("visa")) {
        current.visa += 1;
      } else {
        current.inProcess += 1;
      }
      map.set(country, current);
    });
    return Array.from(map.entries()).map(([name, stats]) => ({
      name,
      flag: getCountryFlagEmoji(undefined, name),
      ...stats,
    }));
  }, [agentData?.candidates]);

  // Candidate funnel metrics (for Candidates page)
  const candidateFunnel = useMemo(() => {
    const candidates = agentData?.candidates || [];
    const total = candidates.length;
    const flight = candidates.filter((c) => c.isCompleted || c.currentStage.includes("Flight")).length;
    const visa = candidates.filter((c) => !c.isCompleted && c.currentStage.toLowerCase().includes("visa")).length;
    const inProcess = total - flight;
    return { total, inProcess, visa, flight };
  }, [agentData?.candidates]);

  // Country-specific metrics when viewing a specific country
  const selectedCountryStats = useMemo(() => {
    if (countryFilter === "All") return null;
    const cands = (agentData?.candidates || []).filter(
      (c) =>
        c.country.toLowerCase().includes(countryFilter.toLowerCase()) ||
        countryFilter.toLowerCase().includes(c.country.toLowerCase())
    );
    const total = cands.length;
    const flight = cands.filter((c) => c.isCompleted || c.currentStage.includes("Flight")).length;
    const visa = cands.filter((c) => !c.isCompleted && c.currentStage.toLowerCase().includes("visa")).length;
    const medical = cands.filter(
      (c) =>
        c.currentStage.toLowerCase().includes("medical") ||
        c.currentStage.toLowerCase().includes("offer") ||
        c.currentStage.toLowerCase().includes("trade")
    ).length;
    return { total, flight, visa, medical, candidates: cands };
  }, [agentData?.candidates, countryFilter]);

  // Financial totals
  const totalAgreedPackage = useMemo(() => {
    return (agentData?.candidates || []).reduce((sum, c) => sum + (c.packageCost || c.totalPackage || 0), 0);
  }, [agentData?.candidates]);

  const collectionRatio = useMemo(() => {
    if (!totalAgreedPackage) return 0;
    return Math.min(100, Math.round(((agentData?.grandTotalCollected || 0) / totalAgreedPackage) * 100));
  }, [agentData?.grandTotalCollected, totalAgreedPackage]);

  // Expiry status breakdowns
  const expiredCount = expiryItems.filter((i) => i.urgency === "EXPIRED").length;
  const criticalExpiryCount = expiryItems.filter((i) => i.urgency === "EXPIRED" || i.urgency === "CRITICAL").length;
  const warningExpiryCount = expiryItems.filter((i) => i.urgency === "WARNING").length;
  const safeExpiryCount = expiryItems.filter((i) => i.urgency === "SAFE").length;

  // Missing doc category breakdown
  const missingPassports =
    agentData?.metrics?.missingPassports ??
    candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "PASSPORT")).length;
  const missingMedicals =
    agentData?.metrics?.missingMedicals ??
    candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "MEDICAL")).length;
  const missingPolices =
    agentData?.metrics?.missingPolices ??
    candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "POLICE")).length;
  const missingNids =
    agentData?.metrics?.missingNids ??
    candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "NID")).length;
  const missingVisas =
    agentData?.metrics?.missingVisas ??
    candidatesWithMissingDocs.filter((c) => (c.missingDocs || []).some((d) => d.category === "VISA")).length;

  // Interview metrics
  const interviewStats = useMemo(() => {
    const ivs = agentData?.interviews || [];
    const total = ivs.length;
    const selected = ivs.filter((i) => /select|pass/i.test(i.result || i.status || "")).length;
    const scheduled = ivs.filter((i) => /schedul/i.test(i.result || i.status || "")).length;
    const review = ivs.filter((i) => /wait|review|pend/i.test(i.result || i.status || "")).length;
    return { total, selected, scheduled, review };
  }, [agentData?.interviews]);

  // Filter candidates (Tab 1 / Country Workspace)
  const filteredCandidates = useMemo(() => {
    return (agentData?.candidates || []).filter((cand) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQ =
        !q ||
        cand.fullName.toLowerCase().includes(q) ||
        cand.passportNumber.toLowerCase().includes(q) ||
        cand.phone.toLowerCase().includes(q) ||
        cand.fileNo.toLowerCase().includes(q) ||
        cand.country.toLowerCase().includes(q) ||
        cand.profession.toLowerCase().includes(q);

      const matchesCountry =
        countryFilter === "All" ||
        cand.country.toLowerCase().includes(countryFilter.toLowerCase()) ||
        countryFilter.toLowerCase().includes(cand.country.toLowerCase());

      const matchesStage = stageFilter === "All" || cand.currentStage.toLowerCase().includes(stageFilter.toLowerCase());

      return matchesQ && matchesCountry && matchesStage;
    });
  }, [agentData?.candidates, searchQuery, countryFilter, stageFilter]);

  // Filter missing docs (Tab 2)
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
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [candidatesWithMissingDocs, countryFilter, missingCategoryFilter, searchQuery]);

  // Filter expiry items (Tab 3)
  const filteredExpiryItems = useMemo(() => {
    return expiryItems.filter((item) => {
      if (expiryStatusFilter !== "ALL") {
        if (expiryStatusFilter === "CRITICAL" && item.urgency !== "EXPIRED" && item.urgency !== "CRITICAL") return false;
        if (expiryStatusFilter === "WARNING" && item.urgency !== "WARNING") return false;
        if (expiryStatusFilter === "SAFE" && item.urgency !== "SAFE") return false;
      }
      if (expiryDocTypeFilter !== "ALL" && item.docType !== expiryDocTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [expiryItems, expiryStatusFilter, expiryDocTypeFilter, searchQuery]);

  // Filter ledger candidates (Tab 4)
  const filteredLedgerCandidates = useMemo(() => {
    return (agentData?.candidates || []).filter((cand) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        cand.fullName.toLowerCase().includes(q) ||
        cand.passportNumber.toLowerCase().includes(q) ||
        cand.fileNo.toLowerCase().includes(q) ||
        cand.country.toLowerCase().includes(q)
      );
    });
  }, [agentData?.candidates, searchQuery]);

  // Filter interviews (Tab 5)
  const filteredInterviews = useMemo(() => {
    return (agentData?.interviews || []).filter((iv) => {
      if (interviewStatusFilter !== "ALL") {
        const res = (iv.result || iv.status || "").toLowerCase();
        if (!res.includes(interviewStatusFilter.toLowerCase())) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (iv.candidateName || "").toLowerCase().includes(q) ||
          (iv.company || "").toLowerCase().includes(q) ||
          (iv.profession || "").toLowerCase().includes(q) ||
          (iv.venue || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agentData?.interviews, interviewStatusFilter, searchQuery]);

  // Filter documents (Tab 6)
  const filteredDocs = useMemo(() => {
    return (agentData?.documents || []).filter((doc) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (doc.title || doc.name || "").toLowerCase().includes(q) ||
        (doc.type || "").toLowerCase().includes(q)
      );
    });
  }, [agentData?.documents, searchQuery]);

  if (isError) {
    return (
      <div className="agent-portal-design portal-state" role="alert">
        <div className="portal-state-icon"><AlertCircle size={24} /></div>
        <h2>Unable to load your portal</h2>
        <p>We could not fetch your partner records. Please try again.</p>
        <button className="portal-button portal-button-primary" onClick={() => refetch()}>Try again</button>
      </div>
    );
  }

  if (isLoading || !agentData) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", display: "grid", placeItems: "center" }}>
        <div className="portal-card" style={{ background: "#fff", padding: "40px 60px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <RefreshCw className="animate-spin" size={32} color="#007aff" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
            Loading Agent Portal...
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Fetching your referred candidates, visa statuses, and financial statement.
          </p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";

  const timestamp = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const displayName = agentData.contactPerson && agentData.contactPerson !== "N/A" ? agentData.contactPerson : agentData.name;

  // Reusable Executive Hero Header Renderer
  const renderHero = ({
    badge,
    title,
    subtitle,
    actions,
  }: {
    badge: string;
    title: React.ReactNode;
    subtitle: string;
    actions?: React.ReactNode;
  }) => (
    <div className="dashboard-exec-hero">
      <div className="dashboard-welcome">
        <div className="dashboard-live-status">
          <DashboardIcon name="LiveIndicator" />
          <span>{badge}</span>
          <small>· {agentData.name} ({agentData.code || "AGT-001"})</small>
        </div>
        <h1>{title}</h1>
        <p>{timestamp} · {subtitle}</p>
      </div>
      <div className="dashboard-exec-ctas">
        {actions}
        <button
          type="button"
          className="dashboard-action primary"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />{" "}
          {isRefetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );

  // Common Reusable Candidates Table Renderer
  const renderCandidatesTable = (list: CandidateItem[], totalCount: number, isPreview = false) => (
    <div className="desktop-dashboard-table dashboard-leads-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: "48px", minWidth: "48px", textAlign: "center" }}>SL</th>
            <th style={{ minWidth: "240px" }}>CANDIDATE DETAILS</th>
            <th style={{ minWidth: "130px" }}>PASSPORT</th>
            <th style={{ minWidth: "140px" }}>DESTINATION</th>
            <th style={{ minWidth: "160px" }}>TRADE / PROFESSION</th>
            <th style={{ minWidth: "160px" }}>PIPELINE STAGE</th>
            <th style={{ minWidth: "180px" }}>PAYMENTS &amp; BALANCE</th>
            <th style={{ minWidth: "150px", width: "150px", textAlign: "right" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
                  <Users size={32} color="#94a3b8" />
                  <b style={{ fontSize: "14px", color: "#0f172a" }}>No candidates found</b>
                  <span style={{ fontSize: "12px" }}>Try adjusting your search query or country filters.</span>
                </div>
              </td>
            </tr>
          ) : (
            list.map((cand, idx) => (
              <tr key={cand.fileId}>
                <td style={{ color: "#64748b", fontWeight: 700, textAlign: "center", width: "48px", minWidth: "48px" }}>
                  {idx + 1}
                </td>
                <td style={{ minWidth: "240px" }}>
                  <div className="dashboard-candidate-identity">
                    <Link
                      href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                      className="dashboard-candidate-avatar"
                      title="Open Candidate Master Dossier"
                    >
                      {cand.fullName.slice(0, 2).toUpperCase()}
                    </Link>
                    <div>
                      <Link
                        href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <b>{cand.fullName}</b>
                      </Link>
                      <small>
                        <span>{cand.fileNo}</span> • <Phone size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {cand.phone}
                      </small>
                    </div>
                  </div>
                </td>
                <td style={{ minWidth: "130px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 600,
                      background: "#f8fafc",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      color: "#334155",
                      fontSize: "12px",
                    }}
                  >
                    {cand.passportNumber || "N/A"}
                  </span>
                </td>
                <td style={{ minWidth: "140px" }}>
                  <div style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{getCountryFlagEmoji(undefined, cand.country)}</span>
                    <span>{cand.country || "Saudi Arabia"}</span>
                  </div>
                </td>
                <td style={{ minWidth: "160px" }}>
                  <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 500 }}>
                    {cand.profession || "General Work"}
                  </span>
                </td>
                <td style={{ minWidth: "160px" }}>
                  <span
                    className={`badge ${
                      cand.currentStage.includes("Flight") || cand.isCompleted
                        ? "on-track"
                        : cand.hasMissingDocs
                        ? "attention"
                        : "on-track"
                    }`}
                  >
                    ● {cand.currentStage.includes("Flight") ? "Flight Ready" : cand.currentStage}
                  </span>
                  {cand.hasMissingDocs && (cand.missingDocsCount || 0) > 0 ? (
                    <div style={{ marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => selectTab("missing")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "6px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fecdd3",
                          cursor: "pointer",
                        }}
                        title={`Action Required: ${(cand.missingDocs || []).map((d) => d.name).join(", ")}`}
                      >
                        <AlertCircle size={10} /> {cand.missingDocsCount || cand.missingDocs?.length || 1} Missing File(s)
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: "4px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "6px",
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <CheckCircle2 size={10} /> All Docs Ready
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ minWidth: "200px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                        Paid: {formatTk(cand.totalPaid)}
                      </span>
                      {cand.dueAmount === 0 ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#059669",
                            background: "#ecfdf5",
                            border: "1px solid #bbf7d0",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          ✓ Paid in Full
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#dc2626",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Due: {formatTk(cand.dueAmount)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                      <span>Package: {formatTk(cand.packageCost || cand.totalPackage || 0)}</span>
                      {Number(cand.discount || 0) > 0 && (
                        <span style={{ color: "#059669", fontWeight: 700, fontSize: "10.5px" }}>
                          (Disc: -৳{Number(cand.discount).toLocaleString()})
                        </span>
                      )}
                    </div>
                    {Boolean(cand.packageCost || cand.totalPackage) && (
                      <div
                        style={{
                          width: "130px",
                          height: "4px",
                          background: "#e2e8f0",
                          borderRadius: "4px",
                          overflow: "hidden",
                          marginTop: "3px",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.round(((cand.totalPaid || 0) / (cand.packageCost || cand.totalPackage || 1)) * 100))}%`,
                            height: "100%",
                            background: cand.dueAmount === 0 ? "#16a34a" : "linear-gradient(90deg, #10b981, #059669)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ minWidth: "150px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                    <Link
                      href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                      className="dashboard-profile-link primary"
                      title="Open Complete Master Dossier"
                    >
                      <FileText size={12} style={{ marginRight: "4px" }} /> Dossier →
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="dashboard-table-summary">
        {isPreview
          ? `Showing recent ${list.length} candidate referrals · Total registered: ${totalCount}`
          : `Showing ${list.length} of ${totalCount} candidate referrals`}
      </div>
    </div>
  );

  return (
    <div className="recruitment-dashboard agent-portal-dashboard agent-portal-design">
      {/* =========================================================================
          VIEW A: COUNTRY WORKSPACE (When a destination like Dubai/Oman is selected)
          ========================================================================= */}
      {countryFilter !== "All" ? (
        <>
          {renderHero({
            badge: `DESTINATION PIPELINE · ${countryFilter.toUpperCase()} WORKSPACE`,
            title: `${getCountryFlagEmoji(undefined, countryFilter)} ${countryFilter} Candidate Pipeline`,
            subtitle: `Active recruitment workflow, visa approvals, and departure readiness for ${countryFilter}`,
            actions: (
              <>
                <button type="button" className="dashboard-action" onClick={() => selectCountry("All")}>
                  ← All Destinations
                </button>
                <button type="button" className="dashboard-action" onClick={() => window.print()}>
                  <Printer size={14} /> Print {countryFilter} Roster
                </button>
              </>
            ),
          })}

          {/* Country-Specific 4 KPI Cards */}
          <section className="dashboard-kpi-grid" aria-label={`${countryFilter} metrics overview`}>
            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("All")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>{countryFilter} Candidates</span>
                <DashboardIcon name="Users1" />
              </div>
              <b>{selectedCountryStats?.total || filteredCandidates.length}</b>
              <p>↗ Active referrals for {countryFilter}</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Visa")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Visas In-Flight</span>
                <DashboardIcon name="FileCheck1" />
              </div>
              <b>{selectedCountryStats?.visa || 0}</b>
              <p>Stamping &amp; E-Visa approval stage</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Medical")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Medical &amp; Trade</span>
                <FileCheck size={16} color="#007aff" />
              </div>
              <b>{selectedCountryStats?.medical || 0}</b>
              <p>GAMCA test &amp; offer issuance</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Flight")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Departure Ready</span>
                <DashboardIcon name="Plane" />
              </div>
              <b>{selectedCountryStats?.flight || 0}</b>
              <p>✈ Flight tickets confirmed</p>
            </div>
          </section>

          {/* Country Candidates Table */}
          <section className="dashboard-activity-section" aria-label={`${countryFilter} Candidate Roster`}>
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="Users1" />
                  <span>{countryFilter} Candidates Roster</span>
                  <span className="dashboard-count-badge">
                    {filteredCandidates.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${countryFilter} candidates, passport, phone...`}
                  />
                </label>

                <select
                  aria-label="Filter by pipeline stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="All">All Stages</option>
                  <option value="Medical">Medical Fit</option>
                  <option value="Visa">Visa Stamped</option>
                  <option value="Manpower">BMET / Manpower</option>
                  <option value="Flight">Flight Done / Ready</option>
                </select>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              {renderCandidatesTable(filteredCandidates, selectedCountryStats?.total || filteredCandidates.length)}
            </div>
          </section>
        </>
      ) : activeTab === "dashboard" ? (
        /* =========================================================================
            VIEW 1: DASHBOARD COMMAND CENTER (Executive Overview, 4 KPIs, Hubs)
            ========================================================================= */
        <>
          {renderHero({
            badge: "LIVE RECRUITMENT CONTROL",
            title: `${greeting}, ${displayName}!`,
            subtitle: "Partner Portal — Real-time Candidate Pipeline, Processing & Financial Control",
            actions: (
              <>
                <button type="button" className="dashboard-action" onClick={() => selectTab("ledger")}>
                  <DashboardIcon name="CreditCard" /> Collections
                </button>
                <button type="button" className="dashboard-action" onClick={() => selectTab("docs")}>
                  <DashboardIcon name="FileCheck" /> Documents
                </button>
                <button type="button" className="dashboard-action" onClick={() => window.print()}>
                  <Printer size={14} /> Print Statement
                </button>
              </>
            ),
          })}

          {/* Top 4 Executive KPI Metric Cards */}
          <section className="dashboard-kpi-grid" aria-label="Partner overview">
            <div
              className="dashboard-kpi-card"
              onClick={() => {
                selectTab("candidates");
                setStageFilter("All");
                selectCountry("All");
              }}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Total Candidates</span>
                <DashboardIcon name="Users1" />
              </div>
              <b>{agentData.totalCandidateCount}</b>
              <p>↗ {agentData.incompleteCandidateCount} In-Process ({agentData.totalCandidateCount} Referred)</p>
            </div>

            <div
              className="dashboard-kpi-card collections"
              onClick={() => selectTab("ledger")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Cash Collections</span>
                <DashboardIcon name="Wallet1" />
              </div>
              <b>{formatTk(agentData.grandTotalCollected)}</b>
              <div className="dashboard-collection-breakdown">
                <span className="due">Due: {formatTk(agentData.grandTotalDue ?? agentData.metrics?.totalDue ?? 0)}</span>
              </div>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => {
                selectTab("candidates");
                setStageFilter("Visa");
              }}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Visas In-Flight</span>
                <DashboardIcon name="FileCheck1" />
              </div>
              <b>{agentData.metrics?.activeDossiers ?? agentData.incompleteCandidateCount}</b>
              <p>🇸🇦 Saudi MOFA + 🇦🇪 Dubai E-Visa</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => {
                selectTab("candidates");
                setStageFilter("Flight");
              }}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Departure Ready</span>
                <DashboardIcon name="Plane" />
              </div>
              <b>{agentData.metrics?.completedFlights ?? agentData.completedCandidateCount}</b>
              <p>✈ Tickets Confirmed · Manpower Issued</p>
            </div>
          </section>

          {/* Active Destination Workspaces (Clickable Country Pipelines) */}
          {countriesWithStats.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", lineHeight: "21px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Active Destination Pipelines
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Country distribution for referred candidate processing
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab("candidates")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#007aff",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  View All Candidates <ArrowRight size={13} />
                </button>
              </div>

              <div className="portal-destinations-grid">
                {countriesWithStats.map((item) => (
                  <div
                    key={item.name}
                    className="portal-destination-card"
                    onClick={() => selectCountry(item.name)}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "24px" }}>{item.flag}</span>
                        <div>
                          <b style={{ fontSize: "15px", color: "#0f172a", display: "block" }}>{item.name}</b>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Destination Pipeline</span>
                        </div>
                      </div>
                      <span className="dashboard-count-badge" style={{ fontSize: "12px", padding: "3px 10px" }}>
                        {item.count} {item.count === 1 ? "File" : "Files"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", fontSize: "12px" }}>
                      <div>
                        <span style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>In-Process</span>
                        <b style={{ color: "#334155" }}>{item.inProcess} Candidates</b>
                      </div>
                      <div>
                        <span style={{ color: "#94a3b8", display: "block", fontSize: "11px" }}>Visa &amp; Flight</span>
                        <b style={{ color: "#16a34a" }}>{item.visa + item.flight} Ready</b>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#007aff", fontSize: "12px", fontWeight: 700 }}>
                      Open {item.name} Pipeline →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Candidate Pipeline Preview Table */}
          <section className="dashboard-activity-section" aria-label="Recent Candidate Activity">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="Users1" />
                  <span>Recent Candidate Referrals</span>
                  <span className="dashboard-count-badge">
                    {filteredCandidates.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate, passport, phone..."
                  />
                </label>

                <button
                  type="button"
                  className="portal-toolbar-btn"
                  onClick={() => selectTab("candidates")}
                  style={{ background: "#eff6ff", color: "#007aff", borderColor: "#bfdbfe", fontWeight: 700 }}
                >
                  View Full Candidate Roster →
                </button>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              {renderCandidatesTable(filteredCandidates.slice(0, 8), agentData.totalCandidateCount, true)}
            </div>
          </section>

          {/* Operations & Compliance Hub */}
          <div className="portal-quick-hub">
            <div
              className="portal-quick-card"
              onClick={() => selectTab("missing")}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <FileWarning size={20} />
                </div>
                <div>
                  <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>Missing Documents</b>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                    {candidatesWithMissingDocs.length} candidates pending mandatory verification uploads.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626" }}>Audit Missing Files →</span>
            </div>

            <div
              className="portal-quick-card"
              onClick={() => selectTab("expiry")}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fffbeb", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Clock size={20} />
                </div>
                <div>
                  <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>Expiry Tracker</b>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                    {criticalExpiryCount} critical documents approaching expiration deadline.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#d97706" }}>Review Expiries →</span>
            </div>

            <div
              className="portal-quick-card"
              onClick={() => selectTab("docs")}
              role="button"
              tabIndex={0}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#eff6ff", color: "#007aff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <FileCheck size={20} />
                </div>
                <div>
                  <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>Agency Repository</b>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                    Access official agency agreement, license credentials, and permits.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#007aff" }}>Open Documents Vault →</span>
            </div>
          </div>
        </>
      ) : activeTab === "candidates" ? (
        /* =========================================================================
            VIEW 2: CANDIDATES MASTER ROSTER
            ========================================================================= */
        <>
          {renderHero({
            badge: "CANDIDATE RECRUITMENT DIRECTORY",
            title: "Candidates & Recruitment Pipeline",
            subtitle: "Comprehensive directory of all referred candidates across all destinations and processing milestones",
            actions: (
              <button type="button" className="dashboard-action" onClick={() => window.print()}>
                <Printer size={14} /> Print Roster
              </button>
            ),
          })}

          {/* Candidate Pipeline Funnel KPI Cards */}
          <section className="dashboard-kpi-grid" aria-label="Candidate pipeline funnel">
            <div
              className="dashboard-kpi-card"
              onClick={() => {
                setStageFilter("All");
                selectCountry("All");
              }}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Total Candidates</span>
                <Users size={16} color="#007aff" />
              </div>
              <b>{candidateFunnel.total}</b>
              <p>All registered candidate files</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Medical")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Active In-Process</span>
                <Briefcase size={16} color="#3b82f6" />
              </div>
              <b>{candidateFunnel.inProcess}</b>
              <p>Under trade, medical &amp; verification</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Visa")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Visa Stamped</span>
                <FileCheck size={16} color="#8b5cf6" />
              </div>
              <b>{candidateFunnel.visa}</b>
              <p>Visas approved &amp; in-flight</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setStageFilter("Flight")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Flight Ready</span>
                <Plane size={16} color="#16a34a" />
              </div>
              <b>{candidateFunnel.flight}</b>
              <p>✈ BMET cleared &amp; departure ready</p>
            </div>
          </section>

          {/* Candidates Activity Workspace */}
          <section className="dashboard-activity-section" aria-label="Candidates directory workspace">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="Users1" />
                  <span>Candidates &amp; Pipeline Roster</span>
                  <span className="dashboard-count-badge">
                    {filteredCandidates.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate, passport, phone..."
                  />
                </label>

                <select
                  aria-label="Filter by destination country"
                  value={countryFilter}
                  onChange={(e) => selectCountry(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="All">All Countries</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by pipeline stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="All">All Stages</option>
                  <option value="Medical">Medical Fit</option>
                  <option value="Visa">Visa Stamped</option>
                  <option value="Manpower">BMET / Manpower</option>
                  <option value="Flight">Flight Done / Ready</option>
                </select>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              {renderCandidatesTable(filteredCandidates, agentData.totalCandidateCount)}
            </div>
          </section>
        </>
      ) : activeTab === "ledger" ? (
        /* =========================================================================
            VIEW 3: PAYMENT COLLECTION & FINANCIAL LEDGER
            ========================================================================= */
        <>
          {renderHero({
            badge: "FINANCIAL CONTROL & VAULT",
            title: "Payment Collection & Accounts Ledger",
            subtitle: "Transparent record of candidate package costs, collected payments, deposit receipts, and balance dues",
            actions: (
              <button type="button" className="dashboard-action" onClick={() => window.print()}>
                <Printer size={14} /> Print Statement
              </button>
            ),
          })}

          {/* 4 Financial KPI Cards */}
          <section className="dashboard-kpi-grid" aria-label="Financial overview">
            <div className="dashboard-kpi-card">
              <div className="dashboard-metric-heading">
                <span>Total Package Value</span>
                <Wallet size={16} color="#007aff" />
              </div>
              <b>{formatTk(totalAgreedPackage)}</b>
              <p>Agreed processing packages</p>
            </div>

            <div className="dashboard-kpi-card collections">
              <div className="dashboard-metric-heading">
                <span>Cash Collected</span>
                <CreditCard size={16} color="#16a34a" />
              </div>
              <b style={{ color: "#16a34a" }}>{formatTk(agentData.grandTotalCollected)}</b>
              <p style={{ color: "#16a34a", fontWeight: 600 }}>Deposited into central vault</p>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-metric-heading">
                <span>Remaining Due Balance</span>
                <AlertCircle size={16} color="#dc2626" />
              </div>
              <b style={{ color: agentData.grandTotalDue > 0 ? "#dc2626" : "#16a34a" }}>
                {formatTk(agentData.grandTotalDue)}
              </b>
              <p>Outstanding candidate collections</p>
            </div>

            <div className="dashboard-kpi-card">
              <div className="dashboard-metric-heading">
                <span>Overall Collection Rate</span>
                <CheckCircle2 size={16} color="#059669" />
              </div>
              <b>{collectionRatio}%</b>
              <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginTop: "2px" }}>
                <div style={{ width: `${collectionRatio}%`, height: "100%", background: "#16a34a" }} />
              </div>
            </div>
          </section>

          {/* Financial Ledger Table */}
          <section className="dashboard-activity-section" aria-label="Financial accounts ledger">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="Wallet1" />
                  <span>Payment Collection &amp; Accounts Ledger</span>
                  <span className="dashboard-count-badge success">
                    {filteredLedgerCandidates.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ledger candidate, file no..."
                  />
                </label>

                <button
                  type="button"
                  className="portal-toolbar-btn"
                  onClick={() => window.print()}
                >
                  <Printer size={13} /> Print Statement
                </button>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              <div className="desktop-dashboard-table dashboard-leads-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "48px", minWidth: "48px", textAlign: "center" }}>SL</th>
                      <th style={{ minWidth: "240px" }}>CANDIDATE DETAILS</th>
                      <th style={{ minWidth: "170px" }}>PASSPORT &amp; DESTINATION</th>
                      <th style={{ minWidth: "130px" }}>PACKAGE COST</th>
                      <th style={{ minWidth: "130px" }}>PAID AMOUNT</th>
                      <th style={{ minWidth: "130px" }}>DUE BALANCE</th>
                      <th style={{ minWidth: "150px", textAlign: "right" }}>RECEIPTS / VOUCHER</th>
                      <th style={{ minWidth: "140px", width: "140px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgerCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                          No financial ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredLedgerCandidates.map((cand, idx) => (
                        <tr key={cand.fileId}>
                          <td style={{ color: "#64748b", fontWeight: 700, textAlign: "center", width: "48px", minWidth: "48px" }}>{idx + 1}</td>
                          <td style={{ minWidth: "240px" }}>
                            <div className="dashboard-candidate-identity">
                              <Link
                                href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                className="dashboard-candidate-avatar"
                              >
                                {cand.fullName.slice(0, 2).toUpperCase()}
                              </Link>
                              <div>
                                <Link
                                  href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                  style={{ textDecoration: "none", color: "inherit" }}
                                >
                                  <b>{cand.fullName}</b>
                                </Link>
                                <small>File: {cand.fileNo}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ minWidth: "170px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>
                              {cand.passportNumber || "No Passport"}
                            </div>
                            <small style={{ color: "#64748b" }}>
                              {getCountryFlagEmoji(undefined, cand.country)} {cand.country}
                            </small>
                          </td>
                          <td style={{ minWidth: "140px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <b style={{ color: "#0f172a" }}>{formatTk(cand.packageCost || cand.totalPackage || 0)}</b>
                              {Number(cand.discount || 0) > 0 && (
                                <span style={{ fontSize: "10.5px", color: "#059669", fontWeight: 700 }}>
                                  (Disc: -৳{Number(cand.discount).toLocaleString()})
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ minWidth: "130px" }}>
                            <b style={{ color: "#16a34a" }}>{formatTk(cand.totalPaid)}</b>
                          </td>
                          <td style={{ minWidth: "130px" }}>
                            <b style={{ color: cand.dueAmount > 0 ? "#dc2626" : "#16a34a" }}>
                              {formatTk(cand.dueAmount)}
                            </b>
                          </td>
                          <td style={{ minWidth: "220px", textAlign: "right" }}>
                            {((cand.payments && cand.payments.length > 0) || (cand.paymentHistory && cand.paymentHistory.length > 0)) ? (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="portal-voucher-btn"
                                  style={{
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    borderColor: "#bfdbfe",
                                  }}
                                  onClick={() => openPrintReceipt(cand, undefined, true)}
                                  title="Print Consolidated Master Money Receipt (All Payments)"
                                >
                                  <Printer size={12} /> Master Receipt
                                </button>
                                <button
                                  type="button"
                                  className="portal-voucher-btn"
                                  onClick={() => openPrintReceipt(cand)}
                                  title="Print Candidate Deposit Money Receipt Voucher"
                                >
                                  <Printer size={12} /> Voucher ({(cand.payments || cand.paymentHistory)!.length})
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>No receipts</span>
                            )}
                          </td>
                          <td style={{ minWidth: "140px", textAlign: "right" }}>
                            <Link
                              href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                              className="dashboard-profile-link primary"
                            >
                              <FileText size={12} style={{ marginRight: "4px" }} /> Dossier →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="dashboard-table-summary">
                  Showing {filteredLedgerCandidates.length} of {agentData.candidates.length} candidate accounts · Total Collected: {formatTk(agentData.grandTotalCollected)} · Total Due: {formatTk(agentData.grandTotalDue)}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : activeTab === "missing" ? (
        /* =========================================================================
            VIEW 4: MISSING DOCUMENTS ATTENTION
            ========================================================================= */
        <>
          {renderHero({
            badge: "COMPLIANCE & RISK MANAGEMENT",
            title: "Missing Documents & Compliance Attention",
            subtitle: "Urgent candidate files pending documentation (Passport, Medical GAMCA, Police Clearance, Visas)",
            actions: (
              <button type="button" className="dashboard-action" onClick={() => window.print()}>
                <Printer size={14} /> Print Checklist
              </button>
            ),
          })}

          {/* Compliance Category Strip */}
          <div className="portal-summary-strip">
            <div className="portal-summary-pill">
              <span>Passports Missing</span>
              <b style={{ color: "#dc2626" }}>{missingPassports}</b>
            </div>
            <div className="portal-summary-pill">
              <span>Medical Slips Missing</span>
              <b style={{ color: "#d97706" }}>{missingMedicals}</b>
            </div>
            <div className="portal-summary-pill">
              <span>Police PCC Missing</span>
              <b style={{ color: "#2563eb" }}>{missingPolices}</b>
            </div>
            <div className="portal-summary-pill">
              <span>NID Cards Missing</span>
              <b style={{ color: "#7c3aed" }}>{missingNids}</b>
            </div>
            <div className="portal-summary-pill">
              <span>Visas Missing</span>
              <b style={{ color: "#059669" }}>{missingVisas}</b>
            </div>
          </div>

          {/* Missing Documents Table */}
          <section className="dashboard-activity-section" aria-label="Missing documents table">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <FileWarning size={18} color="#e11d48" />
                  <span>Missing Documents Attention</span>
                  <span className="dashboard-count-badge alert">
                    {filteredMissingDocCandidates.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search missing documents, name..."
                  />
                </label>

                <select
                  aria-label="Filter by missing category"
                  value={missingCategoryFilter}
                  onChange={(e) => setMissingCategoryFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="ALL">All Categories ({candidatesWithMissingDocs.length})</option>
                  <option value="PASSPORT">Passports Missing</option>
                  <option value="MEDICAL">GAMCA Medical Missing</option>
                  <option value="POLICE">Police PCC Missing</option>
                  <option value="NID">NID Copy Missing</option>
                  <option value="VISA">Visa Copy Missing</option>
                </select>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              <div className="desktop-dashboard-table dashboard-leads-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "48px", minWidth: "48px", textAlign: "center" }}>SL</th>
                      <th style={{ minWidth: "240px" }}>CANDIDATE &amp; CONTACT</th>
                      <th style={{ minWidth: "160px" }}>TRADE &amp; DESTINATION</th>
                      <th style={{ minWidth: "140px" }}>CURRENT STAGE</th>
                      <th style={{ minWidth: "340px" }}>MISSING DOCUMENTS &amp; REASON</th>
                      <th style={{ minWidth: "240px" }}>ACTION REQUIRED</th>
                      <th style={{ minWidth: "140px", width: "140px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissingDocCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                          <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
                            <CheckCircle2 size={32} color="#16a34a" />
                            <b style={{ fontSize: "14px", color: "#0f172a" }}>All candidate documentation complete!</b>
                            <span style={{ fontSize: "12px" }}>No missing passport, medical, PCC, or visa files found.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMissingDocCandidates.map((cand, idx) => (
                        <tr key={cand.fileId}>
                          <td style={{ color: "#64748b", fontWeight: 700, textAlign: "center", width: "48px", minWidth: "48px" }}>{idx + 1}</td>
                          <td style={{ minWidth: "240px" }}>
                            <div className="dashboard-candidate-identity">
                              <Link
                                href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                className="dashboard-candidate-avatar"
                                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                              >
                                {cand.fullName.slice(0, 2).toUpperCase()}
                              </Link>
                              <div>
                                <Link
                                  href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                  style={{ textDecoration: "none", color: "inherit" }}
                                >
                                  <b>{cand.fullName}</b>
                                </Link>
                                <small>
                                  <span>{cand.fileNo}</span> • <Phone size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {cand.phone}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td style={{ minWidth: "160px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>
                              {cand.profession || "General Work"}
                            </div>
                            <small style={{ color: "#64748b" }}>
                              {getCountryFlagEmoji(undefined, cand.country)} {cand.country}
                            </small>
                          </td>
                          <td style={{ minWidth: "140px" }}>
                            <span className="badge attention">
                              ● {cand.currentStage}
                            </span>
                          </td>
                          <td style={{ minWidth: "340px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {(cand.missingDocs || [
                                { category: "GENERAL", name: "Required File Pending", reason: "Mandatory compliance scan required" },
                              ]).map((doc, dIdx) => (
                                <div
                                  key={dIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    fontSize: "12px",
                                    lineHeight: "1.4",
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    background: "#fef2f2",
                                    color: "#991b1b",
                                    border: "1px solid #fecaca",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  <FileWarning size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                                  <div>
                                    <strong style={{ color: "#991b1b", fontWeight: 700 }}>{doc.name}</strong>
                                    {doc.reason && (
                                      <span style={{ color: "#7f1d1d", marginLeft: "4px", fontWeight: 400 }}>: {doc.reason}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ minWidth: "240px" }}>
                            <span style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.4", display: "inline-block" }}>
                              Candidate needs to submit original document to agency office.
                            </span>
                          </td>
                          <td style={{ minWidth: "140px", textAlign: "right" }}>
                            <Link
                              href={`/portal/agent/candidate/${cand.fileId}?agentId=${encodeURIComponent(agentId)}`}
                              className="dashboard-profile-link primary"
                            >
                              <FileText size={12} style={{ marginRight: "4px" }} /> Dossier →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="dashboard-table-summary">
                  Showing {filteredMissingDocCandidates.length} of {candidatesWithMissingDocs.length} candidates with missing documents
                </div>
              </div>
            </div>
          </section>
        </>
      ) : activeTab === "expiry" ? (
        /* =========================================================================
            VIEW 5: DOCUMENT EXPIRY TRACKER
            ========================================================================= */
        <>
          {renderHero({
            badge: "DEADLINE & VALIDITY MONITOR",
            title: "Document Expiry & Validity Tracker",
            subtitle: "Monitor passport, medical GAMCA, and visa expiration dates to prevent costly delays",
            actions: (
              <button type="button" className="dashboard-action" onClick={() => window.print()}>
                <Printer size={14} /> Print Expiry Report
              </button>
            ),
          })}

          {/* 4 Expiry Urgency Health Cards */}
          <section className="dashboard-kpi-grid" aria-label="Expiry urgency metrics">
            <div
              className="dashboard-kpi-card"
              onClick={() => setExpiryStatusFilter("CRITICAL")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Expired (&lt; 0 Days)</span>
                <Clock size={16} color="#dc2626" />
              </div>
              <b style={{ color: "#dc2626" }}>{expiredCount}</b>
              <p>Immediate renewal / re-issue required</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setExpiryStatusFilter("CRITICAL")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Critical (&lt; 15 Days)</span>
                <Clock size={16} color="#d97706" />
              </div>
              <b style={{ color: "#d97706" }}>{criticalExpiryCount - expiredCount}</b>
              <p>Expedite visa stamping immediately</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setExpiryStatusFilter("WARNING")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Warning (16 - 60 Days)</span>
                <Clock size={16} color="#eab308" />
              </div>
              <b style={{ color: "#ca8a04" }}>{warningExpiryCount}</b>
              <p>Approaching expiration threshold</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setExpiryStatusFilter("SAFE")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Safe &amp; Valid (&gt; 60 Days)</span>
                <CheckCircle2 size={16} color="#16a34a" />
              </div>
              <b style={{ color: "#16a34a" }}>{safeExpiryCount}</b>
              <p>Valid for embassy &amp; flight deployment</p>
            </div>
          </section>

          {/* Expiry Table */}
          <section className="dashboard-activity-section" aria-label="Monitored expiration table">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <CalendarClock size={18} color="#d97706" />
                  <span>Document Expiry Tracker</span>
                  <span className="dashboard-count-badge warning">
                    {filteredExpiryItems.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search expiring docs, name..."
                  />
                </label>

                <select
                  aria-label="Filter by expiration urgency"
                  value={expiryStatusFilter}
                  onChange={(e) => setExpiryStatusFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="ALL">All Deadlines ({expiryItems.length})</option>
                  <option value="CRITICAL">Urgent (&lt; 15d) ({criticalExpiryCount})</option>
                  <option value="WARNING">Warning (16-60d) ({warningExpiryCount})</option>
                  <option value="SAFE">Safe / Valid ({safeExpiryCount})</option>
                </select>

                <select
                  aria-label="Filter by document type"
                  value={expiryDocTypeFilter}
                  onChange={(e) => setExpiryDocTypeFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="ALL">All Documents</option>
                  <option value="Passport">Passport</option>
                  <option value="GAMCA Medical">GAMCA Medical</option>
                  <option value="Police Clearance (PCC)">Police PCC</option>
                  <option value="Stamped Visa">Stamped Visa</option>
                </select>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel">
              <div className="desktop-dashboard-table dashboard-leads-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "48px", minWidth: "48px", textAlign: "center" }}>SL</th>
                      <th style={{ minWidth: "240px" }}>CANDIDATE &amp; CONTACT</th>
                      <th style={{ minWidth: "180px" }}>DOCUMENT TYPE &amp; REF</th>
                      <th style={{ minWidth: "150px" }}>EXPIRATION DATE</th>
                      <th style={{ minWidth: "150px" }}>VALIDITY STATUS</th>
                      <th style={{ minWidth: "220px" }}>ACTION REQUIRED</th>
                      <th style={{ minWidth: "140px", width: "140px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpiryItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                          <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
                            <CheckCircle2 size={32} color="#16a34a" />
                            <b style={{ fontSize: "14px", color: "#0f172a" }}>All document deadlines healthy!</b>
                            <span style={{ fontSize: "12px" }}>No passports, GAMCA medical, or visas approaching expiration.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredExpiryItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ color: "#64748b", fontWeight: 700, textAlign: "center", width: "48px", minWidth: "48px" }}>{idx + 1}</td>
                          <td style={{ minWidth: "240px" }}>
                            <div className="dashboard-candidate-identity">
                              <Link
                                href={`/portal/agent/candidate/${item.candidate.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                className="dashboard-candidate-avatar"
                              >
                                {item.candidate.fullName.slice(0, 2).toUpperCase()}
                              </Link>
                              <div>
                                <Link
                                  href={`/portal/agent/candidate/${item.candidate.fileId}?agentId=${encodeURIComponent(agentId)}`}
                                  style={{ textDecoration: "none", color: "inherit" }}
                                >
                                  <b>{item.candidate.fullName}</b>
                                </Link>
                                <small>
                                  <span>{item.candidate.fileNo}</span> • <Phone size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {item.candidate.phone}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td style={{ minWidth: "180px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.docType}</div>
                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748b" }}>{item.docRef}</span>
                          </td>
                          <td style={{ minWidth: "150px" }}>
                            <b style={{ color: "#0f172a" }}>{formatDate(item.expiryDate.toISOString())}</b>
                          </td>
                          <td style={{ minWidth: "150px" }}>
                            <span
                              className={`badge ${
                                item.urgency === "CRITICAL" || item.urgency === "EXPIRED"
                                  ? "overdue"
                                  : item.urgency === "WARNING"
                                  ? "attention"
                                  : "on-track"
                              }`}
                            >
                              {item.daysLeft < 0
                                ? `Expired ${Math.abs(item.daysLeft)}d ago`
                                : `${item.daysLeft} days remaining`}
                            </span>
                          </td>
                          <td style={{ minWidth: "220px" }}>
                            <span style={{ fontSize: "12px", color: "#475569" }}>
                              {item.actionRequired}
                            </span>
                          </td>
                          <td style={{ minWidth: "140px", textAlign: "right" }}>
                            <Link
                              href={`/portal/agent/candidate/${item.candidate.fileId}?agentId=${encodeURIComponent(agentId)}`}
                              className="dashboard-profile-link primary"
                            >
                              <FileText size={12} style={{ marginRight: "4px" }} /> Dossier →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="dashboard-table-summary">
                  Showing {filteredExpiryItems.length} of {expiryItems.length} monitored document expiration items
                </div>
              </div>
            </div>
          </section>
        </>
      ) : activeTab === "interviews" ? (
        /* =========================================================================
            VIEW 6: INTERVIEW CALLS & DRIVES
            ========================================================================= */
        <>
          {renderHero({
            badge: "DELEGATE INTERVIEWS & SELECTIONS",
            title: "Interview Calls & Client Selection Drives",
            subtitle: "Scheduled foreign delegate interviews, trade test evaluations, and candidate results",
          })}

          {/* 4 Interview Stats Cards */}
          <section className="dashboard-kpi-grid" aria-label="Interview overview">
            <div
              className="dashboard-kpi-card"
              onClick={() => setInterviewStatusFilter("ALL")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Total Scheduled</span>
                <CalendarClock size={16} color="#007aff" />
              </div>
              <b>{interviewStats.total}</b>
              <p>Scheduled interview drives</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setInterviewStatusFilter("Selected")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Selected / Passed</span>
                <CheckCircle2 size={16} color="#16a34a" />
              </div>
              <b style={{ color: "#16a34a" }}>{interviewStats.selected}</b>
              <p>Passed trade &amp; client review</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setInterviewStatusFilter("Scheduled")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Upcoming Sessions</span>
                <Clock size={16} color="#3b82f6" />
              </div>
              <b>{interviewStats.scheduled}</b>
              <p>Upcoming delegate sessions</p>
            </div>

            <div
              className="dashboard-kpi-card"
              onClick={() => setInterviewStatusFilter("Pending")}
              role="button"
              tabIndex={0}
            >
              <div className="dashboard-metric-heading">
                <span>Under Review</span>
                <FileWarning size={16} color="#d97706" />
              </div>
              <b>{interviewStats.review}</b>
              <p>Awaiting final client decision</p>
            </div>
          </section>

          {/* Interview Cards Workspace */}
          <section className="dashboard-activity-section" aria-label="Interview calls workspace">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="CalendarDays" />
                  <span>Interview Calls &amp; Drives</span>
                  <span className="dashboard-count-badge">
                    {filteredInterviews.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search interview drives..."
                  />
                </label>

                <select
                  aria-label="Filter by interview result"
                  value={interviewStatusFilter}
                  onChange={(e) => setInterviewStatusFilter(e.target.value)}
                  className="portal-select-filter"
                >
                  <option value="ALL">All Results ({agentData.interviews?.length || 0})</option>
                  <option value="Selected">Selected / Passed</option>
                  <option value="Scheduled">Scheduled / In-Progress</option>
                  <option value="Rescheduled">Rescheduled / Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel" style={{ padding: "20px" }}>
              {filteredInterviews.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
                    <CalendarClock size={32} color="#94a3b8" />
                    <b style={{ fontSize: "14px", color: "#0f172a" }}>No interview drives found</b>
                    <span style={{ fontSize: "12px" }}>Interview appointments will be listed here when scheduled by central operations.</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
                  {filteredInterviews.map((iv) => (
                    <div
                      key={iv.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px 20px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                          <b style={{ fontSize: "14.5px", color: "#0f172a", display: "block" }}>{iv.candidateName || "Candidate"}</b>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>{iv.profession || "General Work"}</span>
                        </div>
                        <span
                          className={`badge ${
                            /select|pass/i.test(iv.result || "")
                              ? "on-track"
                              : /wait|schedul/i.test(iv.result || "")
                              ? "attention"
                              : /reject|fail/i.test(iv.result || "")
                              ? "overdue"
                              : ""
                          }`}
                        >
                          {iv.result || iv.status || "Scheduled"}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        <div>
                          <span style={{ color: "#94a3b8", display: "block" }}>Company / Employer</span>
                          <b style={{ color: "#334155" }}>{iv.company || "General Overseas Employer"}</b>
                        </div>
                        <div>
                          <span style={{ color: "#94a3b8", display: "block" }}>Interview Date</span>
                          <b style={{ color: "#334155" }}>{formatDate(iv.interviewDate)} {iv.interviewTime ? `· ${iv.interviewTime}` : ""}</b>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "#94a3b8", display: "block" }}>Venue / Platform</span>
                          <span style={{ color: "#334155", fontWeight: 600 }}>{iv.venue || "Central Office / In-Person"}</span>
                        </div>
                      </div>

                      {iv.fileId && (
                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                          <Link
                            href={`/portal/agent/candidate/${iv.fileId}?agentId=${encodeURIComponent(agentId)}`}
                            className="dashboard-profile-link primary"
                          >
                            <FileText size={12} style={{ marginRight: "4px" }} /> View Dossier →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* =========================================================================
            VIEW 7: AGENCY VERIFIED DOCUMENTS
            ========================================================================= */
        <>
          {renderHero({
            badge: "OFFICIAL REPOSITORY & COMPLIANCE",
            title: "Agency Documents & Official Records",
            subtitle: "Official partner agreements, trade license scans, authorization credentials, and demand permits",
          })}

          {/* Trust & Security Strip */}
          <div className="portal-trust-strip">
            <div className="portal-trust-badge">
              <ShieldCheck size={16} color="#16a34a" />
              <span>Verified Agency License (RL-1842)</span>
            </div>
            <div className="portal-trust-badge">
              <Lock size={16} color="#007aff" />
              <span>Active Partnership Agreement (AGT-001)</span>
            </div>
            <div className="portal-trust-badge">
              <FileCheck size={16} color="#8b5cf6" />
              <span>Encrypted Document Vault</span>
            </div>
          </div>

          {/* Agency Documents Workspace */}
          <section className="dashboard-activity-section" aria-label="Agency documents repository">
            <div className="dashboard-activity-toolbar">
              <div className="dashboard-active-view-header">
                <div className="dashboard-view-title">
                  <DashboardIcon name="FileCheck1" />
                  <span>Agency Verified Documents</span>
                  <span className="dashboard-count-badge">
                    {filteredDocs.length}
                  </span>
                </div>
              </div>

              <div className="dashboard-module-tools">
                <label className="dashboard-search-field">
                  <DashboardIcon name="Search" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agency files..."
                  />
                </label>
              </div>
            </div>

            <div id="dashboard-activity-panel" role="tabpanel" style={{ padding: "20px" }}>
              {filteredDocs.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ display: "grid", placeItems: "center", gap: "8px" }}>
                    <FileCheck size={32} color="#94a3b8" />
                    <b style={{ fontSize: "14px", color: "#0f172a" }}>No agency documents recorded</b>
                    <span style={{ fontSize: "12px" }}>Official partner agreements, trade license scans, and agency docs will appear here.</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px 20px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "#eff6ff",
                            color: "#007aff",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <FileText size={20} />
                        </div>
                        <div>
                          <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>{doc.title || doc.name}</b>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>{doc.type} · {formatDate(doc.createdAt)}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                        <span className="badge on-track">● Verified Document</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="dashboard-profile-link"
                            onClick={() => setPreviewDoc({ name: doc.title || doc.name || "Agency Document", type: doc.type, fileData: doc.url })}
                          >
                            <Eye size={12} style={{ marginRight: "4px" }} /> Preview
                          </button>
                          {doc.url && (
                            <a
                              href={doc.url}
                              download={doc.title || "Document"}
                              className="dashboard-profile-link primary"
                            >
                              <Download size={12} style={{ marginRight: "4px" }} /> Download
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document Preview"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              maxWidth: "600px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#eff6ff", color: "#007aff", display: "grid", placeItems: "center" }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>{previewDoc.name}</h3>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{previewDoc.type || "Document"}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setPreviewDoc(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                padding: "36px 20px",
                textAlign: "center",
                display: "grid",
                placeItems: "center",
                gap: "12px",
              }}
            >
              {previewDoc.fileData && previewDoc.fileData.startsWith("data:image/") ? (
                <Image
                  src={previewDoc.fileData}
                  alt={previewDoc.name}
                  width={560}
                  height={380}
                  unoptimized
                  style={{ maxHeight: "300px", maxWidth: "100%", height: "auto", borderRadius: "8px", objectFit: "contain" }}
                />
              ) : (
                <>
                  <FileCheck size={44} color="#16a34a" />
                  <div>
                    <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>Document Verified &amp; Archived</b>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Secured by Orbit Central Database</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Lock size={12} color="#16a34a" /> Read-Only File Inspection
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {previewDoc.fileData && (
                  <a
                    href={previewDoc.fileData}
                    download={previewDoc.name}
                    className="portal-toolbar-btn"
                    style={{ background: "#007aff", color: "#ffffff", borderColor: "#007aff" }}
                  >
                    <Download size={13} /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="portal-toolbar-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONEY RECEIPT VOUCHER MODAL */}
      {activeReceipt && (
        <MoneyReceiptModal
          receipt={activeReceipt}
          receipts={activeReceiptsList}
          initialIndex={activeReceiptIndex}
          onClose={() => {
            setActiveReceipt(null);
            setActiveReceiptsList([]);
          }}
        />
      )}
    </div>
  );
}
