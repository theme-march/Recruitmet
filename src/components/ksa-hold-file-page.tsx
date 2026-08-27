"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Row = { id: string; holdId: string; fileNo: string; candidateNo: string; name: string; phone: string; passport: string; officer: string; profession: string; company: string; previousStatus: string; reason: string; holdAt: string; expectedRelease: string | null; owner: string; status: string };
type Data = { data: Row[]; filters: { users: Array<{ id: string; name: string }>; previousStatuses: string[]; professions: string[]; companies: string[] }; meta: { page: number; pageSize: number; total: number; totalPages: number } };
const empty = { passport: "", officer: "", holdFrom: "", holdTo: "", previousStatus: "", profession: "", company: "" };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "N/A";

export function KsaHoldFilePage({ country = "Saudi" }: { country?: string }) {
  const countryLabel = country === "Saudi" ? "Saudi Arabia" : country;
  const [filters, setFilters] = useState(empty);
  const [applied, setApplied] = useState(empty);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = useQuery({
    queryKey: ["ksa-hold-files", country, applied, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ country, page: String(page), pageSize: String(pageSize) });
      Object.entries(applied).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`/api/ksa/hold-files?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load hold files");
      return response.json() as Promise<Data>;
    },
  });
  const rows = query.data?.data ?? [];
  const choices = query.data?.filters;
  const meta = query.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  const set = (key: keyof typeof empty, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const options = (items: string[] = []) => items.map((value) => <option key={value} value={value}>{value}</option>);

  return <div className="ksa-hold-page">
    <header><h1>{countryLabel} Hold File</h1><div className="breadcrumb">Dashboard <span>–</span> {countryLabel} <span>–</span> Hold File</div></header>
    <section className="ksa-hold-card">
      <div className="ksa-hold-filters">
        <label>Passport No<input className="accent" placeholder="Passport number..." value={filters.passport} onChange={(event) => set("passport", event.target.value)} /></label>
        <label>Officer<select value={filters.officer} onChange={(event) => set("officer", event.target.value)}><option value="">Select Officer</option>{choices?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <fieldset><legend>Date range (Hold at)</legend><div><input aria-label="Hold date from" type="date" value={filters.holdFrom} onChange={(event) => set("holdFrom", event.target.value)} /><input aria-label="Hold date to" type="date" value={filters.holdTo} onChange={(event) => set("holdTo", event.target.value)} /></div></fieldset>
        <label>Previous Status<select value={filters.previousStatus} onChange={(event) => set("previousStatus", event.target.value)}><option value="">Select an option</option>{options(choices?.previousStatuses)}</select></label>
        <label>Profession<select value={filters.profession} onChange={(event) => set("profession", event.target.value)}><option value="">All professions</option>{options(choices?.professions)}</select></label>
        <label>Company<select value={filters.company} onChange={(event) => set("company", event.target.value)}><option value="">All companies</option>{options(choices?.companies)}</select></label>
        <div className="ksa-hold-actions"><button onClick={() => { setApplied(filters); setPage(1); }}>Apply</button><button onClick={() => { setFilters(empty); setApplied(empty); setPage(1); }}>Clear</button></div>
      </div>
      {query.isFetching && <div className="loading-line" />}{query.isError && <div className="form-error">Hold files could not be loaded.</div>}
      <div className="ksa-hold-summary"><span>Showing <b>{meta.total ? (page - 1) * pageSize + 1 : 0}</b> to <b>{Math.min(page * pageSize, meta.total)}</b> of <b>{meta.total}</b> Results</span><select aria-label="Results per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></div>
      <div className="ksa-hold-table"><table><thead><tr><th>SL.</th><th>Actions</th><th>Client Info</th><th>Passport</th><th>Previous Status</th><th>Profession</th><th>Company</th><th>Hold Reason</th><th>Hold At</th><th>Expected Release</th><th>Officer</th><th>Owner</th><th>Status</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.holdId}><td>{(page - 1) * pageSize + index + 1}</td><td><Link href={`/file/${row.id}`}>View</Link></td><td className="client-info"><b>{row.name}</b><span>{row.candidateNo}</span><span>{row.phone}</span></td><td>{row.passport}</td><td>{row.previousStatus}</td><td>{row.profession}</td><td>{row.company}</td><td>{row.reason}</td><td>{formatDate(row.holdAt)}</td><td>{formatDate(row.expectedRelease)}</td><td>{row.officer}</td><td>{row.owner}</td><td><span className="hold-badge">{row.status}</span></td></tr>)}{!rows.length && !query.isFetching && <tr><td className="table-empty" colSpan={13}>No data available in table</td></tr>}</tbody></table></div>
      <div className="ksa-hold-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><b>{page}</b><button disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div>
    </section>
  </div>;
}
