"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StageRecordDialog } from "@/components/stage-record-dialog";
import { stageFilterFields, stageTableHeadings, type StageFilterField } from "@/lib/stage-ui";

type Row = { id: string; dbId: string; name: string; phone: string; passport: string; country: string; stage: string; owner: string; status: string; actionUrl?: string };
type Data = { data: Row[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
const fallbackFilters: StageFilterField[] = [
  { name: "identity", label: "Passport / client / phone", placeholder: "Search candidate" },
  { name: "officer", label: "Responsible officer", placeholder: "Officer name" },
  { name: "entryFrom", label: "Entry date from", type: "date" },
  { name: "entryTo", label: "Entry date to", type: "date" },
];
const defaultColumns = ["FILE / CANDIDATE", "CONTACT", "PASSPORT", "DESTINATION", "CURRENT STAGE", "OFFICER"];

export function DubaiWorkflowPage({ stage }: { stage: string }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [creating, setCreating] = useState(false);
  const filterFields = stageFilterFields[stage] ?? fallbackFilters;
  const columns = stageTableHeadings[stage] ?? (stage === "Passport List" ? stageTableHeadings["Passport Entry"] : defaultColumns);
  const dialogStage = stage === "Passport List" ? "Passport Entry" : stage;
  const query = useQuery({
    queryKey: ["dubai-workflow", stage, applied, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ module: "dubai", tab: stage, page: String(page), pageSize: String(pageSize) });
      Object.entries(applied).forEach(([key, value]) => { if (value) params.set(key === "identity" ? "q" : key, value); });
      const response = await fetch(`/api/module-data?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load Dubai ${stage} records`);
      return response.json() as Promise<Data>;
    },
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  const values = (row: Row) => [row.name, row.phone, row.passport, row.country, row.stage, row.owner];
  const clear = () => { setFilters({}); setApplied({}); setPage(1); };

  return <div className="dubai-workflow-page">
    {creating && <StageRecordDialog moduleId="dubai" tab={dialogStage} onClose={() => setCreating(false)} onSaved={() => void query.refetch()} />}
    <header><div className="breadcrumb">Dashboard / Dubai / {stage}</div><h1>Dubai {stage}</h1></header>
    <section className="dubai-workflow-card">
      <div className="dubai-stage-filters">{filterFields.map((field, index) => <FilterField key={field.name} field={field} accent={index === 0} value={filters[field.name] ?? ""} onChange={(value) => setFilters((current) => ({ ...current, [field.name]: value }))} />)}
        <div className="dubai-filter-actions"><button onClick={() => { setApplied(filters); setPage(1); }}>Apply</button><button onClick={clear}>Clear</button></div>
      </div>
      <div className="dubai-stage-actions"><button onClick={() => setCreating(true)}><Plus size={16} />Add New</button><button onClick={() => window.print()}><Printer size={16} />Print</button><button onClick={() => { location.href = `/api/export?module=dubai&tab=${encodeURIComponent(stage)}`; }}><Download size={16} />Export CSV</button></div>
      {query.isFetching && <div className="loading-line" />}{query.isError && <div className="form-error">Dubai {stage} records could not be loaded.</div>}
      <div className="dubai-result-summary"><span>Showing <b>{meta.total ? (page - 1) * pageSize + 1 : 0}</b> to <b>{Math.min(page * pageSize, meta.total)}</b> of <b>{meta.total}</b> Results</span><select aria-label="Results per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></div>
      <div className="dubai-stage-table"><table><thead><tr><th>SL.</th><th>Actions</th>{columns.map((column) => <th key={column}>{column}</th>)}<th>STATUS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.dbId}><td>{(page - 1) * pageSize + index + 1}</td><td><Link href={row.actionUrl ?? `/file/${row.dbId}`}>Actions</Link></td>{values(row).map((value, valueIndex) => <td key={valueIndex}>{valueIndex === 0 ? <div className="dubai-client"><b>{value}</b><span>{row.id}</span></div> : value}</td>)}<td><span className={`dubai-status ${/done|paid|active|ready|approved|verified/i.test(row.status) ? "good" : ""}`}>{row.status}</span></td></tr>)}{!rows.length && !query.isFetching && <tr><td className="table-empty" colSpan={10}>No data available in table</td></tr>}</tbody></table></div>
      <div className="dubai-stage-pagination"><button disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><b>{page}</b><button disabled={page >= meta.totalPages || query.isFetching} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div>
    </section>
  </div>;
}

function FilterField({ field, value, accent, onChange }: { field: StageFilterField; value: string; accent: boolean; onChange: (value: string) => void }) {
  return <label><span>{field.label}</span>{field.type === "select" ? <select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input className={accent ? "accent" : ""} type={field.type ?? "text"} placeholder={field.placeholder} value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}
