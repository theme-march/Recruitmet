"use client";

import { Check, FileText, FileUp, Globe, List, Loader2, MessageSquare, Minus, Plus, RefreshCw, RotateCw, ScanText, Send, Sparkles, Upload, User, UserPlus, Users, X, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";
import { getCountryFlagEmoji } from "@/components/modules/country-management-page";
import { CandidateProfileImageField } from "@/components/modules/candidate-profile-image-field";
import { CandidateBulkUploadModal } from "@/components/modules/candidate-bulk-upload-modal";

type AgentOption = {
  id: string;
  code: string;
  name: string;
  phone: string;
  district: string;
};

function isValidISODate(dateStr?: string | null): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yStr, mStr, dStr] = dateStr.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const isLeap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= daysInMonth[m - 1];
}

export function CreateWorkCallPage({ officerName }: { officerName: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);

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

  // Passport Details & OCR States
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreviewUrl, setPassportPreviewUrl] = useState<string>("");
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [passportNo, setPassportNo] = useState("");
  const [passportExists, setPassportExists] = useState(false);
  const [existingCandInfo, setExistingCandInfo] = useState("");
  const [passportStatus, setPassportStatus] = useState("Available");
  const [givenName, setGivenName] = useState("");
  const [surname, setSurname] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [gender, setGender] = useState("");
  const [passportNationality, setPassportNationality] = useState("BANGLADESHI");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [nid, setNid] = useState("");
  const [passportAddress, setPassportAddress] = useState("");

  // Passport Preview Controls
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewRotate, setPreviewRotate] = useState(0);
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const passportInputRef = useRef<HTMLInputElement>(null);
  const passportBackInputRef = useRef<HTMLInputElement>(null);
  const [passportBackFile, setPassportBackFile] = useState<File | null>(null);
  const [passportBackPreviewUrl, setPassportBackPreviewUrl] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<"front" | "back">("front");
  const [mrzValidation, setMrzValidation] = useState<{
    found: boolean;
    docNumberValid: boolean;
    dobValid: boolean;
    expiryValid: boolean;
  } | null>(null);

  const handlePassportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPassportFile(file);
    const url = URL.createObjectURL(file);
    setPassportPreviewUrl(url);
    setActivePreviewTab("front");
    await triggerOCR(file, passportBackFile || undefined);
  };

  const handlePassportBackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPassportBackFile(file);
    const url = URL.createObjectURL(file);
    setPassportBackPreviewUrl(url);
    setActivePreviewTab("back");
    await triggerOCR(passportFile || undefined, file);
  };

  const triggerOCR = async (fileToScan?: File, backFileToScan?: File) => {
    const file = fileToScan || passportFile;
    const backFile = backFileToScan || passportBackFile;
    if (!file && !backFile) {
      toast.error("Please upload or choose a passport file first.");
      return;
    }
    setIsScanningOCR(true);
    const toastId = toast.loading("Analyzing passport with OCR system...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const fd = new FormData();
      if (file) fd.set("file", file);
      if (backFile) fd.set("secondaryFile", backFile);

      const res = await fetch("/api/ocr/passport", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "OCR reading failed");
      }
      const d = json.data;
      if (d.mrzValidation) {
        setMrzValidation(d.mrzValidation);
      }
      if (d.passportNo?.trim()) {
        setPassportNo(d.passportNo.trim());
        setPassportExists(Boolean(d.alreadyExists));
        if (d.alreadyExists && d.existingCandidateName) {
          setExistingCandInfo(d.existingCandidateName);
        } else {
          setExistingCandInfo("");
        }
      }
      if (d.givenName?.trim()) setGivenName(d.givenName.trim());
      if (d.surname?.trim()) setSurname(d.surname.trim());
      if (d.fullName?.trim()) {
        setCandidateFullName(d.fullName.trim());
      } else if (d.givenName?.trim() && d.surname?.trim()) {
        setCandidateFullName(`${d.givenName.trim()} ${d.surname.trim()}`);
      }
      if (d.dob && isValidISODate(d.dob)) setDob(d.dob);
      if (d.issueDate && isValidISODate(d.issueDate)) setIssueDate(d.issueDate);
      if (d.expiryDate && isValidISODate(d.expiryDate)) setExpiryDate(d.expiryDate);
      if (d.sex?.trim()) setGender(d.sex.trim());
      if (d.nationality?.trim()) setPassportNationality(d.nationality.trim());
      if (d.placeOfBirth?.trim()) setPlaceOfBirth(d.placeOfBirth.trim());
      if (d.fatherName?.trim()) setFatherName(d.fatherName.trim());
      if (d.motherName?.trim()) setMotherName(d.motherName.trim());
      if (d.nid?.trim()) setNid(d.nid.trim());
      if (d.phone?.trim() && !primaryPhone) setPrimaryPhone(d.phone.trim());
      if (d.address?.trim()) setPassportAddress(d.address.trim());

      toast.success(
        d.alreadyExists
          ? "Passport scanned! Warning: This passport number already exists."
          : d.mrzValidation?.found
          ? "Passport scanned & verified with ICAO MRZ checksums!"
          : "Passport scanned & details extracted successfully!",
        { id: toastId, icon: "✨" }
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.error("OCR scan timed out. You can fill in details manually.", { id: toastId });
      } else {
        toast.error(err.message || "Failed to scan passport. You can enter details manually.", { id: toastId });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsScanningOCR(false);
    }
  };

  const handlePassportNoChange = async (val: string) => {
    const clean = val.toUpperCase().trim();
    setPassportNo(clean);
    if (!clean || clean.length < 4) {
      setPassportExists(false);
      setExistingCandInfo("");
      return;
    }
    try {
      const res = await fetch(`/api/passport/check-duplicate?passportNo=${encodeURIComponent(clean)}`);
      const json = await res.json();
      setPassportExists(Boolean(json.exists));
      if (json.exists && json.candidateName) {
        setExistingCandInfo(`${json.candidateName}${json.candidateNo ? ` · ${json.candidateNo}` : ""}`);
      } else {
        setExistingCandInfo("");
      }
    } catch {
      setPassportExists(false);
      setExistingCandInfo("");
    }
  };

  const handleGivenNameChange = (val: string) => {
    setGivenName(val);
    setCandidateFullName(`${val} ${surname}`.trim());
  };

  const handleSurnameChange = (val: string) => {
    setSurname(val);
    setCandidateFullName(`${givenName} ${val}`.trim());
  };

  const handleZoomIn = () => setPreviewZoom((z) => Math.min(250, z + 25));
  const handleZoomOut = () => setPreviewZoom((z) => Math.max(75, z - 25));
  const handleZoomReset = () => {
    setPreviewZoom(100);
    setPreviewRotate(0);
  };
  const handleRotate = () => setPreviewRotate((r) => (r + 90) % 360);

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const [dbCountries, setDbCountries] = useState<Array<{ id: string; name: string; code: string; active: boolean }>>([]);

  useEffect(() => {
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
  }, []);

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
    payload.interviewOption = "";
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
    payload.fullName = candidateFullName || `${givenName} ${surname}`.trim() || String(form.get("fullName") || "");
    payload.phone = primaryPhone || String(form.get("phone") || "");
    payload.passportNo = passportNo || String(form.get("passportNo") || "");
    payload.passportStatus = passportStatus || String(form.get("passportStatus") || "Available");
    payload.givenName = givenName;
    payload.surname = surname;
    payload.issueDate = issueDate;
    payload.expiryDate = expiryDate;
    payload.gender = gender;
    payload.passportNationality = passportNationality;
    payload.placeOfBirth = placeOfBirth;
    payload.fatherName = fatherName;
    payload.motherName = motherName;
    payload.nid = nid;
    payload.passportAddress = passportAddress;
    payload.address = String(form.get("address") || "");

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

    if (passportFile && body.data?.fileId) {
      try {
        const docForm = new FormData();
        docForm.set("file", passportFile);
        docForm.set("fileId", body.data.fileId);
        docForm.set("type", "Passport");
        if (passportNo) docForm.set("number", passportNo);
        if (expiryDate) docForm.set("expiryDate", expiryDate);
        const docRes = await fetch("/api/documents", { method: "POST", body: docForm });
        if (!docRes.ok) {
          console.error("Passport upload warning");
        }
      } catch (docErr) {
        console.error("Passport upload network error:", docErr);
      }
    }

    if (passportBackFile && body.data?.fileId) {
      try {
        const backForm = new FormData();
        backForm.set("file", passportBackFile);
        backForm.set("fileId", body.data.fileId);
        backForm.set("type", "Passport Back");
        if (passportNo) backForm.set("number", passportNo);
        await fetch("/api/documents", { method: "POST", body: backForm });
      } catch (backErr) {
        console.error("Passport back upload network error:", backErr);
      }
    }

    setSaving(false);
    toast.success(`Candidate ${body.data?.leadNo ? `(${body.data.leadNo})` : ""} registered successfully!`);
    router.push(moduleItemPath("call-center", "Registration & interviews"));
  }

  return (
    <div className="work-call-page country-design-page candidate-create-design-page">
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Dashboard</Link> / Candidates / Create Candidate
      </nav>
      <div className="country-design-heading">
        <div>
          <h1>Create Candidate</h1>
          <p>Register and onboard a new candidate for overseas recruitment pipeline.</p>
        </div>
        <div className="country-design-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            data-action-ui="secondary"
            data-action-size="normal"
            onClick={() => setShowBulkUpload(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              background: "#f0edff",
              color: "#4f46e5",
              border: "1px solid #c7d2fe",
              borderRadius: "8px",
            }}
          >
            <Upload size={15} /> Bulk Upload Candidates
          </button>
          <Link data-action-ui="neutral" data-action-size="normal" prefetch={true} href={moduleItemPath("call-center", "Registration & interviews")}>
            <List size={16} /> Registration &amp; Interviews
          </Link>
        </div>
      </div>

      <form className="work-call-form" onSubmit={submit}>
        {/* 1. AGENT PARTNER ASSIGNMENT */}
        <section className="work-form-section candidate-create-agent">
          <div className="candidate-create-section-header">
            <div>
              <div className="candidate-create-section-icon">
                <Users size={20} />
              </div>
              <div>
                <h2>
                  1. Link / Assign Agent Partner
                  <span>(Optional)</span>
                </h2>
                <p>
                  Link this candidate to a registered agency partner or keep them as a direct office candidate.
                </p>
              </div>
            </div>

            <Link data-action-ui="primary" data-action-size="normal"
              href="/module/agents"
              prefetch={true}
            >
              <UserPlus size={14} /> Create New Agent
            </Link>
          </div>

          <label>
            <span>
              Select Agent Partner
            </span>
            <select
              name="agent"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
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
            <div className="candidate-create-agent-notice">
              <Check size={14} /> This lead and resulting files will be automatically attributed to "{selectedAgent}".
            </div>
          )}
        </section>

        {/* 2. PREFER COUNTRY & DESTINATION */}
        <section className="work-form-section">
          <div className="candidate-create-section-header">
            <div>
              <div className="candidate-create-section-icon">
                <Globe size={20} />
              </div>
              <div>
                <h2>
                  2. Prefer Country &amp; Target Destination
                </h2>
                <p>
                  Target overseas destination pipeline where this candidate will be processed upon lead confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="work-form-grid">
            <label>
              <span>Target Country <sup>*</sup></span>
              <select
                name="countrySelect"
                required
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
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
              <small>
                Target overseas destination pipeline where this candidate will be processed upon lead confirmation.
              </small>
            </label>
          </div>
        </section>

        {/* 3. PASSPORT DETAILS WITH OCR & PREVIEW */}
        <section className="work-form-section">
          <div className="candidate-create-section-header">
            <div>
              <div className="candidate-create-section-icon">
                <FileText size={20} />
              </div>
              <div>
                <h2>
                  3. Passport Details
                  <span>(Verification &amp; OCR)</span>
                </h2>
                <p>
                  Upload candidate passport copy for automated OCR extraction, MRZ checksum validation, and biodata verification.
                </p>
              </div>
            </div>

            {mrzValidation && (mrzValidation.docNumberValid || mrzValidation.dobValid || mrzValidation.expiryValid) && (
              <span className="candidate-create-autofill">
                <Sparkles size={13} /> MRZ Verified &amp; Auto-Filled
              </span>
            )}
          </div>

          <div className="passport-ocr-layout">
            {/* Left Column: Upload, OCR button & Form Fields */}
            <div className="passport-form-grid">
              {/* Row 1: Upload Passport (spans 2) & Passport No (spans 1) */}
              <div className="passport-upload-row">
                <div className="passport-upload-header">
                  <span className="passport-upload-label">Upload Passport</span>
                  {passportBackFile ? (
                    <span className="passport-back-status">
                      ✓ Back Page Added
                      <button
                        type="button"
                        className="passport-back-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPassportBackFile(null);
                          setPassportBackPreviewUrl(null);
                          setActivePreviewTab("front");
                        }}
                        title="Remove back page"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="passport-add-back-btn"
                      onClick={() => passportBackInputRef.current?.click()}
                    >
                      + Add Back / Address Page (Optional)
                    </button>
                  )}
                </div>
                <input
                  ref={passportInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  style={{ display: "none" }}
                  onChange={handlePassportFileSelect}
                />
                <input
                  ref={passportBackInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  style={{ display: "none" }}
                  onChange={handlePassportBackFileSelect}
                />
                <div className="passport-upload-box">
                  <div
                    className="passport-file-display"
                    onClick={() => passportInputRef.current?.click()}
                    title={passportFile?.name || "Choose passport scan image"}
                  >
                    <Upload size={14} className="passport-file-icon" />
                    <span className="passport-file-text">{passportFile ? passportFile.name : "Choose passport file (JPEG, PNG, WebP)..."}</span>
                  </div>
                  <button
                    type="button"
                    className="passport-ocr-btn"
                    onClick={() => triggerOCR()}
                    disabled={isScanningOCR || (!passportFile && !passportBackFile)}
                  >
                    {isScanningOCR ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <ScanText size={15} />
                        OCR
                      </>
                    )}
                  </button>
                </div>
              </div>

              <label>
                <div className="passport-label-header">
                  <span className="passport-field-title">
                    Passport No <span className="passport-req-text">(Required)</span>
                  </span>
                  {mrzValidation?.docNumberValid && (
                    <span className="passport-mrz-badge">
                      ✓ Validated (MRZ)
                    </span>
                  )}
                </div>
                <input
                  name="passportNo"
                  placeholder="AA0001618"
                  required
                  value={passportNo}
                  onChange={(e) => handlePassportNoChange(e.target.value)}
                />
                {passportExists && (
                  <span className="passport-dup-warning">
                    This passport number already exists {existingCandInfo ? `(${existingCandInfo})` : ""}.
                  </span>
                )}
              </label>

              {/* Row 2: Date of issue, Date of Expiry, Passport Status */}
              <label>
                <span className="passport-field-title">
                  Date of issue <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </label>
              <label>
                <div className="passport-label-header">
                  <span className="passport-field-title">
                    Date of Expiry <span className="passport-opt-text">(Optional)</span>
                  </span>
                  {mrzValidation?.expiryValid && (
                    <span className="passport-mrz-badge">
                      ✓ Validated
                    </span>
                  )}
                </div>
                <input
                  name="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">Passport Status</span>
                <select
                  name="passportStatus"
                  value={passportStatus}
                  onChange={(e) => setPassportStatus(e.target.value)}
                >
                  <option value="Available">Available</option>
                  <option value="Applied">Applied</option>
                  <option value="Not Available">Not Available</option>
                  <option value="Expired">Expired</option>
                  <option value="Renewal Required">Renewal Required</option>
                </select>
              </label>

              {/* Row 3: Given Name, Surname, Sex */}
              <label>
                <span className="passport-field-title">
                  Given Name <span className="passport-req-text">(Required)</span>
                </span>
                <input
                  name="givenName"
                  placeholder="e.g. FAIAZ ATIF"
                  required
                  value={givenName}
                  onChange={(e) => handleGivenNameChange(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">
                  Surname <span className="passport-req-text">(Required)</span>
                </span>
                <input
                  name="surname"
                  placeholder="e.g. QUAZI"
                  required
                  value={surname}
                  onChange={(e) => handleSurnameChange(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">
                  Sex <span className="passport-opt-text">(Optional)</span>
                </span>
                <select
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              {/* Row 4: Date of Birth, Age, Nationality */}
              <label>
                <div className="passport-label-header">
                  <span className="passport-field-title">
                    Date of Birth <span className="passport-opt-text">(Optional)</span>
                  </span>
                  {mrzValidation?.dobValid && (
                    <span className="passport-mrz-badge">
                      ✓ Validated
                    </span>
                  )}
                </div>
                <input
                  name="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">Age</span>
                <input
                  name="age"
                  placeholder="Auto-calculated"
                  readOnly
                  value={age ? `${age} Years` : ""}
                />
              </label>
              <label>
                <span className="passport-field-title">
                  Nationality <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="passportNationality"
                  placeholder="e.g. BANGLADESHI"
                  value={passportNationality}
                  onChange={(e) => setPassportNationality(e.target.value)}
                />
              </label>

              {/* Row 5: Place of Birth, Father's Name, Mother's Name */}
              <label>
                <span className="passport-field-title">
                  Place of Birth <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="placeOfBirth"
                  placeholder="e.g. RAJSHAHI"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">
                  Father's Name <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="fatherName"
                  placeholder="eg Rahim"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </label>
              <label>
                <span className="passport-field-title">
                  Mother's Name <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="motherName"
                  placeholder="eg Rohima"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                />
              </label>

              {/* Row 6: NID Number, Permanent Address */}
              <label>
                <span className="passport-field-title">
                  NID Number <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="nid"
                  placeholder="0123456001"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                />
              </label>
              <label className="passport-address-col">
                <span className="passport-field-title">
                  Permanent Address as in Passport <span className="passport-opt-text">(Optional)</span>
                </span>
                <input
                  name="passportAddress"
                  placeholder="eg 123 Main Street, Dhaka, Bangladesh"
                  value={passportAddress}
                  onChange={(e) => setPassportAddress(e.target.value)}
                />
              </label>

              {/* Hidden sync inputs */}
              <input type="hidden" name="fullName" value={candidateFullName} />
            </div>

            {/* Right Column: Passport Preview Card */}
            <div className="passport-preview-card">
              <div className="passport-preview-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="passport-preview-title">Passport Preview</span>
                  {passportBackPreviewUrl && (
                    <div className="passport-tab-group">
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab("front")}
                        className={`passport-tab-btn${activePreviewTab === "front" ? " is-active" : ""}`}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePreviewTab("back")}
                        className={`passport-tab-btn${activePreviewTab === "back" ? " is-active" : ""}`}
                      >
                        Back
                      </button>
                    </div>
                  )}
                </div>
                <div className="passport-preview-actions">
                  <span className="hover-zoom-badge">Hover to zoom</span>
                  <button
                    type="button"
                    className="preview-tool-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                  >
                    <Minus size={13} />
                  </button>
                  <button
                    type="button"
                    className="preview-tool-btn is-reset"
                    onClick={handleZoomReset}
                    title="Reset Zoom"
                  >
                    {previewZoom}%
                  </button>
                  <button
                    type="button"
                    className="preview-tool-btn"
                    onClick={handleZoomIn}
                    title="Zoom In"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    className="preview-tool-btn"
                    onClick={handleRotate}
                    title="Rotate 90°"
                  >
                    <RotateCw size={13} />
                  </button>
                </div>
              </div>

              <div
                className="passport-preview-box"
                onMouseEnter={() => setIsHoverZooming(true)}
                onMouseLeave={() => setIsHoverZooming(false)}
                onMouseMove={handlePreviewMouseMove}
                onClick={() => {
                  if (!passportFile && activePreviewTab === "front") passportInputRef.current?.click();
                  if (!passportBackFile && activePreviewTab === "back") passportBackInputRef.current?.click();
                }}
              >
                {(activePreviewTab === "back" ? passportBackPreviewUrl : passportPreviewUrl) ? (
                  <img
                    src={(activePreviewTab === "back" ? passportBackPreviewUrl : passportPreviewUrl)!}
                    alt="Passport Preview"
                    className="passport-preview-img"
                    style={{
                      transform: `rotate(${previewRotate}deg) scale(${isHoverZooming ? (previewZoom / 100) * 1.8 : previewZoom / 100})`,
                      transformOrigin: isHoverZooming ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : "center center",
                    }}
                  />
                ) : (
                  <div className="passport-preview-empty">
                    <FileText size={38} className="passport-empty-icon" />
                    <div className="passport-empty-title">
                      No {activePreviewTab === "back" ? "Back Page" : "Passport"} Selected
                    </div>
                    <div className="passport-empty-sub">
                      Click to upload {activePreviewTab === "back" ? "back/address page" : "passport scan"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. PERSONAL INFORMATION */}
        <section className="work-form-section">
          <div className="candidate-create-section-header">
            <div>
              <div className="candidate-create-section-icon">
                <User size={20} />
              </div>
              <div>
                <h2>
                  4. Personal Information
                </h2>
                <p>
                  Candidate profile photo, contact details, educational background, and financial preferences.
                </p>
              </div>
            </div>
          </div>

          <div className="candidate-create-photo">
            <CandidateProfileImageField
              candidateName={candidateFullName || "New Candidate"}
              selectedFile={candidatePhotoFile}
              onFileChange={setCandidatePhotoFile}
              disabled={saving}
            />
          </div>

          <div className="work-form-grid">
            <label>
              <span>Phone <sup>*</sup></span>
              <input
                name="phone"
                placeholder="e.g. 01700000000"
                required
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
              />
            </label>
            <label>
              <span>Expert In / Skill</span>
              <input name="expertIn" placeholder="e.g. Electrician, Pipe Fitter, Driver" />
            </label>
            <div className="dynamic-field full">
              <span>Additional Phone Numbers</span>
              {phones.map((phone, index) => (
                <input
                  key={index}
                  value={phone}
                  onChange={(event) =>
                    setPhones(phones.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                  }
                  placeholder="Additional phone"
                />
              ))}
              <button data-action-ui="primary" data-action-size="normal"
                type="button"
                onClick={() => setPhones([...phones, ""])}
              >
                <Plus size={15} /> Add Another Phone
              </button>
            </div>
            <label>
              <span>Email Address</span>
              <input name="email" placeholder="email@example.com" type="email" />
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
              <span>Present Address (Optional)</span>
              <input name="address" placeholder="e.g. House 12, Road 4, Mirpur, Dhaka" />
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
          </div>
        </section>

        {/* 5. COMMENTS & NOTES */}
        <section className="work-form-section">
          <div className="candidate-create-section-header">
            <div>
              <div className="candidate-create-section-icon">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2>
                  5. Comments, Notes &amp; Activity Log <span>(Optional)</span>
                </h2>
                <p>
                  Internal recruitment remarks, candidate evaluation comments, and operational notes.
                </p>
              </div>
            </div>
          </div>
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
              <button data-action-ui="primary" data-action-size="normal" type="button" onClick={() => setWorkerComments([...workerComments, ""])}>
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
              <button data-action-ui="primary" data-action-size="normal" type="button" onClick={() => setExecutiveComments([...executiveComments, ""])}>
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
              <button data-action-ui="primary" data-action-size="normal" type="button" onClick={() => setAdminComments([...adminComments, ""])}>
                <Plus size={14} /> Add more
              </button>
            </div>
          </div>
        </section>

        {/* STICKY FOOTER ACTIONS */}
        <div className="work-form-actions">
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Work Call List")}
          >
            Cancel
          </Link>
          <button data-action-ui="primary" data-action-size="normal"
            type="submit"
            disabled={saving}
          >
            <Send size={16} />
            {saving ? "Creating Candidate..." : "Submit Candidate"}
          </button>
        </div>
      </form>

      {/* QUICK CREATE AGENT MODAL */}
      {showAgentModal && (
        <div role="dialog" aria-modal="true" aria-label="Quick Register Agent Partner" className="master-modal-overlay"
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
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
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
            <div className="master-modal-header"
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
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
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
                <button data-action-ui="neutral" data-action-size="normal"
                  type="button"
                  disabled={creatingAgent}
                  onClick={() => setShowAgentModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
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

      {/* Bulk Upload Candidates Modal */}
      <CandidateBulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          router.push("/candidates");
        }}
      />
    </div>
  );
}
