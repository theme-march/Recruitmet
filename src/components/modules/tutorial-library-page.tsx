"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  ExternalLink,
  Folder,
  Layers,
  PlaySquare,
  Plus,
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
    <div className="tutorial-page" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="breadcrumb" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Dashboard / Tutorials / {isCategories ? "Tutorial Categories" : "Tutorials"}
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)", margin: "4px 0" }}>
            {isCategories ? "Tutorial Categories" : "Tutorials & Training Guides"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            {isCategories
              ? "Manage documentation groupings and tutorial sections for agency operations."
              : "Step-by-step operating videos, manuals, and onboarding materials for staff."}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link
            prefetch={true}
            href={moduleItemPath("tutorials", "Tutorial Categories")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "2px solid",
              borderColor: isCategories ? "#7258e8" : "var(--line)",
              background: isCategories ? "#7258e8" : "#fff",
              color: isCategories ? "#fff" : "var(--ink)",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: isCategories ? "0 2px 8px rgba(114,88,232,0.25)" : "none",
            }}
          >
            <Folder size={15} /> Categories
          </Link>

          <Link
            prefetch={true}
            href={moduleItemPath("tutorials", "Tutorials")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "2px solid",
              borderColor: !isCategories ? "#7258e8" : "var(--line)",
              background: !isCategories ? "#7258e8" : "#fff",
              color: !isCategories ? "#fff" : "var(--ink)",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: !isCategories ? "0 2px 8px rgba(114,88,232,0.25)" : "none",
            }}
          >
            <Video size={15} /> All Tutorials
          </Link>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#f0edff", color: "#7258e8" }}>
            <BookOpen size={20} />
          </div>
          <div>
            <small style={labelStyle}>{isCategories ? "Total Categories" : "Total Tutorials"}</small>
            <strong style={valueStyle}>{meta.total}</strong>
            <span style={{ fontSize: "11px", color: "#7258e8", fontWeight: 700 }}>Published materials</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#ecfdf5", color: "#10b981" }}>
            <Layers size={20} />
          </div>
          <div>
            <small style={labelStyle}>Operational Sections</small>
            <strong style={valueStyle}>{isCategories ? meta.total : categoriesList.length || 1}</strong>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>Active departments</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...iconStyle, background: "#eff6ff", color: "#3b82f6" }}>
            <CirclePlay size={20} />
          </div>
          <div>
            <small style={labelStyle}>Training Status</small>
            <strong style={valueStyle}>Live Online</strong>
            <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700 }}>Verified access</span>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "18px 22px", marginBottom: "18px", boxShadow: "var(--shadow)" }}>
        <form onSubmit={apply} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          {!isCategories && (
            <label style={filterLabelStyle}>
              Filter by Category
              <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} style={inputStyle}>
                <option value="">All Categories</option>
                {categoriesList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={filterLabelStyle}>
            {isCategories ? "Search Category Name" : "Search Title or Keywords"}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isCategories ? "Search category name..." : "Search title or keyword..."}
              style={inputStyle}
            />
          </label>

          <label style={filterLabelStyle}>
            Per Page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={inputStyle}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 22px",
                height: "40px",
                borderRadius: "10px",
                background: "#7258e8",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(114,88,232,0.25)",
              }}
            >
              <Search size={15} /> Filter
            </button>
            <button
              type="button"
              onClick={clear}
              style={{
                padding: "0 16px",
                height: "40px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {/* Main Table Section */}
      <section
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "18px 22px",
          boxShadow: "var(--shadow)",
          position: "relative",
          minHeight: "360px",
        }}
      >
        {result.isFetching && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #7258e8, #a855f7, #7258e8)",
              backgroundSize: "200% 100%",
              animation: "loading-bar 1s infinite linear",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              zIndex: 10,
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
            Showing <b>{result.data?.data.length ?? 0}</b> of <b>{meta.total}</b> result(s)
          </span>
        </div>

        {result.isError && <div className="form-error">Tutorial records could not be loaded.</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 14px", width: "60px" }}>SL</th>
                {isCategories ? (
                  <>
                    <th style={{ padding: "12px 14px" }}>Category Name</th>
                    <th style={{ padding: "12px 14px" }}>Total Tutorials</th>
                    <th style={{ padding: "12px 14px" }}>Sort Order</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: "12px 14px" }}>Category</th>
                    <th style={{ padding: "12px 14px" }}>Title</th>
                    <th style={{ padding: "12px 14px" }}>Link Type</th>
                    <th style={{ padding: "12px 14px" }}>Resource Link</th>
                    <th style={{ padding: "12px 14px" }}>Order</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody style={{ opacity: result.isFetching ? 0.75 : 1, transition: "opacity 0.15s ease" }}>
              {isCategories ? (
                (data as CategoryRow[]).map((row, index) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Folder size={16} color="#7258e8" />
                        {row.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Code: {row.code}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: "#f0edff",
                          color: "#7258e8",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        <Video size={13} /> {row.tutorials} Tutorials
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)" }}>
                      #{row.order}
                    </td>
                  </tr>
                ))
              ) : (
                (data as TutorialRow[]).map((row, index) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fcfaff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 14px", color: "var(--muted)", fontWeight: 600 }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "#f1f5f9",
                          color: "var(--ink)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 800, color: "var(--ink)" }}>{row.title}</div>
                      {row.language && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          Language: {row.language} {row.durationMin ? `· ${row.durationMin} mins` : ""}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
                        {row.linkType}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <ResourceLink row={row} />
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--muted)" }}>
                      #{row.order}
                    </td>
                  </tr>
                ))
              )}

              {!data.length && !result.isFetching && (
                <tr>
                  <td colSpan={isCategories ? 4 : 6} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                    No tutorial records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: page <= 1 ? "#fafafd" : "#fff",
              color: page <= 1 ? "var(--muted)" : "var(--ink)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "12px", fontWeight: 700, padding: "0 8px" }}>
            Page {page} of {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: page >= meta.totalPages ? "#fafafd" : "#fff",
              color: page >= meta.totalPages ? "var(--muted)" : "var(--ink)",
              cursor: page >= meta.totalPages ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function ResourceLink({ row }: { row: TutorialRow }) {
  const drive = /drive|google/i.test(row.linkType) || /drive\.google/i.test(row.resourceUrl);
  const youtube = /youtube|video/i.test(row.linkType) || /youtu/i.test(row.resourceUrl);

  return (
    <a
      href={row.resourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "8px",
        fontSize: "11px",
        fontWeight: 700,
        textDecoration: "none",
        background: drive ? "#f0edff" : youtube ? "#fee2e2" : "#eff6ff",
        color: drive ? "#7258e8" : youtube ? "#dc2626" : "#2563eb",
        border: `1px solid ${drive ? "#dcd5fb" : youtube ? "#fecaca" : "#bfdbfe"}`,
      }}
    >
      {drive ? <Folder size={14} /> : youtube ? <CirclePlay size={14} /> : <ExternalLink size={14} />}
      {drive ? "Open Drive" : youtube ? "Watch on YouTube" : "Open Resource"}
    </a>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: "14px",
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  boxShadow: "var(--shadow)",
};

const iconStyle: React.CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--muted)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  display: "block",
};

const valueStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "var(--ink)",
  display: "block",
  margin: "2px 0",
};

const filterLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--ink)",
};

const inputStyle: React.CSSProperties = {
  height: "40px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid var(--line)",
  background: "#fafafd",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
};
