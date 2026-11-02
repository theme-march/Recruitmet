"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 3 * 1024 * 1024;

type Props = {
  agentName: string;
  imageUrl?: string | null;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  removeRequested?: boolean;
  onRemoveExisting?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function AgentProfileImageField({
  agentName,
  imageUrl,
  selectedFile,
  onFileChange,
  removeRequested = false,
  onRemoveExisting,
  disabled = false,
  compact = false,
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
  const initials = agentName.trim().slice(0, 2).toUpperCase() || "AG";

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size < 1 || file.size > maxBytes) {
      toast.error("Profile image must be smaller than 3 MB.");
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
        gap: compact ? "12px" : "16px",
        padding: compact ? "12px" : "14px",
        border: "1px solid #ddd6fe",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #faf9ff 0%, #f5f3ff 100%)",
      }}
    >
      <div
        className="profile-image-avatar"
        style={{
          width: compact ? "58px" : "72px",
          height: compact ? "58px" : "72px",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          fontSize: compact ? "17px" : "21px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #7258e8 0%, #4f46e5 100%)",
          boxShadow: "0 3px 10px rgba(114,88,232,0.25)",
        }}
      >
        {currentImage ? (
          // Authenticated, same-origin image endpoint; a native img avoids optimizer proxying.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentImage} alt={`${agentName || "Agent"} profile`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <b style={{ display: "block", fontSize: "12.5px", color: "var(--ink)", marginBottom: "3px" }}>
          Agent Profile Image
        </b>
        <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "9px" }}>
          JPEG, PNG or WebP · maximum 3 MB
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
              padding: "7px 10px",
              borderRadius: "8px",
              border: "1px solid #c4b5fd",
              background: "#fff",
              color: "#6d4ee8",
              fontSize: "11.5px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {currentImage ? <Camera size={13} /> : <ImagePlus size={13} />}
            {currentImage ? "Change Image" : "Upload Image"}
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
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid #fecdd3",
                background: "#fff",
                color: "#e11d48",
                fontSize: "11.5px",
                fontWeight: 800,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
