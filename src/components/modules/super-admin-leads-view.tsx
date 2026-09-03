"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

export type SuperAdminCall = {
  id: string;
  leadNo: string;
  fullName: string;
  phone: string;
  country: string;
  workCategory: string;
  company: string;
  priority: number;
  status: string;
  assignedToId: string | null;
  assignedToName: string;
  followUpAt: string | null;
  createdAt: string;
};

export type Officer = {
  id: string;
  name: string;
  email: string;
};

export function SuperAdminLeadsView({
  initialCalls,
  officers,
}: {
  initialCalls: SuperAdminCall[];
  officers: Officer[];
}) {
  const [calls, setCalls] = useState(initialCalls);
  const [query, setQuery] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = calls.filter((c) => {
    const matchQ =
      !query ||
      c.fullName.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.leadNo.toLowerCase().includes(query.toLowerCase());
    const matchOfficer = !selectedOfficer || c.assignedToId === selectedOfficer;
    const matchStatus = !selectedStatus || c.status === selectedStatus;
    return matchQ && matchOfficer && matchStatus;
  });

  async function reassignOfficer(leadId: string, officerId: string) {
    setUpdatingId(leadId);
    try {
      const res = await fetch("/api/admin/work-calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, assignedToId: officerId || null }),
      });
      if (!res.ok) throw new Error("Failed to reassign officer");
      const updatedOfficerName = officers.find((o) => o.id === officerId)?.name ?? "Unassigned";
      setCalls((prev) =>
        prev.map((c) =>
          c.id === leadId
            ? { ...c, assignedToId: officerId || null, assignedToName: updatedOfficerName }
            : c
        )
      );
      toast.success("Lead reassigned successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updatePriority(leadId: string, priority: number) {
    setUpdatingId(leadId);
    try {
      const res = await fetch("/api/admin/work-calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, priority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      setCalls((prev) => prev.map((c) => (c.id === leadId ? { ...c, priority } : c)));
      toast.success("Priority updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update priority");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="admin-page-head">
        <div>
          <span>OFFICE OVERSIGHT</span>
          <h1>Lead Control & Officer Reassignment</h1>
          <p>Global view of all candidate leads across call center officers.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "0 12px",
              background: "#fafafd",
              flex: 1,
              minWidth: 260,
              height: 40,
            }}
          >
            <Search size={16} color="#888" />
            <input
              style={{ border: "none", outline: "none", background: "transparent", width: "100%" }}
              placeholder="Search lead no, candidate name, phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            style={{ height: 40, borderRadius: 8, border: "1px solid var(--line)", padding: "0 12px", background: "#fff" }}
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
          >
            <option value="">All Officers</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            style={{ height: 40, borderRadius: 8, border: "1px solid var(--line)", padding: "0 12px", background: "#fff" }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Converted">Converted</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead No</th>
                <th>Candidate</th>
                <th>Phone</th>
                <th>Country & Trade</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#888" }}>
                    No leads found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <b>{call.leadNo}</b>
                      <small style={{ display: "block", color: "#888", fontSize: 10 }}>{call.createdAt}</small>
                    </td>
                    <td>{call.fullName}</td>
                    <td>
                      <a href={`tel:${call.phone}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                        {call.phone}
                      </a>
                    </td>
                    <td>
                      <span>{call.country}</span>
                      <small style={{ display: "block", color: "#888", fontSize: 10 }}>{call.workCategory}</small>
                    </td>
                    <td>
                      <select
                        value={call.priority}
                        disabled={updatingId === call.id}
                        onChange={(e) => updatePriority(call.id, Number(e.target.value))}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, fontWeight: 700 }}
                      >
                        <option value={1}>P1 - Urgent</option>
                        <option value={2}>P2 - High</option>
                        <option value={3}>P3 - Medium</option>
                        <option value={4}>P4 - Low</option>
                        <option value={5}>P5 - Lead</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${call.status === "Converted" ? "active" : call.status === "New" ? "attention" : ""}`}>
                        {call.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={call.assignedToId ?? ""}
                        disabled={updatingId === call.id}
                        onChange={(e) => reassignOfficer(call.id, e.target.value)}
                        style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, background: "#fff" }}
                      >
                        <option value="">-- Unassigned --</option>
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                        {updatingId === call.id ? "Saving..." : "Live Synced"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
