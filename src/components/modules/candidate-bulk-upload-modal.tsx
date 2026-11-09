"use client";

import { useState, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

type PreviewRow = {
  rowNumber: number;
  data: {
    fullName: string;
    phone: string;
    passportNo?: string;
    nationalId?: string;
    profession?: string;
    preferredCountry?: string;
    source?: string;
    district?: string;
    gender?: string;
    dob?: string;
  };
  valid: boolean;
  duplicate: boolean;
  errors?: string[];
};

type PreviewData = {
  jobId: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  rows: PreviewRow[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CandidateBulkUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ inserted: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setErrorMsg(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;
    const isAllowed = /\.(xlsx|xls|csv)$/i.test(selectedFile.name);
    if (!isAllowed) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);
    setPreview(null);
    setImportSuccess(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);

      const res = await fetch("/api/imports/candidates/preview", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to analyze uploaded file.");
      }

      setPreview(json.data);
      if (json.data.valid > 0) {
        toast.success(`Found ${json.data.valid} valid candidate(s) ready to import.`);
      } else if (json.data.duplicates > 0) {
        toast.warning("All records in this file already exist in the system.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse file.");
      toast.error(err.message || "File parse error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleCommit = async () => {
    if (!preview?.jobId) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/imports/candidates/${preview.jobId}/commit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to complete candidate import.");
      }

      const inserted = json.data?.inserted ?? preview.valid;
      setImportSuccess({ inserted });
      toast.success(`Successfully imported ${inserted} candidates!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bulk Upload Candidates"
      className="master-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="master-modal-content"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#eef2ff",
                color: "#4f46e5",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
                Bulk Upload Candidates
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                Import multiple candidates at once using an Excel (.xlsx) or CSV template.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}
        >
          {/* Success State */}
          {importSuccess ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#065f46", margin: "0 0 6px" }}>
                  Successfully Imported {importSuccess.inserted} Candidates!
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "480px", margin: "0 auto" }}>
                  All candidates have been added to the Candidate Central Registry and their active overseas processing files are now open.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  data-action-ui="primary"
                  data-action-size="normal"
                  onClick={() => {
                    onClose();
                  }}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "#4f46e5",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "13px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  View Candidates Directory
                </button>
                <button
                  type="button"
                  data-action-ui="secondary"
                  data-action-size="normal"
                  onClick={handleReset}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontWeight: 700,
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  Upload Another File
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Template Download Banner */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#e0e7ff",
                      color: "#4338ca",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#1e1b4b" }}>
                      Step 1: Download Format Template
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                      <b>Create Candidate Format:</b> Full Name *, Phone *, Passport No, National ID, Target Country *, Trade / Profession, Agent Partner, District, Gender, Date of Birth, Passport Dates &amp; Family Info.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href="/api/imports/candidates/sample?format=xlsx"
                    download="candidates_bulk_upload_template.xlsx"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "#4f46e5",
                      color: "#ffffff",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                      boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
                    }}
                  >
                    <Download size={14} /> Download Excel (.xlsx)
                  </a>
                  <a
                    href="/api/imports/candidates/sample?format=csv"
                    download="candidates_bulk_upload_template.csv"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      background: "#ffffff",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <Download size={14} /> CSV (.csv)
                  </a>
                </div>
              </div>

              {/* Step 2: Drag & Drop Upload Zone */}
              {!preview && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#334155", marginBottom: "8px" }}>
                    Step 2: Upload Completed File
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) void handleFileSelect(e.target.files[0]);
                    }}
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? "#6366f1" : "#cbd5e1"}`,
                      background: isDragging ? "#eef2ff" : "#fdfdfe",
                      borderRadius: "14px",
                      padding: "36px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        background: "#e0e7ff",
                        color: "#4f46e5",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {analyzing ? <Loader2 size={26} className="animate-spin" /> : <UploadCloud size={26} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                        {analyzing
                          ? "Analyzing candidate records..."
                          : "Click to select or drag and drop your spreadsheet here"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 10 MB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "#991b1b",
                    fontSize: "12.5px",
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <b>File Verification Error:</b> {errorMsg}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fca5a5",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#991b1b",
                      cursor: "pointer",
                    }}
                  >
                    Choose Again
                  </button>
                </div>
              )}

              {/* Step 3: Analysis & Preview Dashboard */}
              {preview && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Summary Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e1b4b" }}>
                        Step 3: Verification &amp; Import Preview
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        File: <b>{file?.name}</b> ({(Number(file?.size || 0) / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 10px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={12} /> Upload Different File
                    </button>
                  </div>

                  {/* 4 Metric Badges */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total Rows</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b", marginTop: "2px" }}>
                        {preview.total}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#ecfdf5",
                        borderRadius: "10px",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#065f46", fontWeight: 700 }}>✓ Ready to Import</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#047857", marginTop: "2px" }}>
                        {preview.valid}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#fffbeb",
                        borderRadius: "10px",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 700 }}>⚠ Duplicates (Skip)</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
                        {preview.duplicates}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        background: preview.invalid > 0 ? "#fef2f2" : "#f8fafc",
                        borderRadius: "10px",
                        border: `1px solid ${preview.invalid > 0 ? "#fecaca" : "#e2e8f0"}`,
                      }}
                    >
                      <div style={{ fontSize: "11px", color: preview.invalid > 0 ? "#991b1b" : "#64748b", fontWeight: 600 }}>
                        Errors
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: preview.invalid > 0 ? "#dc2626" : "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        {preview.invalid}
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      overflowX: "auto",
                      maxHeight: "260px",
                      background: "#ffffff",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "12px",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            color: "#475569",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <th style={{ padding: "8px 10px", width: "40px" }}>#</th>
                          <th style={{ padding: "8px 10px", width: "90px" }}>Status</th>
                          <th style={{ padding: "8px 10px" }}>Full Name</th>
                          <th style={{ padding: "8px 10px" }}>Phone</th>
                          <th style={{ padding: "8px 10px" }}>Passport</th>
                          <th style={{ padding: "8px 10px" }}>Target Country</th>
                          <th style={{ padding: "8px 10px" }}>Trade</th>
                          <th style={{ padding: "8px 10px" }}>Agent Partner</th>
                          <th style={{ padding: "8px 10px" }}>District</th>
                          <th style={{ padding: "8px 10px" }}>Gender</th>
                          <th style={{ padding: "8px 10px" }}>DOB</th>
                          <th style={{ padding: "8px 10px" }}>Notes / Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: r.duplicate
                                ? "#fffdf5"
                                : !r.valid
                                ? "#fef8f8"
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>
                              {r.rowNumber}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              {r.valid ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#ecfdf5",
                                    color: "#059669",
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  <Check size={11} /> Ready
                                </span>
                              ) : r.duplicate ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fffbeb",
                                    color: "#b45309",
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  <AlertTriangle size={11} /> Duplicate
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    fontSize: "10.5px",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  <AlertCircle size={11} /> Error
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>
                              {r.data.fullName}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>{r.data.phone}</td>
                            <td style={{ padding: "8px 10px", color: "#475569", fontWeight: 600 }}>
                              {r.data.passportNo || "—"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {r.data.preferredCountry || "Saudi Arabia"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {r.data.profession || "General Worker"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#6366f1", fontWeight: 600 }}>
                              {r.data.source || "Direct Office"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {r.data.district || "—"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {r.data.gender || "—"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#475569" }}>
                              {r.data.dob ? String(r.data.dob).split("T")[0] : "—"}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: "11px", color: "#dc2626" }}>
                              {r.errors && r.errors.length > 0 ? r.errors.join("; ") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!importSuccess && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={committing}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {preview && preview.valid > 0 ? (
              <button
                type="button"
                onClick={handleCommit}
                disabled={committing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 20px",
                  borderRadius: "8px",
                  background: "#4f46e5",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: committing ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)",
                }}
              >
                {committing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing Candidates...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Confirm &amp; Import {preview.valid} Candidate(s)
                  </>
                )}
              </button>
            ) : preview && preview.valid === 0 ? (
              <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
                No new valid candidates to import (all are duplicates or invalid).
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
