"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export type Demand = {
  id: string;
  demandNo: string;
  title: string;
  profession: string;
  country: string;
  quantity: number;
  assignedQuantity: number;
  companyName: string;
  status: string;
};

export function SuperAdminMasterView({
  initialDemands,
  companies,
  professions,
}: {
  initialDemands: Demand[];
  companies: { id: string; name: string; country: string }[];
  professions: { id: string; name: string }[];
}) {
  const [demands, setDemands] = useState(initialDemands);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function createDemand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const payload = {
        title: String(form.get("title")),
        profession: String(form.get("profession")),
        country: String(form.get("country")),
        companyName: String(form.get("companyName")),
        quantity: Number(form.get("quantity")),
      };

      const res = await fetch("/api/admin/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create demand");

      setDemands((prev) => [
        {
          id: body.data.id,
          demandNo: body.data.demandNo,
          title: body.data.title,
          profession: body.data.profession,
          country: body.data.country,
          quantity: body.data.quantity,
          assignedQuantity: 0,
          companyName: body.data.company?.name ?? payload.companyName,
          status: "ACTIVE",
        },
        ...prev,
      ]);

      setShowModal(false);
      toast.success("New Demand published to Office Panel!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create demand");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="admin-page-head">
        <div>
          <span>MASTER CONFIGURATION</span>
          <h1>Master Demands & Vacancies</h1>
          <p>Configure demands, partner companies and quotas. Data automatically feeds into the Office Panel.</p>
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
            <Plus size={18} /> Add New Demand
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Demand No</th>
                <th>Job Title / Demand</th>
                <th>Company</th>
                <th>Target Country</th>
                <th>Trade / Profession</th>
                <th>Allocation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {demands.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "#888" }}>
                    No master demands configured yet.
                  </td>
                </tr>
              ) : (
                demands.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <b>{d.demandNo}</b>
                    </td>
                    <td>{d.title}</td>
                    <td>{d.companyName}</td>
                    <td>
                      <span className="badge active">{d.country}</span>
                    </td>
                    <td>{d.profession}</td>
                    <td>
                      <b>{d.assignedQuantity}</b> / {d.quantity} candidates
                    </td>
                    <td>
                      <span className="badge active">{d.status}</span>
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
          <form onSubmit={createDemand}>
            <header>
              <div>
                <span>MASTER DATA SYNC</span>
                <h2>Create Recruitment Demand</h2>
                <p>This demand will immediately appear in Office Panel call-center lead booking.</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </header>
            <div className="operations-form">
              <label className="wide">
                <span>Demand Title / Job Position</span>
                <input name="title" required placeholder="e.g. Saudi Electrical Maintenance Drive" />
              </label>
              <label>
                <span>Company Name</span>
                <input name="companyName" required placeholder="e.g. Al Noor Contracting LLC" />
              </label>
              <label>
                <span>Destination Country</span>
                <select name="country" required>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Dubai">Dubai (UAE)</option>
                  <option value="Qatar">Qatar</option>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Oman">Oman</option>
                  <option value="Bahrain">Bahrain</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Romania">Romania</option>
                  <option value="Italy">Italy</option>
                  <option value="Poland">Poland</option>
                  <option value="Other Country">Other Country</option>
                </select>
              </label>
              <label>
                <span>Profession / Trade</span>
                <input name="profession" required placeholder="e.g. Electrician, Plumber, Driver" />
              </label>
              <label>
                <span>Vacancy Quota (Quantity)</span>
                <input name="quantity" type="number" min="1" required defaultValue={50} />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Publishing..." : "Publish to Office Panel"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

