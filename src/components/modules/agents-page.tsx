"use client";
import { useAccess } from "@/hooks/use-access";
import { AgentsDesignIcon } from "@/components/layout/agents-design-icon";
import { CountryDesignIcon } from "@/components/layout/country-design-icon";
import { AgentProfileImageField } from "@/components/modules/agent-profile-image-field";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Edit,
  Eye,
  MapPin,
  Phone,
  Search,
  Trash2,
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
  agreementKey: string;
  totalCandidates: number;
  activeDossiers: number;
  completedDossiers: number;
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  profileImageUrl?: string | null;
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
  agreementKey: string;
  hasPortalAccess?: boolean;
  portalLoginEmail?: string | null;
  portalLastLoginAt?: string | null;
  profileImageUrl?: string | null;
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

export function AgentsPage({ initialData }: { initialData?: any } = {}) {
  const { allows, isSuperAdmin } = useAccess();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [unavailableImageUrls, setUnavailableImageUrls] = useState<string[]>([]);
  const showImageFallback = (url: string) => {
    setUnavailableImageUrls((urls) => urls.includes(url) ? urls : [...urls, url]);
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createPortalLogin, setCreatePortalLogin] = useState(true);
  const [createPassword, setCreatePassword] = useState("Agent@2026");
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<"candidates" | "edit">("candidates");
  const [updatingAgent, setUpdatingAgent] = useState(false);
  const [editPortalLogin, setEditPortalLogin] = useState(true);
  const [editPortalEmail, setEditPortalEmail] = useState("");
  const [editPortalPassword, setEditPortalPassword] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [removeEditImage, setRemoveEditImage] = useState(false);

  const isDefaultQuery = !searchQuery && statusFilter === "All" && page === 1 && pageSize === 10;

  // Fetch agents list
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["agents-list", searchQuery, statusFilter, page, pageSize],
    initialData: isDefaultQuery && initialData ? {
      ...initialData,
      data: initialData.data.slice(0, pageSize),
      meta: { ...initialData.meta, page, pageSize, totalPages: Math.max(1, Math.ceil((initialData.meta?.total ?? initialData.data.length) / pageSize)) },
    } : undefined,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/agents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load agents list");
      return res.json() as Promise<{
        data: AgentItem[];
        meta: { page: number; pageSize: number; total: number; totalPages: number };
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
      setEditImageFile(null);
      setRemoveEditImage(false);
    }
  }, [agentDetailQuery.data, selectedAgentId]);

  const saveProfileImage = async (agentId: string, file: File) => {
    const upload = new FormData();
    upload.set("file", file);
    const response = await fetch(`/api/agents/${agentId}/profile-image`, {
      method: "POST",
      body: upload,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Failed to upload profile image");
  };

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
        agreementKey: String(form.get("agreementKey") || "").trim() || undefined,
        status: String(form.get("status") || "Active"),
        enablePortalLogin: isSuperAdmin && createPortalLogin,
        portalEmail: isSuperAdmin && createPortalLogin ? String(form.get("portalEmail") || form.get("email") || "").trim() || undefined : undefined,
        portalPassword: isSuperAdmin && createPortalLogin ? createPassword.trim() || "Agent@2026" : undefined,
      };

      const createRequest: RequestInit = createImageFile
        ? (() => {
            const multipart = new FormData();
            multipart.set("payload", JSON.stringify(payload));
            multipart.set("profileImage", createImageFile);
            return { method: "POST", body: multipart };
          })()
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          };
      const res = await fetch("/api/agents", createRequest);

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to create agent");

      if (json.profileImageWarning) {
        toast.warning(`Agent created, but ${String(json.profileImageWarning).toLowerCase()} You can add it from Edit.`);
      } else {
        toast.success(`Agent "${payload.name}" added successfully!`);
      }
      setCreateImageFile(null);
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
        agreementKey: String(form.get("agreementKey") || "").trim() || null,
        status: String(form.get("status") || "Active"),
        enablePortalLogin: isSuperAdmin ? editPortalLogin : undefined,
        portalEmail: isSuperAdmin ? editPortalEmail.trim() || undefined : undefined,
        portalPassword: isSuperAdmin ? editPortalPassword.trim() || undefined : undefined,
      };

      const res = await fetch(`/api/agents/${selectedAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Failed to update agent");

      if (editImageFile) {
        await saveProfileImage(selectedAgentId, editImageFile);
      } else if (removeEditImage && agentDetailQuery.data?.profileImageUrl) {
        const imageResponse = await fetch(`/api/agents/${selectedAgentId}/profile-image`, { method: "DELETE" });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageResult.error?.message || "Failed to remove profile image");
      }

      toast.success("Agent profile updated successfully!");
      setEditImageFile(null);
      setRemoveEditImage(false);
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

  useEffect(() => {
    if (data?.meta && page > data.meta.totalPages) setPage(Math.max(1, data.meta.totalPages));
  }, [data?.meta, page]);

  const agentsList = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0, totalPages: 1 };
  const stats = data?.stats || {
    totalAgents: 0,
    activeAgents: 0,
    totalReferredCandidates: 0,
    activeDossiers: 0,
  };

  return (
    <div className="agents-page country-design-page channel-partners-design">
      <div className="country-design-breadcrumb">Dashboard / Agency Network / Partners</div>
      <div className="country-design-heading">
        <div>
          <h1>🤝 Agents &amp; Channel Partners</h1>
          <p>Manage agency brokers, sub-agents, candidate referrals, agreements, and partner profiles.</p>
        </div>
        <div className="country-design-actions">
          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => refetch()} title="Refresh agents">
            <CountryDesignIcon name="Refresh" className={isRefetching ? "animate-spin" : ""} /> Refresh
          </button>
          <button data-action-ui="primary" data-action-size="normal"
            className="channel-create-action"
            type="button"
            disabled={!allows("agents", "create")}
            title={!allows("agents", "create") ? "Create permission is required" : undefined}
            onClick={() => { setCreateImageFile(null); setShowCreateModal(true); }}
          >
            + Create New Agent
          </button>
        </div>
      </div>

      <div className="country-design-metrics channel-partner-metrics">
        {([
          ["Total Registered Agents", stats.totalAgents, "Registered", "Registered partners"],
          ["Active Partner Agents", stats.activeAgents, "Partners", "Active agency partners"],
          ["Total Referred Candidates", stats.totalReferredCandidates, "Candidates", "Referred candidate files"],
          ["Active Pipeline Dossiers", stats.activeDossiers, "Pipeline", "Active in pipeline"],
        ] as const).map(([label, value, icon, caption]) => (
          <div className="country-design-metric" key={label}>
            <div><span>{label}</span><AgentsDesignIcon name={icon} /></div>
            <b>{value}</b><p>{caption}</p>
          </div>
        ))}
      </div>

      <div className="agents-results-panel country-design-workspace channel-partner-workspace">
        <div className="country-design-filters channel-partner-toolbar">
          <div className="channel-partner-filter-fields">
            <form className="channel-partner-search-form" onSubmit={(event) => { event.preventDefault(); refetch(); }}>
              <label className="country-design-search channel-partner-search">
                <CountryDesignIcon name="Search" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} aria-label="Search agents" placeholder="Search agent name, phone, code, district..." />
                {searchQuery && <button data-action-ui="ghost" data-action-size="icon" type="button" aria-label="Clear agent search" onClick={() => { setSearchQuery(""); setPage(1); }}><X size={14} /></button>}
              </label>
              <button data-action-ui="primary" data-action-size="normal" className="channel-partner-search-submit" type="submit">Search</button>
            </form>
            <div className="channel-partner-status-filters" aria-label="Agent status filters">
              {["All", "Active", "Inactive"].map((status) => (
                <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => { setStatusFilter(status); setPage(1); }}>{status}</button>
              ))}
            </div>
          </div>
          <label className="country-design-page-size">
            Per Page:
            <span className="country-design-select">
              <select aria-label="Agents per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value="10">10</option><option value="20">20</option><option value="50">50</option>
              </select>
              <CountryDesignIcon name="ChevronDown" />
            </span>
          </label>
        </div>
        <div className="country-design-count">
          Showing {meta.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, meta.total)} of {meta.total} Total Agents &amp; Channel Partners
        </div>
        <div className="desktop-agents-table country-design-table channel-partner-table">
          <table>
            <colgroup>
              {[50, 115, 285, 230, 160, 170, 110, 220].map((width, index) => <col key={index} style={{ width }} />)}
            </colgroup>
            <thead>
              <tr>
                {["SL", "Agent Code", "Agent & Agency Name", "Contact & Phone", "District / Location", "Referred Candidates", "Status", "Actions"].map((heading) => <th key={heading} scope="col">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="channel-partner-empty">Loading agent network...</td></tr>
              ) : agentsList.length === 0 ? (
                <tr><td colSpan={8} className="channel-partner-empty">No agent partners found matching your search.</td></tr>
              ) : agentsList.map((agent: AgentItem, index: number) => {
                const isActive = agent.status === "Active";
                const tone = agent.code === "AGT-999" ? "blue" : agent.code === "AGT-105" ? "purple" : agent.code === "AGT-104" ? "orange" : agent.code === "AGT-103" ? "green" : ["blue", "purple", "orange", "green"][Number(agent.code.replace(/\D/g, "")) % 4 || 0];
                return (
                  <tr key={agent.id} className={`channel-partner-row tone-${tone}`}>
                    <td className="channel-partner-serial">{(page - 1) * pageSize + index + 1}</td>
                    <td><span className="channel-partner-code">{agent.code}</span></td>
                    <td>
                      <div className="channel-partner-identity">
                        <div className="channel-partner-avatar">
                          {agent.profileImageUrl && !unavailableImageUrls.includes(agent.profileImageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={agent.profileImageUrl} onError={() => showImageFallback(agent.profileImageUrl!)} alt={`${agent.name} profile`} />
                          ) : agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link href={`/agent/${agent.id}`}>{agent.name}</Link>
                          <small>{agent.contactPerson !== "N/A" ? `Owner: ${agent.contactPerson}` : agent.address}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="channel-partner-contact">
                        <a href={`tel:${agent.phone}`}>{agent.phone}</a>
                        {agent.email !== "N/A" && <small>{agent.email}</small>}
                        {agent.hasPortalAccess && <span className="channel-partner-portal-status">Portal Active</span>}
                      </div>
                    </td>
                    <td>
                      <span className="channel-partner-district">
                        <AgentsDesignIcon name={tone === "orange" ? "OrangeDot" : tone === "green" ? "GreenDot" : tone === "purple" ? "BlueDot" : "GrayDot"} />
                        {agent.district || "Dhaka"}
                      </span>
                    </td>
                    <td><Link href={`/agent/${agent.id}`} className={`channel-partner-referrals ${agent.totalCandidates > 0 ? "has-candidates" : ""}`}>{agent.totalCandidates} Candidates</Link></td>
                    <td><span className={`channel-partner-status ${isActive ? "active" : "inactive"}`}>{agent.status}</span></td>
                    <td>
                      <div className="channel-partner-row-actions">
                        <Link data-action-ui="secondary" data-action-size="compact" href={`/agent/${agent.id}`} className="channel-partner-profile">View Profile</Link>
                        <Link data-action-ui="secondary" data-action-size="compact" href={`/portal/agent?agentId=${agent.id}`} title="Preview Agent Self-Service Portal" className="channel-partner-portal">Portal</Link>
                        <button data-action-ui="danger" data-action-size="icon" type="button" onClick={() => handleDeleteAgent(agent)} title="Delete Agent" aria-label={`Delete ${agent.name}`}>
                          <AgentsDesignIcon name="Trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stitch Agents Mobile Stream */}
        <div className="mobile-agents-stream">
          {isLoading ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted)", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
              Loading agent network...
            </div>
          ) : agentsList.length === 0 ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--muted)", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
              No agent partners found matching your search.
            </div>
          ) : (
            agentsList.map((agent: AgentItem) => {
              const isActive = agent.status === "Active";
              return (
                <div key={agent.id} className="agent-mobile-card">
                  {/* Top Bar: Code, Status, Delete action */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: isActive ? "#ecfdf5" : "#fff1f2",
                          color: isActive ? "#059669" : "#e11d48",
                          border: isActive ? "1px solid #a7f3d0" : "1px solid #fecdd3",
                        }}
                      >
                        {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />}
                        {agent.status}
                      </span>
                    </div>

                    <button data-action-ui="danger" data-action-size="icon"
                      type="button"
                      onClick={() => handleDeleteAgent(agent)}
                      title="Delete Agent"
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
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

                  {/* Profile info: Avatar + Name + Owner */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
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
                      {agent.profileImageUrl && !unavailableImageUrls.includes(agent.profileImageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={agent.profileImageUrl} onError={() => showImageFallback(agent.profileImageUrl!)} alt={`${agent.name} profile`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }} />
                      ) : (
                        agent.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link
                        href={`/agent/${agent.id}`}
                        style={{
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--ink)",
                          display: "block",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {agent.name}
                      </Link>
                      <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                        {agent.contactPerson !== "N/A" ? `Owner: ${agent.contactPerson}` : agent.address}
                      </span>
                    </div>
                  </div>

                  {/* Location & Referrals Metadata */}
                  <div className="agent-mobile-meta-grid">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "var(--ink)", fontWeight: 600 }}>
                        <MapPin size={13} color="#64748b" /> {agent.district || "Dhaka"}
                      </span>
                      <Link
                        href={`/agent/${agent.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: agent.totalCandidates > 0 ? "#ecfdf5" : "#f1f5f9",
                          color: agent.totalCandidates > 0 ? "#059669" : "var(--muted)",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        <Users size={11} /> {agent.totalCandidates} Candidates
                      </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
                      <a
                        href={`tel:${agent.phone}`}
                        style={{ color: "#0284c7", fontWeight: 700, fontSize: "11.5px", textDecoration: "none" }}
                      >
                        📞 {agent.phone}
                      </a>
                      {agent.hasPortalAccess ? (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "1px 6px", borderRadius: "4px" }}>
                          🔑 Portal Active
                        </span>
                      ) : (
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>No Portal</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="agent-mobile-actions">
                    <Link data-action-ui="secondary" data-action-size="normal"
                      href={`/agent/${agent.id}`}
                      style={{
                        background: "#f0edff",
                        color: "#7258e8",
                        border: "1px solid #dcd5fb",
                      }}
                    >
                      <Eye size={13} /> View Profile
                    </Link>
                    <Link data-action-ui="secondary" data-action-size="normal"
                      href={`/portal/agent?agentId=${agent.id}`}
                      style={{
                        background: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      <span>🔑</span> Portal Login
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="country-design-pagination">
          <span>{meta.total} Total Agents &amp; Channel Partners</span>
          <div>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span className="country-design-page-indicator">Page {page} of {Math.max(1, meta.totalPages)}</span>
            <button data-action-ui="neutral" data-action-size="normal" type="button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {/* 5. Create Agent Modal Dialog */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-label="Create New Agent Partner" className="master-modal-overlay"
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
          onClick={() => {
            if (!creating) {
              setCreateImageFile(null);
              setShowCreateModal(false);
            }
          }}
        >
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "min(560px, 100%)",
              maxHeight: "92vh",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="master-modal-header"
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
                <div className="master-modal-accent master-modal-icon"
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
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
                type="button"
                onClick={() => {
                  setCreateImageFile(null);
                  setShowCreateModal(false);
                }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ padding: "22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <AgentProfileImageField
                  agentName="New Agent"
                  selectedFile={createImageFile}
                  onFileChange={setCreateImageFile}
                  disabled={creating}
                  compact
                />
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

                {/* 🔐 AGENT PORTAL LOGIN CREDENTIALS */}
                <div className="master-modal-panel"
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
                    <label className="master-modal-accent" style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
                      <input
                        type="checkbox"
                        name="enablePortalLogin"
                        checked={isSuperAdmin && createPortalLogin}
                        disabled={!isSuperAdmin}
                        onChange={(e) => setCreatePortalLogin(e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "#7258e8" }}
                      />
                      Enable Login
                    </label>
                  </div>

                  {isSuperAdmin && createPortalLogin && (
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
                          <button data-action-ui="secondary" data-action-size="normal" className="master-modal-accent"
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
                <button data-action-ui="neutral" data-action-size="normal"
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    setCreateImageFile(null);
                    setShowCreateModal(false);
                  }}
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
                <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
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
        <div role="dialog" aria-modal="true" aria-label="Dialog" className="master-modal-overlay"
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
          <div className="master-modal-card master-modal-inline-card master-modal-panel"
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
                    <div className="master-modal-icon"
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
                      {agentDetailQuery.data.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={agentDetailQuery.data.profileImageUrl} alt={`${agentDetailQuery.data.name} profile`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
                      ) : (
                        agentDetailQuery.data.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h2 style={{ fontSize: "19px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                          {agentDetailQuery.data.name}
                        </h2>
                        <span className="master-modal-accent"
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

                  <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close"
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
                  <div className="master-modal-panel" style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Total Referred Candidates</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.totalCandidates}
                    </div>
                  </div>
                  <div className="master-modal-panel" style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Active in Pipeline</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.activeDossiers}
                    </div>
                  </div>
                  <div className="master-modal-panel" style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Visa Done / Flown</span>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                      {agentDetailQuery.data.metrics.completedFlights + agentDetailQuery.data.metrics.visaStamped}
                    </div>
                  </div>
                  <div className="master-modal-panel" style={{ padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>Total Payments Received</span>
                    <div className="master-modal-accent" style={{ fontSize: "18px", fontWeight: 800, color: "#7258e8", marginTop: "2px" }}>
                      ৳ {agentDetailQuery.data.metrics.totalPaymentsReceived.toLocaleString()} BDT
                    </div>
                  </div>
                </div>

                {/* Profile Tabs Navigation */}
                <div style={{ display: "flex", gap: "10px", padding: "12px 24px 0", borderBottom: "1px solid var(--line)", background: "#fafafa" }}>
                  <button data-action-ui="secondary" data-action-size="normal"
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
                  <button data-action-ui="danger" data-action-size="normal"
                    type="button"
                    onClick={() => {
                      setEditImageFile(null);
                      setRemoveEditImage(false);
                      setActiveProfileTab("edit");
                    }}
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
                        <div className="master-modal-panel" style={{ padding: "40px", textAlign: "center", color: "var(--muted)", background: "#f8fafc", borderRadius: "12px" }}>
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
                                    <span className="master-modal-accent" style={{ padding: "3px 8px", borderRadius: "6px", background: "#f0edff", color: "#7258e8", fontWeight: 700, fontSize: "11px" }}>
                                      {cand.currentStage}
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 14px", fontWeight: 800, color: "#059669" }}>
                                    ৳ {cand.totalPaid.toLocaleString()} BDT
                                  </td>
                                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                                    <Link data-action-ui="secondary" data-action-size="compact"
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
                      <div style={{ marginBottom: "16px" }}>
                        <AgentProfileImageField
                          agentName={agentDetailQuery.data.name}
                          imageUrl={agentDetailQuery.data.profileImageUrl}
                          selectedFile={editImageFile}
                          onFileChange={(file) => {
                            setEditImageFile(file);
                            if (file) setRemoveEditImage(false);
                          }}
                          removeRequested={removeEditImage}
                          onRemoveExisting={() => setRemoveEditImage(Boolean(agentDetailQuery.data?.profileImageUrl))}
                          disabled={updatingAgent}
                          compact
                        />
                      </div>
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
                      <div className="master-modal-panel"
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
                          <label className="master-modal-accent" style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#7258e8" }}>
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
                                <button data-action-ui="secondary" data-action-size="normal" className="master-modal-accent"
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
                        <button data-action-ui="primary" data-action-size="normal" className="master-modal-primary"
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
