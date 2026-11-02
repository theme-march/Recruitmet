"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  CirclePlay,
  ExternalLink,
  Folder,
  Layers,
  PlaySquare,
  Search,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { moduleItemPath } from "@/lib/modules";

type CategoryRow = {
  id: string;
  code: string;
  name: string;
  tutorials: number;
  order: number;
};

type TutorialRow = {
  id: string;
  category: string;
  title: string;
  linkType: string;
  resourceUrl: string;
  order: number;
  language: string;
  audience: string | null;
  durationMin: number | null;
};

type ResponseData = {
  data: Array<CategoryRow | TutorialRow>;
  filters?: { categories: Array<{ id: string; name: string }> };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export function TutorialLibraryPage({ mode }: { mode: "categories" | "tutorials" }) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const isCategories = mode === "categories";

  const result = useQuery({
    queryKey: ["tutorial-library", mode, applied, categoryId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: mode,
        q: applied,
        categoryId,
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/tutorials?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load tutorials");
      return response.json() as Promise<ResponseData>;
    },
    placeholderData: (previousData) => previousData,
  });

  const data = result.data?.data ?? [];
  const meta = result.data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  const categoriesList = result.data?.filters?.categories ?? [];

  const clear = () => {
    setQuery("");
    setApplied("");
    setCategoryId("");
    setPage(1);
  };

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setApplied(query.trim());
    setPage(1);
  };

  return (
    <div className="tutorial-page country-design-page management-design-page">
      <div className="country-design-breadcrumb">Dashboard / Tutorials / {isCategories ? "Tutorial Categories" : "Tutorials"}</div>
      <header className="country-design-heading"><div><h1>{isCategories ? "Tutorial Categories" : "Tutorials & Training Guides"}</h1><p>{isCategories ? "Manage documentation groupings and tutorial sections for agency operations." : "Step-by-step operating videos, manuals, and onboarding materials for staff."}</p></div></header>
      <section className="country-design-metrics management-metrics-three">
        <article className="country-design-metric"><div><span>{isCategories ? "Total Categories" : "Total Tutorials"}</span><BookOpen size={16} color="#007aff" /></div><b>{meta.total}</b><p>Published materials</p></article>
        <article className="country-design-metric"><div><span>Operational Sections</span><Layers size={16} color="#6855e8" /></div><b>{isCategories ? meta.total : categoriesList.length || 1}</b><p>Active departments</p></article>
        <article className="country-design-metric management-text-metric"><div><span>Training Status</span><PlaySquare size={16} color="#28c653" /></div><b>Live Online</b><p>Verified access</p></article>
      </section>
      <section className="country-design-workspace">
        <nav className="country-design-tabs management-tabs" aria-label="Tutorial sections">
          <Link href={moduleItemPath("tutorials", "Tutorial Categories")} aria-current={isCategories ? "page" : undefined}><Folder size={13} /> Categories</Link>
          <Link href={moduleItemPath("tutorials", "Tutorials")} aria-current={!isCategories ? "page" : undefined}><Video size={13} /> All Tutorials</Link>
        </nav>
        <form onSubmit={apply} className="country-design-filters">
          <div className="country-design-filter-fields">
            <label className="country-design-search"><Search size={13} /><input aria-label="Search tutorials" value={query} onChange={e => setQuery(e.target.value)} placeholder={isCategories ? "Search category name, code..." : "Search tutorial title, category..."} /></label>
            {!isCategories && <label className="country-design-select"><select aria-label="Tutorial category" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}><option value="">All Categories</option>{categoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={10} /></label>}
            <button data-action-ui="primary" data-action-size="normal" className="management-filter-button" type="submit">Filter</button><button data-action-ui="neutral" data-action-size="normal" className="management-filter-button" type="button" onClick={clear}>Clear</button>
          </div>
          <label className="country-design-page-size">Per Page: <span className="country-design-select"><select aria-label="Tutorials per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select><ChevronDown size={10} /></span></label>
        </form>
        <div className="country-design-count" aria-live="polite">Showing {meta.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, meta.total)} of {meta.total} Total {isCategories ? "Tutorial Categories" : "Tutorials"}</div>
        {result.isError && <div className="form-error">Tutorial records could not be loaded.</div>}
        <div className="country-design-table management-table tutorial-design-table" aria-busy={result.isFetching}>
          <table><thead><tr><th>SL</th>{isCategories ? <><th>Category Name</th><th>Total Tutorials</th><th>Sort Order</th></> : <><th>Category</th><th>Title</th><th>Link Type</th><th>Resource Link</th><th>Order</th></>}</tr></thead>
            <tbody>{isCategories ? (data as CategoryRow[]).map((row,index) => <tr key={row.id}><td>{(page-1)*pageSize+index+1}</td><td><div className="country-design-cell client"><b>{row.name}</b><small>Code: {row.code}</small></div></td><td><span className="country-design-candidate-id">{row.tutorials} Tutorials</span></td><td>#{row.order}</td></tr>) : (data as TutorialRow[]).map((row,index) => <tr key={row.id}><td>{(page-1)*pageSize+index+1}</td><td><span className="country-design-candidate-id">{row.category}</span></td><td><div className="country-design-cell client"><b>{row.title}</b>{row.language && <small>Language: {row.language} {row.durationMin ? `· ${row.durationMin} mins` : ""}</small>}</div></td><td>{row.linkType}</td><td><ResourceLink row={row} /></td><td>#{row.order}</td></tr>)}
            {!data.length && !result.isFetching && <tr><td colSpan={isCategories ? 4 : 6} className="management-empty">No tutorial records found.</td></tr>}</tbody>
          </table>
        </div>
        <footer className="country-design-pagination"><span>{meta.total} Total {isCategories ? "Tutorial Categories" : "Tutorials"}</span><div><button data-action-ui="neutral" data-action-size="normal" disabled={page <= 1} onClick={() => setPage(page-1)}>← Previous</button><span>Page {page} of {meta.totalPages}</span><button data-action-ui="neutral" data-action-size="normal" disabled={page >= meta.totalPages} onClick={() => setPage(page+1)}>Next →</button></div></footer>
      </section>
    </div>
  );
}

function ResourceLink({ row }: { row: TutorialRow }) {
  const drive = /drive|google/i.test(row.linkType) || /drive\.google/i.test(row.resourceUrl);
  const youtube = /youtube|video/i.test(row.linkType) || /youtu/i.test(row.resourceUrl);

  return (
    <a data-action-ui="secondary" data-action-size="normal"
      href={row.resourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="country-design-dossier management-resource-link"
    >
      {drive ? <Folder size={14} /> : youtube ? <CirclePlay size={14} /> : <ExternalLink size={14} />}
      {drive ? "Open Drive" : youtube ? "Watch on YouTube" : "Open Resource"}
    </a>
  );
}
