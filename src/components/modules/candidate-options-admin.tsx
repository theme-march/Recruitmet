"use client";

import { BadgeCheck, BriefcaseBusiness, Building2, Edit3, Folder, Plus, Power, PowerOff, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Entity = "category" | "profession" | "company" | "status";
type OptionRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  description?: string | null;
  sortOrder?: number;
  categoryId?: string;
  categoryName?: string;
  country?: string;
};

const labels: Record<Entity, { singular: string; plural: string }> = {
  category: { singular: "Work Category", plural: "Work Categories" },
  profession: { singular: "Profession / Trade", plural: "Professions / Trades" },
  company: { singular: "Target Company", plural: "Target Companies" },
  status: { singular: "Direct File Status", plural: "Direct File Statuses" },
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  border: 0,
  borderRadius: 7,
  padding: "6px 10px",
  height: "30px",
  fontSize: "11.5px",
  fontWeight: 700,
  cursor: "pointer",
};

export function CandidateOptionsAdmin({
  initialCategories,
  initialProfessions,
  initialCompanies,
  initialStatuses,
}: {
  initialCategories: OptionRow[];
  initialProfessions: OptionRow[];
  initialCompanies: OptionRow[];
  initialStatuses: OptionRow[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [professions, setProfessions] = useState(initialProfessions);
  const [companies, setCompanies] = useState(initialCompanies);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [tab, setTab] = useState<Entity>("category");
  const [editing, setEditing] = useState<OptionRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rows = useMemo(
    () => ({ category: categories, profession: professions, company: companies, status: statuses })[tab],
    [categories, companies, professions, statuses, tab],
  );

  const normalizeRow = (entity: Entity, row: Record<string, unknown>): OptionRow => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    active: entity === "company" ? ["Active", "ACTIVE"].includes(String(row.status)) : Boolean(row.active),
    description: typeof row.description === "string" ? row.description : null,
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
    categoryId: typeof row.categoryId === "string" ? row.categoryId : undefined,
    categoryName:
      entity === "profession"
        ? categories.find((category) => category.id === row.categoryId)?.name
        : undefined,
    country: typeof row.country === "string" ? row.country : undefined,
  });

  const replaceRow = (entity: Entity, row: OptionRow) => {
    const update = (current: OptionRow[]) =>
      [...current.filter((item) => item.id !== row.id), row].sort((a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      );
    if (entity === "category") {
      setCategories(update);
      setProfessions((current) =>
        current.map((item) => item.categoryId === row.id ? { ...item, categoryName: row.name } : item),
      );
    }
    if (entity === "profession") setProfessions(update);
    if (entity === "company") setCompanies(update);
    if (entity === "status") setStatuses(update);
  };

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      entity: tab,
      ...(editing ? { id: editing.id } : {}),
      code: String(form.get("code") || ""),
      name: String(form.get("name") || ""),
      description: String(form.get("description") || "") || undefined,
      categoryId: String(form.get("categoryId") || "") || undefined,
      country: String(form.get("country") || "") || undefined,
      sortOrder: Number(form.get("sortOrder") || 0),
      active: editing?.active ?? true,
    };
    try {
      const response = await fetch("/api/admin/candidate-options", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not save option");
      replaceRow(tab, normalizeRow(tab, body.data.row));
      setModalOpen(false);
      setEditing(null);
      toast.success(`${labels[tab].singular} saved successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save option");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: OptionRow) {
    try {
      const response = await fetch("/api/admin/candidate-options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: tab, id: row.id, active: !row.active }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not update option");
      replaceRow(tab, normalizeRow(tab, body.data.row));
      toast.success(`${row.name} is now ${row.active ? "inactive" : "active"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update option");
    }
  }

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: OptionRow) => {
    setEditing(row);
    setModalOpen(true);
  };

  return (
    <div className="country-design-page management-design-page candidate-options-design-page">
      <div className="country-design-breadcrumb">Dashboard / Administration / Candidate Form Options</div>
      <div className="admin-page-head management-heading">
        <div>

          <h1>Candidate Form Options</h1>
          <p>Manage the categories, trades, companies and statuses shown in Direct Candidate registration.</p>
        </div>
        <button data-action-ui="primary" data-action-size="normal"
          type="button"
          onClick={openCreate}
          style={{ ...buttonStyle, background: "#8368ef", color: "white", padding: "6px 14px", height: "34px", fontSize: "12px" }}
        >
          <Plus size={15} /> Add {labels[tab].singular}
        </button>
      </div>

      <section className="country-design-metrics management-metrics-four">
        {([{label: "Work Categories", count: categories.length, detail: "Registration categories", icon: Folder, color: "#007aff"}, {label: "Professions / Trades", count: professions.length, detail: "Available professions", icon: BriefcaseBusiness, color: "#6855e8"}, {label: "Target Companies", count: companies.length, detail: "Employer options", icon: Building2, color: "#28c653"}, {label: "Direct File Statuses", count: statuses.length, detail: "Candidate status options", icon: BadgeCheck, color: "#ff9500"}]).map(metric => <article className="country-design-metric" key={metric.label}><div><span>{metric.label}</span><metric.icon size={16} color={metric.color} /></div><b>{metric.count}</b><p>{metric.detail}</p></article>)}
      </section>
      <section className="country-design-workspace candidate-options-panel">
        <div className="control-tabs management-tabs" role="tablist">
          {(Object.keys(labels) as Entity[]).map((entity) => (
            <button
              key={entity}
              type="button"
              role="tab"
              aria-selected={tab === entity}
              className={tab === entity ? "active" : ""}
              onClick={() => {
                setTab(entity);
                setEditing(null);
                setModalOpen(false);
              }}
            >
              {labels[entity].plural}
            </button>
          ))}
        </div>

        <div className="country-design-count">Showing {rows.length} Total {labels[tab].plural}</div>
        <div className="admin-table-wrap desktop-options-table management-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                {tab === "profession" && <th>Work Category</th>}
                {tab === "company" && <th>Country</th>}
                {(tab === "category" || tab === "status") && <th>Order</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td><b>{row.code}</b></td>
                    <td>{row.name}</td>
                    {tab === "profession" && <td>{row.categoryName || "Unassigned"}</td>}
                    {tab === "company" && <td>{row.country || "—"}</td>}
                    {(tab === "category" || tab === "status") && <td>{row.sortOrder ?? 0}</td>}
                    <td><span className={`badge ${row.active ? "active" : ""}`}>{row.active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button data-action-ui="secondary" data-action-size="compact" type="button" onClick={() => openEdit(row)} style={{ ...buttonStyle, background: "#eef2ff", color: "#4338ca" }}><Edit3 size={14} />Edit</button>
                        <button     type="button" onClick={() => void toggle(row)} style={{ ...buttonStyle, background: row.active ? "#fff1f2" : "#ecfdf5", color: row.active ? "#be123c" : "#047857" }}>
                          {row.active ? <PowerOff size={14} /> : <Power size={14} />}{row.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#8b92a2" }}>No {labels[tab].plural.toLowerCase()} configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Options Cards Stream (Stitch Screen e663eda2b9c8451da1eda313f67c6352) */}
        <div className="mobile-options-stream">
          {rows.length ? (
            rows.map((row) => (
              <article key={row.id} className="option-mobile-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 800, background: "#f0edff", color: "#4338ca", padding: "2px 7px", borderRadius: "5px", border: "1px solid #e0e7ff" }}>
                    {row.code}
                  </span>
                  <span className={`badge ${row.active ? "active" : ""}`} style={{ fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "6px" }}>
                    {row.active ? "● Active" : "○ Inactive"}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
                    {row.name}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)" }}>
                    {tab === "profession" && row.categoryName && (
                      <span>Category: <strong style={{ color: "var(--ink)" }}>{row.categoryName}</strong></span>
                    )}
                    {tab === "company" && row.country && (
                      <span>Country: <strong style={{ color: "var(--ink)" }}>{row.country}</strong></span>
                    )}
                    {(tab === "category" || tab === "status") && (
                      <span>Display Order: <strong style={{ color: "var(--ink)" }}>#{row.sortOrder ?? 0}</strong></span>
                    )}
                  </div>
                  {row.description && (
                    <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                      {row.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "8px", marginTop: "4px" }}>
                  <button data-action-ui="secondary" data-action-size="normal"
                    type="button"
                    onClick={() => openEdit(row)}
                    style={{ ...buttonStyle, background: "#eef2ff", color: "#4338ca", height: "32px", fontSize: "11.5px" }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button  
                    type="button"
                    onClick={() => void toggle(row)}
                    style={{
                      ...buttonStyle,
                      background: row.active ? "#fff1f2" : "#ecfdf5",
                      color: row.active ? "#be123c" : "#047857",
                      height: "32px",
                      fontSize: "11.5px",
                    }}
                  >
                    {row.active ? <PowerOff size={13} /> : <Power size={13} />}
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid var(--line)", borderRadius: "14px", padding: "24px 16px", textAlign: "center", color: "#8b92a2", fontSize: "13px" }}>
              No {labels[tab].plural.toLowerCase()} configured.
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Dialog" className="operations-modal master-modal-overlay">
          <button className="operations-modal-backdrop" aria-label="Close" onClick={() => setModalOpen(false)} />
          <form className="master-modal-card master-modal-inline-card" onSubmit={save}>
            <header className="master-modal-header">
              <div><span>DIRECT CANDIDATE CONFIGURATION</span><h2>{editing ? "Edit" : "Add"} {labels[tab].singular}</h2><p>Active values appear immediately in the Create Candidate form.</p></div>
              <button data-action-ui="neutral" data-action-size="icon" aria-label="Close dialog" className="master-modal-close" type="button" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </header>
            <div className="operations-form">
              <label><span>Code</span><input name="code" required defaultValue={editing?.code ?? ""} placeholder="e.g. ELECTRICIAN" /></label>
              <label><span>Name</span><input name="name" required defaultValue={editing?.name ?? ""} placeholder={`Enter ${labels[tab].singular.toLowerCase()} name`} /></label>
              {tab === "profession" && (
                <label className="wide"><span>Work Category</span><select name="categoryId" required defaultValue={editing?.categoryId ?? ""}><option value="">Select category</option>{categories.filter((row) => row.active || row.id === editing?.categoryId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
              )}
              {tab === "company" && (
                <label className="wide"><span>Country</span><input name="country" required defaultValue={editing?.country ?? ""} placeholder="e.g. Saudi Arabia, Dubai, Qatar" /></label>
              )}
              {(tab === "category" || tab === "status") && (
                <label><span>Display Order</span><input name="sortOrder" type="number" min="0" defaultValue={editing?.sortOrder ?? 0} /></label>
              )}
              {tab !== "company" && (
                <label className="wide"><span>Description (Optional)</span><textarea name="description" defaultValue={editing?.description ?? ""} /></label>
              )}
            </div>
            <footer className="master-modal-footer"><button data-action-ui="neutral" data-action-size="normal" type="button" onClick={() => setModalOpen(false)}>Cancel</button><button data-action-ui="primary" data-action-size="normal" type="submit" className="primary master-modal-primary" disabled={saving}>{saving ? "Saving..." : "Save Option"}</button></footer>
          </form>
        </div>
      )}
    </div>
  );
}
