"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Filter,
  Globe,
  Lock,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MoneyReceiptModal, type ReceiptData, type ReceiptItem, cleanPaymentType } from "@/components/modals/money-receipt-modal";
import { getDefaultStagesForCountry, MASTER_STAGES } from "@/lib/country-pipeline";

export function AgentCandidateDossierPage({ fileId, agentId }: { fileId: string; agentId?: string }) {
  const [activeSection, setActiveSection] = useState<string>("all");
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; fileData?: string | null } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [activeReceiptsList, setActiveReceiptsList] = useState<ReceiptData[]>([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState<number>(0);

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

  const countriesQuery = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60000,
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
  const documents: any[] = fileData?.documents || [];
  const attachedFiles: Record<string, { url: string; fileName: string; size: string }> = fileData?.attachedFiles || {};

  const resolvedPassportNo =
    passport?.passportNumber ||
    passport?.passportNo ||
    cand?.passportNo ||
    cand?.passportNumber ||
    fileData?.passportNumber ||
    "";

  const isDubai = /dubai|uae|emirates/i.test(fileData?.country || "");
  const isSaudi = /saudi|ksa/i.test(fileData?.country || "");

  // Safe Print Voucher Modal
  const openPrintReceipt = (targetPayment?: any, isMasterOnly = false) => {
    if (!fileData) return;
    const rawPayments = fileData.payments || [];
    const paymentsToProcess = rawPayments.length > 0 ? rawPayments : targetPayment ? [targetPayment] : [];
    if (paymentsToProcess.length === 0) return;

    const sorted = [...paymentsToProcess].sort((a: any, b: any) => {
      const ta = new Date(a.collectedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.collectedAt || b.createdAt || 0).getTime();
      return ta - tb;
    });

    const candidatePackage = fileData.packageCost || 0;
    const agentDisplay = fileData.agentRecord?.name
      ? `${fileData.agentRecord.name}${fileData.agentRecord.code ? ` (${fileData.agentRecord.code})` : ""}`
      : fileData.agent || "Al-Ameen Travels & Tours (AGT-001)";

    const formattedDob = cand.dateOfBirth
      ? `${new Date(cand.dateOfBirth).toLocaleDateString("en-GB")}${cand.age ? ` (${cand.age} yrs)` : ""}`
      : undefined;

    let runningPaid = 0;
    const allReceipts: ReceiptData[] = sorted.map((p: any, idx: number) => {
      const previouslyPaid = runningPaid;
      runningPaid += Number(p.amount);
      const cleanType = cleanPaymentType(p.type);

      return {
        receiptNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : (idx + 1).toString().padStart(6, "0")}`,
        date: new Date(p.collectedAt || p.createdAt || Date.now()).toLocaleDateString("en-GB"),
        candidateName: cand.fullName || "Candidate",
        candidateNo: cand.candidateNo || "",
        fileNo: fileData.fileNo || "",
        passportNo: resolvedPassportNo,
        phone: cand.phone || "",
        country: fileData.country || "Oman",
        profession: fileData.profession || "General",
        agent: agentDisplay,
        company: fileData.company || "Awaiting Sponsor",
        paymentType: cleanType,
        paymentMethod: p.method || "Cash at Office",
        referenceNo: p.reference || `REC-${p.paymentNo ? p.paymentNo.slice(-6) : "OFFICE"}`,
        amount: Number(p.amount),
        totalPackage: candidatePackage,
        grossPackage: fileData.grossPackage,
        discount: fileData.discount,
        previouslyPaid,
        totalPaid: runningPaid,
        officerName: "Central Accounts",
        notes: p.note || p.notes || (p.type === "MAD" ? "BMET Manpower & Final Processing Fee Settlement" : undefined),
        dob: formattedDob,
      };
    });

    // Master Consolidated Receipt
    const masterItems: ReceiptItem[] = sorted.map((p: any, idx: number) => ({
      sl: idx + 1,
      date: new Date(p.collectedAt || p.createdAt || Date.now()).toLocaleDateString("en-GB"),
      type: cleanPaymentType(p.type),
      method: p.method || "Cash at Office",
      reference: p.reference || (p.paymentNo ? `REC-${p.paymentNo.slice(-6)}` : `REC-${idx + 1}`),
      amount: Number(p.amount),
      notes: p.note || p.notes || (p.type === "MAD" ? "BMET Manpower & Final Processing Fee Settlement" : undefined),
    }));

    const totalCollected = fileData.totalPaid !== undefined ? fileData.totalPaid : runningPaid;
    const masterReceipt: ReceiptData = {
      isMasterReceipt: true,
      receiptNo: `MR-${fileData.fileNo.replace("FILE-", "")}`,
      date: new Date().toLocaleDateString("en-GB"),
      candidateName: cand.fullName || "Candidate",
      candidateNo: cand.candidateNo || "",
      fileNo: fileData.fileNo || "",
      passportNo: resolvedPassportNo,
      phone: cand.phone || "",
      country: fileData.country || "Oman",
      profession: fileData.profession || "General",
      agent: agentDisplay,
      company: fileData.company || "Awaiting Sponsor",
      paymentType: "Master Statement (All Payments)",
      paymentMethod: "Office Accounts",
      referenceNo: `STMT-${fileData.fileNo}`,
      amount: totalCollected,
      totalPaid: totalCollected,
      totalPackage: candidatePackage,
      grossPackage: fileData.grossPackage,
      discount: fileData.discount,
      officerName: "Central Accounts",
      items: masterItems,
      dob: formattedDob,
    };

    const combinedList = [masterReceipt, ...allReceipts];

    let targetIdx = 0; // Default to Master Receipt
    if (isMasterOnly) {
      targetIdx = 0;
    } else if (targetPayment) {
      const foundIdx = allReceipts.findIndex(
        (r) => r.receiptNo === targetPayment.reference || r.amount === targetPayment.amount
      );
      if (foundIdx !== -1) targetIdx = foundIdx + 1; // +1 because index 0 is masterReceipt
    }

    setActiveReceiptsList(combinedList);
    setActiveReceiptIndex(targetIdx);
    setActiveReceipt(combinedList[targetIdx] || null);
  };

  const portalAgentId = agentId || fileData?.agentRecord?.id || fileData?.agentId;
  const shouldShow = (secId: string) => activeSection === "all" || activeSection === secId;

  // -------------------------------------------------------------
  // DYNAMIC DOCUMENT COMPLIANCE CHECKLIST
  // Accurately evaluates which files are uploaded vs MISSING
  // -------------------------------------------------------------
  const findUploadedDoc = (patterns: RegExp[], attachedKey?: string) => {
    if (attachedKey && attachedFiles[attachedKey]?.url) {
      return {
        url: attachedFiles[attachedKey].url,
        fileName: attachedFiles[attachedKey].fileName || `${attachedKey} Document`,
        size: attachedFiles[attachedKey].size || "Attached",
      };
    }
    const matched = documents.find((d: any) => {
      const str = `${d.type || ""} ${d.fileName || ""} ${d.number || ""}`.toLowerCase();
      return patterns.some((p) => p.test(str));
    });
    if (matched && (matched.downloadUrl || matched.url || matched.fileUrl)) {
      return {
        url: matched.downloadUrl || matched.url || matched.fileUrl,
        fileName: matched.fileName || `${matched.type} Document`,
        size: matched.sizeFormatted || "Attached",
      };
    }
    return null;
  };

  const passportScanFile = passport.scanUrl
    ? { url: passport.scanUrl, fileName: `Passport_${resolvedPassportNo || "Scan"}.pdf`, size: "Original Scan" }
    : findUploadedDoc([/passport.*front/i, /passport.*scan/i, /^passport/i, /passport copy/i], "passport");

  const passportBackScanFile = passport.backScanUrl
    ? { url: passport.backScanUrl, fileName: `Passport_Back_${resolvedPassportNo || "Scan"}.pdf`, size: "Original Scan" }
    : findUploadedDoc([/passport.*back/i, /back.*page/i], "passport_back");

  const candidatePhotoFile = cand.photo
    ? { url: cand.photo, fileName: "Candidate_Photo.jpg", size: "Photo Profile" }
    : findUploadedDoc([/photo/i, /picture/i, /headshot/i], "photo");

  const nidCardFile = findUploadedDoc([/nid/i, /national id/i, /smart card/i, /smartcard/i], "nid");

  const medicalReportFile = findUploadedDoc([/medical/i, /gamca/i, /fitness/i], "medical");

  const policeClearanceFile = findUploadedDoc([/police/i, /pcc/i, /clearance/i], "pcc");

  const offerLetterFile = findUploadedDoc([/offer/i, /labor/i, /mohre/i, /contract/i, /appointment/i], "offer_letter");

  const visaScanFile = findUploadedDoc([/visa/i, /entry permit/i, /stamped/i], "visa");

  const manpowerCardFile = findUploadedDoc([/manpower/i, /bmet/i, /smart card/i], "manpower");

  const flightTicketFile = findUploadedDoc([/flight/i, /ticket/i, /air ticket/i, /itinerary/i], "flight");

  // Operational system records from database
  const medRec = (fileData?.medical && fileData.medical[0]) || {};
  const hasMedRecord = Boolean(medRec?.result && medRec.result !== "Pending" && medRec.result !== "UNFIT");

  const policeRec = (fileData?.police && fileData.police[0]) || {};
  const hasPoliceRecord = Boolean(
    policeRec?.applicationNumber ||
    policeRec?.status === "Approved" ||
    policeRec?.status === "Clear" ||
    policeRec?.status === "Verified" ||
    policeRec?.result?.toLowerCase?.().includes("clear") ||
    policeRec?.result?.toLowerCase?.().includes("verified")
  );

  const visaRec = (fileData?.visas && fileData.visas[0]) || (fileData?.mofa && fileData.mofa[0]) || {};
  const hasVisaRecord = Boolean(
    visaRec?.visaNumber ||
    visaRec?.visaNo ||
    visaRec?.mofaNumber ||
    visaRec?.status === "Visa Done" ||
    visaRec?.status === "Issued" ||
    (fileData?.visas && fileData.visas.length > 0 && fileData.visas[0].status === "Visa Done")
  );

  const manpowerRec = (fileData?.manpower && fileData.manpower[0]) || {};
  const hasManpowerRecord = Boolean(
    manpowerRec?.reference ||
    manpowerRec?.smartCardNo ||
    manpowerRec?.status === "Approved" ||
    manpowerRec?.status === "Issued"
  );

  const flightRec = (fileData?.flights && fileData.flights[0]) || {};
  const hasFlightRecord = Boolean(
    flightRec?.ticketNo ||
    flightRec?.flight?.flightNo ||
    flightRec?.flight?.airline ||
    (fileData?.flights && fileData.flights.length > 0)
  );

  const isCompletedDossier =
    fileData?.status === "COMPLETED" ||
    fileData?.currentStage === "Flight" ||
    (fileData?.flights && fileData.flights.length > 0);

  const currentStageNorm = (fileData?.currentStage || "").toLowerCase().replace(/[_\s-]+/g, " ");

  const isMedicalReached =
    isCompletedDossier ||
    ["medical", "payment", "deposit", "offer", "approval", "mofa", "visa", "manpower", "flight"].some((s) =>
      currentStageNorm.includes(s)
    );

  const isPoliceReached =
    isCompletedDossier ||
    (!isDubai &&
      ["police", "pcc", "payment", "deposit", "mofa", "visa", "manpower", "flight"].some((s) =>
        currentStageNorm.includes(s)
      ));

  const isOfferLetterReached =
    isCompletedDossier ||
    (isDubai &&
      ["offer", "approval", "mohre", "visa", "manpower", "flight"].some((s) =>
        currentStageNorm.includes(s)
      ));

  const isVisaReached =
    isCompletedDossier ||
    ["visa", "e-visa", "second payment", "final payment", "manpower", "flight"].some((s) =>
      currentStageNorm.includes(s)
    );

  const isManpowerReached =
    isCompletedDossier ||
    ["manpower", "bmet", "flight"].some((s) => currentStageNorm.includes(s));

  const isFlightReached =
    isCompletedDossier ||
    ["flight", "departure", "ticket"].some((s) => currentStageNorm.includes(s));

  const rawDocumentChecklist = [
    {
      id: "passport_front",
      category: "Passport Document",
      name: "Original Passport Copy (Bio-Page)",
      requirement: "High-resolution color scan of candidate MRP / E-Passport (Bio-data page)",
      file: passportScanFile,
      isSystemVerified: Boolean(resolvedPassportNo && resolvedPassportNo !== "N/A" && resolvedPassportNo !== "—"),
      systemSummary: `Passport No: ${resolvedPassportNo} · ${passport.passportStatus || "Verified in System"}`,
      isRequired: true,
      isStageReached: true,
      missingReason: "Original passport scan pending upload to central agency vault.",
      actionPrompt: "Collect and upload scanned copy from candidate.",
    },
    {
      id: "passport_back",
      category: "Passport Document",
      name: "Passport Back Page (Emergency Address)",
      requirement: "Scan of passport back page showing permanent address and emergency details",
      file: passportBackScanFile,
      isSystemVerified: Boolean(passport.address || passport.emergencyContact || cand.address),
      systemSummary: "Permanent Address & Emergency Details Recorded",
      isRequired: false,
      isStageReached: true,
      missingReason: "Back page scan not attached.",
      actionPrompt: "Provide back page scan for complete record verification.",
    },
    {
      id: "candidate_photo",
      category: "Candidate Identity",
      name: "Official Passport-Size Photo",
      requirement: "Digital studio photograph with white background for embassy and visa application",
      file: candidatePhotoFile,
      isSystemVerified: Boolean(cand.photo),
      systemSummary: "Studio Profile Photo Registered",
      isRequired: true,
      isStageReached: true,
      missingReason: "Digital lab passport photograph pending upload.",
      actionPrompt: "Collect white background studio photo from candidate.",
    },
    {
      id: "nid_card",
      category: "Candidate Identity",
      name: "National ID (NID / Smart Card)",
      requirement: "10 or 17 digit Bangladesh Government NID card scan copy",
      file: nidCardFile,
      isSystemVerified: Boolean(cand.nationalId || passport.nid),
      systemSummary: `Govt NID: ${cand.nationalId || passport.nid}`,
      isRequired: true,
      isStageReached: true,
      missingReason: "Candidate Bangladesh NID card copy not uploaded.",
      actionPrompt: "Upload color copy of National ID card.",
    },
    {
      id: "medical_slip",
      category: "Medical & Fitness",
      name: "GCC GAMCA Medical Fitness Certificate",
      requirement: "Authorized GCC center medical examination slip & fit report certificate",
      file: medicalReportFile,
      isSystemVerified: hasMedRecord,
      systemSummary: `${medRec?.result || "Fit"} · ${medRec?.center || "Authorized GCC Medical Center"}${medRec?.expiryDate ? ` (Valid till ${new Date(medRec.expiryDate).toLocaleDateString("en-GB")})` : ""}`,
      isRequired: true,
      isStageReached: isMedicalReached,
      missingReason: "GAMCA medical fitness certificate pending.",
      actionPrompt: "Ensure candidate completes checkup and submits GAMCA report.",
    },
    ...(isDubai
      ? [
          {
            id: "police_pcc",
            category: "Police Verification",
            name: "Police Clearance Certificate (PCC)",
            requirement: "Not required by UAE MOHRE for Dubai work visas",
            file: null,
            isSystemVerified: true,
            systemSummary: "Exempt for Dubai destination (Not required by UAE MOHRE)",
            isRequired: false,
            isNotRequired: true,
            isStageReached: true,
            missingReason: "Exempt for Dubai destination.",
            actionPrompt: "No action required.",
          },
          {
            id: "offer_letter",
            category: "Labor & Offer",
            name: "MOHRE Labor Approval & Offer Letter",
            requirement: "Candidate signed MOHRE employment contract and labor ministry approval",
            file: offerLetterFile,
            isSystemVerified: Boolean(
              fileData?.currentStage &&
              ["OFFER_LETTER", "Offer Letter", "Approval Application", "Visa Stamping", "Manpower", "Flight", "COMPLETED"].some((s) =>
                (fileData?.currentStage || "").toLowerCase().includes(s.toLowerCase())
              )
            ),
            systemSummary: "MOHRE Labor Approval & Signed Employment Contract Active",
            isRequired: true,
            isStageReached: isOfferLetterReached,
            missingReason: "Signed offer letter copy not uploaded yet.",
            actionPrompt: "Upload signed contract copy once released by employer.",
          },
        ]
      : [
          {
            id: "police_pcc",
            category: "Police Verification",
            name: "Police Clearance Certificate (PCC)",
            requirement: "MOFA & Special Branch attested Police Clearance Certificate",
            file: policeClearanceFile,
            isSystemVerified: hasPoliceRecord,
            systemSummary: `Approved · Ref: ${policeRec?.applicationNumber || "PCC-APPROVED"}`,
            isRequired: true,
            isStageReached: isPoliceReached,
            missingReason: "Police clearance certificate (PCC) not uploaded.",
            actionPrompt: "Collect valid police verification certificate from candidate.",
          },
        ]),
    {
      id: "visa_copy",
      category: "Visa Endorsement",
      name: isDubai ? "Dubai Electronic Entry Permit (E-Visa)" : "Embassy Visa Stamped Copy",
      requirement: "Official stamped visa copy or electronic entry permit issued by immigration",
      file: visaScanFile,
      isSystemVerified: hasVisaRecord,
      systemSummary: `Visa Done · No: ${visaRec?.visaNumber || visaRec?.visaNo || "Issued in Central Registry"}`,
      isRequired: true,
      isStageReached: isVisaReached,
      missingReason: "Visa document not uploaded yet (Pending Visa Issuance).",
      actionPrompt: "Will be attached by central visa processing desk upon stamping.",
    },
    {
      id: "bmet_card",
      category: "Immigration Clearance",
      name: "BMET Manpower Smart Card",
      requirement: "Government Bureau of Manpower, Employment and Training smart card scan",
      file: manpowerCardFile,
      isSystemVerified: hasManpowerRecord,
      systemSummary: `BMET Cleared · Smart Card: ${manpowerRec?.reference || manpowerRec?.smartCardNo || "Approved"}`,
      isRequired: true,
      isStageReached: isManpowerReached,
      missingReason: "BMET smart card scan not uploaded (Pending Manpower Clearance).",
      actionPrompt: "Will be uploaded after BMET government fingerprint clearance.",
    },
    {
      id: "flight_ticket",
      category: "Travel & Ticket",
      name: "Confirmed Air Flight E-Ticket",
      requirement: "Airlines confirmed booking e-ticket itinerary with PNR number",
      file: flightTicketFile,
      isSystemVerified: hasFlightRecord,
      systemSummary: `Confirmed Departure · ${flightRec?.ticketNo ? `Ticket: ${flightRec.ticketNo}` : "Flight Booked"}${flightRec?.flight?.airline || flightRec?.flight?.flightNo ? ` (${flightRec?.flight?.airline || ""} ${flightRec?.flight?.flightNo || ""})`.trim() : ""}`,
      isRequired: true,
      isStageReached: isFlightReached,
      missingReason: "Air flight ticket not booked or uploaded yet.",
      actionPrompt: "Will be attached upon confirmed flight itinerary booking.",
    },
  ];

  const documentChecklist = rawDocumentChecklist.map((item) => {
    const isUploaded = Boolean(item.file);
    const isSystemVerified = Boolean(item.isSystemVerified);
    const isExempt = Boolean(item.isNotRequired);
    const isReady = isUploaded || isSystemVerified || isExempt;
    const isStageReached = Boolean(item.isStageReached);
    const isMissing = !isReady && isStageReached && item.isRequired && !isExempt;
    const isPendingStage = !isReady && !isStageReached && !isExempt;

    return {
      ...item,
      isUploaded,
      isSystemVerified,
      isExempt,
      isReady,
      isMissing,
      isPendingStage,
    };
  });

  const missingFiles = documentChecklist.filter((d) => d.isMissing);
  const readyFiles = documentChecklist.filter((d) => d.isReady && !d.isExempt);
  const coreRequiredCount = documentChecklist.filter((d) => d.isRequired && !d.isExempt).length;
  const uploadedFiles = documentChecklist.filter((d) => d.isUploaded);

  if (isLoading || !fileData) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center", display: "grid", placeItems: "center" }}>
        <div className="portal-section-card" style={{ padding: "40px 60px", maxWidth: "480px" }}>
          <RefreshCw className="animate-spin" size={32} color="#007aff" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
            Loading Candidate Dossier...
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Fetching verified candidate bio-data, document status, and financial statement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="agent-portal-design portal-dossier"
      style={{
        padding: "0 0 60px",
        maxWidth: "1600px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* 1. TOP HEADER & BACK NAVIGATION */}
      <div className="portal-page-heading">
        <Link
          className="portal-back-link"
          href={portalAgentId ? `/portal/agent?agentId=${encodeURIComponent(portalAgentId)}` : "/portal/agent"}
        >
          <ArrowLeft size={14} /> Back to agent portal
        </Link>
        <span className="portal-access">
          <Lock size={12} /> Read-only access
        </span>
      </div>

      {/* 2. CANDIDATE PROFILE HERO HEADER */}
      <section className="portal-hero" aria-label="Candidate profile">
        <div className="portal-identity">
          <div className="portal-avatar">
            {cand.photo ? (
              <Image
                src={cand.photo}
                alt={cand.fullName || "Candidate"}
                width={60}
                height={60}
                unoptimized
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px" }}
              />
            ) : (
              (cand.fullName || "CA").slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="portal-partner-info">
            <div className="portal-partner-meta">
              <span className="portal-code">{cand.candidateNo || fileData.fileNo}</span>
              <span className="portal-status is-active">
                {fileData.currentStage?.replace(/[_-]+/g, " ") || "Active Dossier"}
              </span>
            </div>

            <h1>{cand.fullName || "Unnamed Candidate"}</h1>

            <div className="portal-contact">
              <span>
                <FileText size={13} /> {fileData.fileNo}
              </span>
              <span>
                <ShieldCheck size={13} /> {resolvedPassportNo || "Passport not available"}
              </span>
              <span>
                <Globe size={13} /> {fileData.country || "—"}
              </span>
              <span>
                <Briefcase size={13} /> {fileData.profession || "—"}
              </span>
              <span>
                <Phone size={13} /> {cand.phone || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="portal-hero-actions">
          <button
            type="button"
            className="portal-button"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />{" "}
            {isRefetching ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="portal-button portal-button-primary"
            onClick={() => window.print()}
          >
            <Printer size={14} /> Print Dossier
          </button>
        </div>
      </section>

      {/* 3. STAGE PROCESSING PIPELINE (PROGRESS WORKFLOW - MATCHING REQUIREMENTS PANEL) */}
      {(() => {
        const matchedCountry = (countriesQuery.data as any[])?.find((c: any) => {
          const cName = (c.name || "").toLowerCase();
          const cCode = (c.code || "").toLowerCase();
          const fName = (fileData.country || "").toLowerCase();
          if (!fName) return false;
          return cName === fName || cCode === fName || fName.includes(cName) || cName.includes(fName);
        });

        // Stage aliases for matching current file status to pipeline step
        const getStageAliases = (code?: string, id?: string, label?: string): string[] => {
          const list: string[] = [];
          if (id) list.push(id.toLowerCase());
          if (label) list.push(label.toLowerCase());
          switch (code) {
            case "PASSPORT":
              list.push("passport", "passport entry", "pp", "passport scan", "passport validity");
              break;
            case "MEDICAL":
              list.push("medical", "gamca", "fitness", "fit result", "medical fitness");
              break;
            case "PCC":
              list.push("police", "pcc", "police clearance", "police pcc", "police verification");
              break;
            case "PAYMENT":
              list.push("payment", "deposit", "first payment", "second payment", "pending 2nd payment", "pending second payment", "fee", "deposits & fee");
              break;
            case "TAKAMUL":
              list.push("takamul", "svp", "skill test", "svp skill test");
              break;
            case "MOFA":
              list.push("mofa", "enjaz", "embassy", "visa / mofa", "visa mofa", "embassy stamp");
              break;
            case "LABOR_APPROVAL":
              list.push("approval application", "offer letter", "offer_letter", "labor approval", "mohre", "work permit");
              break;
            case "VISA_STAMPING":
              list.push("visa", "visa stamping", "e-visa stamping", "e-visa", "evisa", "entry visa", "visa done");
              break;
            case "MANPOWER":
              list.push("manpower", "bmet", "smart card", "bmet smart card");
              break;
            case "FLIGHT":
              list.push("flight", "departure", "flight departure", "ticket", "ready to flight", "ready for flight", "ticket & depart");
              break;
            default:
              break;
          }
          return [...new Set(list)];
        };

        let stagesList: { id: string; code?: string; label: string; subtitle?: string; aliases: string[] }[] = [];

        if (matchedCountry?.workflow && Array.isArray(matchedCountry.workflow) && matchedCountry.workflow.length > 0) {
          const activeWorkflow = matchedCountry.workflow
            .filter((w: any) => w.active !== false)
            .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

          if (activeWorkflow.length > 0) {
            stagesList = activeWorkflow.map((w: any) => {
              const masterDef = MASTER_STAGES.find((s) => s.code === w.code);
              const stageId = masterDef ? masterDef.id : (w.name || w.code);
              const stageLabel = w.name || masterDef?.label || "Stage";
              return {
                id: stageId,
                code: w.code,
                label: stageLabel,
                subtitle: w.subtitle || masterDef?.subtitle || "",
                aliases: getStageAliases(w.code, stageId, stageLabel),
              };
            });
          }
        }

        if (stagesList.length === 0) {
          const defStages = getDefaultStagesForCountry(fileData.country || "Oman", matchedCountry?.workflowType);
          stagesList = defStages.map((s) => ({
            id: s.id,
            code: s.code,
            label: s.label,
            subtitle: s.subtitle,
            aliases: getStageAliases(s.code, s.id, s.label),
          }));
        }

        const currentStageRaw = fileData.currentStage || "Passport Entry";
        const matchStage = (stageObj: { id: string; label: string; code?: string; aliases: string[] }, target: string) => {
          if (!target) return false;
          const norm = target.trim().toLowerCase().replace(/[_\s-]+/g, " ");
          if (stageObj.id.toLowerCase().replace(/[_\s-]+/g, " ") === norm) return true;
          if (stageObj.label.toLowerCase().replace(/[_\s-]+/g, " ") === norm) return true;
          if (stageObj.code && stageObj.code.toLowerCase().replace(/[_\s-]+/g, " ") === norm) return true;
          return stageObj.aliases.some((a) => {
            const aNorm = a.toLowerCase().replace(/[_\s-]+/g, " ");
            return aNorm === norm || norm.includes(aNorm) || aNorm.includes(norm);
          });
        };

        const isStageDataComplete = (stageCode?: string, stageId?: string): boolean => {
          const code = (stageCode || "").toUpperCase();
          const idNorm = (stageId || "").toLowerCase();

          if (code === "PASSPORT" || idNorm.includes("passport")) {
            return Boolean(resolvedPassportNo || cand?.passportNo || passport?.passportNumber);
          }
          if (code === "MEDICAL" || idNorm.includes("medical")) {
            return Boolean(medical?.fitnessStatus || medical?.centerName || (fileData?.medical && fileData.medical.length > 0));
          }
          if (code === "PCC" || idNorm.includes("police")) {
            return Boolean(police?.certificateNo || (fileData?.police && fileData.police.length > 0));
          }
          if (code === "PAYMENT" || idNorm.includes("payment")) {
            return Boolean((fileData?.totalPaid || 0) > 0 || (payments && payments.length > 0));
          }
          if (code === "TAKAMUL" || idNorm.includes("takamul")) {
            return Boolean(takamul?.certificateNo || (fileData?.takamul && fileData.takamul.length > 0));
          }
          if (code === "MOFA" || idNorm.includes("mofa")) {
            return Boolean(mofa?.mofaNumber || (fileData?.mofa && fileData.mofa.length > 0) || (fileData?.visas && fileData.visas.length > 0));
          }
          if (code === "LABOR_APPROVAL" || idNorm.includes("approval") || idNorm.includes("offer")) {
            return Boolean(visa?.visaNumber || (fileData?.visas && fileData.visas.length > 0));
          }
          if (code === "VISA_STAMPING" || idNorm.includes("visa")) {
            return Boolean(visa?.visaNumber || (fileData?.visas && fileData.visas.some((v: any) => v.visaNumber && v.status !== "Rejected")));
          }
          if (code === "MANPOWER" || idNorm.includes("manpower")) {
            return Boolean(manpower?.cardNo || (fileData?.manpower && fileData.manpower.length > 0));
          }
          if (code === "FLIGHT" || idNorm.includes("flight")) {
            return Boolean(flight?.ticketNumber || (fileData?.flights && fileData.flights.length > 0) || fileData?.status === "COMPLETED");
          }
          return false;
        };

        const isFileCompleted = fileData?.status === "COMPLETED" || (currentStageRaw.toLowerCase().includes("flight") && (fileData?.flights?.length > 0 || flight?.ticketNumber));
        const currentIdx = stagesList.findIndex((st) => matchStage(st, currentStageRaw));

        const completedCount = stagesList.filter((st, idx) => {
          if (isFileCompleted) return true;
          if (currentIdx !== -1 && idx < currentIdx) return true;
          return isStageDataComplete(st.code, st.id);
        }).length;
        const progressPercent = Math.min(100, Math.round((completedCount / stagesList.length) * 100));

        return (
          <div className="portal-section-card">
            <div className="portal-card-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div>
                <h3 className="portal-card-title" style={{ fontSize: "14px" }}>
                  Stage Processing Pipeline (Progress Workflow)
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Recruitment milestone progress for {fileData.country || "Overseas Deployment"} • Stage {currentIdx !== -1 ? currentIdx + 1 : 1} of {stagesList.length} (✓ {completedCount} of {stagesList.length} Milestones Done, {progressPercent}%)
                </span>
              </div>

              <span className="portal-card-badge success" style={{ borderRadius: "9999px" }}>
                Current Active Milestone: <b>{fileData.currentStage?.replace(/[_-]+/g, " ") || "Active"}</b>
              </span>
            </div>

            <div className="portal-scroll" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" }}>
              {stagesList.map((st, idx) => {
                const isMatch = matchStage(st, currentStageRaw);
                const isPastStage = currentIdx !== -1 ? idx < currentIdx : false;
                const hasData = isStageDataComplete(st.code, st.id);

                let isDone = isFileCompleted || isPastStage || hasData;
                let isCurrent = !isFileCompleted && (currentIdx !== -1 ? idx === currentIdx : isMatch);

                if (isCurrent && !isFileCompleted && currentIdx !== stagesList.length - 1) {
                  isDone = false;
                }

                return (
                  <div
                    className="portal-card portal-pipeline-step"
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
        );
      })()}

      {/* 4. FINANCIAL LEDGER STRIP CARDS (MATCHING REQUIREMENTS PANEL) */}
      <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
        {/* CARD 1: TOTAL AMOUNT PAID */}
        <div
          className="portal-financial-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #bbf7d0",
            padding: "18px 20px",
            position: "relative",
            boxShadow: "0 2px 4px rgba(22, 163, 74, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              TOTAL AMOUNT PAID
            </span>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#16a34a",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              ৳
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#16a34a", lineHeight: "1.2", marginBottom: "4px" }}>
            ৳{Number(fileData.totalPaid || 0).toLocaleString()} <span style={{ fontSize: "14px", fontWeight: 600, color: "#15803d" }}>BDT</span>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} color="#16a34a" /> Collected deposits in agency vault
          </span>
        </div>

        {/* CARD 2: CONTRACT PACKAGE */}
        <div
          className="portal-financial-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            position: "relative",
            boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                CONTRACT PACKAGE
              </span>
              {Number(fileData.discount || 0) > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#059669",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  (Disc: -৳{Number(fileData.discount).toLocaleString()})
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", lineHeight: "1.2", marginBottom: "4px" }}>
            ৳{Number(fileData.packageCost || 0).toLocaleString()} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>BDT</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
              📋 {fileData.packageTitle || (isDubai ? "Warehouse Assistant Package" : "General Work Visa")}
            </span>
            {Number(fileData.discount || 0) > 0 && (
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Gross: ৳{Number(fileData.grossPackage || ((fileData.packageCost || 0) + (fileData.discount || 0))).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* CARD 3: REMAINING DUE */}
        <div
          className="portal-financial-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: Number(fileData.dueAmount || 0) > 0 ? "1px solid #fecaca" : "1px solid #bbf7d0",
            padding: "18px 20px",
            position: "relative",
            boxShadow: Number(fileData.dueAmount || 0) > 0 ? "0 2px 4px rgba(220, 38, 38, 0.05)" : "0 2px 4px rgba(22, 163, 74, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: Number(fileData.dueAmount || 0) > 0 ? "#b91c1c" : "#15803d",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {Number(fileData.advanceAmount || 0) > 0 ? "ADVANCE EXTRA" : Number(fileData.dueAmount || 0) > 0 ? "REMAINING DUE" : "PAYMENT STATUS"}
            </span>
          </div>
          <div
            style={{
              fontSize: Number(fileData.dueAmount || 0) > 0 ? "24px" : "20px",
              fontWeight: 700,
              color: Number(fileData.dueAmount || 0) > 0 ? "#dc2626" : "#16a34a",
              lineHeight: "1.2",
              marginBottom: "4px",
            }}
          >
            {Number(fileData.advanceAmount || 0) > 0
              ? `+৳${Number(fileData.advanceAmount).toLocaleString()} BDT`
              : Number(fileData.dueAmount || 0) > 0
              ? `৳${Number(fileData.dueAmount).toLocaleString()} BDT`
              : "100% Fully Settled (Zero Due)"}
          </div>
          <span style={{ fontSize: "12px", color: Number(fileData.dueAmount || 0) > 0 ? "#b91c1c" : "#166534" }}>
            {Number(fileData.dueAmount || 0) > 0 ? "Pending candidate balance settlement" : "✓ Candidate account fully cleared"}
          </span>
        </div>
      </div>

      {/* QUICK DEPOSIT RECEIPT BANNER IF RECENT PAYMENTS EXIST */}
      {payments.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "12.5px",
            marginTop: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "#0f172a" }}>
              Latest Deposit: {payments[0].type || "Payment Deposit"}
            </span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ color: "#64748b" }}>
              {formatDate(payments[0].collectedAt || payments[0].createdAt)} · {payments[0].method || "Cash at Office"}
            </span>
            <span style={{ color: "#cbd5e1" }}>·</span>
            <span style={{ fontWeight: 700, color: "#16a34a" }}>
              ৳{Number(payments[0].amount).toLocaleString()} BDT
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => openPrintReceipt(undefined, true)}
              className="portal-print-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#334155",
              }}
              title="Print Consolidated Master Money Receipt"
            >
              <Printer size={13} /> Print Master Receipt
            </button>
            <button
              type="button"
              onClick={() => openPrintReceipt(payments[0])}
              className="portal-print-btn portal-print-btn-blue"
              title="Print Official Deposit Money Receipt Voucher"
            >
              <Printer size={13} /> Print Deposit Receipt
            </button>
          </div>
        </div>
      )}

      {/* 5. 🚨 DOCUMENT COMPLIANCE & REQUIRED FILES CHECKLIST (MATCHING REQUIREMENTS PANEL DOCUMENT VAULT) */}
      <div className="portal-section-card" id="section-docs-checklist">
        <div className="portal-card-header">
          <div>
            <h3 className="portal-card-title" style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileCheck size={18} color="#007aff" />
              Document Compliance &amp; File Status Checklist
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Comprehensive verification audit across physical document scans and central operational records
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {missingFiles.length > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <FileWarning size={13} color="#dc2626" />
                {missingFiles.length} {missingFiles.length === 1 ? "File Action Required" : "Files Action Required"}
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={13} color="#16a34a" />
                {readyFiles.length}/{coreRequiredCount} Documents Ready &amp; Verified (100% Complete)
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "20px",
                background: "#eff6ff",
                color: "#007aff",
                border: "1px solid #bfdbfe",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} Scans Uploaded` : `${readyFiles.length} Ready in System`}
            </span>
          </div>
        </div>

        <div className="portal-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "820px", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>
                  Required Document
                </th>
                <th style={{ padding: "10px 14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>
                  Category &amp; Requirement
                </th>
                <th style={{ padding: "10px 14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>
                  Status
                </th>
                <th style={{ padding: "10px 14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>
                  Current State / Operational Record
                </th>
                <th style={{ padding: "10px 14px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px", textAlign: "right" }}>
                  File Action
                </th>
              </tr>
            </thead>
            <tbody>
              {documentChecklist.map((item) => {
                const isUploaded = Boolean(item.isUploaded);
                const isSystemVerified = Boolean(item.isSystemVerified);
                const isExempt = Boolean(item.isExempt);
                const isPendingStage = Boolean(item.isPendingStage);
                const isMissing = Boolean(item.isMissing);

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isMissing ? "#fffbfb" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: isUploaded || isSystemVerified ? "#ecfdf5" : isExempt ? "#f1f5f9" : isPendingStage ? "#eff6ff" : "#fef2f2",
                            color: isUploaded || isSystemVerified ? "#16a34a" : isExempt ? "#64748b" : isPendingStage ? "#2563eb" : "#dc2626",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isUploaded || isSystemVerified ? <FileCheck size={16} /> : isExempt ? <CheckCircle2 size={15} /> : isPendingStage ? <Clock size={15} /> : <FileWarning size={16} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>{item.name}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{item.category}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 14px", color: "#475569", maxWidth: "260px" }}>
                      {item.requirement}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      {isUploaded ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#16a34a",
                            background: "#f0fdf4",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <CheckCircle2 size={12} /> Uploaded
                        </span>
                      ) : isSystemVerified ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#059669",
                            background: "#ecfdf5",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <CheckCircle2 size={12} /> Ready in System
                        </span>
                      ) : isExempt ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#64748b",
                            background: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          Not Required
                        </span>
                      ) : isPendingStage ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#2563eb",
                            background: "#eff6ff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          <Clock size={12} /> Pending Stage
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#dc2626",
                            background: "#fef2f2",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <AlertCircle size={12} /> File Missing
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                      {isUploaded ? (
                        <div>
                          <span style={{ color: "#0f172a", fontWeight: 600, display: "block" }}>
                            {item.file?.fileName || "Document Verified"}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>{item.file?.size || "In Central Agency Vault"}</span>
                        </div>
                      ) : isSystemVerified ? (
                        <div>
                          <span style={{ color: "#065f46", fontWeight: 600, display: "block" }}>
                            Verified in Central System
                          </span>
                          <span style={{ color: "#047857", fontSize: "11px" }}>{item.systemSummary}</span>
                        </div>
                      ) : isExempt ? (
                        <div>
                          <span style={{ color: "#64748b", fontWeight: 400, display: "block" }}>
                            Exempt for destination
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>Not required by UAE MOHRE</span>
                        </div>
                      ) : isPendingStage ? (
                        <div>
                          <span style={{ color: "#1e40af", fontWeight: 600, display: "block" }}>
                            Milestone in-flight
                          </span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>Will be verified once milestone is reached</span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: "#dc2626", fontWeight: 600, display: "block" }}>
                            {item.missingReason}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>{item.actionPrompt}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {isUploaded && item.file?.url ? (
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                name: item.file?.fileName || item.name,
                                type: item.name,
                                fileData: item.file?.url,
                              })
                            }
                            className="portal-print-btn portal-print-btn-blue"
                          >
                            <Eye size={12} /> View
                          </button>
                          <a
                            href={item.file.url}
                            download={item.file.fileName || `${item.name}.pdf`}
                            className="portal-toolbar-btn"
                            title="Download document"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      ) : isSystemVerified ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#059669",
                            background: "#ecfdf5",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : isExempt ? (
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                      ) : isPendingStage ? (
                        <span style={{ color: "#64748b", fontSize: "11px" }}>Awaiting Stage</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 700 }}>
                          Action Required
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. TABLE FILTER JUMP PILLS */}
      <div className="portal-jump-pills portal-scroll">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#64748b", padding: "0 8px" }}>
          <Filter size={14} /> Quick Filter:
        </span>

        {[
          { id: "all", label: "Show All Sections" },
          { id: "bio", label: "1. Bio-Data & Passport" },
          { id: "medical", label: "2. Medical & Fitness" },
          ...(isDubai
            ? [{ id: "visa", label: "3. MOHRE Labor & Dubai E-Visa" }]
            : [{ id: "visa", label: isSaudi ? "3. Saudi MOFA & Visa Stamping" : "3. Visa Stamping" }]),
          { id: "manpower", label: "4. BMET Manpower & Departure" },
          { id: "payment", label: "5. Payment Deposits & Receipts" },
          ...(cand.education || cand.experience || educations.length > 0 || experiences.length > 0
            ? [{ id: "education", label: "6. Education & Work Experience" }]
            : []),
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            aria-pressed={activeSection === pill.id}
            onClick={() => setActiveSection(pill.id)}
            className={`portal-jump-btn ${activeSection === pill.id ? "active" : ""}`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* 7. CONSOLIDATED DETAILS SECTIONS (DYNAMIC - NO UNNECESSARY EMPTY DUMMY CARDS) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* SECTION 1: CANDIDATE BIO-DATA & PASSPORT RECORD */}
        {shouldShow("bio") && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">1. Candidate Bio-Data &amp; Passport Record</h3>
              <span className={`portal-card-badge ${resolvedPassportNo ? "success" : "warning"}`}>
                {resolvedPassportNo ? "Verified in Central Registry" : "Pending Passport Submission"}
              </span>
            </div>

            <div className="portal-field-grid">
              <div className="portal-field-item">
                <label>Full Legal Name</label>
                <b>{cand.fullName || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Father&apos;s Name</label>
                <b>{cand.fatherName || passport.fatherName || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Mother&apos;s Name</label>
                <b>{cand.motherName || passport.motherName || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Date of Birth / Age</label>
                <b>
                  {formatDate(cand.dob || passport.dob)}{" "}
                  {cand.age || passport.age ? `(${cand.age || passport.age} yrs)` : ""}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Gender / Religion</label>
                <b>
                  {cand.gender || passport.gender || "Male"} • {cand.religion || "Muslim"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Marital Status</label>
                <b>{cand.maritalStatus || passport.maritalStatus || "Single"}</b>
              </div>
              <div className="portal-field-item">
                <label>District / Division</label>
                <b>
                  {cand.district || passport.district || "—"}
                  {cand.division ? `, ${cand.division}` : ""}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Candidate Phone</label>
                <b style={{ color: "#007aff" }}>{cand.phone || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>National ID (NID)</label>
                <b className="mono">{cand.nationalId || passport.nid || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Emergency Contact</label>
                <b>{cand.emergencyContact || cand.emergencyPhone || passport.emergencyContact?.phone || "—"}</b>
              </div>
              <div className="portal-field-item full-width">
                <label>Permanent Address</label>
                <span className="field-val">{cand.address || passport.address || "—"}</span>
              </div>
            </div>

            <div style={{ margin: "20px 0 16px", borderTop: "1px solid #f1f5f9" }} />

            <div className="portal-field-grid">
              <div className="portal-field-item">
                <label>Passport Number</label>
                <b className="mono" style={{ fontSize: "14px", color: "#007aff" }}>
                  {resolvedPassportNo || "—"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Issue Date</label>
                <b>{formatDate(passport.issueDate)}</b>
              </div>
              <div className="portal-field-item">
                <label>Expiry Date</label>
                <b style={{ color: passport.expiryDate ? "#16a34a" : "#0f172a" }}>
                  {formatDate(passport.expiryDate)}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Place of Issue / Authority</label>
                <b>{passport.issuePlace || passport.placeOfIssue || passport.issuingAuthority || "DIP Bangladesh"}</b>
              </div>
              <div className="portal-field-item">
                <label>Physical Vault Status</label>
                <b style={{ color: resolvedPassportNo ? "#16a34a" : "#d97706" }}>
                  {resolvedPassportNo ? "Stored in Secure Vault (Verified)" : "Pending Original"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Digital Scan File</label>
                {passportScanFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        name: passportScanFile.fileName,
                        type: "Passport Copy",
                        fileData: passportScanFile.url,
                      })
                    }
                    className="portal-print-btn portal-print-btn-blue"
                  >
                    <Eye size={12} /> View Passport Scan
                  </button>
                ) : (
                  <span style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600 }}>
                    ⚠ File Missing (Scan Pending)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: MEDICAL EXAMINATION & GAMCA FITNESS */}
        {shouldShow("medical") && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">2. Medical Examination &amp; GCC GAMCA Fitness</h3>
              <span
                className={`portal-card-badge ${
                  medical.result && medical.result !== "Pending"
                    ? medical.result === "FIT" || medical.result === "Passed"
                      ? "success"
                      : "danger"
                    : "warning"
                }`}
              >
                {medical.result || "Pending Medical Examination"}
              </span>
            </div>

            <div className="portal-field-grid">
              <div className="portal-field-item">
                <label>Medical Center</label>
                <b>{medical.center || "Authorized Medical Center (Pending Slot)"}</b>
              </div>
              <div className="portal-field-item">
                <label>GCC Slip No / Token</label>
                <b className="mono">{medical.slipNo || medical.certificateNo || "Pending GCC Token"}</b>
              </div>
              <div className="portal-field-item">
                <label>Test Exam Date</label>
                <b>{formatDate(medical.testDate)}</b>
              </div>
              <div className="portal-field-item">
                <label>GAMCA Validity Expiry</label>
                <b style={{ color: medical.expiryDate ? "#16a34a" : "#64748b" }}>
                  {formatDate(medical.expiryDate)}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Result Outcome</label>
                <b
                  style={{
                    color:
                      medical.result && medical.result !== "Pending"
                        ? medical.result === "FIT" || medical.result === "Passed"
                          ? "#16a34a"
                          : "#dc2626"
                        : "#d97706",
                  }}
                >
                  {medical.result ? `${medical.result} Result` : "Pending Medical Checkup"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Medical Certificate Scan</label>
                {medicalReportFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        name: medicalReportFile.fileName,
                        type: "GAMCA Medical Certificate",
                        fileData: medicalReportFile.url,
                      })
                    }
                    className="portal-voucher-btn"
                  >
                    <Eye size={12} /> View Medical Certificate
                  </button>
                ) : (
                  <span style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600 }}>
                    ⚠ File Missing (Medical Report Pending)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: VISA & WORK PERMIT PROCESSING (100% DYNAMIC - NO FAKE HARDCODED MB-881290) */}
        {shouldShow("visa") && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">
                {isDubai
                  ? "3. MOHRE Labor Approval & Dubai E-Visa"
                  : isSaudi
                  ? "3. Saudi MOFA & Visa Stamping"
                  : "3. Visa Stamping & Embassy Visa"}
              </h3>
              <span
                className={`portal-card-badge ${
                  visa.visaNumber || visa.visaNo
                    ? "info"
                    : fileData.currentStage === "OFFER_LETTER"
                    ? "info"
                    : "warning"
                }`}
              >
                {visa.visaNumber || visa.visaNo
                  ? "Visa Issued"
                  : fileData.currentStage === "OFFER_LETTER"
                  ? "Offer Letter Processing"
                  : "Pending Visa Stamping"}
              </span>
            </div>

            <div className="portal-field-grid">
              <div className="portal-field-item">
                <label>Sponsoring Employer / Company</label>
                <b>{fileData.company || fileData.companyRecord?.name || "Company Allocation in Progress"}</b>
              </div>
              <div className="portal-field-item">
                <label>Trade / Profession</label>
                <b>{fileData.profession || cand.profession || "General Work"}</b>
              </div>
              <div className="portal-field-item">
                <label>Demand Quota Reference</label>
                <b className="mono">{fileData.demand || fileData.demandRecord?.demandNumber || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>{isDubai ? "E-Visa / Permit Number" : "Visa Number"}</label>
                <b className="mono" style={{ color: visa.visaNumber || visa.visaNo ? "#007aff" : "#64748b" }}>
                  {visa.visaNumber || visa.visaNo || "Pending Issuance"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Stamping / Issue Date</label>
                <b>{formatDate(visa.issueDate)}</b>
              </div>
              <div className="portal-field-item">
                <label>Visa Expiry Date</label>
                <b style={{ color: visa.expiryDate ? "#16a34a" : "#64748b" }}>
                  {formatDate(visa.expiryDate)}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Issuing Authority</label>
                <b>
                  {isDubai
                    ? "GDRFA Dubai (General Directorate of Residency)"
                    : isSaudi
                    ? "Royal Embassy of Saudi Arabia"
                    : "Destination Embassy"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Visa Document File</label>
                {visaScanFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        name: visaScanFile.fileName,
                        type: "Visa Document",
                        fileData: visaScanFile.url,
                      })
                    }
                    className="portal-print-btn portal-print-btn-blue"
                  >
                    <Eye size={12} /> View Visa Document
                  </button>
                ) : (
                  <span style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600 }}>
                    ⚠ File Missing (Pending Visa Issuance)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: BMET MANPOWER & FLIGHT DEPARTURE */}
        {shouldShow("manpower") && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">4. BMET Manpower Clearance &amp; Flight Departure</h3>
              <span
                className={`portal-card-badge ${
                  flight.flightNo || flight.ticketNo
                    ? "success"
                    : manpower.status === "Approved" || manpower.status === "Issued"
                    ? "info"
                    : "warning"
                }`}
              >
                {flight.flightNo || flight.ticketNo
                  ? "Flight Ticket Confirmed"
                  : manpower.status === "Approved" || manpower.status === "Issued"
                  ? "Manpower Approved"
                  : "Pending Manpower Clearance"}
              </span>
            </div>

            <div className="portal-field-grid">
              <div className="portal-field-item">
                <label>BMET Smart Card No</label>
                <b className="mono">{manpower.smartCardNo || manpower.reference || "Pending Issuance"}</b>
              </div>
              <div className="portal-field-item">
                <label>BMET Clearance Ref</label>
                <b className="mono">{manpower.regNo || manpower.reference || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Clearance Date</label>
                <b>{formatDate(manpower.clearanceDate || manpower.approvedAt)}</b>
              </div>
              <div className="portal-field-item">
                <label>Pre-Departure Briefing</label>
                <b
                  style={{
                    color:
                      manpower.status === "Approved" || manpower.status === "Issued"
                        ? "#16a34a"
                        : "#d97706",
                  }}
                >
                  {manpower.status === "Approved" || manpower.status === "Issued"
                    ? "Completed (Orientation Passed)"
                    : "Pending Briefing Session"}
                </b>
              </div>

              <div className="portal-field-item">
                <label>Airline Carrier</label>
                <b>{flight.airline || "Pending Flight Booking"}</b>
              </div>
              <div className="portal-field-item">
                <label>Flight Number</label>
                <b className="mono">{flight.flightNo || "—"}</b>
              </div>
              <div className="portal-field-item">
                <label>Departure Date &amp; Time</label>
                <b>{formatDate(flight.departureAt || flight.departureDate)}</b>
              </div>
              <div className="portal-field-item">
                <label>Route (From ➔ To)</label>
                <b>
                  {flight.departureAirport || "DAC (Dhaka)"} ➔{" "}
                  {flight.destination || (isDubai ? "DXB (Dubai)" : fileData.country || "Overseas")}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Airline PNR / E-Ticket</label>
                <b className="mono" style={{ color: flight.ticketNo || flight.pnr ? "#007aff" : "#64748b" }}>
                  {flight.ticketNo || flight.pnr || "Pending Ticketing"}
                </b>
              </div>
              <div className="portal-field-item">
                <label>Flight Ticket Scan</label>
                {flightTicketFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        name: flightTicketFile.fileName,
                        type: "Flight E-Ticket",
                        fileData: flightTicketFile.url,
                      })
                    }
                    className="portal-print-btn portal-print-btn-blue"
                  >
                    <Eye size={12} /> View Ticket
                  </button>
                ) : (
                  <span style={{ color: "#dc2626", fontSize: "11.5px", fontWeight: 600 }}>
                    ⚠ File Missing (Pending Booking)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: CANDIDATE PAYMENT DEPOSITS & MONEY RECEIPTS */}
        {shouldShow("payment") && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <div>
                <h3 className="portal-card-title">5. Candidate Payment Deposits &amp; Money Receipts</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Official ledger transactions and cash deposit receipts recorded for this candidate
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => openPrintReceipt(undefined, true)}
                  className="portal-print-btn portal-print-btn-blue"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  title="Print Consolidated Master Money Receipt"
                >
                  <Printer size={13} /> Print Master Receipt
                </button>
                <span className="portal-card-badge success">
                  Total Collected: {formatTk(fileData.totalPaid)}
                </span>
              </div>
            </div>

            <div className="portal-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: "750px", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>Date</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>Receipt / Ref No</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>Payment Type</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>Method</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px" }}>Amount (BDT)</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", fontSize: "11px", textAlign: "right" }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "30px 20px", textAlign: "center", color: "#64748b" }}>
                        No payment transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any, idx: number) => (
                      <tr key={p.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>
                          {formatDate(p.collectedAt || p.createdAt)}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                          {p.reference || p.paymentNo || `REC-${idx + 1}`}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>{p.type || "Candidate Deposit"}</td>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>{p.method || "Cash at Office"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16a34a" }}>
                          {formatTk(p.amount)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => openPrintReceipt(p)}
                            className="portal-voucher-btn"
                            title="Print Official Deposit Money Receipt Voucher"
                          >
                            <Printer size={13} /> Print Voucher
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

        {/* SECTION 6: EDUCATION & WORK EXPERIENCE (ONLY DISPLAYED IF ACTUALLY AVAILABLE) */}
        {shouldShow("education") && (cand.education || cand.experience || educations.length > 0 || experiences.length > 0) && (
          <div className="portal-section-card">
            <div className="portal-card-header">
              <h3 className="portal-card-title">6. Education Qualifications &amp; Prior Experience</h3>
            </div>

            <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12.5px" }}>
              <div>
                <b style={{ fontSize: "12.5px", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                  Educational Qualifications
                </b>
                {educations.length === 0 ? (
                  <span style={{ color: "#334155", fontWeight: 500 }}>
                    {cand.education || "No educational records entered"}
                  </span>
                ) : (
                  educations.map((edu: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "6px" }}>
                      <b>{edu.degree || edu.level}</b> - {edu.institute} ({edu.year})
                    </div>
                  ))
                )}
              </div>

              <div>
                <b style={{ fontSize: "12.5px", color: "#0f172a", display: "block", marginBottom: "8px" }}>
                  Prior Work Experience
                </b>
                {experiences.length === 0 ? (
                  <span style={{ color: "#334155", fontWeight: 500 }}>
                    {cand.experience ? `${cand.experience} in ${cand.profession || "trade"}` : "No prior foreign/local experience recorded"}
                  </span>
                ) : (
                  experiences.map((exp: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "6px" }}>
                      <b>{exp.company}</b> - {exp.role} ({exp.years} yrs)
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8. SAFE DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document Preview"
          className="master-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >
          <div
            className="master-modal-card"
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              maxWidth: "640px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div
              className="master-modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#007aff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    {previewDoc.name}
                  </h3>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{previewDoc.type || "Document"}</span>
                </div>
              </div>

              <button
                aria-label="Close dialog"
                type="button"
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
                  width={600}
                  height={400}
                  unoptimized
                  style={{ maxHeight: "300px", maxWidth: "100%", height: "auto", borderRadius: "8px", objectFit: "contain" }}
                />
              ) : (
                <>
                  <FileCheck size={48} color="#16a34a" />
                  <div>
                    <b style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                      Document Verified &amp; Archived
                    </b>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Type: {previewDoc.type} • Secured in Orbit Central Database
                    </span>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                marginTop: "18px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Lock size={12} color="#16a34a" /> Read-Only File Inspection
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {previewDoc.fileData && (
                  <a
                    href={previewDoc.fileData}
                    download={previewDoc.name}
                    className="portal-toolbar-btn"
                    style={{
                      background: "#007aff",
                      color: "#fff",
                      borderColor: "#007aff",
                    }}
                  >
                    <Download size={14} /> Download File
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

      {/* 9. MONEY RECEIPT MODAL */}
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
