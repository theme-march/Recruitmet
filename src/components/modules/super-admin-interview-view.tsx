"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export type Schedule = {
  id: string;
  title: string;
  company: string | null;
  profession: string | null;
  scheduledAt: string;
  venue: string | null;
  interviewer: string | null;
  capacity: number;
  registeredCount: number;
  status: string;
};

export function SuperAdminInterviewView({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function createSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        title: String(form.get("title")),
        company: String(form.get("company")),
        profession: String(form.get("profession")),
        scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
        venue: String(form.get("venue")),
        interviewer: String(form.get("interviewer")),
        capacity: Number(form.get("capacity")),
        instructions: String(form.get("instructions") || ""),
      };

      const res = await fetch("/api/interview-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create schedule");

      setSchedules((prev) => [
        {
          id: body.data.id,
          title: payload.title,
          company: payload.company,
          profession: payload.profession,
          scheduledAt: new Date(payload.scheduledAt).toLocaleDateString(),
          venue: payload.venue,
          interviewer: payload.interviewer,
          capacity: payload.capacity,
          registeredCount: 0,
          status: "Scheduled",
        },
        ...prev,
      ]);

      setShowModal(false);
      toast.success("Interview Drive created & published to Office Panel!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create interview schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="admin-page-head">
        <div>
          <span>RECRUITMENT DRIVES</span>
          <h1>Interview Drives & Assessments</h1>
          <p>Create recruitment interview drives. Office panel officers can book interested candidates directly.</p>
        </div>
        <div className="admin-head-actions">
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={18} /> Schedule New Drive
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Drive Title</th>
                <th>Company</th>
                <th>Trade / Profession</th>
                <th>Date & Time</th>
                <th>Venue / Location</th>
                <th>Interviewer / Panel</th>
                <th>Registered / Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#888" }}>
                    No interview drives scheduled yet.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <b>{s.title}</b>
                    </td>
                    <td>{s.company ?? "—"}</td>
                    <td>{s.profession ?? "—"}</td>
                    <td>{s.scheduledAt}</td>
                    <td>{s.venue ?? "Head Office"}</td>
                    <td>{s.interviewer ?? "HR Panel"}</td>
                    <td>
                      <b>{s.registeredCount}</b> / {s.capacity} candidates
                    </td>
                    <td>
                      <span className="badge active">{s.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="operations-modal">
          <button className="operations-modal-backdrop" onClick={() => setShowModal(false)} />
          <form onSubmit={createSchedule}>
            <header>
              <div>
                <span>INTERVIEW DRIVE SETUP</span>
                <h2>Schedule Interview Drive</h2>
                <p>Call Center officers can immediately view and register eligible candidates.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </header>
            <div className="operations-form">
              <label className="wide">
                <span>Drive Title</span>
                <input name="title" required placeholder="e.g. Dubai Logistics Warehouse Assessment Drive" />
              </label>
              <label>
                <span>Hiring Company</span>
                <input name="company" required placeholder="e.g. Emirates Logistics LLC" />
              </label>
              <label>
                <span>Target Profession</span>
                <input name="profession" required placeholder="e.g. Warehouse Assistant" />
              </label>
              <label>
                <span>Interview Date & Time</span>
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                />
              </label>
              <label>
                <span>Maximum Capacity</span>
                <input name="capacity" type="number" min="1" required defaultValue={50} />
              </label>
              <label>
                <span>Venue / Location</span>
                <input name="venue" required defaultValue="Dhaka Head Office (Banani)" />
              </label>
              <label>
                <span>Interviewer / Panel</span>
                <input name="interviewer" required defaultValue="Recruitment Delegation" />
              </label>
              <label className="wide">
                <span>Candidate Instructions</span>
                <textarea
                  name="instructions"
                  placeholder="Bring original passport and training certificates"
                  defaultValue="Bring original passport and 2 passport photos."
                />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Scheduling..." : "Publish Interview Drive"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

