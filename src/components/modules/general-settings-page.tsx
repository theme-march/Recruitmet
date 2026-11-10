"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileCode,
  FileJson,
  Globe,
  HardDrive,
  ImageIcon,
  Info,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SETTINGS,
  settingsQueryKey,
  settingsQueryOptions,
  type GeneralSettings,
  type BackupItem,
  type DatabaseStats,
} from "@/lib/queries/settings";
import { DashboardBrandMark } from "@/components/layout/dashboard-icon";

const COLOR_PRESETS = [
  { name: "Orbit Blue", hex: "#007aff" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Royal Purple", hex: "#8b5cf6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
];

export function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(settingsQueryOptions);
  const serverSettings = settingsQuery.data ?? DEFAULT_SETTINGS;

  const [form, setForm] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<"general" | "company" | "backup" | "system">("general");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState<"sql" | "json" | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupsQueryKey = ["database-backups"] as const;
  const backupsQuery = useQuery({
    queryKey: backupsQueryKey,
    queryFn: async () => {
      const res = await fetch("/api/settings/backup");
      if (!res.ok) throw new Error("Failed to load backups");
      const json = await res.json();
      return {
        stats: (json.stats as DatabaseStats) || null,
        backups: (json.backups as BackupItem[]) || [],
      };
    },
    staleTime: 1000 * 30,
  });

  // Sync form with fetched data
  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const handleChange = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleChange("logoUrl", dataUrl);
        toast.success("Logo uploaded! Remember to click 'Save Settings'.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleChange("logoUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Logo cleared. Default system logo will be used.");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...form }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update settings.");
      }

      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      toast.success("Settings saved successfully! Branding updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to the original system defaults?")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to reset settings.");
      }

      setForm(DEFAULT_SETTINGS);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      toast.success("Settings restored to original system defaults!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset settings.");
    } finally {
      setResetting(false);
    }
  };

  const handleTriggerBackup = async (format: "sql" | "json") => {
    setIsBackingUp(format);
    try {
      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, type: "manual" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create database backup.");
      }

      toast.success(`${format.toUpperCase()} database backup created successfully!`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: backupsQueryKey }),
        queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
      ]);

      if (json.downloadUrl) {
        const a = document.createElement("a");
        a.href = json.downloadUrl;
        a.download = json.backup?.filename || `database_backup.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create backup.");
    } finally {
      setIsBackingUp(null);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete backup "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingFilename(filename);
    try {
      const res = await fetch(`/api/settings/backup?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to delete backup file.");
      }

      toast.success("Backup file deleted successfully.");
      await queryClient.invalidateQueries({ queryKey: backupsQueryKey });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete backup file.");
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleSaveBackupSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...form }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save backup settings.");
      }

      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      toast.success("Database backup configuration saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save backup settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="country-design-page management-design-page" style={{ paddingBottom: "60px" }}>
      {/* 1. Breadcrumbs */}
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link> / System Settings / <span>General Settings</span>
      </nav>

      {/* 2. Page Header */}
      <header className="country-design-heading management-heading" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#f0edff",
                color: "#6366f1",
              }}
            >
              <Settings size={20} />
            </span>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
              General Settings
            </h1>
          </div>
          <p style={{ margin: "6px 0 0", color: "#66666e", fontSize: "13px" }}>
            Configure software name, brand logo, portal subtitle, and office contact identity across Recruitment OS.
          </p>
        </div>

        <div className="country-design-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            title="Reset to default system logo and title"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 16px",
              height: "36px",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              fontWeight: 600,
              fontSize: "12.5px",
              cursor: resetting ? "not-allowed" : "pointer",
            }}
          >
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Reset to Defaults
          </button>

          <button
            data-action-ui="primary"
            data-action-size="normal"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || resetting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 18px",
              height: "36px",
              borderRadius: "18px",
              border: "none",
              background: "#007aff",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Settings
          </button>
        </div>
      </header>

      {/* 3. Settings Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #e5e5ea",
          paddingBottom: "12px",
          marginBottom: "24px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 16px",
            borderRadius: "16px",
            border: "none",
            background: activeTab === "general" ? "#007aff" : "#ebebed",
            color: activeTab === "general" ? "#ffffff" : "#1d1d1f",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Sparkles size={14} /> Basic &amp; Branding
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("company")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 16px",
            borderRadius: "16px",
            border: "none",
            background: activeTab === "company" ? "#007aff" : "#ebebed",
            color: activeTab === "company" ? "#ffffff" : "#1d1d1f",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Building2 size={14} /> Company Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 16px",
            borderRadius: "16px",
            border: "none",
            background: activeTab === "backup" ? "#007aff" : "#ebebed",
            color: activeTab === "backup" ? "#ffffff" : "#1d1d1f",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Database size={14} /> Database Backup
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 16px",
            borderRadius: "16px",
            border: "none",
            background: activeTab === "system" ? "#007aff" : "#ebebed",
            color: activeTab === "system" ? "#ffffff" : "#1d1d1f",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Info size={14} /> System Info
        </button>
      </div>

      {/* 4. Tab Contents */}
      <form onSubmit={handleSubmit}>
        {activeTab === "general" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
            {/* Left Column: Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Card 1: Software Identity */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e5e5ea",
                  padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <Layers size={17} style={{ color: "#007aff" }} />
                  <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                    Software Identity &amp; Title
                  </h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Software Name / Brand Title <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.softwareName}
                      onChange={(e) => handleChange("softwareName", e.target.value)}
                      placeholder="e.g. ORBIT, Hyqorix ATS"
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "9px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "#fafafa",
                        outline: "none",
                      }}
                      required
                    />
                    <small style={{ display: "block", color: "#8e8e93", fontSize: "11px", marginTop: "4px" }}>
                      Displayed in bold on the sidebar, header, and browser tabs.
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Software Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={form.softwareSubtitle}
                      onChange={(e) => handleChange("softwareSubtitle", e.target.value)}
                      placeholder="e.g. Requirements PANEL, Recruitment OS"
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "9px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                        color: "#1e293b",
                        background: "#fafafa",
                        outline: "none",
                      }}
                    />
                    <small style={{ display: "block", color: "#8e8e93", fontSize: "11px", marginTop: "4px" }}>
                      Small subtext beneath the brand name in the navigation bar.
                    </small>
                  </div>
                </div>

                <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Software Version
                    </label>
                    <input
                      type="text"
                      value={form.softwareVersion}
                      onChange={(e) => handleChange("softwareVersion", e.target.value)}
                      placeholder="e.g. 2.4.0, 26.1"
                      style={{
                        width: "100%",
                        height: "38px",
                        padding: "0 12px",
                        borderRadius: "9px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                        color: "#1e293b",
                        background: "#fafafa",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Primary Accent Color
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="color"
                        value={form.primaryColor || "#007aff"}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        style={{
                          width: "38px",
                          height: "38px",
                          padding: "2px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          background: "#ffffff",
                        }}
                      />
                      <input
                        type="text"
                        value={form.primaryColor}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        placeholder="#007aff"
                        style={{
                          flex: 1,
                          height: "38px",
                          padding: "0 12px",
                          borderRadius: "9px",
                          border: "1px solid #e2e8f0",
                          fontSize: "13px",
                          color: "#1e293b",
                          background: "#fafafa",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Logo & Media Upload */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e5e5ea",
                  padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <ImageIcon size={17} style={{ color: "#6366f1" }} />
                  <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                    Logo &amp; Brand Media
                  </h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "16px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                      Upload Custom Brand Logo
                    </label>
                    <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: "12px", lineHeight: "1.4" }}>
                      Upload your agency or company logo. Recommended format: PNG, SVG, or WebP with transparent background. Max size: 2 MB.
                    </p>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        style={{ display: "none" }}
                        id="logo-file-input"
                      />
                      <label
                        htmlFor="logo-file-input"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: "#f0edff",
                          color: "#4f46e5",
                          border: "1px solid #c7d2fe",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={13} /> Choose Logo File
                      </label>

                      {form.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "#fff1f2",
                            color: "#e11d48",
                            border: "1px solid #fecdd3",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <X size={13} /> Remove Custom Logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo Preview Tile */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{ display: "block", fontSize: "11px", color: "#8e8e93", marginBottom: "6px" }}>
                      Logo Preview
                    </span>
                    <div
                      style={{
                        width: "110px",
                        height: "110px",
                        borderRadius: "14px",
                        border: "1px dashed #cbd5e1",
                        background: "#f8fafc",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        padding: "8px",
                        margin: "0 auto",
                      }}
                    >
                      {form.logoUrl ? (
                        <img
                          src={form.logoUrl}
                          alt="Logo Preview"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ textAlign: "center" }}>
                          <DashboardBrandMark />
                          <small style={{ display: "block", fontSize: "9px", color: "#94a3b8", marginTop: "4px" }}>
                            Default Logo
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live App Mockup Preview */}
            <div style={{ position: "sticky", top: "24px" }}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e5e5ea",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                  <Sparkles size={15} style={{ color: "#f59e0b" }} />
                  <h3 style={{ fontSize: "13.5px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                    Live Brand Preview
                  </h3>
                </div>

                <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "11.5px", lineHeight: "1.4" }}>
                  This is how your branding and title appear across the application sidebar and header navigation:
                </p>

                {/* Mock Sidebar Header */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        style={{ width: "28px", height: "28px", objectFit: "contain" }}
                      />
                    ) : (
                      <DashboardBrandMark />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ display: "block", fontSize: "14px", color: "#1d1d1f", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {form.softwareName || "ORBIT"}
                    </b>
                    <small style={{ display: "block", fontSize: "10.5px", color: "#8e8e93", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {form.softwareSubtitle || "Requirements PANEL"}
                    </small>
                  </div>
                </div>

                {/* Mock Browser Tab */}
                <div
                  style={{
                    background: "#f1f5f9",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      background: "#e2e8f0",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="" style={{ width: "12px", height: "12px", objectFit: "contain" }} />
                    ) : (
                      <Globe size={11} style={{ color: "#64748b" }} />
                    )}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {form.companyName || "Orbit Overseas"} | {form.softwareName || "Recruitment OS"}
                  </span>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #e2e8f0" }}>
                  <button
                    type="submit"
                    disabled={saving || resetting}
                    style={{
                      width: "100%",
                      height: "38px",
                      borderRadius: "10px",
                      background: "#007aff",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Brand Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "company" && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e5ea",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                <Building2 size={18} style={{ color: "#007aff" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                  Company &amp; Organization Profile
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Official Company Name
                  </label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => handleChange("companyName", e.target.value)}
                    placeholder="e.g. Orbit Overseas Ltd."
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "9px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                      color: "#1e293b",
                      background: "#fafafa",
                      outline: "none",
                    }}
                  />
                  <small style={{ color: "#8e8e93", fontSize: "11px" }}>Used on official money receipts and generated CVs.</small>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Company Phone / Hotline
                  </label>
                  <input
                    type="text"
                    value={form.companyPhone}
                    onChange={(e) => handleChange("companyPhone", e.target.value)}
                    placeholder="e.g. +880 1711-000000"
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "9px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                      color: "#1e293b",
                      background: "#fafafa",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) => handleChange("companyEmail", e.target.value)}
                    placeholder="e.g. info@orbitoverseas.com"
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "9px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                      color: "#1e293b",
                      background: "#fafafa",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Head Office City / State
                  </label>
                  <input
                    type="text"
                    defaultValue="Dhaka, Bangladesh"
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "9px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                      color: "#1e293b",
                      background: "#fafafa",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Head Office Physical Address
                </label>
                <textarea
                  value={form.companyAddress}
                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                  placeholder="e.g. Plot No. 23, Road No. 11, Block F, Banani, Dhaka 1213, Bangladesh"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "9px",
                    border: "1px solid #e2e8f0",
                    fontSize: "13px",
                    color: "#1e293b",
                    background: "#fafafa",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={saving || resetting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 18px",
                    height: "36px",
                    borderRadius: "18px",
                    border: "none",
                    background: "#007aff",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Company Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "backup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
            {/* 1. Top Database Overview Stats (Full Width Grid) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", width: "100%" }}>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e5e5ea",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#eff6ff",
                    color: "#007aff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Database size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Tables
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {backupsQuery.data?.stats?.totalTables ?? 71} Tables
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e5e5ea",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#f0fdf4",
                    color: "#16a34a",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Stored Records
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {backupsQuery.data?.stats?.totalRows?.toLocaleString() ?? "320+"} Records
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e5e5ea",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    color: "#475569",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <HardDrive size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Database Engine
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    Prisma ORM + MySQL
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e5e5ea",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#faf5ff",
                    color: "#9333ea",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Last Backup
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {backupsQuery.data?.stats?.lastBackupAt
                      ? new Date(backupsQuery.data.stats.lastBackupAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "No backup yet"}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Middle Row: 2-Column Split (Scheduled Backup + Instant Manual Backup) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "20px", width: "100%", alignItems: "stretch" }}>
              {/* Left Card: Automatic Scheduled Backup */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e5e5ea",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Clock size={18} style={{ color: "#007aff" }} />
                    <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                      Automatic Scheduled Backup
                    </h2>
                  </div>

                  {/* iOS Style Toggle Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>
                          Automatic Backup
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: form.autoBackupEnabled ? "#e8f5e9" : "#f1f5f9",
                            color: form.autoBackupEnabled ? "#2e7d32" : "#64748b",
                          }}
                        >
                          {form.autoBackupEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <small style={{ color: "#8e8e93", fontSize: "11px", display: "block", marginTop: "2px" }}>
                        {form.autoBackupEnabled
                          ? "Regular snapshots are automatically generated according to the schedule."
                          : "Automatic backup is disabled. You can still generate manual snapshots anytime."}
                      </small>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.autoBackupEnabled}
                      onClick={() => handleChange("autoBackupEnabled", !form.autoBackupEnabled)}
                      title={form.autoBackupEnabled ? "Click to disable auto backup" : "Click to enable auto backup"}
                      style={{
                        position: "relative",
                        width: "48px",
                        height: "28px",
                        borderRadius: "14px",
                        background: form.autoBackupEnabled ? "#34c759" : "#cbd5e1",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        outline: "none",
                        transition: "background-color 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                          transform: form.autoBackupEnabled ? "translateX(20px)" : "translateX(0px)",
                          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </button>
                  </div>

                  {/* Schedule Configuration Fields */}
                  <div
                    style={{
                      opacity: form.autoBackupEnabled ? 1 : 0.45,
                      pointerEvents: form.autoBackupEnabled ? "auto" : "none",
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                          Backup Frequency
                        </label>
                        <select
                          value={form.backupFrequency}
                          onChange={(e) => handleChange("backupFrequency", e.target.value as any)}
                          style={{
                            width: "100%",
                            height: "38px",
                            padding: "0 12px",
                            borderRadius: "9px",
                            border: "1px solid #e2e8f0",
                            fontSize: "13px",
                            color: "#1e293b",
                            background: "#fafafa",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="12hours">Every 12 Hours</option>
                          <option value="daily">Daily (Once a Day - Recommended)</option>
                          <option value="weekly">Weekly (Once a Week)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                          Preferred Backup Time
                        </label>
                        <input
                          type="time"
                          value={form.backupTime || "02:00"}
                          onChange={(e) => handleChange("backupTime", e.target.value)}
                          style={{
                            width: "100%",
                            height: "38px",
                            padding: "0 12px",
                            borderRadius: "9px",
                            border: "1px solid #e2e8f0",
                            fontSize: "13px",
                            color: "#1e293b",
                            background: "#fafafa",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                        Retention Period
                      </label>
                      <select
                        value={form.backupRetention}
                        onChange={(e) => handleChange("backupRetention", parseInt(e.target.value, 10))}
                        style={{
                          width: "100%",
                          height: "38px",
                          padding: "0 12px",
                          borderRadius: "9px",
                          border: "1px solid #e2e8f0",
                          fontSize: "13px",
                          color: "#1e293b",
                          background: "#fafafa",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value={7}>Keep last 7 days</option>
                        <option value={14}>Keep last 14 days (Recommended)</option>
                        <option value={30}>Keep last 30 days (1 Month)</option>
                        <option value={60}>Keep last 60 days (2 Months)</option>
                      </select>
                      <small style={{ color: "#8e8e93", fontSize: "11px", display: "block", marginTop: "4px" }}>
                        Older snapshots are automatically pruned to conserve server disk space.
                      </small>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
                  <button
                    type="button"
                    onClick={() => void handleSaveBackupSettings()}
                    disabled={saving || resetting}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0 18px",
                      height: "36px",
                      borderRadius: "18px",
                      border: "none",
                      background: "#007aff",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      cursor: saving ? "not-allowed" : "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Backup Settings
                  </button>
                </div>
              </div>

              {/* Right Card: Instant Manual Backup */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e5e5ea",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Download size={18} style={{ color: "#007aff" }} />
                    <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                      Instant Manual Backup
                    </h2>
                  </div>

                  <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "12.5px" }}>
                    Generate and download a complete database snapshot directly to your local machine.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* SQL Dump Option */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <FileCode size={18} style={{ color: "#007aff" }} />
                          <b style={{ fontSize: "13.5px", color: "#1e293b" }}>Full SQL Dump (.sql)</b>
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "8px",
                            background: "#e0f2fe",
                            color: "#0284c7",
                          }}
                        >
                          Recommended
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
                        Complete MySQL schema and table records. Ready for direct restore via MySQL Workbench, command line, or phpMyAdmin.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleTriggerBackup("sql")}
                        disabled={isBackingUp !== null}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          width: "100%",
                          height: "36px",
                          borderRadius: "18px",
                          border: "none",
                          background: "#007aff",
                          color: "#ffffff",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: isBackingUp !== null ? "not-allowed" : "pointer",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                          marginTop: "2px",
                        }}
                      >
                        {isBackingUp === "sql" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isBackingUp === "sql" ? "Generating SQL Dump..." : "Download SQL Backup (.sql)"}
                      </button>
                    </div>

                    {/* JSON Export Option */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <FileJson size={18} style={{ color: "#10b981" }} />
                          <b style={{ fontSize: "13.5px", color: "#1e293b" }}>JSON Export (.json)</b>
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "8px",
                            background: "#ecfdf5",
                            color: "#059669",
                          }}
                        >
                          JSON Format
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
                        Structured JSON format organized by database table. Ideal for migrations, scripts, data audit, and analysis.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleTriggerBackup("json")}
                        disabled={isBackingUp !== null}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          width: "100%",
                          height: "36px",
                          borderRadius: "18px",
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          color: "#1e293b",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: isBackingUp !== null ? "not-allowed" : "pointer",
                          marginTop: "2px",
                        }}
                      >
                        {isBackingUp === "json" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isBackingUp === "json" ? "Exporting JSON Data..." : "Export JSON Data (.json)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bottom Row: Stored Server Backups (Full Width) */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e5ea",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <HardDrive size={18} style={{ color: "#007aff" }} />
                  <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                    Stored Server Backups
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => void backupsQuery.refetch()}
                  disabled={backupsQuery.isFetching}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 12px",
                    height: "30px",
                    borderRadius: "15px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: backupsQuery.isFetching ? "not-allowed" : "pointer",
                  }}
                >
                  <RefreshCw size={12} className={backupsQuery.isFetching ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {backupsQuery.isLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontSize: "13px", margin: 0 }}>Loading backup records...</p>
                </div>
              ) : !backupsQuery.data?.backups || backupsQuery.data.backups.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <Database size={32} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                  <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#334155", margin: "0 0 4px" }}>
                    No database backups found on server
                  </p>
                  <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0 }}>
                    Click &quot;Download Full SQL Backup&quot; above to create your first database snapshot.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e5e5ea", borderRadius: "10px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>File Name</th>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Type</th>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Format</th>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Size</th>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Created Date</th>
                        <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsQuery.data.backups.map((b) => (
                        <tr key={b.filename} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>
                            {b.filename}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: b.type === "auto" ? "#e8f5e9" : "#e0f2fe",
                                color: b.type === "auto" ? "#2e7d32" : "#0284c7",
                              }}
                            >
                              {b.type === "auto" ? "Scheduled" : "Manual"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                color: "#334155",
                              }}
                            >
                              {b.format.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#475569", fontWeight: 500 }}>
                            {b.sizeFormatted}
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b", fontSize: "12px" }}>
                            {new Date(b.createdAt).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              <a
                                href={`/api/settings/backup/download?filename=${encodeURIComponent(b.filename)}`}
                                download={b.filename}
                                title="Download this backup file"
                                style={{
                                  display: "inline-grid",
                                  placeItems: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#f0f9ff",
                                  color: "#007aff",
                                  border: "1px solid #bae6fd",
                                  cursor: "pointer",
                                }}
                              >
                                <Download size={13} />
                              </a>

                              <button
                                type="button"
                                onClick={() => void handleDeleteBackup(b.filename)}
                                disabled={deletingFilename === b.filename}
                                title="Permanently delete this backup file"
                                style={{
                                  display: "inline-grid",
                                  placeItems: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#fef2f2",
                                  color: "#ef4444",
                                  border: "1px solid #fecaca",
                                  cursor: deletingFilename === b.filename ? "not-allowed" : "pointer",
                                }}
                              >
                                {deletingFilename === b.filename ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e5ea",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Info size={18} style={{ color: "#007aff" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1d1d1f" }}>
                  System Information &amp; Health
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", color: "#64748b", fontSize: "11px" }}>Application Framework</span>
                  <b style={{ color: "#1e293b" }}>Next.js 16 + React 19 (Turbopack)</b>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", color: "#64748b", fontSize: "11px" }}>Database Engine</span>
                  <b style={{ color: "#1e293b" }}>Prisma ORM + MySQL</b>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", color: "#64748b", fontSize: "11px" }}>Current Release Version</span>
                  <b style={{ color: "#1e293b" }}>v{form.softwareVersion || "2.4.0"}</b>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", color: "#64748b", fontSize: "11px" }}>System Health</span>
                  <b style={{ color: "#15803d", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <CheckCircle2 size={13} /> Operational
                  </b>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
