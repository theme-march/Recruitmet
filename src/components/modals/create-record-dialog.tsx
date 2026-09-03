"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resourceFields, resourceForModule, type ModuleField } from "@/lib/module-ui";

function Control({ field }: { field: ModuleField }) {
  if (field.type === "textarea") return <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={3} />;
  if (field.type === "select") return <select name={field.name} required={field.required}><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>;
  return <input name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} />;
}

export { resourceForModule } from "@/lib/module-ui";

export function CreateRecordDialog({ moduleId, tab, onClose, onSaved }: { moduleId: string; tab: string; onClose: () => void; onSaved?: () => void }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const resource = resourceForModule(moduleId, tab);
  const fields = resourceFields[resource];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = resource === "demand" ? "/api/demands" : resource === "tutorial" ? "/api/tutorials" : "/api/records";
    const payload = resource === "demand" || resource === "tutorial" ? data : { resource, data: { ...data, module: moduleId, page: tab } };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) { toast.error(body.error?.message || body.error || "Could not save"); return; }
    toast.success(`${tab} record saved`);
    router.refresh();
    onSaved?.();
    onClose();
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><div><span>CREATE RECORD</span><h2>New {tab}</h2></div><button type="button" className="icon" onClick={onClose}><X /></button></div>
      <div className="modal-grid">{fields.map((field) => <label key={field.name} className={field.wide ? "wide" : undefined}>{field.label}<Control field={field} /></label>)}</div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving..." : "Save record"}</button></div>
    </form>
  </div>;
}
