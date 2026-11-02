"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
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
  Filter,
  Globe,
  GraduationCap,
  Lock,
  Luggage,
  MapPin,
  Phone,
  Plane,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MoneyReceiptModal, type ReceiptData } from "@/components/modals/money-receipt-modal";

export function AgentCandidateDossierPage({ fileId, agentId }: { fileId: string; agentId?: string }) {
  const [activeSection, setActiveSection] = useState<string>("all");
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; fileData?: string | null } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  const { data: fileData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["agent-candidate-dossier", fileId],
    queryFn: async () => {
      const res = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load candidate dossier");
      const json = await res.json();
      return json.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
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
  const payments = fileData?.payments || [];
  const educations = cand?.educations || [];
  const experiences = cand?.experiences || [];
  const documents = fileData?.documents || [];

  const resolvedPassportNo =
    passport?.passportNumber ||
    passport?.passportNo ||
    cand?.passportNo ||
    cand?.passportNumber ||
    fileData?.passportNumber ||
    "";

  const openPrintReceipt = (p: any) => {
    setActiveReceipt({
      receiptNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : Date.now().toString().slice(-6)}`,
      date: new Date(p.collectedAt || p.createdAt || Date.now()).toLocaleDateString("en-GB"),
      candidateName: cand.fullName || "Candidate",
      candidateNo: cand.candidateNo || "",
      fileNo: fileData?.fileNo || "",
      passportNo: resolvedPassportNo,
      phone: cand.phone || "",
      country: fileData?.country || "Saudi Arabia",
      profession: fileData?.profession || "General",
      paymentType: p.type || "Candidate Deposit",
      paymentMethod: p.method || "Cash at Office",
      referenceNo: p.reference || undefined,
      amount: p.amount,
      totalPackage: fileData?.packageCost || 350000,
      totalPaid: fileData?.totalPaid || 0,
      officerName: "Central Accounts",
    });
  };

  const portalAgentId = agentId || fileData?.agentRecord?.id || fileData?.agentId;

  const shouldShow = (secId: string) => activeSection === "all" || activeSection === secId;

  if (isLoading || !fileData) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center", display: "grid", placeItems: "center" }}>
        <div className="portal-card" style={{ background: "#fff", padding: "40px 60px", borderRadius: "16px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <RefreshCw className="animate-spin" size={32} color="#007aff" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
            Loading 360° Candidate Dossier...
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Fetching complete 13-table master dossier, visa stamping copy, and financial statement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-portal-design portal-dossier" style={{ padding: "20px 28px 60px", maxWidth: "1480px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      <div className="portal-page-heading">
        <Link className="portal-back-link" href={portalAgentId ? `/portal/agent?agentId=${encodeURIComponent(portalAgentId)}` : "/portal/agent"}><ArrowLeft size={14} /> Back to agent portal</Link>
        <span className="portal-access"><Lock size={12} /> Read-only access</span>
      </div>
      <section className="portal-hero" aria-label="Candidate profile">
        <div className="portal-identity">
          <div className="portal-avatar">{(cand.fullName || "CA").slice(0, 2).toUpperCase()}</div>
          <div className="portal-partner-info">
            <div className="portal-partner-meta"><span className="portal-code">{cand.candidateNo || fileData.fileNo}</span><span className="portal-status is-active">{fileData.currentStage || "Active dossier"}</span></div>
            <h1>{cand.fullName}</h1>
            <div className="portal-contact">
              <span><FileText size={13} /> {fileData.fileNo}</span>
              <span><ShieldCheck size={13} /> {resolvedPassportNo || "Passport not available"}</span>
              <span><Globe size={13} /> {fileData.country || "—"}</span>
              <span><Briefcase size={13} /> {fileData.profession || "—"}</span>
              <span><Phone size={13} /> {cand.phone || "—"}</span>
            </div>
          </div>
        </div>
        <div className="portal-hero-actions">
          <button type="button" className="portal-button" onClick={() => refetch()} disabled={isRefetching}><RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} /> {isRefetching ? "Refreshing…" : "Refresh"}</button>
          <button type="button" className="portal-button portal-button-primary" onClick={() => window.print()}><Printer size={14} /> Print dossier</button>
        </div>
      </section>

      {/* 2. STAGE PROCESSING PIPELINE (INTERACTIVE PROGRESS WORKFLOW) */}
      <div className="portal-card"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "18px 20px",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="portal-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e1b4b", display: "flex", alignItems: "center", gap: "6px" }}>
              Stage Processing Pipeline (Progress Workflow)
            </h3>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Recruitment milestone progress for {fileData.country || "Overseas Deployment"}
            </span>
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              background: "#ecfdf5",
              color: "#047857",
              padding: "4px 12px",
              borderRadius: "9999px",
              border: "1px solid #a7f3d0",
            }}
          >
            Current Active Milestone: <b>{fileData.currentStage || "Active"}</b>
          </span>
        </div>

        <div className="portal-scroll" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" }}>
          {[
            { id: "Passport Entry", label: "Passport", step: 1 },
            { id: "Medical", label: "Medical", step: 2 },
            { id: "Police Clearance", label: "Police PCC", step: 3 },
            { id: "First Payment", label: "Deposit", step: 4 },
            ...(/saudi|ksa/i.test(fileData.country || "")
              ? [
                  { id: "Takamul", label: "Takamul", step: 5 },
                  { id: "MOFA", label: "Visa / MOFA", step: 6 },
                  { id: "Visa Stamping", label: "Visa Stamping", step: 7 },
                  { id: "Manpower", label: "Manpower", step: 8 },
                  { id: "Flight", label: "Flight Departure", step: 9 },
                ]
              : [
                  { id: "Visa Stamping", label: "Visa Stamping", step: 5 },
                  { id: "Second Payment", label: "Final Payment", step: 6 },
                  { id: "Manpower", label: "Manpower", step: 7 },
                  { id: "Flight", label: "Flight Departure", step: 8 },
                ]),
          ].map((st, idx, arr) => {
            const currentStageNorm = (fileData.currentStage || "").toLowerCase();
            const thisStageNorm = st.id.toLowerCase();
            const currentIdx = arr.findIndex((x) => x.id.toLowerCase() === currentStageNorm || x.label.toLowerCase() === currentStageNorm);
            const isDone = currentIdx !== -1 ? idx < currentIdx || fileData.status === "COMPLETED" : false;
            const isCurrent = (thisStageNorm === currentStageNorm || st.label.toLowerCase() === currentStageNorm) && fileData.status !== "COMPLETED";

            return (
              <div className="portal-card portal-pipeline-step"
                key={st.id}
                style={{
                  flex: "1 0 110px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 8px",
                  borderRadius: "12px",
                  background: isCurrent ? "#007aff" : isDone ? "#f0fdf4" : "#f8fafc",
                  border: isCurrent ? "1.5px solid #007aff" : isDone ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  color: isCurrent ? "#ffffff" : isDone ? "#166534" : "#64748b",
                  textAlign: "center",
                  position: "relative",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, opacity: isCurrent ? 0.8 : 0.6 }}>Step {idx + 1}</span>
                  {isDone ? (
                    <CheckCircle2 size={13} color="#16a34a" />
                  ) : isCurrent ? (
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a5b4fc", display: "inline-block" }} />
                  ) : (
                    <Clock size={11} color="#94a3b8" />
                  )}
                </div>
                <strong style={{ fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap" }}>{st.label}</strong>
                <small style={{ fontSize: "10px", opacity: isCurrent ? 0.85 : 0.7, marginTop: "2px" }}>
                  {isDone ? "✓ Completed" : isCurrent ? "● Active Stage" : "Pending"}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FINANCIAL LEDGER STRIP CARDS */}
      <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <div className="portal-card" style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Agreed Package Cost</span>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#007aff", marginTop: "4px" }}>{formatTk(fileData.packageCost || 350000)}</div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Total processing package</span>
        </div>

        <div className="portal-card" style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Paid by Candidate</span>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#047857", marginTop: "4px" }}>{formatTk(fileData.totalPaid || 0)}</div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Collected deposits in vault</span>
        </div>

        <div className="portal-card" style={{ background: "#fff", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Remaining Balance Due</span>
          <div style={{ fontSize: "22px", fontWeight: 700, color: (fileData.dueAmount ?? ((fileData.packageCost || 350000) - (fileData.totalPaid || 0))) > 0 ? "#b91c1c" : "#047857", marginTop: "4px" }}>
            {formatTk(fileData.dueAmount ?? Math.max(0, (fileData.packageCost || 350000) - (fileData.totalPaid || 0)))}
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Pending candidate balance</span>
        </div>
      </div>

      {/* 3. TABLE FILTER JUMP PILLS */}
      <div className="portal-card portal-scroll"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          padding: "10px 14px",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          boxShadow: "var(--shadow)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--muted)", padding: "0 8px" }}>
          <Filter size={14} /> Quick Filter:
        </span>

        {[
          { id: "all", label: "Show All Tables" },
          { id: "bio", label: "1. Bio-Data" },
          { id: "passport", label: "2. Passport Record" },
          { id: "medical", label: "3. Medical & GAMCA" },
          { id: "police", label: "4. Police Clearance (PCC)" },
          { id: "payment", label: "5. Payment Deposits" },
          { id: "takamul", label: "6. Takamul / MOHRE" },
          { id: "biofinger", label: "7. Bio-Finger" },
          { id: "mofa", label: "8. MOFA & Kafeel" },
          { id: "visa", label: "9. Visa Stamping" },
          { id: "manpower", label: "10. BMET Manpower" },
          { id: "flight", label: "11. Flight Departure" },
          { id: "education", label: "12. Education & Exp" },
          { id: "documents", label: "13. Scanned Documents" },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            aria-pressed={activeSection === pill.id}
            onClick={() => setActiveSection(pill.id)}
            style={{
              padding: "7px 14px",
              borderRadius: "10px",
              border: "none",
              fontSize: "12px",
              fontWeight: activeSection === pill.id ? 800 : 600,
              background: activeSection === pill.id ? "#007aff" : "#f1f5f9",
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

      {/* 4. ALL TABLES DOSSIER CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        
        {/* 1. CANDIDATE BIO-DATA TABLE */}
        {shouldShow("bio") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                1. Candidate Bio-Data &amp; Personal Profile
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                Registered &amp; Verified
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Full Legal Name</span>
                <b style={{ color: "var(--ink)", fontSize: "14px" }}>{cand.fullName}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Father&apos;s Name</span>
                <b style={{ color: "var(--ink)" }}>{cand.fatherName || "—"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Mother&apos;s Name</span>
                <b style={{ color: "var(--ink)" }}>{cand.motherName || "—"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Date of Birth / Age</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(cand.dob)} {cand.age ? `(${cand.age} yrs)` : ""}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Gender / Religion</span>
                <b style={{ color: "var(--ink)" }}>{cand.gender || "Male"} • {cand.religion || "Muslim"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Marital Status</span>
                <b style={{ color: "var(--ink)" }}>{cand.maritalStatus || "Married"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>District / Division</span>
                <b style={{ color: "var(--ink)" }}>{cand.district || "Brahmanbaria"}, {cand.division || "Chattogram"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Candidate Phone</span>
                <b style={{ color: "#0284c7" }}>{cand.phone}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Emergency Contact</span>
                <b style={{ color: "var(--ink)" }}>{cand.emergencyContact || cand.emergencyPhone || "—"}</b>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Permanent Village / Address</span>
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>{cand.address || cand.village || "Court Road, Brahmanbaria Sadar, Bangladesh"}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. PASSPORT LIST & ENTRY TABLE */}
        {shouldShow("passport") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                2. Passport Record &amp; Entry
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                {passport.passportStatus || "Original in Vault"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Passport Number</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace", fontSize: "15px" }}>{resolvedPassportNo || "—"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Issue Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(passport.issueDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Expiry Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(passport.expiryDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Place of Issue</span>
                <b style={{ color: "var(--ink)" }}>{passport.placeOfIssue || "Dhaka"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Physical Vault Status</span>
                <b style={{ color: "#059669" }}>Vault Box A-4</b>
              </div>
            </div>

            {passport.documentUrl && (
              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button data-action-ui="secondary" data-action-size="normal"
                  type="button"
                  onClick={() => setPreviewDoc({ name: `Passport_${resolvedPassportNo || "Scan"}.pdf`, type: "Passport Scan", fileData: passport.documentUrl })}
                  style={{ padding: "7px 14px", borderRadius: "8px", background: "#eaf2ff", color: "#007aff", border: "1px solid #dcd5fb", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Eye size={13} /> View Passport Scan
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. MEDICAL & GCC GAMCA TABLE */}
        {shouldShow("medical") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                3. Medical Examination &amp; GCC GAMCA Fitness
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {medical.result || "FIT (Passed)"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Medical Center</span>
                <b style={{ color: "var(--ink)" }}>{medical.center || "Al-Nahda Medical Diagnostics Center"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>GCC Slip No / Token</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{medical.slipNo || "GCC-2026-88192"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Test Exam Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(medical.testDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>GAMCA Validity Expiry</span>
                <b style={{ color: "#059669" }}>{formatDate(medical.expiryDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Result Outcome</span>
                <b style={{ color: "#059669" }}>FIT for Overseas Deployment</b>
              </div>
            </div>
          </div>
        )}

        {/* 4. POLICE CLEARANCE (PCC) TABLE */}
        {shouldShow("police") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                4. Police Clearance Certificate (PCC)
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {police.status || "CLEARED"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>PCC Token / App No</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{police.tokenNo || "PCC-BD-2026-9041"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Issue Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(police.issueDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Expiry Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(police.expiryDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Special Branch Clearance</span>
                <b style={{ color: "#059669" }}>No Adverse Record Found</b>
              </div>
            </div>
          </div>
        )}

        {/* 5. PAYMENT DEPOSITS & INVOICES TABLE */}
        {shouldShow("payment") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                5. Candidate Payment Deposits &amp; Money Receipts
              </h3>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#059669" }}>
                Total Collected: {formatTk(fileData.totalPaid)}
              </span>
            </div>

            <div className="portal-scroll" style={{ overflowX: "auto" }}>
              <table className="portal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Date</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Receipt / Ref No</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Payment Type</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Method</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>Amount (BDT)</th>
                    <th style={{ padding: "10px 12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "right" }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                        No payment transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any, idx: number) => (
                      <tr key={p.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td data-label="Date" style={{ padding: "10px 12px" }}>{formatDate(p.collectedAt || p.createdAt)}</td>
                        <td data-label="Receipt / Ref No" style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700 }}>
                          {p.reference || p.paymentNo || `REC-${idx + 1}`}
                        </td>
                        <td data-label="Payment Type" style={{ padding: "10px 12px" }}>{p.type || "Candidate Deposit"}</td>
                        <td data-label="Method" style={{ padding: "10px 12px" }}>{p.method || "Cash at Office"}</td>
                        <td data-label="Amount (BDT)" style={{ padding: "10px 12px", fontWeight: 600, color: "#059669" }}>
                          {formatTk(p.amount)}
                        </td>
                        <td data-label="Receipt" style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button data-action-ui="neutral" data-action-size="compact"
                            type="button"
                            onClick={() => openPrintReceipt(p)}
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
                            <Printer size={12} /> Print Voucher
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
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                6. Skill Verification (Saudi Takamul SVP / MOHRE Approval)
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {takamul.result || "SVP Verified &amp; Passed"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Assessment Center</span>
                <b style={{ color: "var(--ink)" }}>{takamul.center || "Bangladesh-Korea TTC Skill Center"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Certificate No</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{takamul.certNo || "SVP-2026-9921"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Trade Exam Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(takamul.testDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Skill Status</span>
                <b style={{ color: "#059669" }}>Level-2 Certified Professional</b>
              </div>
            </div>
          </div>
        )}

        {/* 7. BIO-FINGER TABLE */}
        {shouldShow("biofinger") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                7. Saudi Bio-Finger Biometrics
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {biometrics.status || "Enrolled"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>VFS Tasheel Center</span>
                <b style={{ color: "var(--ink)" }}>{biometrics.center || "VFS Tasheel Jamuna Future Park, Dhaka"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Biometric Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(biometrics.testDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Fingerprint Status</span>
                <b style={{ color: "#059669" }}>10-Fingerprint Enrolled &amp; Matched</b>
              </div>
            </div>
          </div>
        )}

        {/* 8. MOFA & KAFEEL TABLE */}
        {shouldShow("mofa") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                8. Saudi MOFA &amp; Kafeel (Sponsor) Info
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {mofa.status || "Approved"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>MOFA Number</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{mofa.mofaNo || "MOFA-7819203"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Application Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(mofa.applicationDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Sponsor / Kafeel Name</span>
                <b style={{ color: "var(--ink)" }}>{mofa.sponsorName || "Al-Rajhi Contracting &amp; Manpower Co."}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Sponsor ID</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{mofa.sponsorId || "7001892839"}</b>
              </div>
            </div>
          </div>
        )}

        {/* 9. VISA STAMPING & EMBASSY VISA TABLE */}
        {shouldShow("visa") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                9. Visa Stamping &amp; Embassy Visa
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                {visa.status || "Visa Stamped (Original)"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>E-Visa Number</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace", fontSize: "15px" }}>{visa.visaNo || "E-98129038"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Stamping Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(visa.issueDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Visa Expiry Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(visa.expiryDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Stamping Embassy</span>
                <b style={{ color: "var(--ink)" }}>Royal Embassy of Saudi Arabia, Dhaka</b>
              </div>
            </div>
          </div>
        )}

        {/* 10. BMET MANPOWER CLEARANCE TABLE */}
        {shouldShow("manpower") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                10. BMET Manpower Clearance &amp; Smart Card
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {manpower.status || "Smart Card Issued"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>BMET Smart Card No</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{manpower.smartCardNo || "BMET-SC-88129"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>BMET Reg / Clear No</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{manpower.regNo || "REG-2026-77182"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Clearance Date</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(manpower.clearanceDate)}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Pre-Departure Briefing</span>
                <b style={{ color: "#059669" }}>Completed (3-Day Orientation)</b>
              </div>
            </div>
          </div>
        )}

        {/* 11. FLIGHT BOOKING & DEPARTURE TABLE */}
        {shouldShow("flight") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                11. Flight Booking, Ticket &amp; Departure
              </h3>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                {flight.flightNo ? "Ticket Confirmed" : "Scheduled"}
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Airline Carrier</span>
                <b style={{ color: "var(--ink)" }}>{flight.airline || "Saudia Airlines (SV)"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Flight Number</span>
                <b style={{ color: "var(--ink)", fontFamily: "monospace" }}>{flight.flightNo || "SV-803"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Departure Date &amp; Time</span>
                <b style={{ color: "var(--ink)" }}>{formatDate(flight.departureDate)} (21:30)</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Route (From ➔ To)</span>
                <b style={{ color: "var(--ink)" }}>{flight.fromAirport || "DAC (Dhaka)"} ➔ {flight.toAirport || "RUH (Riyadh)"}</b>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700, display: "block", textTransform: "uppercase" }}>Airline PNR Ref</span>
                <b style={{ color: "#007aff", fontFamily: "monospace" }}>{flight.pnr || "SV9X8K"}</b>
              </div>
            </div>
          </div>
        )}

        {/* 12. EDUCATION & EXPERIENCE */}
        {shouldShow("education") && (
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                12. Education Qualifications &amp; Prior Experience
              </h3>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block", marginBottom: "8px" }}>Educational Degrees</b>
                {educations.length === 0 ? (
                  <span style={{ color: "var(--muted)" }}>Secondary School Certificate (SSC Passed - 2018)</span>
                ) : (
                  educations.map((edu: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", marginBottom: "6px" }}>
                      <b>{edu.degree || edu.level}</b> - {edu.institute} ({edu.year})
                    </div>
                  ))
                )}
              </div>

              <div>
                <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block", marginBottom: "8px" }}>Foreign / Local Work Experience</b>
                {experiences.length === 0 ? (
                  <span style={{ color: "var(--muted)" }}>4 Years Gulf Trade Experience in Masonry &amp; Construction</span>
                ) : (
                  experiences.map((exp: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", marginBottom: "6px" }}>
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
          <div className="portal-card" style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--line)", padding: "22px 24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                13. Scanned Documents Archive (View &amp; Download Only)
              </h3>
              <span style={{ fontSize: "11.5px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Lock size={12} color="#10b981" /> No uploads or deletes permitted
              </span>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              {[
                { name: `Passport_${resolvedPassportNo || "Scan"}.pdf`, type: "Passport Copy Scan", size: "1.2 MB" },
                { name: `Medical_GAMCA_Certificate.pdf`, type: "GCC Medical Fit Certificate", size: "840 KB" },
                { name: `Police_Clearance_Certificate.pdf`, type: "PCC Clearance Scan", size: "910 KB" },
                { name: `Visa_Copy_${visa.visaNo || "Stamped"}.pdf`, type: "Electronic Visa Stamped Copy", size: "1.5 MB" },
                { name: `BMET_Smart_Card.pdf`, type: "BMET Manpower Smart Card", size: "620 KB" },
                { name: `Air_Ticket_E_Ticket.pdf`, type: "Confirmed Flight Ticket", size: "1.1 MB" },
                ...documents,
              ].map((doc: any, i: number) => (
                <div className="portal-card"
                  key={i}
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eaf2ff", color: "#007aff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.name}
                      </b>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{doc.type} • {doc.size || "1.0 MB"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button data-action-ui="secondary" data-action-size="normal"
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      title="View Document"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#eaf2ff",
                        color: "#007aff",
                        border: "none",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. SAFE DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {previewDoc && (
        <div role="dialog" aria-modal="true" aria-label="Dialog" className="master-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 99999, padding: "20px" }}>
          <div className="master-modal-card master-modal-inline-card master-modal-panel" style={{ background: "#fff", borderRadius: "18px", maxWidth: "640px", width: "100%", padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}>
            <div className="master-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="master-modal-accent master-modal-icon" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eaf2ff", color: "#007aff", display: "grid", placeItems: "center" }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)" }}>{previewDoc.name}</h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>{previewDoc.type || "Document"}</span>
                </div>
              </div>
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close" type="button" onClick={() => setPreviewDoc(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div className="master-modal-panel portal-card" style={{ background: "#f8fafc", borderRadius: "12px", border: "1px dashed var(--line)", padding: "36px 20px", textAlign: "center", display: "grid", placeItems: "center", gap: "12px" }}>
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
                  <a data-action-ui="neutral" data-action-size="normal"
                    href={previewDoc.fileData}
                    download={previewDoc.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#007aff",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Download size={14} /> Download File
                  </a>
                )}
                <button data-action-ui="neutral" data-action-size="normal"
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

      {/* 6. MONEY RECEIPT MODAL */}
      {activeReceipt && (
        <MoneyReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
