"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, Edit, FileSpreadsheet, Plus, Search, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { moduleItemPath } from "@/lib/modules";

type Schedule = {
  id: string;
  title: string;
  company: string | null;
  profession: string | null;
  scheduledAt: string;
  venue: string | null;
  capacity?: number;
  instructions?: string | null;
  status: string;
  _count: { interviews: number };
};

type DemandItem = {
  id: string;
  demandNo: string;
  title: string;
  country: string;
  profession: string;
  quantity: number;
  visaQuantity?: number;
  salary?: number;
  currency?: string;
  visaRate?: number;
  company?: { name: string };
};

const readableDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

export function InterviewListPage({ upcomingOnly = false }: { upcomingOnly?: boolean }) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  
  // Create Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Modal States
  const [editOpen, setEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [updating, setUpdating] = useState(false);

  // Demand Linking States
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [profession, setProfession] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("Dhaka Head Office (Auditorium)");
  const [capacity, setCapacity] = useState(50);
  const [instructions, setInstructions] = useState("");

  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as {
        name: string;
        role: string;
        roleKey: "SUPER_ADMIN" | "CALL_CENTER";
        permissions?: { canManageDemands?: boolean; canManageInterviews?: boolean };
      };
    },
  });

  const canManage = profileQuery.data?.roleKey === "SUPER_ADMIN" || Boolean(profileQuery.data?.permissions?.canManageInterviews);

  const query = useQuery({
    queryKey: ["interview-schedules", search],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search) params.set("q", search);
      const response = await fetch(`/api/interviews?${params}`);
      if (!response.ok) throw new Error("Could not load interview schedules");
      return (await response.json()).data as Schedule[];
    },
  });

  // Fetch active Demands from Works & Demands
  useEffect(() => {
    void fetch("/api/demands?pageSize=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data?.length) {
          setDemands(body.data);
        }
      })
      .catch(() => {});
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const schedules = query.data ?? [];
  const upcoming = schedules
    .filter((item) => new Date(item.scheduledAt) >= today)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  const past = schedules
    .filter((item) => new Date(item.scheduledAt) < today)
    .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

  const handleDemandSelect = (demId: string) => {
    setSelectedDemandId(demId);
    if (!demId) return;

    const dem = demands.find((d) => d.id === demId);
    if (dem) {
      const compName = dem.company?.name || dem.title || "Foreign Employer";
      setTitle(`${compName} - ${dem.profession} Selection Drive`);
      setCompany(compName);
      setProfession(dem.profession);
      setCapacity(dem.visaQuantity || dem.quantity || 50);
      setInstructions(
        `Salary: ${dem.salary ? `${dem.salary} ${dem.currency || "SAR"}` : "Competitive"} | Package: ৳ ${
          dem.visaRate ? Number(dem.visaRate).toLocaleString() : "500,000"
        } | Requirements: Trade experience & original passport`
      );

      if (!scheduledAt) {
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setScheduledAt(
          `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T10:00`
        );
      }

      toast.success(`Auto-filled details from Demand ${dem.demandNo} (${compName})`, {
        icon: "✨",
      });
    }
  };

  const openEditModal = (sch: Schedule) => {
    setEditingSchedule(sch);
    // Format date for datetime-local input
    let formattedDate = "";
    if (sch.scheduledAt) {
      try {
        const d = new Date(sch.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {}
    }
    setTitle(sch.title || "");
    setCompany(sch.company || "");
    setProfession(sch.profession || "");
    setScheduledAt(formattedDate);
    setVenue(sch.venue || "Dhaka Head Office (Auditorium)");
    setCapacity(sch.capacity || 50);
    setInstructions(sch.instructions || "");
    setEditOpen(true);
  };

  async function handleCreateSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          profession,
          scheduledAt,
          venue,
          capacity: Number(capacity) || 50,
          instructions,
          candidateIds: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create interview drive");
      toast.success("Interview drive created and linked to Works & Demands!");
      setCreateOpen(false);
      // Reset form
      setSelectedDemandId("");
      setTitle("");
      setCompany("");
      setProfession("");
      setScheduledAt("");
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating interview");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSchedule) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/interview-schedules/${editingSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          profession,
          scheduledAt,
          venue,
          capacity: Number(capacity) || 50,
          instructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update interview drive");
      toast.success("Interview drive updated successfully!");
      setEditOpen(false);
      setEditingSchedule(null);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating interview");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteSchedule(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/interview-schedules/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete interview drive");
      toast.success("Interview drive deleted successfully!");
      setEditOpen(false);
      setEditingSchedule(null);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting interview");
    }
  }

  return (
    <div className="interview-list-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div className="interview-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Call Center / Registration &amp; Interviews
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>Registration &amp; Interviews</h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Create, schedule and manage overseas recruitment interview drives with clients.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {canManage && (
            <button
              type="button"
              className="button primary"
              onClick={() => setCreateOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(114,88,232,0.25)",
              }}
            >
              <Plus size={15} /> Create Interview Drive
            </button>
          )}
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Officer Dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              background: "#fff",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Officer Dashboard
          </Link>
          <Link
            prefetch={true}
            href={moduleItemPath("call-center", "Work Call List")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              borderRadius: "10px",
              background: "#f0edff",
              border: "1px solid #dcd5fb",
              color: "#7258e8",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Work Call List
          </Link>
        </div>
      </div>

      {/* Search Filter Card */}
      <form
        className="interview-search-card"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(input.trim());
        }}
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "18px 22px",
          marginBottom: "20px",
          boxShadow: "var(--shadow)",
          display: "flex",
          alignItems: "flex-end",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--ink)", flex: "1 1 320px" }}>
          Search by interview name or company
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type interview title, company or profession..."
            style={{
              height: "42px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
              background: "#fafafd",
              fontSize: "13px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 22px",
              height: "42px",
              borderRadius: "10px",
              background: "#7258e8",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(114,88,232,0.25)",
            }}
          >
            <Search size={15} /> Search
          </button>
          <button
            type="button"
            onClick={() => {
              setInput("");
              setSearch("");
            }}
            style={{
              padding: "0 18px",
              height: "42px",
              borderRadius: "10px",
              background: "#f1f5f9",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {query.isError && <div className="form-error">Interview schedules could not be loaded.</div>}

      <ScheduleSection
        title="Upcoming interviews"
        count={upcoming.length}
        rows={upcoming}
        canManage={canManage}
        onEdit={openEditModal}
        onDelete={handleDeleteSchedule}
      />
      {!upcomingOnly && (
        <ScheduleSection
          title="Past interviews"
          count={past.length}
          rows={past}
          canManage={canManage}
          onEdit={openEditModal}
          onDelete={handleDeleteSchedule}
        />
      )}

      {/* 1. CREATE SCHEDULE MODAL */}
      {createOpen && (
        <div className="lead-modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="lead-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="lead-modal-header">
              <div>
                <h2>Create New Company Interview Drive</h2>
                <p>Create interview schedule directly linked with an active Works &amp; Demand letter.</p>
              </div>
              <button className="lead-close-btn" onClick={() => setCreateOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div className="lead-modal-body" style={{ display: "block" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Active Demand Selector (Optional) */}
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <FileSpreadsheet size={15} /> Select Active Demand Letter (Optional)
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Auto-fill helper</span>
                    </div>
                    <select
                      value={selectedDemandId}
                      onChange={(e) => handleDemandSelect(e.target.value)}
                      style={{
                        height: 40,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 8,
                        padding: "0 10px",
                        fontWeight: 500,
                        color: "#334155",
                      }}
                    >
                      <option value="">-- None (Create Custom / Manual Interview) --</option>
                      {demands.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.demandNo} · {d.company?.name || d.title} · {d.profession} ({d.visaQuantity || d.quantity} Visas)
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedDemandId && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-bold">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-600 shrink-0" />
                        <span>Auto-filled from Works &amp; Demands. You can still edit any field below.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDemandId("")}
                        style={{ color: "#059669", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 11 }}
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Interview Title *
                    <input
                      name="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Saudi Binladen Group - Electrician Drive"
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Company Name
                      <input
                        name="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Saudi Binladen Group"
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Profession / Trade Category
                      <input
                        name="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="e.g. Electrician / Plumber"
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Interview Date &amp; Time *
                      <input
                        name="scheduledAt"
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Candidate Capacity (Seats)
                      <input
                        name="capacity"
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Venue / Location
                    <input
                      name="venue"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Dhaka Head Office Auditorium"
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Requirements &amp; Instructions (Auto-filled from Demand)
                    <input
                      name="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Salary, package, passport requirements..."
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>
                </div>
              </div>
              <div className="lead-modal-footer">
                <button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="button primary">
                  {creating ? "Creating..." : "Publish Interview Drive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT SCHEDULE MODAL */}
      {editOpen && editingSchedule && (
        <div className="lead-modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="lead-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="lead-modal-header">
              <div>
                <h2>Edit Interview Schedule Drive</h2>
                <p>Update title, reschedule date &amp; time, location, or quota for this interview.</p>
              </div>
              <button className="lead-close-btn" onClick={() => setEditOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateSchedule}>
              <div className="lead-modal-body" style={{ display: "block" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Interview Title *
                    <input
                      name="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Company Name
                      <input
                        name="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Profession / Trade Category
                      <input
                        name="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Interview Date &amp; Time *
                      <input
                        name="scheduledAt"
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                      Candidate Capacity (Seats)
                      <input
                        name="capacity"
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                        style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Venue / Location
                    <input
                      name="venue"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700 }}>
                    Requirements &amp; Instructions
                    <input
                      name="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      style={{ height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px" }}
                    />
                  </label>
                </div>
              </div>
              <div className="lead-modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ color: "#e11d48", border: "1px solid #fecdd3", background: "#fff1f2" }}
                  onClick={() => handleDeleteSchedule(editingSchedule.id, editingSchedule.title)}
                >
                  <Trash2 size={14} /> Delete Drive
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={updating} className="button primary">
                    {updating ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleSection({
  title,
  count,
  rows,
  canManage,
  onEdit,
  onDelete,
}: {
  title: string;
  count?: number;
  rows: Schedule[];
  canManage?: boolean;
  onEdit: (sch: Schedule) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <section className="schedule-section" style={{ marginBottom: "26px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", margin: 0 }}>
          {title} {typeof count === "number" && <small style={{ color: "var(--muted)", fontWeight: 600, fontSize: "12px" }}>({count} total)</small>}
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
        {rows.map((row) => (
          <article
            key={row.id}
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "18px 20px",
              boxShadow: "var(--shadow)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <div>
              {/* Date & Company Tag */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#f0edff",
                    color: "#7258e8",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "8px",
                  }}
                >
                  <CalendarDays size={13} /> {readableDate(row.scheduledAt)}
                </span>
                {row.company && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      background: "#f8fafc",
                      border: "1px solid var(--line)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {row.company}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.35 }}>
                {row.title}
              </h3>

              {/* Profession */}
              {row.profession && (
                <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, margin: 0 }}>
                  {row.profession}
                </p>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid var(--line)",
                paddingTop: "12px",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#3b82f6",
                  background: "#eff6ff",
                  padding: "4px 10px",
                  borderRadius: "8px",
                }}
              >
                <UsersRound size={14} /> {row._count?.interviews ?? 0} Candidates
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Link
                  prefetch={true}
                  href={`/module/registration/interview/${row.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "#7258e8",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 2px 4px rgba(114,88,232,0.2)",
                  }}
                >
                  View details ➔
                </Link>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Edit or Reschedule Interview Drive"
                  >
                    <Edit size={12} /> Edit
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
