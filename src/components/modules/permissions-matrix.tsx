"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  CheckSquare,
  Crown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Headphones,
  KeyRound,
  Lock,
  Mail,
  MinusSquare,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ActionKey = "create" | "read" | "edit" | "delete" | "export" | "assign";

interface ModuleDefinition {
  id: string;
  label: string;
  desc: string;
  icon: any;
  hasExport?: boolean;
  hasAssign?: boolean;
}

const moduleConfig: ModuleDefinition[] = [
  {
    id: "dashboard",
    label: "Analytics Dashboard",
    desc: "Executive overview, live recruitment metrics, and operational performance KPIs",
    icon: ShieldCheck,
    hasExport: true,
  },
  {
    id: "call-center",
    label: "Call Center & Leads",
    desc: "Lead pipeline management, inbound/outbound call logs, and candidate follow-ups",
    icon: Headphones,
    hasExport: true,
    hasAssign: true,
  },
  {
    id: "registration",
    label: "Registration & Interviews",
    desc: "Candidate interview drives, registration events, and company selection sessions",
    icon: Users,
    hasExport: true,
  },
  {
    id: "ksa",
    label: "Saudi Arabia Dossiers",
    desc: "End-to-end visa dossier stages, medicals, and MOFA processing for Saudi Arabia",
    icon: ShieldCheck,
    hasExport: true,
    hasAssign: true,
  },
  {
    id: "dubai",
    label: "Dubai Dossiers",
    desc: "Candidate file processing, offer letters, and visa clearance for Dubai & UAE",
    icon: ShieldCheck,
    hasExport: true,
    hasAssign: true,
  },
  {
    id: "other-country",
    label: "Other Country Dossiers",
    desc: "Candidate file processing and international stage tracking for other countries",
    icon: ShieldCheck,
    hasExport: true,
    hasAssign: true,
  },
  {
    id: "office-vendor",
    label: "Works & Demands",
    desc: "Overseas recruitment quotas, visa demand letters, and foreign employer contracts",
    icon: Shield,
    hasExport: true,
  },
  {
    id: "agents",
    label: "Agents & Channel Partners",
    desc: "Agency broker directory, candidate referral commissions, and partner profiles",
    icon: Users,
    hasExport: true,
  },
  {
    id: "payment-collection",
    label: "Payment Collection",
    desc: "Candidate payment deposits, cash vouchers, fee receipts, and billing tracking",
    icon: ShieldCheck,
    hasExport: true,
  },
  {
    id: "document",
    label: "Document Collection",
    desc: "Passport intake, document vault, scanned file archives, and verifications",
    icon: FileText,
    hasExport: true,
  },
  {
    id: "tutorials",
    label: "Tutorials & Knowledge",
    desc: "Employee onboarding articles, learning videos, and visa policy guides",
    icon: FileSpreadsheet,
  },
];

type GranularState = Record<string, ActionKey[]>;

type OfficerUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  employeeId: string | null;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "ON_LEAVE";
  role: { id: string; name: string };
  office: { id: string; name: string } | null;
  createdAt: string;
};

export function PermissionsMatrix() {
  const queryClient = useQueryClient();
  const [activeAdminTab, setActiveAdminTab] = useState<"matrix" | "users">("matrix");
  const [selectedRole, setSelectedRole] = useState<"CALL_CENTER" | "SUPER_ADMIN">("CALL_CENTER");
  const [granularState, setGranularState] = useState<GranularState>({
    "call-center": ["create", "read", "edit", "delete", "export", "assign"],
    dashboard: ["read", "export"],
  });
  const [saving, setSaving] = useState(false);

  // User Management State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { name: string; role: string; roleKey: "SUPER_ADMIN" | "CALL_CENTER" };
    },
  });

  const isSuperAdmin = profileQuery.data?.roleKey === "SUPER_ADMIN";

  // Fetch live permissions from backend
  const permissionsQuery = useQuery({
    queryKey: ["admin-live-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      const json = await res.json();
      return json.data as { roleId: string; granularPermissions: Record<string, string[]> };
    },
    enabled: isSuperAdmin,
  });

  // Fetch all users
  const usersQuery = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?pageSize=100");
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      return (json.data ?? []) as OfficerUser[];
    },
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (permissionsQuery.data?.granularPermissions) {
      const state: GranularState = {};
      for (const [mod, acts] of Object.entries(permissionsQuery.data.granularPermissions)) {
        if (acts.includes("*") || acts.includes("all") || acts.includes("manage")) {
          state[mod] = ["create", "read", "edit", "delete", "export", "assign"];
        } else {
          state[mod] = acts as ActionKey[];
        }
      }
      setGranularState(state);
    }
  }, [permissionsQuery.data]);

  // Helper to toggle a single action
  const toggleAction = (moduleId: string, action: ActionKey) => {
    if (selectedRole === "SUPER_ADMIN") return;
    setGranularState((prev) => {
      const currentActions = prev[moduleId] || [];
      const exists = currentActions.includes(action);
      let newActions: ActionKey[];

      if (exists) {
        newActions = currentActions.filter((a) => a !== action);
      } else {
        newActions = [...currentActions, action];
        if (!newActions.includes("read")) {
          newActions.push("read");
        }
      }

      return {
        ...prev,
        [moduleId]: newActions,
      };
    });
  };

  // Helper to toggle all actions for a module
  const toggleModuleMaster = (moduleId: string, def: ModuleDefinition) => {
    if (selectedRole === "SUPER_ADMIN") return;
    setGranularState((prev) => {
      const current = prev[moduleId] || [];
      if (current.length > 0) {
        const next = { ...prev };
        delete next[moduleId];
        return next;
      } else {
        const allActs: ActionKey[] = ["create", "read", "edit", "delete"];
        if (def.hasExport) allActs.push("export");
        if (def.hasAssign) allActs.push("assign");
        return {
          ...prev,
          [moduleId]: allActs,
        };
      }
    });
  };

  const setAllFullAccess = () => {
    const next: GranularState = {};
    for (const mod of moduleConfig) {
      const acts: ActionKey[] = ["create", "read", "edit", "delete"];
      if (mod.hasExport) acts.push("export");
      if (mod.hasAssign) acts.push("assign");
      next[mod.id] = acts;
    }
    setGranularState(next);
  };

  const setAllReadOnly = () => {
    const next: GranularState = {};
    for (const mod of moduleConfig) {
      next[mod.id] = ["read"];
    }
    setGranularState(next);
  };

  const resetToRecommended = () => {
    setGranularState({
      dashboard: ["read", "export"],
      "call-center": ["create", "read", "edit", "delete", "export", "assign"],
      registration: ["read"],
      ksa: ["read", "edit", "assign"],
      dubai: ["read", "edit", "assign"],
      "other-country": ["read", "edit", "assign"],
      "office-vendor": ["read"],
      "payment-collection": ["read"],
      document: ["read", "create"],
      tutorials: ["read"],
    });
  };

  const handleSavePermissions = async () => {
    if (selectedRole === "SUPER_ADMIN") return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granularMap: granularState }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || "Failed to update permissions");
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-live-permissions"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["works-demands"] });
      await queryClient.invalidateQueries({ queryKey: ["interview-schedules"] });

      toast.success("Granular Permission Matrix saved to live database successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  // Create Call Center Officer Handler
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingUser(true);
    const form = new FormData(e.currentTarget);

    try {
      const payload = {
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim(),
        username: String(form.get("username") || "").trim(),
        password: String(form.get("password") || ""),
        phone: String(form.get("phone") || "").trim() || undefined,
        employeeId: String(form.get("employeeId") || "").trim() || undefined,
      };

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to create officer account");
      }

      toast.success(`Call Center Officer "${payload.name}" created successfully!`);
      setShowCreateUserModal(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (err: any) {
      toast.error(err.message || "Error creating user");
    } finally {
      setCreatingUser(false);
    }
  };

  // Update User Status Handler
  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Officer access status updated!");
      await queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (e: any) {
      toast.error(e.message || "Error updating user status");
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user: OfficerUser) => {
    if (!confirm(`Are you sure you want to permanently delete Call Center Officer "${user.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete officer");
      toast.success(`Officer "${user.name}" removed successfully.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (e: any) {
      toast.error(e.message || "Error deleting user");
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
        Loading administrative workspace...
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "40px auto",
          padding: "32px",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          textAlign: "center",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            background: "#fff1f2",
            color: "#e11d48",
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 16px",
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>
          Super Admin Access Required
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
          Only Super Administrators have authority to create Call Center Officer accounts and configure permissions.
        </p>
      </div>
    );
  }

  const allOfficers = usersQuery.data ?? [];
  const filteredOfficers = allOfficers.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="permissions-page" style={{ maxWidth: "1500px", margin: "0 auto", paddingBottom: "50px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / System Administration / Control Center
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={26} color="#7258e8" /> System Administration &amp; Access Control
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Super Administrator Control: Manage Call Center Officer accounts and granular module permissions.
          </p>
        </div>

        {activeAdminTab === "matrix" ? (
          <button
            type="button"
            disabled={saving || selectedRole === "SUPER_ADMIN"}
            onClick={handleSavePermissions}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 24px",
              borderRadius: "10px",
              background: selectedRole === "SUPER_ADMIN" ? "#f1f5f9" : "#7258e8",
              color: selectedRole === "SUPER_ADMIN" ? "var(--muted)" : "#fff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: selectedRole === "SUPER_ADMIN" || saving ? "not-allowed" : "pointer",
              boxShadow: selectedRole === "SUPER_ADMIN" ? "none" : "0 2px 10px rgba(114,88,232,0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <Save size={16} /> {saving ? "Saving Permissions..." : "Save Permission Matrix"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 24px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(114,88,232,0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <UserPlus size={16} /> Create Call Center Officer
          </button>
        )}
      </div>

      {/* Main Admin Section Switcher Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "22px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setActiveAdminTab("matrix")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: activeAdminTab === "matrix" ? 800 : 600,
            background: activeAdminTab === "matrix" ? "#7258e8" : "#fff",
            color: activeAdminTab === "matrix" ? "#fff" : "var(--muted)",
            border: activeAdminTab === "matrix" ? "1px solid #7258e8" : "1px solid var(--line)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <ShieldCheck size={16} /> Roles &amp; Granular Permissions Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab("users")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: activeAdminTab === "users" ? 800 : 600,
            background: activeAdminTab === "users" ? "#7258e8" : "#fff",
            color: activeAdminTab === "users" ? "#fff" : "var(--muted)",
            border: activeAdminTab === "users" ? "1px solid #7258e8" : "1px solid var(--line)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Users size={16} /> Call Center Officers ({allOfficers.length})
        </button>
      </div>

      {/* TAB 1: PERMISSION MATRIX */}
      {activeAdminTab === "matrix" && (
        <>
          {/* Role Selection Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {/* Card 1: Call Center */}
            <div
              onClick={() => setSelectedRole("CALL_CENTER")}
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px 22px",
                border: selectedRole === "CALL_CENTER" ? "2px solid #7258e8" : "1px solid var(--line)",
                cursor: "pointer",
                boxShadow: selectedRole === "CALL_CENTER" ? "0 4px 16px rgba(114,88,232,0.12)" : "var(--shadow)",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                    <Headphones size={20} />
                  </div>
                  <div>
                    <b style={{ fontSize: "15px", color: "var(--ink)", display: "block" }}>Call Center Officer</b>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>Configurable Operational Role</span>
                  </div>
                </div>
                {selectedRole === "CALL_CENTER" && (
                  <span style={{ fontSize: "11px", fontWeight: 800, background: "#7258e8", color: "#fff", padding: "3px 10px", borderRadius: "9999px" }}>
                    Configuring Granular CRUD
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                Configure individual Create, Read, Edit, and Delete access per module for Call Center staff.
              </p>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
                {Object.keys(granularState).filter((k) => (granularState[k] || []).length > 0).length} of {moduleConfig.length} Modules Active
              </div>
            </div>

            {/* Card 2: Super Administrator */}
            <div
              onClick={() => setSelectedRole("SUPER_ADMIN")}
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px 22px",
                border: selectedRole === "SUPER_ADMIN" ? "2px solid #7258e8" : "1px solid var(--line)",
                cursor: "pointer",
                boxShadow: selectedRole === "SUPER_ADMIN" ? "0 4px 16px rgba(114,88,232,0.12)" : "var(--shadow)",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
                    <Crown size={20} />
                  </div>
                  <div>
                    <b style={{ fontSize: "15px", color: "var(--ink)", display: "block" }}>Super Administrator</b>
                    <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 700 }}>Unrestricted Master Access</span>
                  </div>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#ecfdf5", color: "#059669", padding: "3px 10px", borderRadius: "9999px" }}>
                  Master Bypass
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                Super Administrator has unconditional Create, Read, Edit, and Delete privileges across all modules and sub-systems.
              </p>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#d97706" }}>
                100% Full Access Always Enabled
              </div>
            </div>
          </div>

          {/* Granular Table */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                  Granular CRUD &amp; Feature Matrix:{" "}
                  <span style={{ color: "#7258e8" }}>
                    {selectedRole === "CALL_CENTER" ? "Call Center Officer" : "Super Administrator"}
                  </span>
                </h2>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  {selectedRole === "SUPER_ADMIN"
                    ? "Super Administrator permissions are locked to full CRUD access for system maintenance."
                    : "Check specific boxes below to grant granular Create, Read, Edit, Delete, and Export permissions."}
                </p>
              </div>

              {selectedRole !== "SUPER_ADMIN" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={setAllFullAccess}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f0edff",
                      border: "1px solid #dcd5fb",
                      color: "#7258e8",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <CheckSquare size={13} style={{ display: "inline", marginRight: 4 }} /> Full CRUD All
                  </button>
                  <button
                    type="button"
                    onClick={setAllReadOnly}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={13} style={{ display: "inline", marginRight: 4 }} /> Read-Only All
                  </button>
                  <button
                    type="button"
                    onClick={resetToRecommended}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={12} style={{ display: "inline", marginRight: 4 }} /> Recommended
                  </button>
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", minWidth: "220px" }}>
                      Module &amp; Feature Area
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "center", width: "110px" }}>
                      Master Access
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", fontSize: "11px", textAlign: "center", width: "110px" }}>
                      ➕ Create (Add)
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", fontSize: "11px", textAlign: "center", width: "110px" }}>
                      👁️ Read (View)
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", fontSize: "11px", textAlign: "center", width: "110px" }}>
                      ✏️ Edit (Update)
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", fontSize: "11px", textAlign: "center", width: "110px" }}>
                      🗑️ Delete (Remove)
                    </th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, color: "#7258e8", textTransform: "uppercase", fontSize: "11px", minWidth: "200px" }}>
                      ⚡ Inner &amp; Advanced Controls
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {moduleConfig.map((mod) => {
                    const acts = selectedRole === "SUPER_ADMIN" ? ["create", "read", "edit", "delete", "export", "assign"] : granularState[mod.id] || [];
                    const hasAny = acts.length > 0;
                    const hasCreate = acts.includes("create");
                    const hasRead = acts.includes("read");
                    const hasEdit = acts.includes("edit");
                    const hasDelete = acts.includes("delete");
                    const hasExport = acts.includes("export");
                    const hasAssign = acts.includes("assign");

                    const isLocked = selectedRole === "SUPER_ADMIN";

                    return (
                      <tr
                        key={mod.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: hasAny ? "#fff" : "#fafafa",
                          transition: "background 0.1s ease",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: hasAny ? "#f0edff" : "#f1f5f9",
                                color: hasAny ? "#7258e8" : "var(--muted)",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              <mod.icon size={16} />
                            </div>
                            <div>
                              <b style={{ fontSize: "13px", color: hasAny ? "var(--ink)" : "var(--muted)", display: "block" }}>
                                {mod.label}
                              </b>
                              <span style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.35, display: "block", marginTop: "2px" }}>
                                {mod.desc}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px", textAlign: "center" }}>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => toggleModuleMaster(mod.id, mod)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: hasAny ? "1px solid #a7f3d0" : "1px solid var(--line)",
                              background: hasAny ? "#ecfdf5" : "#f8fafc",
                              color: hasAny ? "#059669" : "var(--muted)",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: isLocked ? "default" : "pointer",
                            }}
                          >
                            {hasAny ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                            {hasAny ? "Active" : "Disabled"}
                          </button>
                        </td>

                        <td style={{ padding: "14px", textAlign: "center" }}>
                          <ActionCheckbox
                            checked={hasCreate}
                            disabled={isLocked}
                            color="#16a34a"
                            label="Create"
                            onChange={() => toggleAction(mod.id, "create")}
                          />
                        </td>

                        <td style={{ padding: "14px", textAlign: "center" }}>
                          <ActionCheckbox
                            checked={hasRead}
                            disabled={isLocked}
                            color="#2563eb"
                            label="Read"
                            onChange={() => toggleAction(mod.id, "read")}
                          />
                        </td>

                        <td style={{ padding: "14px", textAlign: "center" }}>
                          <ActionCheckbox
                            checked={hasEdit}
                            disabled={isLocked}
                            color="#d97706"
                            label="Edit"
                            onChange={() => toggleAction(mod.id, "edit")}
                          />
                        </td>

                        <td style={{ padding: "14px", textAlign: "center" }}>
                          <ActionCheckbox
                            checked={hasDelete}
                            disabled={isLocked}
                            color="#dc2626"
                            label="Delete"
                            onChange={() => toggleAction(mod.id, "delete")}
                          />
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            {mod.hasExport && (
                              <InnerButtonBadge
                                icon={Download}
                                label="Export Report"
                                active={hasExport}
                                disabled={isLocked}
                                onClick={() => toggleAction(mod.id, "export")}
                              />
                            )}
                            {mod.hasAssign && (
                              <InnerButtonBadge
                                icon={UserCheck}
                                label="Assign Officer"
                                active={hasAssign}
                                disabled={isLocked}
                                onClick={() => toggleAction(mod.id, "assign")}
                              />
                            )}
                            {!mod.hasExport && !mod.hasAssign && (
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>Standard CRUD</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: CALL CENTER OFFICER ACCOUNTS MANAGEMENT */}
      {activeAdminTab === "users" && (
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                Call Center Officer Accounts
              </h2>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                Only Super Administrators can create, activate, lock, or delete Call Center user accounts.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
                <input
                  type="text"
                  placeholder="Search officer name, email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 30px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    outline: "none",
                    width: "220px",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#7258e8",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <UserPlus size={14} /> + Add Officer
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                    Officer Name &amp; Contact
                  </th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                    Username / ID
                  </th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                    Role
                  </th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                    Branch Office
                  </th>
                  <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                    Account Status
                  </th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
                      No officer accounts found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredOfficers.map((user) => {
                    const isSuper = user.role?.name?.toLowerCase().includes("super") || user.role?.name?.toLowerCase().includes("admin");
                    return (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                background: isSuper ? "#fef3c7" : "#f0edff",
                                color: isSuper ? "#d97706" : "#7258e8",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 800,
                                fontSize: "12px",
                              }}
                            >
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <b style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>{user.name}</b>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>{user.username}</span>
                          {user.employeeId && (
                            <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>
                              ID: {user.employeeId}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: isSuper ? "#fef3c7" : "#f0edff",
                              color: isSuper ? "#d97706" : "#7258e8",
                            }}
                          >
                            {user.role?.name ?? "Call Center"}
                          </span>
                        </td>
                        <td style={{ padding: "14px", color: "#475569" }}>
                          {user.office?.name || "Dhaka Head Office"}
                        </td>
                        <td style={{ padding: "14px" }}>
                          {isSuper ? (
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "6px" }}>
                              ACTIVE (Protected)
                            </span>
                          ) : (
                            <select
                              value={user.status}
                              onChange={(e) => handleUpdateStatus(user.id, e.target.value)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--line)",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: user.status === "ACTIVE" ? "#059669" : "#dc2626",
                                background: user.status === "ACTIVE" ? "#ecfdf5" : "#fff1f2",
                                cursor: "pointer",
                              }}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                              <option value="LOCKED">LOCKED</option>
                              <option value="ON_LEAVE">ON LEAVE</option>
                            </select>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          {!isSuper && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete Officer Account"
                              style={{
                                background: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#e11d48",
                                borderRadius: "6px",
                                padding: "5px 8px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE OFFICER MODAL DIALOG */}
      {showCreateUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => !creatingUser && setShowCreateUserModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "min(520px, 100%)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 22px",
                borderBottom: "1px solid var(--line)",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0edff", color: "#7258e8", display: "grid", placeItems: "center" }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    Create Call Center Officer
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
                    Only Super Administrator can provision new officer accounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} style={{ padding: "22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                    Full Name *
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Kamal Hossain"
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Email Address *
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="e.g. kamal@orbit.com"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Username *
                    </label>
                    <input
                      name="username"
                      required
                      placeholder="e.g. kamal.officer"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Temporary Password *
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      defaultValue="Admin@123"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Phone Number
                    </label>
                    <input
                      name="phone"
                      placeholder="e.g. +8801700000000"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Employee ID (Optional)
                    </label>
                    <input
                      name="employeeId"
                      placeholder="e.g. CC-005"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Assigned Role
                    </label>
                    <div
                      style={{
                        height: "40px",
                        borderRadius: "8px",
                        background: "#f0edff",
                        border: "1px solid #dcd5fb",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#7258e8",
                        gap: "6px",
                      }}
                    >
                      <Headphones size={14} /> Call Center Officer (Fixed)
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setShowCreateUserModal(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "#fff",
                    color: "var(--ink)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    cursor: creatingUser ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
                  }}
                >
                  <UserPlus size={15} /> {creatingUser ? "Creating Officer..." : "Create Officer Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCheckbox({
  checked,
  disabled,
  color,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  color: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <div
      onClick={() => !disabled && onChange()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: "6px",
        background: checked ? color : "#fff",
        border: checked ? `1px solid ${color}` : "1.5px solid #cbd5e1",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s ease",
        margin: "0 auto",
      }}
      title={`${label}: ${checked ? "Allowed" : "Restricted"}`}
    >
      {checked && <Check size={16} color="#fff" strokeWidth={3} />}
    </div>
  );
}

function InnerButtonBadge({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "6px",
        border: active ? "1px solid #7258e8" : "1px solid var(--line)",
        background: active ? "#f0edff" : "#fff",
        color: active ? "#7258e8" : "var(--muted)",
        fontSize: "11px",
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}
