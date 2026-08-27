"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

type ReportData = { type: "total" | "daily"; country: string; snapshot: string; from: string; to: string; events: Array<{ event: string; count: number }> };

export function KsaEventsReportPage({ type }: { type: "total" | "daily" }) {
  const [country, setCountry] = useState("Saudi"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [applied, setApplied] = useState({ from: "", to: "" });
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("country"); if (requested) setCountry(requested); }, []);
  const query = useQuery({ queryKey: ["country-events-report", type, country, applied], queryFn: async () => {
    const params = new URLSearchParams({ type, country }); if (applied.from) params.set("from", applied.from); if (applied.to) params.set("to", applied.to);
    const response = await fetch(`/api/ksa/events-report?${params}`, { cache: "no-store" }); if (!response.ok) throw new Error("Could not load country events report"); return (await response.json()).data as ReportData;
  } });
  const data = query.data; const countryLabel = country === "Saudi" ? "Saudi Arabia" : country; const countryModule = country === "Saudi" ? "ksa" : country === "Dubai" ? "dubai" : "other-country";
  const title = type === "total" ? `${country === "Saudi" ? "KSA" : countryLabel} Total Events Report` : `${countryLabel} Daily Report`;
  const snapshot = data ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(data.snapshot)) : "Loading...";
  const download = () => { if (!data) return; const csv = ["EVENT,COUNT", ...data.events.map((row) => `"${row.event.replaceAll('"', '""')}",${row.count}`)].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${countryModule}-${type === "total" ? "total-events" : "daily-report"}.csv`; anchor.click(); URL.revokeObjectURL(url); };
  return <div className="ksa-events-report-page">
    <header><div><h1>{title}</h1><div className="breadcrumb">Dashboard / {title}</div></div><Link href={`/module/${countryModule}/passport-list`}>All Passport List</Link></header>
    <section className="ksa-events-card">
      <div className="events-report-controls"><label>Country<select value={country} onChange={(event)=>setCountry(event.target.value)}><option value="Saudi">Saudi Arabia</option><option value="Dubai">Dubai</option><option value="Other Country">Other Country</option></select></label>{type === "daily" && <div className="events-date-filter"><label>Report Date Range<div><input aria-label="Report from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><span>–</span><input aria-label="Report to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></label><button onClick={() => setApplied({ from, to })}>Apply</button><button className="clear" onClick={() => { setFrom(""); setTo(""); setApplied({ from: "", to: "" }); }}>Clear</button></div>}</div>
      <div className="events-actions"><button onClick={download}>Download CSV</button><button onClick={() => window.print()}>Print</button></div>
      {query.isFetching && <div className="loading-line" />}{query.isError && <div className="form-error">Report data could not be loaded.</div>}
      {data && <><div className="events-snapshot"><b>Country:</b> {data.country}<br /><b>{type === "total" ? "Pipeline Snapshot" : "Today Activity Summary"}:</b> {snapshot}</div><div className="events-table"><table><thead><tr><th>EVENT</th><th>COUNT</th></tr></thead><tbody>{data.events.map((row) => <tr key={row.event}><td>{row.event}</td><td>{row.count}</td></tr>)}</tbody></table></div></>}
    </section>
  </div>;
}
