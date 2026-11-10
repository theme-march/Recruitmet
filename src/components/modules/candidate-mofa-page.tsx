"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, ChevronDown, ChevronUp, Edit3, Eye, FileCheck, Printer, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export interface MofaData {
  candidateId: string;
  candidateNo: string;
  fileId?: string;
  fileNo?: string;
  photo?: string | null;

  // Barcode & Application
  mofaNumber: string;
  applicationType: string;
  visaType: string;

  // Personal Info
  fullName: string;
  fatherName: string;
  motherName: string;
  dob: string;
  placeOfBirth: string;
  prevNationality: string;
  presentNationality: string;
  sex: string;
  maritalStatus: string;
  sect: string;
  religion: string;
  qualification: string;
  profession: string;
  professionAr: string;
  homeAddress: string;
  phone: string;

  // Agency Info
  agencyName: string;
  agencyRl: string;
  agencyAddress: string;
  agencyPhone: string;

  // Passport Info
  passportNo: string;
  issuePlace: string;
  issueDate: string;
  expiryDate: string;

  // Travel & Sponsor Info
  purposeOfTravel: "Work" | "Transit" | "Visit" | "Umrah" | "Residence" | "Hajj" | "Diplomacy";
  durationOfStay: string;
  dateOfArrival: string;
  dateOfDeparture: string;
  modeOfPayment: "Cash" | "Free" | "Cheque";
  paymentChequeNo: string;
  paymentDate: string;
  relationship: string;
  destinationCity: string;
  carrier: string;
  sponsorNameAndAddress: string;

  // Dependents (usually empty for work visa)
  dependents: Array<{
    relationship: string;
    dob: string;
    sex: string;
    fullName: string;
  }>;
}

// Crisp SVG Barcode Generator (Code 128 lookalike pattern)
function BarcodeSvg({ value }: { value: string }) {
  const bars: { width: number; isBlack: boolean }[] = [];
  const cleanVal = (value || "1234567890").toUpperCase();
  
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 3, isBlack: false });

  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    const w1 = (code % 3) + 1;
    const w2 = ((code * 2) % 3) + 1;
    const w3 = ((code * 3) % 2) + 1;
    bars.push({ width: w1, isBlack: true });
    bars.push({ width: w2, isBlack: false });
    bars.push({ width: w3, isBlack: true });
    bars.push({ width: 2, isBlack: false });
  }

  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 3, isBlack: true });

  let currentX = 10;
  return (
    <svg className="mofa-barcode-svg" viewBox="0 0 200 44" preserveAspectRatio="none">
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width * 2;
        if (!bar.isBlack) return null;
        return (
          <rect
            key={idx}
            x={x}
            y={2}
            width={bar.width * 2}
            height={40}
            fill="#000000"
          />
        );
      })}
    </svg>
  );
}

export function CandidateMofaPageClient({ initialData }: { initialData: MofaData }) {
  const [data, setData] = useState<MofaData>(initialData);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Photo size must be smaller than 3MB");
      return;
    }

    // 1. Instant preview via FileReader
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setData((prev) => ({ ...prev, photo: dataUrl }));
    };
    reader.readAsDataURL(file);

    // 2. Persist to candidate profile photo endpoint in background
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/candidates/${data.candidateId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Candidate photo updated successfully!");
      } else {
        toast.success("Photo applied to MOFA form!");
      }
    } catch (err: any) {
      console.warn("Photo upload warning:", err);
      toast.success("Photo applied to MOFA form!");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoRemove = async () => {
    setData((prev) => ({ ...prev, photo: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      await fetch(`/api/candidates/${data.candidateId}/photo`, {
        method: "DELETE",
      });
      toast.info("Candidate photo removed");
    } catch (err) {
      console.warn("Photo delete error:", err);
    }
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add("printing-mofa");
    };
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-mofa");
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-mofa");
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add("printing-mofa");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-mofa");
    }, 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${data.candidateId}/mofa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save MOFA details");
      toast.success("MOFA Application details saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Error saving details");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof MofaData, val: any) => {
    setData((prev) => ({ ...prev, [field]: val }));
  };

  const combinedFullName = data.fatherName
    ? `${data.fullName} S/O. ${data.fatherName}`
    : data.fullName;

  return (
    <div className="mofa-page-container mofa-print-root">
      {/* Hidden file input for Candidate Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

      {/* Top Navigation & Action Bar */}
      <div className="mofa-topbar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link
            href="/candidates"
            data-action-ui="neutral"
            data-action-size="normal"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <div className="mofa-title-area">
            <h1>Saudi Embassy MOFA Visa Application</h1>
            <p>
              Candidate: <b>{data.fullName}</b> ({data.candidateNo}) · Passport: <b>{data.passportNo}</b> · Target: 🇸🇦 Saudi Arabia
            </p>
          </div>
        </div>

        <div className="mofa-actions">
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={() => setShowEditor(!showEditor)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Edit3 size={14} /> {showEditor ? "Hide Edit Form" : "Edit Form Details"}
          </button>

          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Details"}
          </button>

          <button
            data-action-ui="primary"
            data-action-size="normal"
            type="button"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={14} /> Print MOFA Form
          </button>
        </div>
      </div>

      {/* Main Vertical Layout: Edit Form on Top, Full A4 Preview Below */}
      <div className="mofa-vertical-layout">
        {/* 1. Edit Form (Top / Collapsible) */}
        {showEditor && (
          <div className="mofa-editor-card no-print">
            <div className="mofa-editor-header">
              <h2>Edit Application Information</h2>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                style={{ background: "transparent", border: 0, color: "#64748b", cursor: "pointer", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Hide Form <ChevronUp size={14} />
              </button>
            </div>

            <div className="mofa-editor-body">
              <div className="mofa-editor-grid">
                {/* Candidate Photo Uploader Card */}
                <div className="mofa-editor-section-card" style={{ gridColumn: "1 / -1", background: "#f8fafc" }}>
                  <div className="mofa-section-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Candidate Photo / প্রার্থীর ছবি</span>
                    <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>
                      JPG / PNG / WebP (Max 3MB)
                    </span>
                  </div>
                  <div className="mofa-photo-uploader-box">
                    <div
                      className="mofa-photo-uploader-thumb"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: "pointer" }}
                      title="Click to change photo"
                    >
                      {data.photo ? (
                        <img src={data.photo} alt="Candidate Preview" />
                      ) : (
                        <Camera size={22} color="#94a3b8" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {data.photo ? "Profile Photo Active" : "No Photo Set"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 8px" }}>
                        Official passport size photograph for Saudi Embassy visa submission. You can upload a new photo or change it anytime.
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          data-action-ui="primary"
                          data-action-size="compact"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <Upload size={13} /> {isUploadingPhoto ? "Uploading..." : data.photo ? "Change Photo" : "Upload Photo"}
                        </button>
                        {data.photo && (
                          <button
                            type="button"
                            data-action-ui="neutral"
                            data-action-size="compact"
                            onClick={handlePhotoRemove}
                            disabled={isUploadingPhoto}
                            style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#dc2626" }}
                          >
                            <Trash2 size={13} /> Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Application & Barcode */}
                <div className="mofa-editor-section-card">
                  <div className="mofa-section-heading">1. Application &amp; Barcode</div>
                  <div className="mofa-form-group">
                    <label>MOFA Application No</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={data.mofaNumber}
                      onChange={(e) => handleFieldChange("mofaNumber", e.target.value)}
                      placeholder="e.g. E843181209"
                    />
                  </div>
                  <div className="mofa-form-group">
                    <label>Application Subtitle</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={data.applicationType}
                      onChange={(e) => handleFieldChange("applicationType", e.target.value)}
                    />
                  </div>
                  <div className="mofa-form-group">
                    <label>Agency Name &amp; RL</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={`${data.agencyName} RL: ${data.agencyRl}`}
                      onChange={(e) => handleFieldChange("agencyName", e.target.value)}
                    />
                  </div>
                  <div className="mofa-form-group">
                    <label>Agency Address</label>
                    <textarea
                      className="mofa-form-input"
                      rows={2}
                      value={data.agencyAddress}
                      onChange={(e) => handleFieldChange("agencyAddress", e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 2: Personal & Family Information */}
                <div className="mofa-editor-section-card">
                  <div className="mofa-section-heading">2. Candidate &amp; Family Info</div>
                  <div className="mofa-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={data.fullName}
                      onChange={(e) => handleFieldChange("fullName", e.target.value)}
                    />
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Father's Name (S/O)</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.fatherName}
                        onChange={(e) => handleFieldChange("fatherName", e.target.value)}
                        placeholder="e.g. MD JEBON MIA"
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Mother's Name</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.motherName}
                        onChange={(e) => handleFieldChange("motherName", e.target.value)}
                        placeholder="e.g. JUMILA BEGUM"
                      />
                    </div>
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Date of Birth</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.dob}
                        onChange={(e) => handleFieldChange("dob", e.target.value)}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Place of Birth</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.placeOfBirth}
                        onChange={(e) => handleFieldChange("placeOfBirth", e.target.value)}
                        placeholder="e.g. CUMILLA"
                      />
                    </div>
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Gender / Sex</label>
                      <select
                        className="mofa-form-select"
                        value={data.sex}
                        onChange={(e) => handleFieldChange("sex", e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="mofa-form-group">
                      <label>Marital Status</label>
                      <select
                        className="mofa-form-select"
                        value={data.maritalStatus}
                        onChange={(e) => handleFieldChange("maritalStatus", e.target.value)}
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                    </div>
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Religion</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.religion}
                        onChange={(e) => handleFieldChange("religion", e.target.value)}
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Sect</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.sect}
                        onChange={(e) => handleFieldChange("sect", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Passport & Profession */}
                <div className="mofa-editor-section-card">
                  <div className="mofa-section-heading">3. Passport &amp; Profession</div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Passport Number</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.passportNo}
                        onChange={(e) => handleFieldChange("passportNo", e.target.value)}
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Place of Issue</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.issuePlace}
                        onChange={(e) => handleFieldChange("issuePlace", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Date of Issue</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.issueDate}
                        onChange={(e) => handleFieldChange("issueDate", e.target.value)}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Date of Expiry</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.expiryDate}
                        onChange={(e) => handleFieldChange("expiryDate", e.target.value)}
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Profession</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.profession}
                        onChange={(e) => handleFieldChange("profession", e.target.value)}
                      />
                    </div>
                    <div className="mofa-form-group">
                      <label>Qualification</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.qualification}
                        onChange={(e) => handleFieldChange("qualification", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mofa-form-group">
                    <label>Home Address &amp; Contact</label>
                    <textarea
                      className="mofa-form-input"
                      rows={2}
                      value={data.homeAddress}
                      onChange={(e) => handleFieldChange("homeAddress", e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 4: Sponsor & Saudi Details */}
                <div className="mofa-editor-section-card">
                  <div className="mofa-section-heading">4. Saudi Sponsor &amp; Travel</div>
                  <div className="mofa-form-row">
                    <div className="mofa-form-group">
                      <label>Purpose of Travel</label>
                      <select
                        className="mofa-form-select"
                        value={data.purposeOfTravel}
                        onChange={(e) => handleFieldChange("purposeOfTravel", e.target.value)}
                      >
                        <option value="Work">Work</option>
                        <option value="Transit">Transit</option>
                        <option value="Visit">Visit</option>
                        <option value="Umrah">Umrah</option>
                        <option value="Residence">Residence</option>
                        <option value="Hajj">Hajj</option>
                        <option value="Diplomacy">Diplomacy</option>
                      </select>
                    </div>
                    <div className="mofa-form-group">
                      <label>Duration of Stay</label>
                      <input
                        type="text"
                        className="mofa-form-input"
                        value={data.durationOfStay}
                        onChange={(e) => handleFieldChange("durationOfStay", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mofa-form-group">
                    <label>Destination City in KSA</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={data.destinationCity}
                      onChange={(e) => handleFieldChange("destinationCity", e.target.value)}
                      placeholder="CITY: RIYADH, K.S.A"
                    />
                  </div>
                  <div className="mofa-form-group">
                    <label>Company / Sponsor in KSA</label>
                    <textarea
                      className="mofa-form-input"
                      rows={2}
                      value={data.sponsorNameAndAddress}
                      onChange={(e) => handleFieldChange("sponsorNameAndAddress", e.target.value)}
                    />
                  </div>
                  <div className="mofa-form-group">
                    <label>Carrier Airline</label>
                    <input
                      type="text"
                      className="mofa-form-input"
                      value={data.carrier}
                      onChange={(e) => handleFieldChange("carrier", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Official Printable Embassy Paper (A4) - Rendered BELOW */}
        <div className="mofa-preview-section">
          <div className="mofa-preview-header no-print">
            <span className="mofa-preview-header-title">Official Saudi Embassy Application Form Preview (A4)</span>
            <button
              data-action-ui="primary"
              data-action-size="compact"
              type="button"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={13} /> Print MOFA Form
            </button>
          </div>

          <div className="mofa-preview-area">
            <div className="mofa-paper">
              {/* Header: Photo | Barcode | Embassy Title */}
              <div className="mofa-doc-header">
                <div
                  className="mofa-doc-photo"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload or change candidate photo"
                >
                  {data.photo ? (
                    <img src={data.photo} alt="Candidate" />
                  ) : (
                    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                      <Camera size={18} className="no-print" style={{ color: "#94a3b8" }} />
                      <span>Photo</span>
                      <span className="no-print" style={{ fontSize: "9px", color: "#2563eb", fontWeight: 600 }}>Click to Upload</span>
                    </div>
                  )}
                  <div className="mofa-photo-hover-overlay no-print">
                    <Camera size={15} />
                    <span>Change Photo</span>
                  </div>
                </div>

                <div className="mofa-doc-barcode-area">
                  <BarcodeSvg value={data.mofaNumber} />
                  <div className="mofa-barcode-number">{data.mofaNumber}</div>
                  <div className="mofa-barcode-sub">{data.applicationType || "New Application"}</div>
                </div>

                <div className="mofa-doc-embassy-title">
                  EMBASSY OF SAUDI ARABIA
                  <span>CONSULAR SECTION</span>
                </div>
              </div>

              {/* Official Table Grid (table-layout: fixed for 100% boundary safety) */}
              <table className="mofa-table">
                <tbody>
                  {/* 1. Full Name */}
                  <tr>
                    <td className="label-en" style={{ width: "23%" }}>Full Name:</td>
                    <td className="val-field" style={{ width: "54%" }}>{combinedFullName}</td>
                    <td className="label-ar" style={{ width: "23%" }}>اسم الكامل :</td>
                  </tr>

                  {/* 2. Mother's Name */}
                  <tr>
                    <td className="label-en">Mother's Name:</td>
                    <td className="val-field">{data.motherName || "—"}</td>
                    <td className="label-ar">اسم الأم :</td>
                  </tr>

                  {/* 3. DOB & Place of Birth */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "16%" }}>Date of Birth:</td>
                            <td className="val-field" style={{ width: "16%", textAlign: "center" }}>{data.dob}</td>
                            <td className="label-ar" style={{ width: "14%" }}>تاريخ الولادة :</td>
                            <td className="label-en" style={{ width: "16%" }}>Place of Birth:</td>
                            <td className="val-field" style={{ width: "20%", textAlign: "center" }}>{data.placeOfBirth}</td>
                            <td className="label-ar" style={{ width: "18%" }}>محل الولادة :</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 4. Previous Nationality & Present Nationality */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "18%" }}>Previous Nationality:</td>
                            <td className="val-field" style={{ width: "16%", textAlign: "center" }}>{data.prevNationality}</td>
                            <td className="label-ar" style={{ width: "14%" }}>الجنسية السابقة :</td>
                            <td className="label-en" style={{ width: "18%" }}>Present Nationality:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.presentNationality}</td>
                            <td className="label-ar" style={{ width: "16%" }}>الجنسية الحالية :</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 5. Sex & Marital Status */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "14%" }}>Sex:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.sex}</td>
                            <td className="label-ar" style={{ width: "14%" }}>الجنس :</td>
                            <td className="label-en" style={{ width: "18%" }}>Marital Status:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.maritalStatus}</td>
                            <td className="label-ar" style={{ width: "18%" }}>الحالة الاجتماعية :</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 6. Sect & Religion */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "14%" }}>Sect:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.sect || "—"}</td>
                            <td className="label-ar" style={{ width: "14%" }}>المذهب :</td>
                            <td className="label-en" style={{ width: "18%" }}>Religion:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.religion}</td>
                            <td className="label-ar" style={{ width: "18%" }}>الديانة :</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 7. Place of Issue, Qualification, Profession */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "13%" }}>Place of Issue:</td>
                            <td className="val-field" style={{ width: "13%", textAlign: "center" }}>{data.issuePlace}</td>
                            <td className="label-en" style={{ width: "13%" }}>Qualification:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.qualification || "—"}</td>
                            <td className="label-en" style={{ width: "12%" }}>Profession:</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.profession}</td>
                            <td className="label-ar" style={{ width: "13%" }}>المهنة :</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 8. Home Address & Phone No */}
                  <tr>
                    <td className="label-en">Home address &amp; phone No.:</td>
                    <td className="val-field" style={{ fontSize: "10px" }}>{data.homeAddress}</td>
                    <td className="label-ar">عنوان المنزل ورقم التلفون :</td>
                  </tr>

                  {/* 9. Business Address & Phone No (Agency) */}
                  <tr>
                    <td className="label-en">Business address &amp; phone No.:</td>
                    <td className="val-field" style={{ fontSize: "10px" }}>
                      <b>{data.agencyName} RL: {data.agencyRl}</b><br />
                      <span>{data.agencyAddress}</span>
                    </td>
                    <td className="label-ar">رقم التلفون(المؤسسة) عنوان الشركة :</td>
                  </tr>

                  {/* 10. Purpose of Travel (Checkboxes) */}
                  <tr>
                    <td className="label-en">Purpose of Travel:</td>
                    <td style={{ padding: "4px" }}>
                      <div className="mofa-purpose-grid">
                        {(["Work", "Transit", "Visit", "Umrah", "Residence", "Hajj", "Diplomacy"] as const).map((p) => {
                          const checked = data.purposeOfTravel === p;
                          return (
                            <div key={p} className="mofa-purpose-item">
                              <span className={`mofa-checkbox ${checked ? "checked" : ""}`}>
                                {checked ? "✓" : ""}
                              </span>
                              <span>{p}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="label-ar">الغاية من السفر :</td>
                  </tr>

                  {/* 11. Passport Issue & Expiry & Number */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable mofa-subtable-multi">
                        <tbody>
                          <tr style={{ background: "#f8fafc" }}>
                            <td className="label-ar" style={{ width: "22%", textAlign: "center" }}>محل الاصدار</td>
                            <td className="label-ar" style={{ width: "24%", textAlign: "center" }}>تاريخ الاصدار</td>
                            <td className="label-ar" style={{ width: "24%", textAlign: "center" }}>تاريخ انتهاء الصلاحية</td>
                            <td className="label-ar" style={{ width: "30%", textAlign: "center" }}>رقم الجواز</td>
                          </tr>
                          <tr>
                            <td style={{ width: "22%", textAlign: "center", fontWeight: 700 }}>
                              <span style={{ fontSize: "10px", display: "block", color: "#475569" }}>Place of issue:</span>
                              {data.issuePlace}
                            </td>
                            <td style={{ width: "24%", textAlign: "center", fontWeight: 700 }}>
                              <span style={{ fontSize: "10px", display: "block", color: "#475569" }}>Date of issue:</span>
                              {data.issueDate}
                            </td>
                            <td style={{ width: "24%", textAlign: "center", fontWeight: 700 }}>
                              <span style={{ fontSize: "10px", display: "block", color: "#475569" }}>Date of expiry:</span>
                              {data.expiryDate}
                            </td>
                            <td style={{ width: "30%", textAlign: "center", fontWeight: 800, fontSize: "12.5px", color: "#000" }}>
                              <span style={{ fontSize: "10px", display: "block", color: "#475569", fontWeight: 400 }}>Passport No.:</span>
                              {data.passportNo}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 12. Duration of Stay, Arrival, Departure */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "25%" }}>
                              Duration of stay in kingdom:
                            </td>
                            <td className="val-field" style={{ width: "12%", textAlign: "center" }}>
                              {data.durationOfStay || "02 Years"}
                            </td>
                            <td className="label-en" style={{ width: "15%" }}>
                              Date of arrival:
                            </td>
                            <td className="val-field" style={{ width: "15%", textAlign: "center" }}>
                              {data.dateOfArrival || "—"}
                            </td>
                            <td className="label-en" style={{ width: "18%" }}>
                              Date of departure:
                            </td>
                            <td className="val-field" style={{ width: "15%", textAlign: "center" }}>
                              {data.dateOfDeparture || "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 13. Mode of payment */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "18%" }}>Mode of payment:</td>
                            <td style={{ width: "35%", padding: "4px 8px" }}>
                              <span style={{ marginRight: "12px", fontWeight: 700 }}>
                                <span className={`mofa-checkbox ${data.modeOfPayment === "Free" ? "checked" : ""}`} style={{ marginRight: "4px" }}>
                                  {data.modeOfPayment === "Free" ? "✓" : ""}
                                </span> Free
                              </span>
                              <span style={{ marginRight: "12px", fontWeight: 700 }}>
                                <span className={`mofa-checkbox ${data.modeOfPayment === "Cash" ? "checked" : ""}`} style={{ marginRight: "4px" }}>
                                  {data.modeOfPayment === "Cash" ? "✓" : ""}
                                </span> Cash
                              </span>
                              <span style={{ fontWeight: 700 }}>
                                <span className={`mofa-checkbox ${data.modeOfPayment === "Cheque" ? "checked" : ""}`} style={{ marginRight: "4px" }}>
                                  {data.modeOfPayment === "Cheque" ? "✓" : ""}
                                </span> Cheque No.
                              </span>
                            </td>
                            <td className="label-en" style={{ width: "8%" }}>Date</td>
                            <td className="val-field" style={{ width: "15%", textAlign: "center" }}>{data.paymentDate || "—"}</td>
                            <td className="label-en" style={{ width: "6%" }}>No.</td>
                            <td className="val-field" style={{ width: "18%", textAlign: "center" }}>{data.paymentChequeNo || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 14. Relationship */}
                  <tr>
                    <td className="label-en">Relationship:</td>
                    <td className="val-field">{data.relationship || "EMPLOYER AND EMPLOYEE"}</td>
                    <td className="label-ar">صله :</td>
                  </tr>

                  {/* 15. Destination & Carrier */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <table className="mofa-subtable">
                        <tbody>
                          <tr>
                            <td className="label-en" style={{ width: "15%" }}>Destination:</td>
                            <td className="val-field" style={{ width: "35%" }}>{data.destinationCity}</td>
                            <td className="label-en" style={{ width: "15%" }}>Carrier's:</td>
                            <td className="val-field" style={{ width: "35%" }}>{data.carrier || "SAUDIA AIRLINES / BIMAN"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 16. Dependents traveling in the same passport */}
                  <tr>
                    <td colSpan={3} className="mofa-subtable-cell">
                      <div style={{ textAlign: "center", padding: "3px", fontWeight: 700, fontSize: "10.5px", background: "#f8fafc", borderBottom: "1px solid #000" }}>
                        Dependents traveling in the same passport (ايضاحات تخص أفراد العائلة (المضافين) على نفس جواز السفر)
                      </div>
                      <table className="mofa-subtable mofa-subtable-multi">
                        <thead>
                          <tr>
                            <th style={{ width: "25%" }}>نوع الصلة<br />Relationship</th>
                            <th style={{ width: "25%" }}>تاريخ الميلاد<br />Date of Birth</th>
                            <th style={{ width: "20%" }}>الجنس<br />Sex</th>
                            <th style={{ width: "30%" }}>الاسم بالكامل<br />Full Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[0, 1].map((idx) => (
                            <tr key={idx} style={{ height: "18px" }}>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* 17. Company / Sponsor in Kingdom */}
                  <tr>
                    <td className="label-en" style={{ verticalAlign: "top" }}>
                      Name and address of company or individual in the kingdom:
                    </td>
                    <td className="val-field" style={{ fontSize: "10px", lineHeight: 1.35 }}>
                      {data.sponsorNameAndAddress}
                    </td>
                    <td className="label-ar" style={{ verticalAlign: "top" }}>
                      اسم و عنوان الشركة أو اسم الشخص و عنوانه بالمملكة :
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Official Declaration */}
              <div className="mofa-declaration-text">
                <strong>I the undersigned hereby that all the information I have provided are correct. I will abide by laws of the kingdom during the period of my residence in it.</strong><br />
                <span style={{ direction: "rtl", display: "block", textAlign: "right", fontFamily: "Tahoma, Arial", marginTop: "2px" }}>
                  أنا الموقع أدناه أقر بأن كل المعلومات التي دونتها صحيحة وسأكون ملتزما بقوانين المملكة أثناء فترة وجودي بها
                </span>
              </div>

              {/* Signature & Date Row */}
              <div className="mofa-sign-row">
                <div>
                  <span>Date: </span>
                  <b>{new Date().toLocaleDateString("en-GB")}</b>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ display: "inline-block", width: "160px", borderBottom: "1px solid #000", marginBottom: "3px" }}>&nbsp;</span>
                  <div>Signature : التوقيع</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span>Name: </span>
                  <b>{data.fullName}</b>
                </div>
              </div>

              {/* Official Use Only Box */}
              <div className="mofa-official-box">
                <div className="mofa-official-title">
                  <span>For official use only</span>
                  <span style={{ direction: "rtl" }}>لاستعمال الرسمي فقط</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "4px" }}>
                  <div>Date: ________________</div>
                  <div>Visa No: _____________</div>
                  <div>Fee: ________________</div>
                  <div>Officer: ______________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
