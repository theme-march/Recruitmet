"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { stageFields } from "@/lib/stage-ui";

export function StageRecordDialog({ moduleId, tab, onClose, onSaved }: { moduleId: string; tab: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const fields = stageFields[tab] ?? stageFields["Pre Confirm File"];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const body = new FormData(event.currentTarget); body.set("module", moduleId); body.set("stage", tab);
    const response = await fetch("/api/stage-records", { method: "POST", body });
    const result = await response.json(); setSaving(false);
    if (!response.ok) { toast.error(result.error?.message ?? result.error ?? "Unable to save stage record"); return; }
    toast.success(`${tab} record saved`); onSaved(); onClose();
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal stage-modal" onSubmit={submit}><div className="modal-head"><div><span>CREATE {tab.toUpperCase()} RECORD</span><h2>New {tab}</h2><p>Fields are specific to the {tab} workflow stage.</p></div><button type="button" className="icon" onClick={onClose}><X /></button></div><div className="modal-grid">{fields.map((field) => <label key={field.name} className={`${field.wide ? "field-wide" : ""} ${field.type === "checkbox" ? "checkbox-field" : ""}`}>{field.type === "checkbox" ? <><input name={field.name} type="checkbox" value="true" /> {field.label}</> : <>{field.label}{field.type === "select" ? <select name={field.name} required={field.required}><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "textarea" ? <textarea name={field.name} placeholder={field.placeholder} required={field.required} /> : <input name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} accept={field.type === "file" ? ".pdf,.jpg,.jpeg,.png,.webp" : undefined} />}</>}</label>)}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving..." : `Save ${tab}`}</button></div></form></div>;
}
