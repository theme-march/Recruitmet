"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 3 * 1024 * 1024;

type Props = {
  candidateName: string;
  imageUrl?: string | null;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  removeRequested?: boolean;
  onRemoveExisting?: () => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
};

export function CandidateProfileImageField({
  candidateName,
  imageUrl,
  selectedFile,
  onFileChange,
  removeRequested = false,
  onRemoveExisting,
  disabled = false,
  compact = false,
  label = "Candidate Profile Photo",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  const currentImage = previewUrl || (!removeRequested ? imageUrl : null);
  const initials = candidateName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CAN";

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size < 1 || file.size > maxBytes) {
      toast.error("Profile photo must be smaller than 3 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onFileChange(file);
  };

  const clearImage = () => {
    const wasSelectedFile = Boolean(selectedFile);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!wasSelectedFile) onRemoveExisting?.();
  };

  return (
    <div
      className="profile-image-field"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? "14px" : "18px",
        padding: compact ? "12px 14px" : "16px 20px",
        border: "1px solid #e0e7ff",
        borderRadius: "14px",
        background: "linear-gradient(135deg, #f8faff 0%, #f1f5fd 100%)",
      }}
    >
      <div
        className="profile-image-avatar"
        style={{
          width: compact ? "60px" : "78px",
          height: compact ? "60px" : "78px",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          fontSize: compact ? "18px" : "22px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
          border: "2px solid #fff",
          position: "relative",
        }}
      >
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={`${candidateName || "Candidate"} profile`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initials
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <b style={{ display: "block", fontSize: compact ? "12.5px" : "13.5px", color: "var(--ink)", marginBottom: "3px" }}>
          {label}
        </b>
        <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "9px" }}>
          Passport / Bio Photo · JPEG, PNG or WebP · max 3 MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0])}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button data-action-ui="secondary" data-action-size="compact"
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #c7d2fe",
              background: "#fff",
              color: "#4338ca",
              fontSize: "11.5px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {currentImage ? <Camera size={13} /> : <ImagePlus size={13} />}
            {currentImage ? "Change Photo" : "Upload Photo"}
          </button>
          {currentImage && (
            <button data-action-ui="danger" data-action-size="compact"
              type="button"
              disabled={disabled}
              onClick={clearImage}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 11px",
                borderRadius: "8px",
                border: "1px solid #fecdd3",
                background: "#fff",
                color: "#e11d48",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
