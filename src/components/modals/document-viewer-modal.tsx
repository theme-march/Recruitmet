"use client";

import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  Globe,
  GraduationCap,
  Printer,
  QrCode,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

export type DocumentViewerData = {
  title: string;
  category: string;
  url?: string;
  fileType?: "image" | "pdf" | "other";
  fileNumber?: string;
  uploadedAt?: string;
  verifiedStatus?: string;
  candidateName?: string;
  passportNo?: string;
  candidateNo?: string;
  country?: string;
  profession?: string;
  company?: string;
  extraMeta?: Record<string, string>;
};

export function DocumentViewerModal({
  doc,
  onClose,
  onAttachFile,
}: {
  doc: DocumentViewerData;
  onClose: () => void;
  onAttachFile?: (category: string, fileData: { url: string; fileName: string; size: string }) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(doc.url);
  const [currentFileName, setCurrentFileName] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCurrentUrl(result);
      setCurrentFileName(file.name);
      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      if (onAttachFile) {
        onAttachFile(doc.category, {
          url: result,
          fileName: file.name,
          size: sizeFormatted,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const isPdf = currentUrl?.toLowerCase().includes("application/pdf") || currentUrl?.toLowerCase().endsWith(".pdf") || doc.fileType === "pdf";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="doc-viewer-overlay" onClick={onClose}>
      <div className="doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-viewer-header no-print">
          <div className="flex items-center gap-3">
            <div className="doc-type-icon">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3>{doc.title}</h3>
              <p>
                {doc.category.toUpperCase()} · File: <b>{doc.fileNumber || "FILE-RECORD"}</b> · Status:{" "}
                <span className="text-emerald-600 font-bold">{doc.verifiedStatus || "Verified Valid"}</span>
                {currentFileName && <span className="text-indigo-600 ml-2 font-semibold">({currentFileName})</span>}
              </p>
            </div>
          </div>
          <div className="doc-viewer-controls">
            {currentUrl && !isPdf && (
              <>
                <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={16} /></button>
                <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={16} /></button>
                <button className="ctrl-btn" onClick={handleRotate} title="Rotate"><RotateCw size={16} /></button>
              </>
            )}
            <button className="ctrl-btn" onClick={handlePrint} title="Print Document">
              <Printer size={15} />
            </button>
            <button
              className="ctrl-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach or Replace Physical Scanned File"
              style={{ width: "auto", padding: "0 12px", gap: "6px", display: "inline-flex", fontSize: "11px", fontWeight: 700 }}
            >
              <UploadCloud size={15} /> {currentUrl ? "Replace Scan" : "Attach Physical Scan"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            {currentUrl && (
              <a href={currentUrl} download={currentFileName || `${doc.title}.png`} className="ctrl-btn" title="Download Document">
                <Download size={16} />
              </a>
            )}
            <button className="ctrl-btn close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div
          className="doc-viewer-body"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileSelect(f);
          }}
        >
          {currentUrl ? (
            isPdf ? (
              <iframe
                src={currentUrl}
                className="doc-iframe"
                title={doc.title}
              />
            ) : (
              <div className="image-viewer-stage">
                <Image
                  src={currentUrl}
                  alt={doc.title}
                  width={800}
                  height={1000}
                  unoptimized
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                  className="doc-preview-img"
                />
              </div>
            )
          ) : (
            /* OFFICIAL DIGITAL CERTIFICATE SLIP TEMPLATES */
            <div className="digital-certificate-paper printable-area">
              {/* GAMCA Medical Certificate Slip */}
              {doc.category.toLowerCase().includes("medical") && (
                <div className="cert-wrapper medical-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge">🏥 GCC GAMCA</div>
                      <div>
                        <h2>EXECUTIVE BOARD OF THE HEALTH MINISTERS’ COUNCIL FOR GCC STATES</h2>
                        <p>GAMCA GCC APPROVED MEDICAL EXAMINATION &amp; FITNESS CERTIFICATE</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">FIT FOR EMPLOYMENT</span>
                      <small>GCC Slip: <b>GAMCA-BD-{doc.fileNumber?.slice(-6) || "481846"}</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Candidate Full Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport Number:</span>
                      <strong>{doc.passportNo || "A0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>File Reference:</span>
                      <strong>{doc.fileNumber || "FILE-481846"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Destination Country:</span>
                      <strong>🇸🇦 Saudi Arabia (KSA)</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Applied Profession:</span>
                      <strong>{doc.profession || "General Electrician / Plumber"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Medical Center:</span>
                      <strong>Ibn Sina GCC Medical Center, Dhanmondi, Dhaka</strong>
                    </div>
                  </div>

                  {/* Medical Test Results Table */}
                  <table className="cert-table">
                    <thead>
                      <tr>
                        <th>Medical Investigation Item</th>
                        <th>Standard GCC Criteria</th>
                        <th>Observed Clinical Finding</th>
                        <th className="text-right">Result Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b>HIV I &amp; II / Hepatitis B &amp; C</b></td>
                        <td>Non-Reactive</td>
                        <td>Serology Negative</td>
                        <td className="text-right text-emerald-600 font-bold">PASSED ✓</td>
                      </tr>
                      <tr>
                        <td><b>Chest X-Ray (Lungs / Tuberculosis)</b></td>
                        <td>Normal / Clear</td>
                        <td>Clear Lung Fields / No Infiltrate</td>
                        <td className="text-right text-emerald-600 font-bold">CLEAR ✓</td>
                      </tr>
                      <tr>
                        <td><b>VDRL / Syphilis Serology</b></td>
                        <td>Negative</td>
                        <td>Non-Reactive</td>
                        <td className="text-right text-emerald-600 font-bold">PASSED ✓</td>
                      </tr>
                      <tr>
                        <td><b>Visual Acuity &amp; Color Vision</b></td>
                        <td>6/6 Corrected</td>
                        <td>Normal Color Perception</td>
                        <td className="text-right text-emerald-600 font-bold">NORMAL ✓</td>
                      </tr>
                      <tr>
                        <td><b>Biometric 10-Fingerprint Check</b></td>
                        <td>Biometric Match</td>
                        <td>GCC Database Verified</td>
                        <td className="text-right text-emerald-600 font-bold">VERIFIED ✓</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="cert-final-verdict-box">
                    <div>
                      <span>FINAL MEDICAL VERDICT:</span>
                      <strong className="text-emerald-700">FIT FOR OVERSEAS EMPLOYMENT (GCC / KSA)</strong>
                    </div>
                    <div className="cert-qr-block">
                      <QrCode size={40} className="text-slate-800" />
                      <span className="text-[10px] text-slate-500 font-mono">GAMCA-VALID-100%</span>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Examining Medical Officer</span>
                      <small>Dr. S. M. Rahman, MBBS, FCPS</small>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Authorized GCC Medical Director Seal</span>
                      <small>GCC Health Council Accreditation RL-1284</small>
                    </div>
                  </div>
                </div>
              )}

              {/* Passport Bio Data Dossier */}
              {doc.category.toLowerCase().includes("passport") && (
                <div className="cert-wrapper passport-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-indigo-900 text-white">📘 PASSPORT</div>
                      <div>
                        <h2>PEOPLE’S REPUBLIC OF BANGLADESH · PASSPORT BIO DOSSIER</h2>
                        <p>DEPARTMENT OF IMMIGRATION &amp; PASSPORTS · VERIFIED RECORD</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-indigo-700 text-white">ORIGINAL VERIFIED</span>
                      <small>Type: <b>Ordinary (P)</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Passport No:</span>
                      <strong className="text-indigo-900 text-base">{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Surname &amp; Given Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Nationality:</span>
                      <strong>Bangladeshi (BGD)</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Date of Issue:</span>
                      <strong>01/01/2024</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Date of Expiry (10 Years):</span>
                      <strong>01/01/2034</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Issuing Authority:</span>
                      <strong>DIP / DHAKA</strong>
                    </div>
                  </div>

                  <div className="passport-mrz-box">
                    <code>P&lt;BGD{doc.candidateName?.replace(/\s+/g, "<").toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>
                    <code>{doc.passportNo || "0123654789"}4BGD9501018M3401015&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06</code>
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Bearer’s Signature</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Immigration Officer Verification &amp; Seal</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Police Clearance PCC Certificate */}
              {doc.category.toLowerCase().includes("police") && (
                <div className="cert-wrapper police-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-slate-800 text-white">🛡️ POLICE PCC</div>
                      <div>
                        <h2>BANGLADESH POLICE · SPECIAL BRANCH (SB), DHAKA</h2>
                        <p>POLICE CLEARANCE CERTIFICATE FOR OVERSEAS EMPLOYMENT</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">CLEAR / NO CRIMINAL RECORD</span>
                      <small>Validity: <b>180 Days</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Applicant Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport No:</span>
                      <strong>{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>PCC Reference Number:</span>
                      <strong>PCC-{doc.fileNumber || "481846"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>District / Police Station:</span>
                      <strong>Dhaka Metropolitan Police</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs font-semibold my-4 leading-relaxed">
                    This is to certify that according to the police records, there is no adverse or criminal case pending against the applicant in the jurisdiction of Bangladesh Police. The applicant is cleared for overseas employment in Saudi Arabia.
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Superintendent of Police (SB)</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Ministry of Foreign Affairs Attestation</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Takamul Skill Test Certificate */}
              {doc.category.toLowerCase().includes("takamul") && (
                <div className="cert-wrapper takamul-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-amber-700 text-white">🏅 TAKAMUL</div>
                      <div>
                        <h2>KINGDOM OF SAUDI ARABIA · SKILL VERIFICATION PROGRAM (SVP)</h2>
                        <p>TAKAMUL / QIWA ACCREDITED OCCUPATIONAL TEST CERTIFICATE</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">SVP PASSED (94%)</span>
                      <small>Cert: <b>TAK-{doc.fileNumber?.slice(-6) || "481846"}</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Certified Professional:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport No:</span>
                      <strong>{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Certified Trade:</span>
                      <strong>{doc.profession || "General Electrician / Building Technician"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Test Center:</span>
                      <strong>Takamul Accredited Dhaka Center</strong>
                    </div>
                  </div>

                  <div className="cert-final-verdict-box">
                    <div>
                      <span>QIWA SKILL AUTHENTICATION:</span>
                      <strong className="text-emerald-700">CERTIFIED COMPETENT FOR SAUDI ARABIA VISA ISSUANCE</strong>
                    </div>
                    <QrCode size={36} className="text-slate-800" />
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Chief Technical Examiner</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Ministry of Human Resources Seal</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Electronic Visa MOFA Embassy Copy */}
              {doc.category.toLowerCase().includes("visa") && (
                <div className="cert-wrapper visa-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-emerald-800 text-white">🌐 E-VISA</div>
                      <div>
                        <h2>KINGDOM OF SAUDI ARABIA · MINISTRY OF FOREIGN AFFAIRS (MOFA)</h2>
                        <p>ELECTRONIC WORK VISA STAMPING · EMBASSY OF SAUDI ARABIA, DHAKA</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">VISA ISSUED &amp; STAMPED</span>
                      <small>Validity: <b>90 Days Single Entry</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Visa Number:</span>
                      <strong className="text-emerald-800 text-base">VISA-KSA-{doc.fileNumber?.slice(-6) || "481846"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>MOFA Number:</span>
                      <strong>MOFA-98120931</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Beneficiary Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport Number:</span>
                      <strong>{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Sponsor / Employer (Kafeel):</span>
                      <strong>{doc.company || "Al-Yamama Group for Trading & Contracting (🇸🇦)"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Designated Profession:</span>
                      <strong>{doc.profession || "Electrician / Building Worker"}</strong>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Consular Affairs Officer</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Royal Embassy of Saudi Arabia Seal</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BMET Manpower Smart Card Document */}
              {doc.category.toLowerCase().includes("manpower") && (
                <div className="cert-wrapper manpower-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-emerald-700 text-white">📜 BMET</div>
                      <div>
                        <h2>GOVERNMENT OF THE PEOPLE’S REPUBLIC OF BANGLADESH</h2>
                        <p>BUREAU OF MANPOWER, EMPLOYMENT AND TRAINING (BMET) · SMART CARD CLEARANCE</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">GOVT EMIGRATION CLEARED</span>
                      <small>Smart Card: <b>BMET-{doc.fileNumber?.slice(-6) || "481846"}</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Emigrant Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport Number:</span>
                      <strong>{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Recruiting Agency:</span>
                      <strong>ORBIT OVERSEAS RECRUITMENT (RL-1284)</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Foreign Employer:</span>
                      <strong>{doc.company || "Al-Yamama Group (🇸🇦)"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>3-Day PDOT Briefing:</span>
                      <strong className="text-emerald-700">COMPLETED &amp; VERIFIED ✓</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>BMET Fingerprint Biometric:</span>
                      <strong className="text-emerald-700">MATCHED ✓</strong>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Director (Emigration &amp; Clearance)</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>BMET Official Government Hologram</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Flight Ticket */}
              {doc.category.toLowerCase().includes("flight") && (
                <div className="cert-wrapper flight-cert">
                  <div className="cert-header">
                    <div className="cert-branding">
                      <div className="cert-logo-badge bg-blue-900 text-white">✈️ E-TICKET</div>
                      <div>
                        <h2>SAUDIA ARABIAN AIRLINES (SV) · ELECTRONIC FLIGHT TICKET</h2>
                        <p>PASSENGER ITINERARY &amp; OFFICIAL BOARDING CONFIRMATION</p>
                      </div>
                    </div>
                    <div className="cert-seal-box">
                      <span className="cert-status-tag bg-emerald-600 text-white">CONFIRMED / SEAT BOOKED</span>
                      <small>PNR: <b>PNR-8921098</b></small>
                    </div>
                  </div>

                  <div className="cert-divider" />

                  <div className="cert-candidate-grid">
                    <div className="cert-meta-item">
                      <span>Passenger Name:</span>
                      <strong>{doc.candidateName || "Md. Candidate Khan"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Passport No:</span>
                      <strong>{doc.passportNo || "0123654789"}</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Flight Route:</span>
                      <strong>DAC (Dhaka) ➔ RUH (Riyadh, KSA)</strong>
                    </div>
                    <div className="cert-meta-item">
                      <span>Flight No:</span>
                      <strong>SV-803 (Saudia Airlines)</strong>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Airlines Ticketing Desk</span>
                    </div>
                    <div className="sig-block">
                      <div className="sig-line" />
                      <span>Airport Emigration Desk</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
