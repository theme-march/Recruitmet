"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Check,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  type CvData,
  type PrintSettings,
  type WorkExperienceItem,
  type EducationItem,
  type CustomFieldItem,
  defaultPrintSettings,
  downloadCvPdf,
  downloadCvPdfFromPreview,
} from "@/lib/cv-pdf-generator";

export function CandidateCvPageClient({ initialData }: { initialData: CvData }) {
  const [settings, setSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [cvData, setCvData] = useState<CvData>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSetting = (key: keyof PrintSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const allChecked: PrintSettings = Object.keys(settings).reduce(
      (acc, key) => {
        acc[key as keyof PrintSettings] = true;
        return acc;
      },
      {} as PrintSettings
    );
    setSettings(allChecked);
    toast.success("All CV print fields selected");
  };

  const handleClearAll = () => {
    const allUnchecked: PrintSettings = Object.keys(settings).reduce(
      (acc, key) => {
        acc[key as keyof PrintSettings] = false;
        return acc;
      },
      {} as PrintSettings
    );
    setSettings(allUnchecked);
    toast.info("All CV print fields cleared");
  };

  // --- Photo Upload & Remove Handlers ---
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB");
      return;
    }

    setIsUploadingPhoto(true);

    // 1. Immediately read as base64 Data URL for zero-latency local render & pristine html2canvas capture
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCvData((prev) => ({ ...prev, profileImageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);

    // 2. Persist to candidate profile photo endpoint in background
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/candidates/${cvData.id}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Candidate photo updated successfully!");
      } else {
        toast.success("Photo applied to CV preview!");
      }
    } catch (err) {
      console.warn("Photo upload warning:", err);
      toast.success("Photo applied to CV preview!");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    setCvData((prev) => ({ ...prev, profileImageUrl: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    try {
      await fetch(`/api/candidates/${cvData.id}/photo`, {
        method: "DELETE",
      });
    } catch {
      // Ignore background delete errors
    }
    toast.info("Candidate photo removed");
  };

  // --- Work Experience Dynamic Handlers ---
  const handleAddExperience = () => {
    const newExp: WorkExperienceItem = {
      id: `exp-${Date.now()}`,
      title: "",
      company: "",
      period: "Current",
      description: "",
    };
    setCvData((prev) => ({
      ...prev,
      experiences: [...(prev.experiences || []), newExp],
    }));
    toast.success("New work experience entry added");
  };

  const handleUpdateExperience = (
    id: string,
    field: keyof WorkExperienceItem,
    value: string
  ) => {
    setCvData((prev) => ({
      ...prev,
      experiences: (prev.experiences || []).map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const handleRemoveExperience = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      experiences: (prev.experiences || []).filter((exp) => exp.id !== id),
    }));
    toast.info("Work experience entry removed");
  };

  // --- Education Dynamic Handlers ---
  const handleAddEducation = () => {
    const newEdu: EducationItem = {
      id: `edu-${Date.now()}`,
      level: "",
      institute: "",
      year: new Date().getFullYear().toString(),
      result: "",
    };
    setCvData((prev) => ({
      ...prev,
      educations: [...(prev.educations || []), newEdu],
    }));
    toast.success("New education qualification added");
  };

  const handleUpdateEducation = (
    id: string,
    field: keyof EducationItem,
    value: string
  ) => {
    setCvData((prev) => ({
      ...prev,
      educations: (prev.educations || []).map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const handleRemoveEducation = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      educations: (prev.educations || []).filter((edu) => edu.id !== id),
    }));
    toast.info("Education entry removed");
  };

  // --- Custom Field Dynamic Handlers ---
  const handleAddCustomField = (presetLabel?: string) => {
    const newField: CustomFieldItem = {
      id: `cf-${Date.now()}`,
      label: presetLabel || "",
      value: "",
    };
    setCvData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
    toast.success(
      presetLabel
        ? `Added custom field "${presetLabel}"`
        : "New custom information field added"
    );
  };

  const handleUpdateCustomField = (
    id: string,
    field: "label" | "value",
    val: string
  ) => {
    setCvData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((cf) =>
        cf.id === id ? { ...cf, [field]: val } : cf
      ),
    }));
  };

  const handleRemoveCustomField = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((cf) => cf.id !== id),
    }));
    toast.info("Custom field removed");
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadCvPdfFromPreview(cvData, "cv-preview-sheet");
      toast.success("CV PDF downloaded successfully (identical to preview)!");
    } catch (err: any) {
      console.warn("Direct preview capture fallback to pdf-lib:", err);
      try {
        await downloadCvPdf(cvData, settings);
        toast.success("CV PDF downloaded successfully!");
      } catch (fallbackErr: any) {
        console.error(fallbackErr);
        toast.error("Failed to generate PDF. Using print fallback.");
        window.print();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCvData(initialData);
    setSettings(defaultPrintSettings);
    toast.info("Reset CV details to default database values");
  };

  // Checkbox items for the 2 columns matching Image 2 exactly
  const leftCheckboxes: { key: keyof PrintSettings; label: string }[] = [
    { key: "photo", label: "Photo" },
    { key: "email", label: "Email" },
    { key: "language", label: "Language" },
    { key: "summary", label: "Summary" },
    { key: "motherName", label: "Mother Name" },
    { key: "dob", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "nid", label: "NID" },
    { key: "passportDates", label: "Passport Dates" },
    { key: "heightLabel", label: "Height Label" },
    { key: "weightLabel", label: "Weight Label" },
    { key: "qualificationValue", label: "Qualification Value" },
  ];

  const rightCheckboxes: { key: keyof PrintSettings; label: string }[] = [
    { key: "mobile", label: "Mobile" },
    { key: "address", label: "Address" },
    { key: "education", label: "Education" },
    { key: "fatherName", label: "Father Name" },
    { key: "maritalStatus", label: "Marital Status" },
    { key: "age", label: "Age" },
    { key: "nationality", label: "Nationality" },
    { key: "passportNo", label: "Passport No" },
    { key: "drivingLicense", label: "Driving License" },
    { key: "heightValue", label: "Height Value" },
    { key: "weightValue", label: "Weight Value" },
    { key: "experience", label: "Experience" },
  ];

  const hasAnyContact = settings.mobile || settings.email || settings.address;

  // Active experiences & educations
  const activeExperiences =
    cvData.experiences && cvData.experiences.length > 0
      ? cvData.experiences
      : cvData.experienceTitle
      ? [
          {
            id: "exp-legacy",
            title: cvData.experienceTitle,
            company: cvData.experienceCompany,
            period: cvData.experiencePeriod,
            description: cvData.experienceDescription,
          },
        ]
      : [];

  const activeEducations =
    cvData.educations && cvData.educations.length > 0
      ? cvData.educations
      : cvData.educationLevel
      ? [
          {
            id: "edu-legacy",
            level: cvData.educationLevel,
            institute: cvData.educationInstitute,
            year: cvData.educationYear,
            result: "",
          },
        ]
      : [];

  const customFieldPresets = [
    "Religion",
    "Blood Group",
    "Place of Issue",
    "Emergency Contact",
    "Visa Status",
  ];

  return (
    <div className="country-design-page cv-theme-page">
      {/* 1. TOP BREADCRUMB & HEADER (EXACT ORBIT THEME INTEGRATION) */}
      <nav className="country-design-breadcrumb no-print" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link> /{" "}
        <Link href="/candidates">Candidate Directory</Link> / Generate CV
      </nav>

      <header className="country-design-heading no-print">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Candidate CV Generator</h1>
            <span className="country-design-candidate-id">
              {cvData.candidateNo}
            </span>
          </div>
          <p>
            Customizable overseas employment CV layout with real-time print settings and instant PDF export for <b>{cvData.fullName}</b>.
          </p>
        </div>

        <div className="country-design-actions directory-design-actions">
          <Link
            data-action-ui="neutral"
            data-action-size="normal"
            href="/candidates"
            style={{ textDecoration: "none" }}
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 size={14} /> {isEditing ? "Close Editor" : "Edit CV Details"}
          </button>
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={handlePrint}
          >
            <Printer size={14} /> Print / Save PDF
          </button>
          <button
            data-action-ui="primary"
            data-action-size="normal"
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            <Download size={14} /> {isDownloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </header>

      {/* 2. EDIT CV DETAILS ACCORDION/PANEL */}
      {isEditing && (
        <section className="cv-editor-panel no-print" aria-label="Edit CV Fields">
          <div className="cv-editor-header">
            <h2 className="cv-editor-title">
              <Edit3 size={16} /> Edit CV Information
            </h2>
            <button
              data-action-ui="neutral"
              data-action-size="compact"
              type="button"
              onClick={handleReset}
            >
              <RotateCcw size={12} /> Reset Defaults
            </button>
          </div>

          {/* Photo Management Section */}
          <div className="cv-editor-photo-section">
            <div className="cv-editor-photo-preview">
              {cvData.profileImageUrl ? (
                <img
                  src={cvData.profileImageUrl}
                  alt={cvData.fullName}
                  className="cv-editor-thumb"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="cv-editor-thumb-empty">
                  <User size={36} />
                </div>
              )}
            </div>

            <div className="cv-editor-photo-details">
              <span className="cv-editor-photo-title">Candidate Profile Photo</span>
              <p className="cv-editor-photo-hint">
                PNG, JPG or WebP (max 5MB). Photo updates the CV preview and downloaded PDF in real time.
              </p>
              <div className="cv-editor-photo-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="cv-photo-btn primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  <Camera size={13} />
                  {cvData.profileImageUrl ? "Change Photo" : "Upload Photo"}
                </button>
                {cvData.profileImageUrl && (
                  <button
                    type="button"
                    className="cv-photo-btn danger"
                    onClick={handlePhotoRemove}
                  >
                    <Trash2 size={13} /> Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Subheading: Basic Contact & Summary */}
          <div className="cv-editor-section-heading">
            <span>Basic & Contact Information</span>
          </div>

          <div className="cv-editor-grid">
            <div className="cv-editor-field">
              <label>Full Name</label>
              <input
                type="text"
                value={cvData.fullName}
                onChange={(e) => setCvData({ ...cvData, fullName: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Profession / Trade</label>
              <input
                type="text"
                value={cvData.profession}
                onChange={(e) => setCvData({ ...cvData, profession: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Mobile Number</label>
              <input
                type="text"
                value={cvData.phone}
                onChange={(e) => setCvData({ ...cvData, phone: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Email</label>
              <input
                type="email"
                value={cvData.email}
                onChange={(e) => setCvData({ ...cvData, email: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Address / District</label>
              <input
                type="text"
                value={cvData.district || cvData.address}
                onChange={(e) => setCvData({ ...cvData, district: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Language Skills</label>
              <input
                type="text"
                value={cvData.languages}
                onChange={(e) => setCvData({ ...cvData, languages: e.target.value })}
              />
            </div>
            <div className="cv-editor-field" style={{ gridColumn: "1 / -1" }}>
              <label>Professional Summary</label>
              <textarea
                rows={3}
                value={cvData.summary}
                onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
              />
            </div>
          </div>

          {/* Subheading: Personal & Identity Details */}
          <div className="cv-editor-section-heading">
            <span>Personal & Identification Details</span>
          </div>

          <div className="cv-editor-grid">
            <div className="cv-editor-field">
              <label>Date of Birth</label>
              <input
                type="text"
                value={cvData.dob}
                onChange={(e) => setCvData({ ...cvData, dob: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Age</label>
              <input
                type="text"
                value={cvData.age}
                onChange={(e) => setCvData({ ...cvData, age: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Gender</label>
              <input
                type="text"
                value={cvData.gender}
                onChange={(e) => setCvData({ ...cvData, gender: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Nationality</label>
              <input
                type="text"
                value={cvData.nationality}
                onChange={(e) => setCvData({ ...cvData, nationality: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>NID No</label>
              <input
                type="text"
                value={cvData.nid}
                onChange={(e) => setCvData({ ...cvData, nid: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Passport No</label>
              <input
                type="text"
                value={cvData.passportNo}
                onChange={(e) => setCvData({ ...cvData, passportNo: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Date of Issue</label>
              <input
                type="text"
                value={cvData.passportIssueDate}
                onChange={(e) => setCvData({ ...cvData, passportIssueDate: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Date of Expiry</label>
              <input
                type="text"
                value={cvData.passportExpiryDate}
                onChange={(e) => setCvData({ ...cvData, passportExpiryDate: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Father's Name</label>
              <input
                type="text"
                value={cvData.fatherName}
                onChange={(e) => setCvData({ ...cvData, fatherName: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Mother's Name</label>
              <input
                type="text"
                value={cvData.motherName}
                onChange={(e) => setCvData({ ...cvData, motherName: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Marital Status</label>
              <input
                type="text"
                value={cvData.maritalStatus}
                onChange={(e) => setCvData({ ...cvData, maritalStatus: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Height</label>
              <input
                type="text"
                value={cvData.height}
                onChange={(e) => setCvData({ ...cvData, height: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Weight</label>
              <input
                type="text"
                value={cvData.weight}
                onChange={(e) => setCvData({ ...cvData, weight: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Qualification</label>
              <input
                type="text"
                value={cvData.qualification}
                onChange={(e) => setCvData({ ...cvData, qualification: e.target.value })}
              />
            </div>
            <div className="cv-editor-field">
              <label>Driving License</label>
              <input
                type="text"
                value={cvData.drivingLicense}
                onChange={(e) => setCvData({ ...cvData, drivingLicense: e.target.value })}
              />
            </div>
          </div>

          {/* Subheading & Repeater: Work Experience */}
          <div className="cv-editor-repeater-header">
            <div>
              <span className="cv-editor-repeater-title">
                <Briefcase size={15} /> Work Experience
              </span>
              <p className="cv-editor-repeater-subtitle">
                Add one or multiple work experiences with roles, companies, and durations.
              </p>
            </div>
            <button
              type="button"
              className="cv-btn-add-repeater"
              onClick={handleAddExperience}
            >
              <Plus size={13} /> Add Work Experience
            </button>
          </div>

          <div className="cv-repeater-list">
            {activeExperiences.length === 0 ? (
              <div className="cv-repeater-empty">
                <span>No work experience added yet.</span>
                <button
                  type="button"
                  className="cv-link-btn"
                  onClick={handleAddExperience}
                >
                  + Add experience
                </button>
              </div>
            ) : (
              activeExperiences.map((exp, index) => (
                <div key={exp.id} className="cv-repeater-card">
                  <div className="cv-repeater-card-header">
                    <span className="cv-repeater-card-num">
                      Experience #{index + 1}
                    </span>
                    <button
                      type="button"
                      className="cv-repeater-card-remove"
                      onClick={() => handleRemoveExperience(exp.id)}
                      title="Remove this experience"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>

                  <div className="cv-editor-grid">
                    <div className="cv-editor-field">
                      <label>Job Title / Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Electrician (041)"
                        value={exp.title}
                        onChange={(e) =>
                          handleUpdateExperience(exp.id, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field">
                      <label>Company / Employer</label>
                      <input
                        type="text"
                        placeholder="e.g. Almarai / Binladin"
                        value={exp.company || ""}
                        onChange={(e) =>
                          handleUpdateExperience(exp.id, "company", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field">
                      <label>Experience Period</label>
                      <input
                        type="text"
                        placeholder="e.g. Current, 2020 - 2023"
                        value={exp.period || ""}
                        onChange={(e) =>
                          handleUpdateExperience(exp.id, "period", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Description / Responsibilities (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Handled industrial electrical setups and routine maintenance"
                        value={exp.description || ""}
                        onChange={(e) =>
                          handleUpdateExperience(exp.id, "description", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subheading & Repeater: Education */}
          <div className="cv-editor-repeater-header">
            <div>
              <span className="cv-editor-repeater-title">
                <GraduationCap size={16} /> Education & Qualifications
              </span>
              <p className="cv-editor-repeater-subtitle">
                Add education credentials, certifications, or diplomas.
              </p>
            </div>
            <button
              type="button"
              className="cv-btn-add-repeater"
              onClick={handleAddEducation}
            >
              <Plus size={13} /> Add Education
            </button>
          </div>

          <div className="cv-repeater-list">
            {activeEducations.length === 0 ? (
              <div className="cv-repeater-empty">
                <span>No education record added yet.</span>
                <button
                  type="button"
                  className="cv-link-btn"
                  onClick={handleAddEducation}
                >
                  + Add education
                </button>
              </div>
            ) : (
              activeEducations.map((edu, index) => (
                <div key={edu.id} className="cv-repeater-card">
                  <div className="cv-repeater-card-header">
                    <span className="cv-repeater-card-num">
                      Education #{index + 1}
                    </span>
                    <button
                      type="button"
                      className="cv-repeater-card-remove"
                      onClick={() => handleRemoveEducation(edu.id)}
                      title="Remove this qualification"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>

                  <div className="cv-editor-grid">
                    <div className="cv-editor-field">
                      <label>Degree / Level</label>
                      <input
                        type="text"
                        placeholder="e.g. HSC Passed, SSC, Diploma"
                        value={edu.level}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, "level", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field">
                      <label>Institute / Board</label>
                      <input
                        type="text"
                        placeholder="e.g. Dhaka Board, BTEB"
                        value={edu.institute || ""}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, "institute", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field">
                      <label>Passing Year</label>
                      <input
                        type="text"
                        placeholder="e.g. 2018"
                        value={edu.year || ""}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, "year", e.target.value)
                        }
                      />
                    </div>
                    <div className="cv-editor-field">
                      <label>Result / Grade (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. GPA 4.5 / 5.0"
                        value={edu.result || ""}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, "result", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subheading & Repeater: Additional Information / Custom Fields */}
          <div className="cv-editor-repeater-header">
            <div>
              <span className="cv-editor-repeater-title">
                <Tag size={15} /> Additional Information & Custom Fields
              </span>
              <p className="cv-editor-repeater-subtitle">
                Add any extra custom fields needed for this candidate (e.g. Religion, Blood Group, Place of Issue).
              </p>
            </div>
            <button
              type="button"
              className="cv-btn-add-repeater"
              onClick={() => handleAddCustomField()}
            >
              <Plus size={13} /> Add Custom Field
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="cv-presets-row">
            <span className="cv-presets-label">Quick suggestions:</span>
            {customFieldPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className="cv-preset-chip"
                onClick={() => handleAddCustomField(preset)}
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="cv-repeater-list">
            {(!cvData.customFields || cvData.customFields.length === 0) ? (
              <div className="cv-repeater-empty">
                <span>No custom additional fields added. Click any suggestion or "Add Custom Field" if needed.</span>
              </div>
            ) : (
              cvData.customFields.map((cf) => (
                <div key={cf.id} className="cv-custom-field-row">
                  <div className="cv-custom-input-wrap">
                    <label>Field Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Religion, Blood Group"
                      value={cf.label}
                      onChange={(e) =>
                        handleUpdateCustomField(cf.id, "label", e.target.value)
                      }
                    />
                  </div>
                  <div className="cv-custom-input-wrap" style={{ flex: 1.5 }}>
                    <label>Value</label>
                    <input
                      type="text"
                      placeholder="e.g. Islam, B+ (Positive)"
                      value={cf.value}
                      onChange={(e) =>
                        handleUpdateCustomField(cf.id, "value", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="cv-custom-field-remove"
                    onClick={() => handleRemoveCustomField(cf.id)}
                    title="Remove field"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 3. MAIN WORKSPACE: CV DOCUMENT & PRINT SETTINGS (IMAGE 2 MATCH) */}
      <div className="cv-workspace-grid">
        {/* LEFT: CV PREVIEW SHEET */}
        <section className="cv-document-container" aria-label="CV Document Preview">
          <div className="cv-document-sheet" id="cv-preview-sheet">
            {/* SUB-COLUMN 1: Left Column of CV */}
            <div className="cv-sheet-left">
              <div className="cv-profile-box">
                {settings.photo && (
                  <div className="cv-avatar-container">
                    {cvData.profileImageUrl ? (
                      <img
                        src={cvData.profileImageUrl}
                        alt={cvData.fullName}
                        className="cv-avatar-image"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="cv-avatar-placeholder">
                        <User size={50} />
                      </div>
                    )}
                  </div>
                )}

                <h2 className="cv-name-heading">{cvData.fullName}</h2>
                <div className="cv-trade-subheading">{cvData.profession}</div>
              </div>

              {/* Contact Information */}
              {hasAnyContact && (
                <div className="cv-sidebar-section">
                  <h3 className="cv-sidebar-title">Contact Information</h3>
                  <div className="cv-contact-list">
                    {settings.mobile && cvData.phone && (
                      <div className="cv-contact-row">
                        <Phone size={14} className="cv-contact-icon" />
                        <span>{cvData.phone}</span>
                      </div>
                    )}
                    {settings.email && cvData.email && cvData.email !== "-" && (
                      <div className="cv-contact-row">
                        <Mail size={14} className="cv-contact-icon" />
                        <span>{cvData.email}</span>
                      </div>
                    )}
                    {settings.address && (cvData.district || cvData.address) && (
                      <div className="cv-contact-row">
                        <MapPin size={14} className="cv-contact-icon" />
                        <span>{(cvData.district || cvData.address).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Language Skills */}
              {settings.language && cvData.languages && (
                <div className="cv-sidebar-section">
                  <h3 className="cv-sidebar-title">Language Skills</h3>
                  <div className="cv-language-badge-list">
                    <span className="cv-language-pill">{cvData.languages}</span>
                  </div>
                </div>
              )}

              {/* Driving License */}
              {settings.drivingLicense && cvData.drivingLicense && cvData.drivingLicense !== "-" && (
                <div className="cv-sidebar-section">
                  <h3 className="cv-sidebar-title">Driving License</h3>
                  <div className="cv-language-badge-list">
                    <span className="cv-language-pill">{cvData.drivingLicense}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SUB-COLUMN 2: Right Column of CV */}
            <div className="cv-sheet-right">
              {/* Professional Summary */}
              {settings.summary && cvData.summary && (
                <div className="cv-main-section">
                  <h3 className="cv-main-title">Professional Summary</h3>
                  <p className="cv-summary-paragraph">{cvData.summary}</p>
                </div>
              )}

              {/* Personal Information */}
              <div className="cv-main-section">
                <h3 className="cv-main-title">Personal Information</h3>
                <div className="cv-personal-grid">
                  {settings.dob && cvData.dob && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Date of Birth:</span>
                      <span className="cv-field-value">{cvData.dob}</span>
                    </div>
                  )}

                  {settings.age && cvData.age && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Age:</span>
                      <span className="cv-field-value">{cvData.age}</span>
                    </div>
                  )}

                  {settings.gender && cvData.gender && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Gender:</span>
                      <span className="cv-field-value">{cvData.gender}</span>
                    </div>
                  )}

                  {settings.nationality && cvData.nationality && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Nationality:</span>
                      <span className="cv-field-value">{cvData.nationality}</span>
                    </div>
                  )}

                  {settings.nid && cvData.nid && cvData.nid !== "-" && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">NID No:</span>
                      <span className="cv-field-value">{cvData.nid}</span>
                    </div>
                  )}

                  {settings.passportNo && cvData.passportNo && cvData.passportNo !== "-" && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Passport No:</span>
                      <span className="cv-field-value">{cvData.passportNo}</span>
                    </div>
                  )}

                  {settings.passportDates && cvData.passportIssueDate && cvData.passportIssueDate !== "-" && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Date of Issue:</span>
                      <span className="cv-field-value">{cvData.passportIssueDate}</span>
                    </div>
                  )}

                  {settings.passportDates && cvData.passportExpiryDate && cvData.passportExpiryDate !== "-" && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Date of Expiry:</span>
                      <span className="cv-field-value">{cvData.passportExpiryDate}</span>
                    </div>
                  )}

                  {settings.fatherName && cvData.fatherName && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Father Name:</span>
                      <span className="cv-field-value">{cvData.fatherName}</span>
                    </div>
                  )}

                  {settings.motherName && cvData.motherName && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Mother Name:</span>
                      <span className="cv-field-value">{cvData.motherName}</span>
                    </div>
                  )}

                  {settings.maritalStatus && cvData.maritalStatus && cvData.maritalStatus !== "-" && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Marital Status:</span>
                      <span className="cv-field-value">{cvData.maritalStatus}</span>
                    </div>
                  )}

                  {(settings.heightLabel || settings.heightValue) && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">
                        {settings.heightLabel ? "Height:" : ""}
                      </span>
                      <span className="cv-field-value">
                        {settings.heightValue ? cvData.height || "—" : "—"}
                      </span>
                    </div>
                  )}

                  {(settings.weightLabel || settings.weightValue) && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">
                        {settings.weightLabel ? "Weight:" : ""}
                      </span>
                      <span className="cv-field-value">
                        {settings.weightValue ? cvData.weight || "—" : "—"}
                      </span>
                    </div>
                  )}

                  {settings.qualificationValue && cvData.qualification && (
                    <div className="cv-field-item">
                      <span className="cv-field-label">Qualification:</span>
                      <span className="cv-field-value">{cvData.qualification}</span>
                    </div>
                  )}

                  {/* Dynamic Custom Fields */}
                  {cvData.customFields &&
                    cvData.customFields.map((cf) => {
                      if (!cf.label || !cf.value) return null;
                      return (
                        <div key={cf.id} className="cv-field-item">
                          <span className="cv-field-label">{cf.label}:</span>
                          <span className="cv-field-value">{cf.value}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Work Experience Section (Supports Multiple Entries) */}
              {settings.experience && activeExperiences.length > 0 && (
                <div className="cv-main-section">
                  <h3 className="cv-main-title">Work Experience</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {activeExperiences.map((exp) => (
                      <div key={exp.id} className="cv-exp-block">
                        <div className="cv-exp-headline">
                          <span className="cv-exp-role-title">
                            {exp.company
                              ? `${exp.title || "Experience"} (${exp.company})`
                              : exp.title || "Experience"}
                          </span>
                          {exp.period && (
                            <span className="cv-exp-period-badge">{exp.period}</span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="cv-exp-desc-text">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section (Supports Multiple Entries) */}
              {settings.education && activeEducations.length > 0 && (
                <div className="cv-main-section">
                  <h3 className="cv-main-title">Education</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {activeEducations.map((edu) => (
                      <div key={edu.id} className="cv-exp-block">
                        <div className="cv-exp-headline">
                          <span className="cv-exp-role-title">
                            {edu.level || "Educational Qualification"}
                          </span>
                          {edu.year && (
                            <span className="cv-exp-period-badge">{edu.year}</span>
                          )}
                        </div>
                        {(edu.institute || edu.result) && (
                          <p className="cv-exp-desc-text">
                            {[edu.institute, edu.result].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Official CV Sheet Footer */}
            <div className="cv-sheet-footer">
              <span>Orbit Overseas Recruitment OS • Verified Candidate CV</span>
              <span>Candidate ID: {cvData.candidateNo}</span>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: ⚙ PRINT SETTINGS (MATCHES IMAGE 2 + ORBIT THEME) */}
        <aside className="cv-settings-panel no-print" aria-label="CV Print Settings">
          <div className="cv-settings-header">
            <h2 className="cv-settings-title">
              <Settings size={17} style={{ color: "#007aff" }} /> Print Settings
            </h2>
            <div className="cv-settings-actions">
              <button
                type="button"
                className="cv-btn-select-all"
                onClick={handleSelectAll}
              >
                Select All
              </button>
              <button
                type="button"
                className="cv-btn-clear-all"
                onClick={handleClearAll}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* 2-Column Checkbox Grid */}
          <div className="cv-checkboxes-container">
            {/* Column 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              {leftCheckboxes.map(({ key, label }) => (
                <label key={key} className="cv-checkbox-item">
                  <input
                    type="checkbox"
                    className="cv-checkbox-input"
                    checked={settings[key]}
                    onChange={() => toggleSetting(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {/* Column 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              {rightCheckboxes.map(({ key, label }) => (
                <label key={key} className="cv-checkbox-item">
                  <input
                    type="checkbox"
                    className="cv-checkbox-input"
                    checked={settings[key]}
                    onChange={() => toggleSetting(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Download PDF Button */}
          <button
            type="button"
            className="cv-download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            <Download size={17} />
            {isDownloading ? "Generating PDF..." : "Download PDF"}
          </button>

          <div className="cv-secondary-btn-group">
            <button
              type="button"
              className="cv-secondary-btn"
              onClick={handlePrint}
            >
              <Printer size={13} /> Print Dialog
            </button>
            <button
              type="button"
              className="cv-secondary-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 size={13} /> {isEditing ? "Hide Form" : "Edit Details"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
