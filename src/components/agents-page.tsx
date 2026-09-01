"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Edit,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plane,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type AgentItem = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  district: string;
  status: "Active" | "Inactive" | "Blocked";
  commissionRate: string;
  agreementKey: string;
  totalCandidates: number;
  activeDossiers: number;
  completedDossiers: number;
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  createdAt: string;
};

type AgentCandidate = {
  fileId: string;
  fileNo: string;
  candidateId: string;
  candidateNo: string;
  fullName: string;
  phone: string;
  passportNumber: string;
  country: string;
  profession: string;
  currentStage: string;
  status: string;
  visaNumber: string;
  flightDate: string | null;
  totalPaid: number;
  createdAt: string;
};

type AgentDetail = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  district: string;
  status: "Active" | "Inactive" | "Blocked";
  commissionRate: string;
  agreementKey: string;
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  portalLastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: {
    totalCandidates: number;
    activeDossiers: number;
    completedFlights: number;
    visaStamped: number;
    totalPaymentsReceived: number;
  };
  candidates: AgentCandidate[];
};

export function AgentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createPortalLogin, setCreatePortalLogin] = useState(true);
  const [createPassword, setCreatePassword] = useState("Agent@2026");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<"candidates" | "edit">("candidates");
  const [updatingAgent, setUpdatingAgent] = useState(false);
  const [editPortalLogin, setEditPortalLogin] = useState(true);
  const [editPortalEmail, setEditPortalEmail] = useState("");
  const [editPortalPassword, setEditPortalPassword] = useState("");

  // Fetch agents list
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["agents-list", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/agents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load agents list");
      return res.json() as Promise<{
        data: AgentItem[];
        stats: {
          totalAgents: number;
          activeAgents: number;
          totalReferredCandidates: number;
          activeDossiers: number;
        };
      }>;
    },
  });

  // Fetch single agent details when profile modal is open
  const agentDetailQuery = useQuery({
    queryKey: ["agent-profile", selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return null;
      const res = await fetch(`/api/agents/${selectedAgentId}`);
      if (!res.ok) throw new Error("Failed to load agent profile");
      const json = await res.json();
      return json.data as AgentDetail;
    },
    enabled: Boolean(selectedAgentId),
  });

  useEffect(() => {
    if (agentDetailQuery.data) {
      setEditPortalLogin(agentDetailQuery.data.hasPortalAccess ?? true);
      setEditPortalEmail(agentDetailQuery.data.portalLoginEmail || agentDetailQuery.data.email || "");
      setEditPortalPassword("");
    }
  }, [agentDetailQuery.data, selectedAgentId]);

  // Handle Create Agent Form Submit
  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);

    try {
      const payload = {
        code: String(form.get("code") || "").trim() || undefined,
        name: String(form.get("name") || "").trim(),
        contactPerson: String(form.get("contactPerson") || "").trim() || undefined,
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim() || undefined,
        country: String(form.get("district") || "").trim() || "Dhaka",
        address: String(form.get("address") || "").trim() || undefined,
        commissionRate: String(form.get("commissionRate") || "").trim() || undefined,
        agreementKey: String(form.get("agreementKey") || "").trim() || undefined,
        status: String(form.get("status") || "Active"),
        enablePortalLogin: createPortalLogin,
        portalEmail: String(form.get("portalEmail") || form.get("email") || "").trim() || undefined,
        portalPassword: createPassword.trim() || "Agent@2026",
      };

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to create agent");

      toast.success(`Agent "${payload.name}" added successfully!`);
      setShowCreateModal(false);
      await queryClient.invalidateQueries({ queryKey: ["agents-list"] });
      await queryClient.invalidateQueries({ queryKey: ["nav-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent");
    } finally {
      setCreating(false);
    }
  };

  // Handle Update Agent Form Submit
  const handleUpdateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setUpdatingAgent(true);
    const form = new FormData(e.currentTarget);

    try {
      const payload = {
        name: String(form.get("name") || "").trim(),
        contactPerson: String(form.get("contactPerson") || "").trim() || null,
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim() || null,
        country: String(form.get("district") || "").trim() || "Dhaka",
        address: String(form.get("address") || "").trim() || null,
        commissionRate: String(form.get("commissionRate") || "").trim() || "Standard",
        agreementKey: String(form.get("agreementKey") || "").trim() || null,
        status: String(form.get("status") || "Active"),
        enablePortalLogin: editPortalLogin,
        portalEmail: editPortalEmail.trim() || undefined,
        portalPassword: editPortalPassword.trim() || undefined,
      };

      const res = await fetch(`/api/agents/${selectedAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to update agent");

      toast.success("Agent profile updated successfully!");
      await queryClient.invalidateQueries({ queryKey: ["agent-profile", selectedAgentId] });
      await queryClient.invalidateQueries({ queryKey: ["agents-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent");
    } finally {
      setUpdatingAgent(false);
    }
  };

  // Handle Delete Agent
  const handleDeleteAgent = async (agent: AgentItem) => {
    if (!confirm(`Are you sure you want to permanently delete Agent "${agent.name}" (${agent.code})?`)) return;
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete agent");
      toast.success(`Agent "${agent.name}" removed successfully.`);
      await queryClient.invalidateQueries({ queryKey: ["agents-list"] });
      await queryClient.invalidateQueries({ queryKey: ["nav-counts"] });
    } catch (err: any) {
      toast.error(err.message || "Error deleting agent");
    }
  };

  const agentsList = data?.data || [];
  const stats = data?.stats || {
    totalAgents: 0,
    activeAgents: 0,
    totalReferredCandidates: 0,
    activeDossiers: 0,
  };

  return (
    <div className="agents-page" style={{ maxWidth: "1550px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "22px",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <div
            className="breadcrumb"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
            }}
          >
            Dashboard / Agency Network / Partners
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--ink)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#f0edff",
                color: "#7258e8",
              }}
            >
              <Users size={22} />
            </span>
            Agents &amp; Channel Partners
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
            Manage agency brokers, sub-agents, candidate referrals, commission agreements, and partner profiles.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Refresh agents"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(114,88,232,0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <UserPlus size={16} /> + Create New Agent
          </button>
        </div>
      </div>

      {/* 2. Orbit 4 Metric Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#f0edff",
              color: "#7258e8",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              Total Registered Agents
            </span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
              {stats.totalAgents}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#ecfdf5",
              color: "#059669",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <UserCheck size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              Active Partner Agents
            </span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
              {stats.activeAgents}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              Total Referred Candidates
            </span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
              {stats.totalReferredCandidates}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#fef3c7",
              color: "#d97706",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Briefcase size={24} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              Active Pipeline Dossiers
            </span>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>
              {stats.activeDossiers}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "360px" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agent name, phone, code, district..."
              style={{
                width: "100%",
                height: "38px",
                padding: "0 12px 0 34px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>Status:</span>
          {["All", "Active", "Inactive"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: statusFilter === st ? 800 : 600,
                background: statusFilter === st ? "#7258e8" : "#f8fafc",
                color: statusFilter === st ? "#fff" : "var(--muted)",
                border: statusFilter === st ? "1px solid #7258e8" : "1px solid var(--line)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Agents Master Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", width: "50px" }}>
                  SL
                </th>
                <th style={{ padding: "14px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", width: "110px" }}>
                  Agent Code
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", minWidth: "220px" }}>
                  Agent &amp; Agency Name
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", minWidth: "160px" }}>
                  Contact &amp; Phone
                </th>
                <th style={{ padding: "14px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                  District / Location
                </th>
                <th style={{ padding: "14px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "center" }}>
                  Referred Candidates
                </th>
                <th style={{ padding: "14px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                  Commission Rate
                </th>
                <th style={{ padding: "14px 14px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "14px 16px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", textAlign: "right", width: "160px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    Loading agent network...
                  </td>
                </tr>
              ) : agentsList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    No agent partners found matching your search.
                  </td>
                </tr>
              ) : (
                agentsList.map((agent, index) => {
                  const isActive = agent.status === "Active";
                  return (
                    <tr
                      key={agent.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.1s ease",
                      }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ padding: "14px 16px", color: "var(--muted)", fontWeight: 700 }}>
                        {index + 1}
                      </td>

                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            color: "#7258e8",
                            background: "#f0edff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        >
                          {agent.code}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: "#f0edff",
                              color: "#7258e8",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: "13px",
                              flexShrink: 0,
                            }}
                          >
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/agent/${agent.id}`}
                              style={{
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "var(--ink)",
                                display: "block",
                                textDecoration: "none",
                              }}
                              className="hover:text-indigo-600 hover:underline"
                            >
                              {agent.name}
                            </Link>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {agent.contactPerson !== "N/A" ? `Owner: ${agent.contactPerson}` : agent.address}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <a
                            href={`tel:${agent.phone}`}
                            style={{ color: "#0284c7", fontWeight: 700, fontSize: "12px", textDecoration: "none" }}
                          >
                            📞 {agent.phone}
                          </a>
                          {agent.email !== "N/A" && (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>{agent.email}</span>
                          )}
                          {agent.hasPortalAccess && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#059669",
                                background: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                width: "fit-content",
                                marginTop: "2px",
                              }}
                            >
                              🔑 Portal Active
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "14px", color: "var(--ink)", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={13} color="#64748b" /> {agent.district || "Dhaka"}
                        </span>
                      </td>

                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <Link
                          href={`/agent/${agent.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            background: agent.totalCandidates > 0 ? "#ecfdf5" : "#f1f5f9",
                            color: agent.totalCandidates > 0 ? "#059669" : "var(--muted)",
                            fontSize: "11px",
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          <Users size={12} /> {agent.totalCandidates} Candidates
                        </Link>
                      </td>

                      <td style={{ padding: "14px", color: "var(--ink)", fontWeight: 700 }}>
                        {agent.commissionRate}
                      </td>

                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isActive ? "#ecfdf5" : "#fff1f2",
                            color: isActive ? "#059669" : "#e11d48",
                            border: isActive ? "1px solid #a7f3d0" : "1px solid #fecdd3",
                          }}
                        >
                          {agent.status}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <Link
                            href={`/agent/${agent.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "#f0edff",
                              color: "#7258e8",
                              border: "1px solid #dcd5fb",
                              fontSize: "11px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <Eye size={13} /> View Profile
                          </Link>
                          <Link
                            href={`/portal/agent?agentId=${agent.id}`}
                            title="Preview Agent Self-Service Portal"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "6px 9px",
                              borderRadius: "8px",
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              fontSize: "11px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <span>🔑</span> Portal
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteAgent(agent)}
                            title="Delete Agent"
                            style={{
                              padding: "6px",
                              borderRadius: "8px",
                              background: "#fff1f2",
                              color: "#e11d48",
                              border: "1px solid #fecdd3",
                              cursor: "pointer",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Create Agent Modal Dialog */}
      {showCreateModal && (
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
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "min(560px, 100%)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#f0edff",
                    color: "#7258e8",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                    Create New Agent Partner
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
                    Register a new recruitment broker, travel agency, or referral partner.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ padding: "22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Agent Code
                    </label>
                    <input
                      name="code"
                      placeholder="e.g. AGT-106"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Agent / Agency Name *
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. Dhaka Express Travels"
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
                      Contact Person / Owner
                    </label>
                    <input
                      name="contactPerson"
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
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Phone Number *
                    </label>
                    <input
                      name="phone"
                      required
                      placeholder="e.g. +8801711000000"
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
                      Email Address
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="e.g. agent@gmail.com"
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
                      District / City
                    </label>
                    <input
                      name="district"
                      defaultValue="Dhaka"
                      placeholder="e.g. Sylhet, Cumilla, Dhaka"
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
                      Commission Rate (BDT)
                    </label>
                    <input
                      name="commissionRate"
                      defaultValue="৳ 25,000 / candidate"
                      placeholder="e.g. ৳ 25,000 / candidate"
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
                      Agreement Reference / Key
                    </label>
                    <input
                      name="agreementKey"
                      placeholder="e.g. AGR-2026-005"
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

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                      Office Address
                    </label>
                    <input
                      name="address"
                      placeholder="e.g. Suite 402, Paltan Tower, Dhaka"
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
                      Account Status
                    </label>
                    <select
                      name="status"
                      defaultValue="Active"
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        outline: "none",
                        background: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <option value="Active">Active (Verified)</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                {/* 🔐 AGENT PORTAL LOGIN CREDENTIALS */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #f8f7ff 0%, #f5f3ff 100%)",
                    border: "1px solid #ddd6fe",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>🔐</span>
                      <div>
                        <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>
                          Agent Portal Self-Service Login
                        </b>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          Agent can log in with Email &amp; Password to view their candidates in read-only mode.
                        </span>
                      </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
                      <input
                        type="checkbox"
                        name="enablePortalLogin"
                        checked={createPortalLogin}
                        onChange={(e) => setCreatePortalLogin(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "#7258e8" }}
                      />
                      Enable Login
                    </label>
                  </div>

                  {createPortalLogin && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "4px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                          Portal Login Email
                        </label>
                        <input
                          name="portalEmail"
                          type="email"
                          placeholder="Uses Main Email if blank"
                          style={{
                            width: "100%",
                            height: "38px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            padding: "0 10px",
                            fontSize: "12.5px",
                            outline: "none",
                            background: "#fff",
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink)" }}>
                            Portal Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
                              let pwd = "";
                              for (let i = 0; i < 6; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                              setCreatePassword(`Agent@${pwd}`);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#7258e8",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            🎲 Auto-generate
                          </button>
                        </div>
                        <input
                          name="portalPassword"
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          placeholder="e.g. Agent@2026"
                          style={{
                            width: "100%",
                            height: "38px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            padding: "0 10px",
                            fontSize: "12.5px",
                            outline: "none",
                            background: "#fff",
                            fontFamily: "monospace",
                            fontWeight: 700,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "22px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
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
                  disabled={creating}
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
                    cursor: creating ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(114,88,232,0.3)",
                  }}
                >
                  <UserPlus size={15} /> {creating ? "Creating Agent..." : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Agent 360 Profile Modal / Drawer View */}
      {selectedAgentId && (
        <div
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
          onClick={() => setSelectedAgentId(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "min(960px, 100%)",
              maxHeight: "90vh",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Modal Header */}
            {agentDetailQuery.isLoading ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)" }}>
                Loading agent 360 profile...
              </div>
            ) : !agentDetailQuery.data ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)" }}>
                Agent profile details could not be found.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--line)",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "14px",
                        background: "#7258e8",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "20px",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(114,88,232,0.35)",
                      }}
                    >
                      {agentDetailQuery.data.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                          {agentDetailQuery.data.name}
                        </h2>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            color: "#7258e8",
                            background: "#f0edff",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        >
                          {agentDetailQuery.data.code}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: agentDetailQuery.data.status === "Active" ? "#ecfdf5" : "#fff1f2",
                            color: agentDetailQuery.data.status === "Active" ? "#059669" : "#e11d48",
                          }}
                        >
                          {agentDetailQuery.data.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "6px", fontSize: "12px", color: "var(--muted)", flexWrap: "wrap" }}>
                        <span>👤 Owner: <b>{agentDetailQuery.data.contactPerson}</b></span>
                        <a href={`tel:${agentDetailQuery.data.phone}`} style={{ color: "#0284c7", textDecoration: "none", fontWeight: 700 }}>
                          📞 {agentDetailQuery.data.phone}
                        </a>
                        <span>📍 {agentDetailQuery.data.district} ({agentDetailQuery.data.address})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAgentId(null)}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Profile Stats Quick Summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "10px",
                    padding: "16px 24px",
                    borderBottom: "1px solid var(--line)",
                    background: "#fff",
                  }}
                >
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Total Referred Candidates</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.totalCandidates}
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Active in Pipeline</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.activeDossiers}
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Visa Done / Flown</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.completedFlights + agentDetailQuery.data.metrics.visaStamped}
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Total Payments Received</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#7258e8", marginTop: "2px" }}>
                      ৳ {agentDetailQuery.data.metrics.totalPaymentsReceived.toLocaleString()} BDT
                    </div>
                  </div>
                </div>

                {/* Profile Tabs Navigation */}
                <div style={{ display: "flex", gap: "10px", padding: "12px 24px 0", borderBottom: "1px solid var(--line)", background: "#fafafa" }}>
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("candidates")}
                    style={{
                      padding: "8px 16px",
                      borderBottom: activeProfileTab === "candidates" ? "2px solid #7258e8" : "2px solid transparent",
                      color: activeProfileTab === "candidates" ? "#7258e8" : "var(--muted)",
                      fontWeight: activeProfileTab === "candidates" ? 800 : 600,
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Users size={15} /> Referred Candidates ({agentDetailQuery.data.candidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("edit")}
                    style={{
                      padding: "8px 16px",
                      borderBottom: activeProfileTab === "edit" ? "2px solid #7258e8" : "2px solid transparent",
                      color: activeProfileTab === "edit" ? "#7258e8" : "var(--muted)",
                      fontWeight: activeProfileTab === "edit" ? 800 : 600,
                      fontSize: "13px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Edit size={15} /> Edit Agent Information &amp; Agreements
                  </button>
                </div>

                {/* Profile Tab Body */}
                <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
                  {activeProfileTab === "candidates" ? (
                    <div>
                      {agentDetailQuery.data.candidates.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "#f8fafc", borderRadius: "12px" }}>
                          <Users size={32} style={{ margin: "0 auto 10px", color: "#cbd5e1" }} />
                          <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                            No Candidate Files Referred Yet
                          </h4>
                          <p style={{ margin: 0, fontSize: "12px" }}>
                            When candidate processing files are created with this agent's name/code, they will automatically appear here.
                          </p>
                        </div>
                      ) : (
                        <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px" }}>Candidate</th>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px" }}>Passport</th>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px" }}>Trade &amp; Country</th>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px" }}>Current Stage</th>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px" }}>Total Paid</th>
                                <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)", fontSize: "11px", textAlign: "right" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {agentDetailQuery.data.candidates.map((cand) => (
                                <tr key={cand.fileId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "12px 14px" }}>
                                    <b style={{ color: "var(--ink)", display: "block" }}>{cand.fullName}</b>
                                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{cand.candidateNo} · 📞 {cand.phone}</span>
                                  </td>
                                  <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>
                                    {cand.passportNumber}
                                  </td>
                                  <td style={{ padding: "12px 14px" }}>
                                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>{cand.profession}</span>
                                    <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>🌍 {cand.country}</span>
                                  </td>
                                  <td style={{ padding: "12px 14px" }}>
                                    <span style={{ padding: "3px 8px", borderRadius: "6px", background: "#f0edff", color: "#7258e8", fontWeight: 700, fontSize: "11px" }}>
                                      {cand.currentStage}
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 14px", fontWeight: 800, color: "#059669" }}>
                                    ৳ {cand.totalPaid.toLocaleString()} BDT
                                  </td>
                                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                                    <Link
                                      href={`/file/${cand.fileId}`}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        background: "#7258e8",
                                        color: "#fff",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        textDecoration: "none",
                                      }}
                                    >
                                      Open Dossier <ChevronRight size={12} />
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateAgent}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "5px" }}>
                            Agent / Agency Name *
                          </label>
                          <input
                            name="name"
                            defaultValue={agentDetailQuery.data.name}
                            required
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
                            Owner / Contact Person
                          </label>
                          <input
                            name="contactPerson"
                            defaultValue={agentDetailQuery.data.contactPerson !== "N/A" ? agentDetailQuery.data.contactPerson : ""}
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
                            Phone Number *
                          </label>
                          <input
                            name="phone"
                            defaultValue={agentDetailQuery.data.phone}
                            required
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
                            Email Address
                          </label>
                          <input
                            name="email"
                            type="email"
                            defaultValue={agentDetailQuery.data.email !== "N/A" ? agentDetailQuery.data.email : ""}
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
                            District / Division
                          </label>
                          <input
                            name="district"
                            defaultValue={agentDetailQuery.data.district}
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
                            Office Address
                          </label>
                          <input
                            name="address"
                            defaultValue={agentDetailQuery.data.address}
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
                            Commission Rate
                          </label>
                          <input
                            name="commissionRate"
                            defaultValue={agentDetailQuery.data.commissionRate}
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
                            Agreement Reference / Key
                          </label>
                          <input
                            name="agreementKey"
                            defaultValue={agentDetailQuery.data.agreementKey || `AGR-${agentDetailQuery.data.code}`}
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
                            Account Status
                          </label>
                          <select
                            name="status"
                            defaultValue={agentDetailQuery.data.status}
                            style={{
                              width: "100%",
                              height: "40px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              padding: "0 12px",
                              fontSize: "13px",
                              outline: "none",
                              background: "#fff",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <option value="Active">Active (Verified)</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                        </div>
                      </div>

                      {/* 🔐 AGENT PORTAL SELF-SERVICE LOGIN */}
                      <div
                        style={{
                          background: "linear-gradient(135deg, #f8f7ff 0%, #f5f3ff 100%)",
                          border: "1px solid #ddd6fe",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          marginTop: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>🔐</span>
                            <div>
                              <b style={{ fontSize: "12.5px", color: "var(--ink)", display: "block" }}>
                                Agent Portal Self-Service Login
                              </b>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Agent can log in with Email &amp; Password to view their candidates in read-only mode.
                              </span>
                            </div>
                          </div>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
                            <input
                              type="checkbox"
                              name="enablePortalLogin"
                              checked={editPortalLogin}
                              onChange={(e) => setEditPortalLogin(e.target.checked)}
                              style={{ width: "16px", height: "16px", accentColor: "#7258e8" }}
                            />
                            Enable Login
                          </label>
                        </div>

                        {editPortalLogin && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "4px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                                Portal Login Email
                              </label>
                              <input
                                name="portalEmail"
                                type="email"
                                value={editPortalEmail}
                                onChange={(e) => setEditPortalEmail(e.target.value)}
                                placeholder="Uses Main Email if blank"
                                style={{
                                  width: "100%",
                                  height: "38px",
                                  borderRadius: "8px",
                                  border: "1px solid #cbd5e1",
                                  padding: "0 10px",
                                  fontSize: "12.5px",
                                  outline: "none",
                                  background: "#fff",
                                }}
                              />
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                <label style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink)" }}>
                                  Reset Password
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
                                    let pwd = "";
                                    for (let i = 0; i < 6; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                                    setEditPortalPassword(`Agent@${pwd}`);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#7258e8",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    padding: 0,
                                  }}
                                >
                                  🎲 Auto-generate
                                </button>
                              </div>
                              <input
                                name="portalPassword"
                                type="text"
                                value={editPortalPassword}
                                onChange={(e) => setEditPortalPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                style={{
                                  width: "100%",
                                  height: "38px",
                                  borderRadius: "8px",
                                  border: "1px solid #cbd5e1",
                                  padding: "0 10px",
                                  fontSize: "12.5px",
                                  outline: "none",
                                  background: "#fff",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                        <button
                          type="submit"
                          disabled={updatingAgent}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "9px 22px",
                            borderRadius: "8px",
                            background: "#7258e8",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: "none",
                            cursor: updatingAgent ? "not-allowed" : "pointer",
                          }}
                        >
                          <Check size={14} /> {updatingAgent ? "Saving Changes..." : "Save Agent Profile"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
