"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function FileTransition({ fileId, currentStage, stages }: { fileId: string; currentStage: string; stages: string[] }) {
  const current = Math.max(0, stages.indexOf(currentStage));
  const next = stages[current + 1];
  const [reason, setReason] = useState("Stage requirements reviewed and approved");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function advance() {
    if (!next) return;
    setSaving(true);
    const response = await fetch(`/api/files/${fileId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: next, reason }) });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { toast.error(body.error?.message ?? body.error ?? "Unable to advance file"); return; }
    toast.success(`File moved to ${next}`); router.refresh();
  }
  return <div className="transition-box"><div><span>CURRENT STAGE</span><b>{currentStage}</b></div><div className="transition-arrow">→</div><div><span>NEXT ALLOWED STAGE</span><b>{next || "Workflow complete"}</b></div><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mandatory transition reason" /><button className="button primary" onClick={advance} disabled={!next || saving}>{saving ? "Updating..." : next ? "Advance file" : "Completed"}</button></div>;
}
