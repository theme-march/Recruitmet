"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Columns3, Download, Eye, Filter, MoreHorizontal, Plus, Printer, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateRecordDialog } from "@/components/modals/create-record-dialog";
import { StageRecordDialog } from "@/components/modals/stage-record-dialog";
import { moduleFilterFields, type ModuleField } from "@/lib/module-ui";
import { getModule } from "@/lib/modules";
import { stageFilterFields, stageTableHeadings } from "@/lib/stage-ui";

export type ModuleRow = { id: string; dbId: string; name: string; phone: string; passport: string; country: string; stage: string; owner: string; status: string; actionUrl?: string };
type ApiPage = { data: ModuleRow[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };

const headings: Record<string, string[]> = {
  "call-center": ["LEAD / PERSON", "PHONE", "PURPOSE", "COUNTRY", "FOLLOW-UP / STATUS", "OFFICER"],
  registration: ["CANDIDATE", "PHONE", "PASSPORT", "DESTINATION", "INTERVIEW", "PROFESSION"],
  accounts: ["PAYMENT / CLIENT", "AMOUNT", "METHOD", "CURRENCY", "PAYMENT TYPE", "COLLECTOR"],
  documents: ["DOCUMENT / CLIENT", "TYPE", "NUMBER", "COUNTRY", "EXPIRY / VERSION", "VERIFIED BY"],
  flights: ["FLIGHT / AIRLINE", "PASSENGERS", "PNR", "DESTINATION", "DEPARTURE", "AIRPORT"],
  partners: ["DEMAND / WORK", "CAPACITY", "PROFESSION", "COUNTRY", "COMPANY", "DEADLINE"],
  tutorials: ["TUTORIAL", "TYPE", "LANGUAGE", "AUDIENCE", "CATEGORY", "DURATION"],
  notifications: ["NOTIFICATION", "CHANNEL", "TYPE", "PRIORITY", "SCHEDULED", "RECIPIENT"],
};
const tabHeadings: Record<string, string[]> = {
  Interview: ["INTERVIEW", "CAPACITY", "COMPANY", "PROFESSION", "SCHEDULE", "INTERVIEWER"],
  "Interview Schedule": ["INTERVIEW", "CAPACITY", "COMPANY", "PROFESSION", "SCHEDULE", "INTERVIEWER"],
  "Upcoming Interview": ["INTERVIEW", "CAPACITY", "COMPANY", "PROFESSION", "SCHEDULE", "INTERVIEWER"],
};

const defaultFilters: ModuleField[] = [
  { name: "identity", label: "Passport / ID / name / phone" }, { name: "country", label: "Country" },
  { name: "recordStatus", label: "Record status", type: "select", options: ["ACTIVE", "PENDING", "COMPLETED", "HOLD", "RETURNED", "EXPIRED"] },
  { name: "entryFrom", label: "Created from", type: "date" }, { name: "entryTo", label: "Created to", type: "date" },
];

function FilterControl({ field, value, onChange }: { field: ModuleField; value: string; onChange: (value: string) => void }) {
  if (field.type === "select") return <select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>;
  return <input type={field.type ?? "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} />;
}

export function ModuleView({ moduleId, initialTab, people, total }: { moduleId: string; initialTab: string; people: ModuleRow[]; total: number }) {
  const mod = getModule(moduleId);
  const tab = initialTab;
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [creating, setCreating] = useState(false);
  const placeholder: ApiPage = { data: people, meta: { page: 1, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) } };
  const query = useQuery({
    queryKey: ["module-data", moduleId, tab, page, pageSize, search, appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ module: moduleId, tab, page: String(page), pageSize: String(pageSize) });
      if (search) params.set("q", search);
      Object.entries(appliedFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const response = await fetch(`/api/module-data?${params}`);
      if (!response.ok) throw new Error("Could not load records");
      return response.json() as Promise<ApiPage>;
    },
    placeholderData: (previous) => previous ?? placeholder,
  });
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? placeholder.meta;
  if (!mod) return <div>Module not found</div>;
  const countryWorkflow = ["ksa", "dubai", "other-country"].includes(moduleId);
  const filterFields = stageFilterFields[tab] ?? moduleFilterFields[moduleId] ?? defaultFilters;
  const labels = stageTableHeadings[tab] ?? tabHeadings[tab] ?? headings[moduleId] ?? ["FILE / CANDIDATE", "CONTACT", "PASSPORT", "DESTINATION", "CURRENT STAGE", "OWNER"];
  const active = rows.filter((row) => ["ACTIVE", "Active", "VERIFIED", "Published", "Sent"].includes(row.status)).length;
  const pending = rows.filter((row) => /pending|overdue|due|draft/i.test(row.status)).length;
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;
  const commitSearch = () => { setPage(1); setSearch(q.trim()); };
  const applyFilters = () => { setPage(1); setAppliedFilters(filterValues); const identity = filterValues.identity?.trim(); if (identity) { setQ(identity); setSearch(identity); } };
  const clearFilters = () => { setQ(""); setSearch(""); setFilterValues({}); setAppliedFilters({}); setPage(1); };

  return <>
    {creating && (countryWorkflow ? <StageRecordDialog moduleId={moduleId} tab={tab} onClose={() => setCreating(false)} onSaved={() => void query.refetch()} /> : <CreateRecordDialog moduleId={moduleId} tab={tab} onClose={() => setCreating(false)} onSaved={() => void query.refetch()} />)}
    <div className="page-head compact"><div><div className="breadcrumb">Operations <ChevronRight size={13} /> {mod.label}</div><h1>{tab}</h1><p>Live, permission-scoped MySQL records for this operational queue.</p></div><div className="head-actions"><button className="button secondary" onClick={() => window.print()}><Printer size={16} />Print</button><button className="button secondary" onClick={() => location.href = `/api/export?module=${moduleId}&tab=${encodeURIComponent(tab)}`}><Download size={16} />Export CSV</button><button className="button primary" onClick={() => setCreating(true)}><Plus size={17} />Add new</button></div></div>
    <section className="module-summary"><div><span>Total records</span><b>{meta.total}</b><small>{tab} queue</small></div><div><span>Active on page</span><b>{active}</b><small>Currently processing</small></div><div><span>Pending on page</span><b>{pending}</b><small>Requires attention</small></div><div><span>Countries on page</span><b>{new Set(rows.map((row) => row.country).filter((value) => value !== "—")).size}</b><small>Current result set</small></div></section>
    <section className="card records"><div className="record-toolbar"><form className="record-search" onSubmit={(event) => { event.preventDefault(); commitSearch(); }}><Search size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search ID, name, phone, passport or reference..." /></form><button className={`button secondary ${filtersOpen ? "selected" : ""}`} onClick={() => setFiltersOpen((value) => !value)}><Filter size={16} />Filters {activeFilterCount > 0 && <i>{activeFilterCount}</i>}</button><button className="button secondary"><Columns3 size={16} />Columns</button><button className="button secondary" onClick={() => location.href = "/api/imports/candidates/sample"}><Upload size={16} />Sample CSV</button></div>
      {filtersOpen && <form className="advanced-filter" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>{filterFields.map((field) => <label key={field.name}>{field.label}<FilterControl field={field} value={filterValues[field.name] ?? ""} onChange={(value) => setFilterValues((current) => ({ ...current, [field.name]: value }))} /></label>)}<div className="filter-actions"><button className="button primary">Apply filters</button><button type="button" className="button secondary" onClick={clearFilters}>Clear</button></div></form>}
      {query.isFetching && <div className="loading-line" />}{query.isError && <div className="form-error">Unable to load this queue. Check permission or retry.</div>}
      <div className="table-wrap"><table><thead><tr><th><input type="checkbox" /></th>{labels.map((label) => <th key={label}>{label}</th>)}<th>STATUS</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={`${row.id}-${row.dbId}`}><td><input type="checkbox" /></td><td><div className="person"><span>{row.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><b>{row.name}</b><small>{row.id}</small></div></div></td><td>{row.phone}</td><td><b>{row.passport}</b></td><td>{row.country}</td><td><em className="stage">{row.stage}</em></td><td>{row.owner}</td><td><em className={`badge ${row.status.toLowerCase().replaceAll(" ", "-")}`}>{row.status}</em></td><td>{(row.actionUrl || ["files", "ksa", "dubai", "other-country", "accounts", "documents"].includes(moduleId)) && <Link className="icon" title="Open details" href={row.actionUrl ?? `/file/${row.dbId}`}><Eye size={17} /></Link>}<button className="icon"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table>{!rows.length && !query.isFetching && <div className="empty-state"><Search size={28} /><b>No records in this queue</b><span>Change filters or add the first record.</span></div>}</div>
      <div className="pagination"><span>Showing {meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0} to {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} records</span><div><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option><option value="100">100 / page</option></select><button disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><button className="current">{page}</button><button disabled={page >= meta.totalPages || query.isFetching} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div></div>
    </section>
  </>;
}
