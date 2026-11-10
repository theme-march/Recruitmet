"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BookMarked,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Layers,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  User,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type HandoverItem = {
  id: string;
  candidateId: string;
  candidateNo: string;
  candidateName: string;
  passportNumber: string;
  expectedReturn?: string | null;
  takenReason?: string | null;
  returnDate?: string | null;
  status: "PENDING" | "COLLECTED" | "REJECTED_OR_LOST" | "PERMANENT";
  returnedAt?: string | null;
  returnRemarks?: string | null;
};

type HandoverRecord = {
  id: string;
  handoverNo: string;
  handoverType: "SINGLE" | "GROUP";
  handoverMode: "TEMPORARY" | "PERMANENT";
  typeLabel: string;
  takerName: string;
  takerPhone: string;
  takerDesignation?: string | null;
  takenAt: string;
  expectedReturn?: string | null;
  takenReason?: string | null;
  returnDate?: string | null;
  status: "HANDED_OVER" | "PARTIALLY_COLLECTED" | "COLLECTED" | "PERMANENT" | "CANCELLED";
  passportsSummary: string;
  counts: {
    total: number;
    collected: number;
    rejected: number;
    pending: number;
    permanent: number;
  };
  items: HandoverItem[];
  createdAt: string;
};

type Metrics = {
  total: number;
  handedOver: number;
  partiallyCollected: number;
  collected: number;
  permanent: number;
};

type CandidateSearchResult = {
  candidateId: string;
  candidateNo: string;
  fullName: string;
  phone: string;
  passportNumber: string;
  country: string;
  isHandedOut: boolean;
  activeHandover?: {
    handoverNo: string;
    takerName: string;
    takerPhone: string;
    takenAt: string;
  } | null;
};

export function PassportHandoverPage() {
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    handedOver: 0,
    partiallyCollected: 0,
    collected: 0,
    permanent: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewHandover, setViewHandover] = useState<HandoverRecord | null>(null);
  const [collectHandover, setCollectHandover] = useState<HandoverRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch handovers
  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/passport-handover?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load records");
      const json = await res.json();
      setHandovers(json.data || []);
      setTotalCount(json.meta?.total || 0);
      if (json.metrics) {
        setMetrics(json.metrics);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load handovers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, [search, statusFilter, page, pageSize]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setStatusFilter("ALL");
    setModeFilter("");
    setPage(1);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this handover record?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/passport-handover/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      toast.success("Handover record deleted");
      fetchHandovers();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // CSV Export matching project standard
  const downloadCsv = () => {
    if (handovers.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    const headers = [
      "SL",
      "Handover No",
      "Type",
      "Mode",
      "Taker Name",
      "Taker Phone",
      "Taken At",
      "Expected Return",
      "Passports Summary",
      "Status",
      "Created At",
    ];
    const escape = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = handovers.map((h, i) => [
      i + 1,
      h.handoverNo,
      h.handoverType,
      h.handoverMode,
      h.takerName,
      h.takerPhone,
      formatDate(h.takenAt),
      formatDate(h.expectedReturn),
      h.passportsSummary,
      h.status,
      formatDateTime(h.createdAt),
    ]);
    const csvContent = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `passport-handovers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} - ${timeFormatted}`;
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Filter tabs
  const statusTabs = [
    { id: "ALL", label: "All Statuses", icon: "🌐" },
    { id: "HANDED_OVER", label: "Handed Over", icon: "⏳" },
    { id: "PARTIALLY_COLLECTED", label: "Partially Collected", icon: "🔄" },
    { id: "COLLECTED", label: "Collected", icon: "✅" },
    { id: "PERMANENT", label: "Permanent", icon: "🔒" },
  ];

  return (
    <div className="country-design-page directory-design-page" aria-busy={loading}>
      {/* 1. Standard Breadcrumb */}
      <nav className="country-design-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link> / Passport Handover
      </nav>

      {/* 2. Standard Page Header */}
      <header className="country-design-heading">
        <div>
          <h1>Passport Handover</h1>
          <p>Central tracking for physical passport dispatches, agency riders, and return collections.</p>
        </div>
        <div className="country-design-actions directory-design-actions">
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={downloadCsv}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            data-action-ui="primary"
            data-action-size="normal"
            type="button"
            className="directory-design-create"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={14} /> Create Handover
          </button>
        </div>
      </header>

      {/* 3. 4 Standard Metric Summary Cards */}
      <section className="country-design-metrics directory-design-metrics" aria-label="Passport handover summary">
        <article className="country-design-metric">
          <div>
            <span>Total Handovers</span>
            <BookMarked size={16} className="directory-icon-blue" />
          </div>
          <b>{metrics.total}</b>
          <p>In Dispatch Registry</p>
        </article>

        <article className="country-design-metric">
          <div>
            <span>Handed Out (Pending)</span>
            <Clock size={16} className="directory-icon-orange" />
          </div>
          <b>{metrics.handedOver}</b>
          <p>Passports With Takers</p>
        </article>

        <article className="country-design-metric">
          <div>
            <span>Partially Collected</span>
            <Layers size={16} className="directory-icon-purple" />
          </div>
          <b>{metrics.partiallyCollected}</b>
          <p>In Return Progress</p>
        </article>

        <article className="country-design-metric">
          <div>
            <span>Safely Collected</span>
            <CheckCircle2 size={16} className="directory-icon-green" />
          </div>
          <b>{metrics.collected + metrics.permanent}</b>
          <p>Returned or Permanent</p>
        </article>
      </section>

      {/* 4. Main Table Workspace */}
      <section className="country-design-workspace directory-design-workspace" aria-label="Passport Handover Workspace">
        {/* Filter Pills Row */}
        <div className="country-design-tabs directory-design-country-tabs" role="group" aria-label="Filter by Status">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={statusFilter === tab.id}
              className={statusFilter === tab.id ? "selected" : ""}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <form onSubmit={handleSearch} className="country-design-filters directory-design-filters">
          <div className="country-design-filter-fields">
            <label className="country-design-search directory-design-search" style={{ width: "340px" }}>
              <Search size={14} aria-hidden="true" />
              <input
                aria-label="Search Handover"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Taker name, phone, passport no, handover no..."
              />
            </label>

            <button
              data-action-ui="primary"
              data-action-size="normal"
              type="submit"
              className="directory-design-filter-button"
            >
              Apply
            </button>
            <button
              data-action-ui="neutral"
              data-action-size="normal"
              type="button"
              className="directory-design-filter-button"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>

          <label className="country-design-page-size">
            Per Page:
            <span className="country-design-select">
              <select
                aria-label="Handovers per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="directory-select-arrow" aria-hidden="true">
                ⌄
              </span>
            </span>
          </label>
        </form>

        {/* Total Count Header Line */}
        <div className="country-design-count">
          Showing {handovers.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)} of {totalCount} Total Handovers
        </div>

        {/* Standard Data Table */}
        <div className="desktop-candidates-table country-design-table directory-design-table">
          <table style={{ minWidth: "1280px" }}>
            <colgroup>
              <col style={{ width: "50px" }} />
              <col style={{ width: "210px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>SL</th>
                <th>ACTIONS</th>
                <th>HANDOVER NO</th>
                <th>TAKER DETAILS</th>
                <th>TAKEN AT</th>
                <th>EXPECTED RETURN</th>
                <th>PASSPORTS</th>
                <th>STATUS</th>
                <th>CREATED AT</th>
              </tr>
            </thead>
            <tbody style={{ opacity: loading ? 0.75 : 1 }}>
              {handovers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 16px", color: "var(--muted)" }}>
                    <BookMarked size={32} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>
                      No passport handover records found matching criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                handovers.map((row, index) => {
                  const sl = (page - 1) * pageSize + index + 1;
                  return (
                    <tr key={row.id}>
                      <td className="country-design-serial">{sl}</td>
                      <td>
                        <div className="directory-design-row-actions">
                          <button
                            data-action-ui="secondary"
                            data-action-size="compact"
                            type="button"
                            className="country-design-dossier"
                            onClick={() => setViewHandover(row)}
                            title="View Handover Dossier & Print Slip"
                          >
                            <Eye size={12} /> Details
                          </button>

                          {row.handoverMode !== "PERMANENT" && row.status !== "COLLECTED" && (
                            <button
                              data-action-ui="secondary"
                              data-action-size="compact"
                              type="button"
                              className="country-design-dossier"
                              style={{
                                color: "#059669",
                                background: "#ecfdf5",
                                borderColor: "#a7f3d0",
                              }}
                              onClick={() => setCollectHandover(row)}
                              title="Collect Passports back to office"
                            >
                              <CheckCircle2 size={12} /> Collect
                            </button>
                          )}

                          <button
                            data-action-ui="secondary"
                            data-action-size="compact"
                            type="button"
                            className="country-design-dossier"
                            style={{
                              color: "#dc2626",
                              background: "#fef2f2",
                              borderColor: "#fecaca",
                            }}
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row.id)}
                            title="Delete Record"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell client">
                          <b>{row.handoverNo}</b>
                          <span className="country-design-candidate-id">{row.typeLabel}</span>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b>{row.takerName}</b>
                          <small>{row.takerPhone}</small>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b>{formatDate(row.takenAt)}</b>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b>{formatDate(row.expectedReturn)}</b>
                        </div>
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <b>{row.passportsSummary}</b>
                          <small>{row.counts.total} Candidate{row.counts.total > 1 ? "s" : ""}</small>
                        </div>
                      </td>
                      <td>
                        {row.status === "HANDED_OVER" && (
                          <span className="ph-badge ph-badge-handed-over">Handed Over</span>
                        )}
                        {row.status === "PARTIALLY_COLLECTED" && (
                          <span className="ph-badge ph-badge-partially-collected">
                            Partially Collected
                          </span>
                        )}
                        {row.status === "COLLECTED" && (
                          <span className="ph-badge ph-badge-collected">Collected</span>
                        )}
                        {row.status === "PERMANENT" && (
                          <span className="ph-badge ph-badge-permanent">Permanent</span>
                        )}
                      </td>
                      <td>
                        <div className="country-design-cell">
                          <small>{formatDateTime(row.createdAt)}</small>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Standard Pagination Footer */}
        <div className="country-design-pagination">
          <span>{totalCount} Total Handovers</span>
          <div>
            <button
              data-action-ui="neutral"
              data-action-size="normal"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="country-design-page-indicator">
              Page {page} of {totalPages}
            </span>
            <button
              data-action-ui="neutral"
              data-action-size="normal"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* CREATE HANDOVER MODAL */}
      {isCreateOpen && (
        <CreateHandoverModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchHandovers();
          }}
        />
      )}

      {/* VIEW HANDOVER DETAILS & PRINT MODAL */}
      {viewHandover && (
        <ViewHandoverModal
          handover={viewHandover}
          onClose={() => setViewHandover(null)}
          onCollectClick={() => {
            setCollectHandover(viewHandover);
            setViewHandover(null);
          }}
        />
      )}

      {/* COLLECT PASSPORTS MODAL */}
      {collectHandover && (
        <CollectPassportsModal
          handover={collectHandover}
          onClose={() => setCollectHandover(null)}
          onSuccess={() => {
            setCollectHandover(null);
            fetchHandovers();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   1. CREATE PASSPORT HANDOVER MODAL (Standard Master Modal Pattern)
   ========================================================================= */

type SelectedApp = {
  candidateId: string;
  candidateName: string;
  passportNumber: string;
  phone?: string;
  expectedReturn?: string;
  takenReason?: string;
  returnDate?: string;
};

type SingleEntryForm = {
  id: string;
  candidateId: string;
  candidateName: string;
  passportNumber: string;
  expectedReturn: string;
  takenReason: string;
  returnDate: string;
  searchQuery: string;
};

function CreateHandoverModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [handoverType, setHandoverType] = useState<"SINGLE" | "GROUP">("GROUP");
  const [handoverMode, setHandoverMode] = useState<"TEMPORARY" | "PERMANENT">("TEMPORARY");

  // Common Taker fields
  const [takerName, setTakerName] = useState("");
  const [takerPhone, setTakerPhone] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));

  // Group Mode fields (Screenshot 1)
  const [groupExpectedReturn, setGroupExpectedReturn] = useState("");
  const [groupTakenReason, setGroupTakenReason] = useState("");
  const [groupReturnDate, setGroupReturnDate] = useState("");
  const [searchPassportQuery, setSearchPassportQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CandidateSearchResult[]>([]);
  const [selectedApps, setSelectedApps] = useState<SelectedApp[]>([]);

  // Single Mode fields (Screenshots 2 and 3)
  const [singleEntries, setSingleEntries] = useState<SingleEntryForm[]>([
    {
      id: "1",
      candidateId: "",
      candidateName: "",
      passportNumber: "",
      expectedReturn: "",
      takenReason: "",
      returnDate: "",
      searchQuery: "",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Search candidate by passport in Group Mode
  const handleSearchCandidates = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/passport-handover/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setSearchResults(json.candidates || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addGroupCandidate = (cand: CandidateSearchResult) => {
    if (selectedApps.some((a) => a.candidateId === cand.candidateId)) {
      toast.warning("Candidate is already added.");
      return;
    }
    if (cand.isHandedOut) {
      toast.error(
        `Passport ${cand.passportNumber} is already handed out to ${cand.activeHandover?.takerName}!`
      );
      return;
    }
    setSelectedApps((prev) => [
      ...prev,
      {
        candidateId: cand.candidateId,
        candidateName: cand.fullName,
        passportNumber: cand.passportNumber,
        phone: cand.phone,
      },
    ]);
    setSearchPassportQuery("");
    setSearchResults([]);
  };

  const removeGroupApp = (candidateId: string) => {
    setSelectedApps((prev) => prev.filter((a) => a.candidateId !== candidateId));
  };

  // Add / remove single entry
  const addSingleEntry = () => {
    setSingleEntries((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        candidateId: "",
        candidateName: "",
        passportNumber: "",
        expectedReturn: "",
        takenReason: "",
        returnDate: "",
        searchQuery: "",
      },
    ]);
  };

  const removeSingleEntry = (index: number) => {
    if (singleEntries.length <= 1) return;
    setSingleEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSingleEntry = (index: number, updates: Partial<SingleEntryForm>) => {
    setSingleEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry))
    );
  };

  const searchSingleCandidate = async (index: number, query: string) => {
    updateSingleEntry(index, { searchQuery: query });
    if (!query || query.trim().length < 2) return;

    try {
      const res = await fetch(
        `/api/passport-handover/search?q=${encodeURIComponent(query.trim())}`
      );
      const json = await res.json();
      const firstMatch: CandidateSearchResult | undefined = json.candidates?.[0];
      if (firstMatch) {
        if (firstMatch.isHandedOut) {
          toast.error(
            `Passport ${firstMatch.passportNumber} is already handed out to ${firstMatch.activeHandover?.takerName}!`
          );
        } else {
          updateSingleEntry(index, {
            candidateId: firstMatch.candidateId,
            candidateName: firstMatch.fullName,
            passportNumber: firstMatch.passportNumber,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!takerName.trim() || !takerPhone.trim()) {
      toast.error("Please enter Taker Name and Taker Phone.");
      return;
    }

    let itemsPayload: any[] = [];

    if (handoverType === "GROUP") {
      if (selectedApps.length === 0) {
        toast.error("Please add at least one candidate passport.");
        return;
      }
      itemsPayload = selectedApps.map((app) => ({
        candidateId: app.candidateId,
        candidateName: app.candidateName,
        passportNumber: app.passportNumber,
        expectedReturn: handoverMode === "TEMPORARY" ? groupExpectedReturn || null : null,
        takenReason: groupTakenReason || null,
        returnDate: handoverMode === "TEMPORARY" ? groupReturnDate || null : null,
      }));
    } else {
      const validEntries = singleEntries.filter(
        (entry) => entry.candidateId && entry.passportNumber
      );
      if (validEntries.length === 0) {
        toast.error("Please select valid candidate passports for the entries.");
        return;
      }
      itemsPayload = validEntries.map((entry) => ({
        candidateId: entry.candidateId,
        candidateName: entry.candidateName,
        passportNumber: entry.passportNumber,
        expectedReturn: handoverMode === "TEMPORARY" ? entry.expectedReturn || null : null,
        takenReason: entry.takenReason || null,
        returnDate: handoverMode === "TEMPORARY" ? entry.returnDate || null : null,
      }));
    }

    try {
      setSubmitting(true);
      const payload = {
        handoverType,
        handoverMode,
        takerName: takerName.trim(),
        takerPhone: takerPhone.trim(),
        takenAt,
        expectedReturn: handoverMode === "TEMPORARY" ? groupExpectedReturn || null : null,
        takenReason: handoverType === "GROUP" ? groupTakenReason || null : null,
        returnDate: handoverMode === "TEMPORARY" ? groupReturnDate || null : null,
        items: itemsPayload,
      };

      const res = await fetch("/api/passport-handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create handover");

      toast.success(`Handover ${json.data?.handoverNo || ""} created successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create handover");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create Passport Handover"
      className="master-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="master-modal-content"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#eef2ff",
                color: "#007aff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <BookMarked size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
                Create Passport Handover
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                Issue physical passport dispatch records for medical, embassy, or candidate return.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: 0,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
            {/* Top Switchers: Handover Type & Handover Mode */}
            <div className="ph-switch-row">
              <div className="ph-switch-group">
                <label>Handover Type</label>
                <div className="ph-toggle-container">
                  <button
                    type="button"
                    className={`ph-toggle-btn ${handoverType === "SINGLE" ? "active" : ""}`}
                    onClick={() => setHandoverType("SINGLE")}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    className={`ph-toggle-btn ${handoverType === "GROUP" ? "active" : ""}`}
                    onClick={() => setHandoverType("GROUP")}
                  >
                    Group
                  </button>
                </div>
              </div>

              <div className="ph-switch-group">
                <label>Handover Mode</label>
                <div className="ph-toggle-container">
                  <button
                    type="button"
                    className={`ph-toggle-btn ${handoverMode === "TEMPORARY" ? "active" : ""}`}
                    onClick={() => setHandoverMode("TEMPORARY")}
                  >
                    Temporary
                  </button>
                  <button
                    type="button"
                    className={`ph-toggle-btn ${handoverMode === "PERMANENT" ? "active" : ""}`}
                    onClick={() => setHandoverMode("PERMANENT")}
                  >
                    Permanent
                  </button>
                </div>
              </div>
            </div>

            {/* Permanent Note */}
            {handoverMode === "PERMANENT" && (
              <p className="ph-mode-notice">
                Permanent handovers do not require expected return or return dates.
              </p>
            )}

            {/* Taker Name & Phone */}
            <div className="ph-form-grid-2">
              <div className="ph-field-wrap">
                <label>Taker Name</label>
                <input
                  type="text"
                  className="ph-input"
                  placeholder="Enter taker name"
                  value={takerName}
                  onChange={(e) => setTakerName(e.target.value)}
                  required
                />
              </div>

              <div className="ph-field-wrap">
                <label>Taker Phone</label>
                <input
                  type="text"
                  className="ph-input"
                  placeholder="Enter taker phone"
                  value={takerPhone}
                  onChange={(e) => setTakerPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Taken At & Expected Return */}
            <div className="ph-form-grid-2">
              <div className="ph-field-wrap">
                <label>Taken At</label>
                <input
                  type="date"
                  className="ph-input"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                  required
                />
              </div>

              {handoverType === "GROUP" && handoverMode === "TEMPORARY" && (
                <div className="ph-field-wrap">
                  <label>Expected Return Date</label>
                  <input
                    type="date"
                    className="ph-input"
                    value={groupExpectedReturn}
                    onChange={(e) => setGroupExpectedReturn(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* GROUP MODE (Screenshot 1) */}
            {handoverType === "GROUP" && (
              <>
                <div className="ph-field-wrap" style={{ position: "relative" }}>
                  <label>Search by Passport No</label>
                  <div className="ph-search-add-bar">
                    <input
                      type="text"
                      className="ph-input"
                      placeholder="Enter passport no to search"
                      value={searchPassportQuery}
                      onChange={(e) => {
                        setSearchPassportQuery(e.target.value);
                        handleSearchCandidates(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="ph-btn-add"
                      onClick={() => handleSearchCandidates(searchPassportQuery)}
                    >
                      Add
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        zIndex: 20,
                        maxHeight: "200px",
                        overflowY: "auto",
                        marginTop: "4px",
                      }}
                    >
                      {searchResults.map((cand) => (
                        <div
                          key={cand.candidateId}
                          onClick={() => addGroupCandidate(cand)}
                          style={{
                            padding: "10px 14px",
                            cursor: cand.isHandedOut ? "not-allowed" : "pointer",
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            opacity: cand.isHandedOut ? 0.6 : 1,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>
                              {cand.fullName}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              Passport: {cand.passportNumber} · Phone: {cand.phone}
                            </div>
                          </div>
                          {cand.isHandedOut ? (
                            <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>
                              Already Out
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#007aff", fontWeight: 600 }}>
                              + Select
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedApps.length > 0 && (
                  <div className="ph-selected-apps-container">
                    <div className="ph-selected-apps-title">
                      Selected Applications ({selectedApps.length})
                    </div>
                    {selectedApps.map((app) => (
                      <div key={app.candidateId} className="ph-selected-app-card">
                        <div>
                          <div className="ph-app-name">{app.candidateName}</div>
                          <div className="ph-app-passport">Passport: {app.passportNumber}</div>
                        </div>
                        <button
                          type="button"
                          className="ph-btn-remove-app"
                          onClick={() => removeGroupApp(app.candidateId)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ph-form-grid-2" style={{ marginTop: "16px" }}>
                  <div className="ph-field-wrap">
                    <label>Taken Reason</label>
                    <input
                      type="text"
                      className="ph-input"
                      placeholder="e.g. For medical test"
                      value={groupTakenReason}
                      onChange={(e) => setGroupTakenReason(e.target.value)}
                    />
                  </div>

                  {handoverMode === "TEMPORARY" && (
                    <div className="ph-field-wrap">
                      <label>Return Date</label>
                      <input
                        type="date"
                        className="ph-input"
                        value={groupReturnDate}
                        onChange={(e) => setGroupReturnDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SINGLE MODE (Screenshots 2 and 3) */}
            {handoverType === "SINGLE" && (
              <div>
                {singleEntries.map((entry, idx) => (
                  <div key={entry.id} className="ph-single-entry-card">
                    <div className="ph-single-entry-head">
                      <span className="ph-single-entry-title">Single Entry {idx + 1}</span>
                      {singleEntries.length > 1 && (
                        <button
                          type="button"
                          className="ph-btn-remove-entry"
                          onClick={() => removeSingleEntry(idx)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="ph-field-wrap" style={{ marginBottom: "12px" }}>
                      <label>Search by Passport No</label>
                      <input
                        type="text"
                        className="ph-input"
                        placeholder="Enter passport no to search"
                        value={entry.searchQuery}
                        onChange={(e) => searchSingleCandidate(idx, e.target.value)}
                      />
                      {entry.candidateName && (
                        <div style={{ fontSize: "12px", color: "#059669", marginTop: "4px" }}>
                          ✓ Selected: <b>{entry.candidateName}</b> (Passport: {entry.passportNumber})
                        </div>
                      )}
                    </div>

                    {handoverMode === "TEMPORARY" ? (
                      <div className="ph-form-grid-3">
                        <div className="ph-field-wrap">
                          <label>Expected Return Date</label>
                          <input
                            type="date"
                            className="ph-input"
                            value={entry.expectedReturn}
                            onChange={(e) =>
                              updateSingleEntry(idx, { expectedReturn: e.target.value })
                            }
                          />
                        </div>

                        <div className="ph-field-wrap">
                          <label>Taken Reason</label>
                          <input
                            type="text"
                            className="ph-input"
                            placeholder="Enter taken reason"
                            value={entry.takenReason}
                            onChange={(e) =>
                              updateSingleEntry(idx, { takenReason: e.target.value })
                            }
                          />
                        </div>

                        <div className="ph-field-wrap">
                          <label>Return Date</label>
                          <input
                            type="date"
                            className="ph-input"
                            value={entry.returnDate}
                            onChange={(e) =>
                              updateSingleEntry(idx, { returnDate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="ph-field-wrap">
                        <label>Taken Reason</label>
                        <input
                          type="text"
                          className="ph-input"
                          placeholder="Enter taken reason"
                          value={entry.takenReason}
                          onChange={(e) =>
                            updateSingleEntry(idx, { takenReason: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="ph-btn-add-entry"
                  onClick={addSingleEntry}
                >
                  <Plus size={16} /> Add Single Entry
                </button>
              </div>
            )}
          </div>

          {/* Standard Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              background: "#f8fafc",
            }}
          >
            <button
              data-action-ui="neutral"
              data-action-size="normal"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              data-action-ui="primary"
              data-action-size="normal"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Passport Handover"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   2. VIEW DETAILS & PRINT SLIP MODAL
   ========================================================================= */

function ViewHandoverModal({
  handover,
  onClose,
  onCollectClick,
}: {
  handover: HandoverRecord;
  onClose: () => void;
  onCollectClick: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const beforePrint = () => {
      document.body.classList.add("printing-passport-slip");
    };
    const afterPrint = () => {
      document.body.classList.remove("printing-passport-slip");
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      document.body.classList.remove("printing-passport-slip");
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const handlePrint = () => {
    document.body.classList.add("printing-passport-slip");
    const cleanup = () => {
      document.body.classList.remove("printing-passport-slip");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Passport Handover Details"
      className="master-modal-overlay passport-handover-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="master-modal-content passport-handover-modal-content"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Screen Header (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
              Passport Handover Details ({handover.handoverNo})
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
              Type: {handover.typeLabel} · Mode: {handover.handoverMode} · Dispatched: {new Date(handover.takenAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="ph-print-body passport-handover-print-container" style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }} ref={printRef}>
          {/* Printable Official Header (Shown ONLY on print) */}
          <div className="ph-print-only" style={{ marginBottom: "20px", borderBottom: "2px solid #0f172a", paddingBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ORBIT RECRUITMENT AGENCY
                </h1>
                <p style={{ fontSize: "11px", color: "#475569", margin: "4px 0 0 0", fontWeight: 600 }}>
                  Government Approved Recruiting Agency · RL-1542 · Dhaka, Bangladesh
                </p>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Overseas Manpower &amp; Processing Department
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-block", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#0f172a" }}>
                  PASSPORT HANDOVER SLIP
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#007aff", marginTop: "4px" }}>
                  {handover.handoverNo}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          </div>

          {/* Taker Summary */}
          <div
            className="ph-print-taker-summary"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "20px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Taker Name
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px", color: "#1e293b" }}>
                {handover.takerName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Taker Phone
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px", color: "#1e293b" }}>
                {handover.takerPhone}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Taken At
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px", color: "#1e293b" }}>
                {new Date(handover.takenAt).toLocaleDateString()}
              </div>
            </div>
            {handover.expectedReturn && (
              <div>
                <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Expected Return
                </div>
                <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px", color: "#1e293b" }}>
                  {new Date(handover.expectedReturn).toLocaleDateString()}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Handover Mode
              </div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginTop: "2px", color: "#1e293b" }}>
                {handover.handoverMode} ({handover.typeLabel})
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Overall Status
              </div>
              <div style={{ marginTop: "4px" }}>
                <span className="ph-badge ph-badge-handed-over">{handover.status}</span>
              </div>
            </div>
          </div>

          {/* Passports List */}
          <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", color: "#475569" }}>
            Included Passports ({handover.items.length})
          </h3>
          <div className="desktop-candidates-table country-design-table directory-design-table ph-print-table-wrap">
            <table className="ph-print-table" style={{ minWidth: "100%", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>SL</th>
                  <th>Candidate Name</th>
                  <th>Passport No</th>
                  <th>Reason</th>
                  <th>Expected Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {handover.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.candidateName}</td>
                    <td style={{ color: "#007aff", fontWeight: 600 }}>{item.passportNumber}</td>
                    <td>{item.takenReason || handover.takenReason || "—"}</td>
                    <td>
                      {item.expectedReturn
                        ? new Date(item.expectedReturn).toLocaleDateString()
                        : handover.expectedReturn
                          ? new Date(handover.expectedReturn).toLocaleDateString()
                          : "—"}
                    </td>
                    <td>
                      {item.status === "COLLECTED" ? (
                        <span className="ph-badge ph-badge-collected">Collected</span>
                      ) : item.status === "PERMANENT" ? (
                        <span className="ph-badge ph-badge-permanent">Permanent</span>
                      ) : (
                        <span className="ph-badge ph-badge-pending">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Terms on Print */}
          <div
            className="ph-print-only"
            style={{
              marginTop: "20px",
              padding: "10px 14px",
              border: "1px dashed #cbd5e1",
              borderRadius: "6px",
              background: "#f8fafc",
              fontSize: "11px",
              color: "#334155",
              lineHeight: 1.5,
            }}
          >
            <strong>Official Handover Acknowledgement:</strong> The undersigned recipient/taker acknowledges receipt of the physical passport(s) specified in this slip for authorized processing. The taker is strictly responsible for the safe custody and timely return of all listed documents in original condition.
          </div>

          {/* Printable Signature Lines */}
          <div
            className="ph-print-signatures"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "48px",
              paddingTop: "24px",
            }}
          >
            <div style={{ textAlign: "center", borderTop: "1.5px solid #475569", width: "210px", paddingTop: "8px", fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>
              <div>Receiver (Taker) Signature</div>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>Name: {handover.takerName}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400, marginTop: "4px" }}>Date: ____________________</div>
            </div>
            <div style={{ textAlign: "center", borderTop: "1.5px solid #475569", width: "210px", paddingTop: "8px", fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>
              <div>Authorized Officer Signature</div>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>Passport Department (Seal)</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400, marginTop: "4px" }}>Date: ____________________</div>
            </div>
          </div>

          {/* Print Footer */}
          <div
            className="ph-print-only"
            style={{
              marginTop: "24px",
              paddingTop: "10px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#94a3b8",
            }}
          >
            <div>Orbit Recruitment OS · Official Handover Voucher #{handover.handoverNo}</div>
            <div>Generated: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* Modal Actions (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#f8fafc",
          }}
        >
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={15} /> Print Slip
          </button>

          {handover.handoverMode !== "PERMANENT" && handover.status !== "COLLECTED" && (
            <button
              data-action-ui="primary"
              data-action-size="normal"
              type="button"
              onClick={onCollectClick}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <CheckCircle2 size={15} /> Collect Passports
            </button>
          )}

          <button data-action-ui="neutral" data-action-size="normal" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/* =========================================================================
   3. COLLECT / RECEIVE PASSPORTS MODAL
   ========================================================================= */

function CollectPassportsModal({
  handover,
  onClose,
  onSuccess,
}: {
  handover: HandoverRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const pendingItems = handover.items.filter((i) => i.status === "PENDING");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    pendingItems.map((i) => i.id)
  );
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnRemarks, setReturnRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === pendingItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(pendingItems.map((i) => i.id));
    }
  };

  const handleConfirmCollect = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one passport to collect.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/passport-handover/${handover.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collections: selectedItemIds.map((id) => ({
            itemId: id,
            status: "COLLECTED",
            returnedAt: returnDate,
            returnRemarks: returnRemarks || "Received safely in office",
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to collect");

      toast.success("Passports collected back to office successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to collect passports");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Collect Passports"
      className="master-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="master-modal-content"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
              Collect / Receive Passports
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
              Handover #{handover.handoverNo} · Taker: {handover.takerName} ({handover.takerPhone})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: "13px", color: "#475569", marginBottom: "14px" }}>
            Select the passports being returned to the office:
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              Pending Passports ({pendingItems.length})
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: "transparent",
                border: "none",
                color: "#007aff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {selectedItemIds.length === pendingItems.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            {pendingItems.map((item) => (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  background: selectedItemIds.includes(item.id) ? "#f0f9ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>
                      {item.candidateName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Passport: {item.passportNumber}
                    </div>
                  </div>
                </div>
                <span className="ph-badge ph-badge-pending">Pending</span>
              </label>
            ))}
          </div>

          <div className="ph-form-grid-2">
            <div className="ph-field-wrap">
              <label>Return Date</label>
              <input
                type="date"
                className="ph-input"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>

            <div className="ph-field-wrap">
              <label>Remarks / Notes</label>
              <input
                type="text"
                className="ph-input"
                placeholder="e.g. Returned safely with Gamca fit slip"
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#f8fafc",
          }}
        >
          <button
            data-action-ui="neutral"
            data-action-size="normal"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            data-action-ui="primary"
            data-action-size="normal"
            type="button"
            onClick={handleConfirmCollect}
            disabled={submitting || selectedItemIds.length === 0}
          >
            {submitting ? "Collecting..." : `Collect (${selectedItemIds.length}) Passports`}
          </button>
        </div>
      </div>
    </div>
  );
}
