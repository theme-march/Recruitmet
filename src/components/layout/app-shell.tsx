"use client";

import {
  Building2,
  Calendar,
  CalendarClock,
  ChevronDown,
  Clock,
  Command,
  FileText,
  FileWarning,
  Globe,
  Layers,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { moduleItemPath, moduleItemSlug, modules } from "@/lib/modules";
import { allModuleIds, moduleIdsForRole } from "@/lib/roles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { countryCandidatesQueryOptions } from "@/lib/queries/country-candidates";
import { NavigationPending } from "@/components/layout/navigation-pending";
import { countriesQueryOptions } from "@/lib/queries/countries";
import { getCountryFlagEmoji } from "@/lib/country-pipeline";
import { matchesCountry } from "@/lib/country-package-sync";

import { DashboardIcon, DashboardBrandMark, type DashboardIconName } from "@/components/layout/dashboard-icon";
import { meQueryOptions } from "@/lib/queries/me";
import { DEFAULT_SETTINGS, settingsQueryOptions } from "@/lib/queries/settings";
type SearchResult = {
  id: string;
  fileNo: string;
  name: string;
  passport: string | null;
  country: string;
  stage: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [moduleQuery, setModuleQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const profileQuery = useQuery(meQueryOptions());
  const profile = profileQuery.data?.data ?? null;
  const settingsQuery = useQuery(settingsQueryOptions);
  const settings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: navCounts = {} } = useQuery({
    queryKey: ["nav-counts"],
    queryFn: async ({
      signal,
    }): Promise<Record<string, Record<string, number>>> => {
      const response = await fetch("/api/nav-counts", { signal });
      if (!response.ok) throw new Error("Could not load navigation counts");
      return (await response.json()).data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: dbCountries = [] } = useQuery(countriesQueryOptions());
  const path = usePathname();
  const isDesignDashboard = path === "/dashboard";
  const dashboardNavIcons: Record<string, DashboardIconName> = {
    dashboard: "LayoutDashboard", "call-center": "Users", "office-vendor": "Handshake",
    agents: "Contact", "payment-collection": "Wallet", document: "Files",
    "country-setup": "Globe", tutorials: "GraduationCap", "passport-handover": "Files",
  };
  const isPortalRoute = path.startsWith("/portal");
  const routeParts = path.split("/").filter(Boolean);
  const selectedModule = routeParts[0] === "module" ? routeParts[1] : (path === "/candidates" || path.startsWith("/candidate") || path === "/demands" || path === "/interviews" ? "call-center" : path.startsWith("/passport-handover") ? "passport-handover" : null);
  const selectedPage = routeParts[0] === "module" ? routeParts[2] : (path === "/demands" ? "works-and-demands" : path === "/candidates" ? "candidate-list" : path === "/interviews" ? "registration-and-interviews" : null);

  const visible = useMemo(() => {
    if (!profile || profile?.roleKey === "AGENT" || isPortalRoute) {
      return [];
    }

    const allowed =
      profile.roleKey === "SUPER_ADMIN"
        ? allModuleIds
        : profile.allowedModules || moduleIdsForRole(profile.roleKey);

    const nonCountryModules = modules.filter(
      (m) =>
        !["ksa", "dubai", "other-country"].includes(m.id) &&
        !m.hidden &&
        (allowed.includes(m.id as any) ||
          (m.id === "call-center" && (allowed.includes("registration") || allowed.includes("office-vendor"))) ||
          (m.id === "passport-handover" && (allowed.includes("call-center") || allowed.includes("document") || allowed.includes("passport-handover")))),
    );

    const countryMods =
      dbCountries.length > 0
        ? dbCountries
            .filter((c) => c.active)
            .map((c) => {
              const lower = c.name.toLowerCase();
              const id = lower.includes("saudi")
                ? "ksa"
                : lower.includes("dubai")
                  ? "dubai"
                  : lower === "other" || lower === "other country"
                    ? "other-country"
                    : c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

              const icon = lower.includes("saudi")
                ? Globe
                : lower.includes("dubai")
                  ? Building2
                  : Globe;
              const flag =
                c.flag || getCountryFlagEmoji(c.code, c.name, c.flag);

              return {
                id,
                label: c.name,
                icon,
                flag,
                isCountry: true,
                items: [{ id: "1", label: "Candidates List" }],
                candidateCount: c.candidateCount,
              };
            })
        : modules
            .filter((m) => ["ksa", "dubai", "other-country"].includes(m.id))
            .map((m) => ({
              ...m,
              flag:
                m.flag ||
                getCountryFlagEmoji(
                  m.id === "ksa" ? "SA" : m.id === "dubai" ? "AE" : "OTHER",
                  m.label,
                ),
              isCountry: true,
            }));

    const callCenterIdx = nonCountryModules.findIndex(
      (m) => m.id === "call-center",
    );
    const combined = [...nonCountryModules];
    if (callCenterIdx >= 0) {
      combined.splice(callCenterIdx + 1, 0, ...(countryMods as any));
    } else {
      combined.push(...(countryMods as any));
    }

    return combined
      .map((m) => ({
        ...m,
        items: m.items.filter((item) => {
          if (profile.roleKey === "SUPER_ADMIN") return true;
          const permissionModule = /interview/i.test(item.label)
            ? "registration"
            : /demand|work/i.test(item.label)
              ? "office-vendor"
              : m.id;
          return (
            profile.granularPermissions?.[permissionModule] ?? []
          ).includes(
            /^(Create|Add|New)\b/.test(item.label) ? "create" : "read",
          );
        }),
      }))
      .filter((m) => m.items.length > 0)
      .filter(
        (m) =>
          m.label.toLowerCase().includes(moduleQuery.toLowerCase()) ||
          m.items.some((item) =>
            item.label.toLowerCase().includes(moduleQuery.toLowerCase()),
          ),
      );
  }, [moduleQuery, profile, dbCountries, isPortalRoute]);

  useEffect(() => {
    const current = path.match(/^\/module\/([^/]+)/)?.[1] || (path.startsWith("/candidate") || path === "/demands" || path === "/interviews" ? "call-center" : null);
    setExpandedModule(current || null);
  }, [path]);

  const [portalQuery, setPortalQuery] = useState<{ agentId?: string; tab?: string; country?: string }>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateQuery = () => {
      const sp = new URLSearchParams(window.location.search);
      setPortalQuery({
        agentId: sp.get("agentId") || undefined,
        tab: sp.get("tab") || undefined,
        country: sp.get("country") || undefined,
      });
    };
    updateQuery();
    window.addEventListener("popstate", updateQuery);
    return () => window.removeEventListener("popstate", updateQuery);
  }, [path]);

  const effectiveAgentId = isPortalRoute ? (portalQuery.agentId || profile?.agentId) : profile?.agentId;

  const { data: portalAgentData } = useQuery<any>({
    queryKey: ["agent-portal-data", effectiveAgentId],
    queryFn: async () => {
      if (!effectiveAgentId) return null;
      const res = await fetch(`/api/agents/${effectiveAgentId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(isPortalRoute && effectiveAgentId),
    staleTime: 30_000,
  });

  const portalCountries = useMemo(() => {
    const candidates = (portalAgentData?.candidates || []) as any[];
    if (candidates.length === 0) return [];

    const baseList = dbCountries.length > 0 ? dbCountries.filter(c => c.active) : [
      { id: "dubai", name: "Dubai", code: "AE", flag: "🇦🇪" },
      { id: "malta", name: "Malta", code: "MT", flag: "🇲🇹" },
      { id: "oman", name: "Oman", code: "OM", flag: "🇴🇲" },
      { id: "qatar", name: "Qatar", code: "QA", flag: "🇶🇦" },
      { id: "ksa", name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
    ];

    const matchedCountries: Array<{
      id: string;
      name: string;
      code?: string;
      flag: string;
      candidateCount: number;
    }> = [];

    // 1. Match from baseList and include ONLY those where candidateCount > 0
    for (const c of baseList) {
      const count = candidates.filter((cand: any) =>
        matchesCountry(c.name, c.code, cand.country || "")
      ).length;
      if (count > 0) {
        matchedCountries.push({
          id: c.id,
          name: c.name,
          code: c.code,
          flag: c.flag || getCountryFlagEmoji(c.code, c.name, c.flag),
          candidateCount: count,
        });
      }
    }

    // 2. Also check if any candidate belongs to an active country not matched by baseList
    for (const cand of candidates) {
      const countryStr = (cand.country || "").trim();
      if (!countryStr) continue;
      const alreadyMatched = matchedCountries.some((mc) =>
        matchesCountry(mc.name, mc.code || "", countryStr)
      );
      if (!alreadyMatched) {
        const count = candidates.filter((c: any) =>
          (c.country || "").trim().toLowerCase() === countryStr.toLowerCase()
        ).length;
        if (count > 0) {
          matchedCountries.push({
            id: countryStr.toLowerCase().replace(/\s+/g, "-"),
            name: countryStr,
            flag: getCountryFlagEmoji(undefined, countryStr),
            candidateCount: count,
          });
        }
      }
    }

    return matchedCountries;
  }, [dbCountries, portalAgentData?.candidates]);

  const portalCandidateCount = portalAgentData?.totalCandidateCount ?? portalAgentData?.candidates?.length ?? 0;
  const portalMissingDocsCount = portalAgentData?.metrics?.totalMissingDocsCount ?? (portalAgentData?.candidates?.filter((c: any) => c.hasMissingDocs || (c.missingDocs && c.missingDocs.length > 0)).length) ?? 0;

  const portalExpiryCount = useMemo(() => {
    if (!portalAgentData?.candidates) return 0;
    let count = 0;
    for (const cand of portalAgentData.candidates) {
      if (cand.passportExpiryDate) {
        const days = Math.ceil((new Date(cand.passportExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180) count++;
      } else if (cand.medicalExpiryDate) {
        const days = Math.ceil((new Date(cand.medicalExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 15) count++;
      } else if (cand.visaExpiryDate) {
        const days = Math.ceil((new Date(cand.visaExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 15) count++;
      }
    }
    return count || (portalAgentData.candidates.length > 0 ? 1 : 0);
  }, [portalAgentData?.candidates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      if (isPortalRoute && portalAgentData?.candidates) {
        const q = globalQuery.toLowerCase().trim();
        const matched = (portalAgentData.candidates as any[])
          .filter((c) =>
            (c.fullName && c.fullName.toLowerCase().includes(q)) ||
            (c.fileNo && c.fileNo.toLowerCase().includes(q)) ||
            (c.passportNumber && c.passportNumber.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q)) ||
            (c.country && c.country.toLowerCase().includes(q))
          )
          .slice(0, 8)
          .map((c) => ({
            id: c.fileId || c.candidateId || c.id,
            fileNo: c.fileNo || "FILE",
            name: c.fullName || "Candidate",
            passport: c.passportNumber || null,
            country: c.country || "Overseas",
            stage: c.currentStage || "Active",
          }));
        setResults(matched);
        return;
      }
      void fetch(`/api/search?q=${encodeURIComponent(globalQuery.trim())}`)
        .then((response) => (response.ok ? response.json() : []))
        .then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [globalQuery, isPortalRoute, portalAgentData?.candidates]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const portalAgentName = portalAgentData?.contactPerson || portalAgentData?.name;
  const displayName = isPortalRoute ? (portalAgentName || profile?.name || "Ahmed Rahman") : (profile?.name ?? "Account");
  const displayRole = isPortalRoute ? "Verified Agent" : (profile?.role ?? (profileQuery.isPending ? "Loading…" : "Unavailable"));
  const initials =
    (displayName || "AR")
      .split(" ")
      .map((part: string) => part[0])
      .slice(0, 2)
      .join("") || "AR";

  const handlePortalNav = (params: { tab?: string; country?: string }) => {
    setOpen(false);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (effectiveAgentId) sp.set("agentId", effectiveAgentId);
      if (params.tab) {
        if (params.tab === "dashboard") {
          sp.delete("tab");
        } else {
          sp.set("tab", params.tab);
        }
      } else {
        sp.delete("tab");
      }
      if (params.country !== undefined) {
        if (params.country === "All") {
          sp.delete("country");
        } else {
          sp.set("country", params.country);
        }
      }
      const targetUrl = `/portal/agent?${sp.toString()}`;
      if (path === "/portal/agent") {
        window.history.pushState(null, "", targetUrl);
        window.dispatchEvent(new Event("popstate"));
      } else {
        router.push(targetUrl);
      }
    }
  };

  return (
    <div className={`app-shell home-sidebar-shell ${isDesignDashboard || isPortalRoute ? "figma-dashboard-shell" : ""} ${isPortalRoute ? "agent-portal-route-shell" : ""}`}>
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span
            className="brand-mark"
            style={{
              display: "grid",
              placeItems: "center",
              background: "transparent",
              overflow: "hidden",
            }}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.softwareName}
                style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "6px" }}
              />
            ) : (
              <DashboardBrandMark />
            )}
          </span>
          <span>
            <b>{settings.softwareName}</b>
            <small>{isPortalRoute ? "AGENT PARTNER PORTAL" : settings.softwareSubtitle}</small>
          </span>
          <button className="icon mobile" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="side-search">
          <DashboardIcon name="Search" />
          <input
            value={moduleQuery}
            onChange={(event) => setModuleQuery(event.target.value)}
            placeholder="Quick filter..."
          />
          <kbd>Ctrl K</kbd>
        </div>
        <nav>
          {isPortalRoute ? (
            <>
              {/* 1. RECRUITMENT Group */}
              <div
                className="nav-group"
                data-module="dashboard"
                data-section="RECRUITMENT"
                style={{ "--nav-accent": "#5ca8ec" } as React.CSSProperties}
              >
                {(!moduleQuery || "dashboard".includes(moduleQuery.toLowerCase()) || "partner".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "dashboard", country: "All" })}
                    href={`/portal/agent${effectiveAgentId ? `?agentId=${encodeURIComponent(effectiveAgentId)}` : ""}`}
                    className={`nav-main dashboard-link ${
                      path === "/portal/agent" &&
                      (!portalQuery.tab || portalQuery.tab === "dashboard") &&
                      (!portalQuery.country || portalQuery.country.toLowerCase() === "all")
                        ? "active"
                        : ""
                    }`}
                  >
                    <span className="nav-icon">
                      <DashboardIcon name="LayoutDashboard" />
                    </span>
                    <span>Dashboard</span>
                    <NavigationPending />
                  </Link>
                )}

                {(!moduleQuery || "candidates".includes(moduleQuery.toLowerCase()) || "pipeline".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "candidates", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=candidates`}
                    className={`nav-main ${
                      (path === "/portal/agent" &&
                        portalQuery.tab === "candidates" &&
                        (!portalQuery.country || portalQuery.country.toLowerCase() === "all")) ||
                      path.startsWith("/portal/agent/candidate")
                        ? "active active-module"
                        : ""
                    }`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#5856d6" }}>
                        <DashboardIcon name="Users" />
                      </span>
                      <span>Candidates</span>
                    </span>
                    <span className="nav-badge">{portalCandidateCount}</span>
                    <NavigationPending />
                  </Link>
                )}
              </div>

              {/* 2. COUNTRIES Group (Matching Image 3 Admin Requirements Panel!) */}
              {portalCountries.length > 0 && (
                <div
                  className="nav-group"
                  data-section="COUNTRIES"
                  style={{ "--nav-accent": "#007aff" } as React.CSSProperties}
                >
                  {portalCountries
                    .filter((c) => !moduleQuery || c.name.toLowerCase().includes(moduleQuery.toLowerCase()))
                    .map((c) => {
                      const activeCountry = portalQuery.country?.toLowerCase();
                      const isCountryActive =
                        path === "/portal/agent" &&
                        Boolean(activeCountry && activeCountry !== "all") &&
                        (activeCountry === c.name.toLowerCase() ||
                          matchesCountry(c.name, c.code || "", portalQuery.country || ""));
                      return (
                        <Link
                          key={c.id}
                          prefetch={true}
                          onClick={() => handlePortalNav({ country: c.name })}
                          href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}country=${encodeURIComponent(c.name)}`}
                          className={`nav-main ${isCountryActive ? "active active-module" : ""}`}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}
                        >
                          <span className="nav-main-content">
                            <span className="nav-icon nav-country-icon" aria-hidden="true">
                              {c.flag}
                            </span>
                            <span>{c.name}</span>
                          </span>
                          <span className="nav-badge">{c.candidateCount}</span>
                          <NavigationPending />
                        </Link>
                      );
                    })}
                </div>
              )}

              {/* 3. OPERATIONS Group (Matching Image 3 Admin Requirements Panel!) */}
              <div
                className="nav-group"
                data-section="OPERATIONS"
                style={{ "--nav-accent": "#34c759" } as React.CSSProperties}
              >
                {(!moduleQuery || "payment collection".includes(moduleQuery.toLowerCase()) || "ledger".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "ledger", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=ledger`}
                    className={`nav-main ${path === "/portal/agent" && portalQuery.tab === "ledger" ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#007aff" }}>
                        <DashboardIcon name="Wallet" />
                      </span>
                      <span>Payment Collection</span>
                    </span>
                    <span className="nav-badge">{portalAgentData?.grandTotalCollected ? `৳ ${Math.round(portalAgentData.grandTotalCollected / 1000)}k` : "0"}</span>
                    <NavigationPending />
                  </Link>
                )}

                {(!moduleQuery || "missing documents".includes(moduleQuery.toLowerCase()) || "docs".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "missing", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=missing`}
                    className={`nav-main ${path === "/portal/agent" && portalQuery.tab === "missing" ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#ff3b30" }}>
                        <DashboardIcon name="Files" />
                      </span>
                      <span>Missing Documents</span>
                    </span>
                    <span className="nav-badge">{portalMissingDocsCount}</span>
                    <NavigationPending />
                  </Link>
                )}

                {(!moduleQuery || "expiry tracker".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "expiry", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=expiry`}
                    className={`nav-main ${path === "/portal/agent" && portalQuery.tab === "expiry" ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#ff9500" }}>
                        <DashboardIcon name="CalendarDays" />
                      </span>
                      <span>Expiry Tracker</span>
                    </span>
                    <span className="nav-badge">{portalExpiryCount}</span>
                    <NavigationPending />
                  </Link>
                )}

                {(!moduleQuery || "interview calls".includes(moduleQuery.toLowerCase()) || "interviews".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "interviews", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=interviews`}
                    className={`nav-main ${path === "/portal/agent" && portalQuery.tab === "interviews" ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#34c759" }}>
                        <DashboardIcon name="Contact" />
                      </span>
                      <span>Interview Calls</span>
                    </span>
                    <span className="nav-badge">{portalAgentData?.interviews?.length || 0}</span>
                    <NavigationPending />
                  </Link>
                )}

                {(!moduleQuery || "agency documents".includes(moduleQuery.toLowerCase()) || "files".includes(moduleQuery.toLowerCase())) && (
                  <Link
                    prefetch={true}
                    onClick={() => handlePortalNav({ tab: "docs", country: "All" })}
                    href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=docs`}
                    className={`nav-main ${path === "/portal/agent" && portalQuery.tab === "docs" ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon" style={{ background: "#ff2d55" }}>
                        <DashboardIcon name="FileCheck" />
                      </span>
                      <span>Agency Documents</span>
                    </span>
                    <span className="nav-badge">{portalAgentData?.documents?.length || 0}</span>
                    <NavigationPending />
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              {!profile && (
                <div style={{ padding: "16px", fontSize: "13px" }}>
                  {profileQuery.isPending ? (
                    <p role="status">Loading navigation…</p>
                  ) : profileQuery.data?.data === null ? (
                    <p role="alert">
                      Your session has expired.{" "}
                      <Link data-action-ui="primary" data-action-size="normal" href="/login">Sign in again</Link>
                    </p>
                  ) : (
                    <div role="alert">
                      <p>Unable to load navigation.</p>
                      <button data-action-ui="neutral" data-action-size="normal"
                        type="button"
                        disabled={profileQuery.isFetching}
                        onClick={() => void profileQuery.refetch()}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
              {visible.map((module, index) => {
                const activeModule =
                  module.id === "dashboard"
                    ? path === "/dashboard"
                    : selectedModule === module.id;
                const expanded =
                  expandedModule === module.id || Boolean(moduleQuery);
                const accent = ["#5ca8ec", "#f7bd23", "#8368ef", "#4fd3a1"][index % 4];
                const navSection = (item: typeof module) => item.id === "dashboard" || item.id === "call-center" ? "RECRUITMENT" : (item as any).isCountry ? "COUNTRIES" : ["payment-collection", "document", "passport-handover"].includes(item.id) ? "OPERATIONS" : ["country-setup", "tutorials"].includes(item.id) ? "ADMINISTRATION" : "COUNTRIES";
                const sectionHeading = (index === 0 || navSection(module) !== navSection(visible[index - 1])) ? navSection(module) : undefined;

                if (module.id === "dashboard") {
                  return (
                    <div
                      className="nav-group"
                      key={module.id}
                      data-module={module.id}
                      data-section={sectionHeading}
                      style={{ "--nav-accent": accent } as React.CSSProperties}
                    >
                      <Link
                        prefetch={true}
                        onClick={() => setOpen(false)}
                        href="/dashboard"
                        className={`nav-main dashboard-link ${activeModule ? "active" : ""}`}
                      >
                        <span className="nav-icon">
                          {dashboardNavIcons[module.id] ? <DashboardIcon name={dashboardNavIcons[module.id]} /> : <module.icon size={19} />}
                        </span>
                        <span>{module.label}</span>
                        <NavigationPending />
                      </Link>
                    </div>
                  );
                }

                if (module.items.length === 1) {
                  const singleItem = module.items[0];
                  const prefetchCountry = () => {
                    if (singleItem.label !== "Candidates List") return;
                    const country =
                      module.id === "ksa"
                        ? "Saudi Arabia"
                        : module.id === "other-country"
                          ? "Other Country"
                          : module.label;
                    void queryClient.prefetchQuery(
                      countryCandidatesQueryOptions(country),
                    );
                  };
                  const singleCount =
                    module.id === "country-setup"
                      ? dbCountries.length ||
                        (navCounts[module.id]?.[singleItem.label] ?? 0)
                      : (module as any).candidateCount !== undefined
                        ? (module as any).candidateCount
                        : (navCounts[module.id]?.[singleItem.label] ?? 0);
                  const hideBadge =
                    module.id === "document" || module.id === "payment-collection" || module.id === "passport-handover";
                  return (
                    <div
                      className="nav-group"
                      key={module.id}
                  data-module={module.id}
                  data-section={sectionHeading}
                  style={{ "--nav-accent": accent } as React.CSSProperties}
                >
                  <Link
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    onMouseEnter={prefetchCountry}
                    onFocus={prefetchCountry}
                    onTouchStart={prefetchCountry}
                    href={moduleItemPath(module.id, singleItem.label)}
                    className={`nav-main ${activeModule ? "active active-module" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="nav-main-content">
                      <span
                        className={`nav-icon ${(module as any).isCountry ? "nav-country-icon" : ""}`}
                        aria-hidden="true"
                      >
                        {(module as any).flag ? (
                          (module as any).flag === "🌐" ? <DashboardIcon name="Globe" /> : (module as any).flag
                        ) : dashboardNavIcons[module.id] ? <DashboardIcon name={dashboardNavIcons[module.id]} /> : <module.icon size={19} />}

                      </span>
                      <span>{module.label}</span>
                    </span>
                    {!hideBadge && (
                      <span className="nav-badge">{singleCount}</span>
                    )}
                    <NavigationPending />
                  </Link>
                </div>
              );
            }

            return (
              <div
                className={`nav-group ${expanded ? "expanded" : ""}`}
                key={module.id}
                data-module={module.id}
                data-section={sectionHeading}
                style={{ "--nav-accent": accent } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={`nav-main nav-toggle ${activeModule ? "active-module" : ""}`}
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedModule((current) =>
                      current === module.id ? null : module.id,
                    )
                  }
                >
                  <span
                    className={`nav-icon ${(module as any).isCountry ? "nav-country-icon" : ""}`}
                    aria-hidden="true"
                  >
                    {(module as any).flag ? (
                      (module as any).flag === "🌐" ? <DashboardIcon name="Globe" /> : (module as any).flag
                    ) : dashboardNavIcons[module.id] ? <DashboardIcon name={dashboardNavIcons[module.id]} /> : <module.icon size={19} />}

                  </span>
                  <span>{module.label}</span>
                  <DashboardIcon name="ChevronDown" className="nav-chevron" />
                </button>
                <div className="nav-children">
                  {module.items.map((item) => {
                    const itemActive =
                      activeModule &&
                      selectedPage === moduleItemSlug(item.label);
                    const count = navCounts[module.id]?.[item.label] ?? 0;
                    const isActionItem = /^(create|add|new|register\s*$)/i.test(
                      item.label.trim(),
                    );
                    return (
                      <Link
                        key={item.label}
                        prefetch={true}
                        className={`nav-child ${itemActive ? "active" : ""}`}
                        onClick={() => setOpen(false)}
                        href={moduleItemPath(module.id, item.label)}
                      >
                        <span className="nav-child-label">
                          <i /> <span>{item.label}</span>
                        </span>
                        {!isActionItem && (
                          <span className="nav-badge">{count}</span>
                        )}
                        <NavigationPending />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {profile?.roleKey === "SUPER_ADMIN" && (
            <>
              <div
                className="nav-group"
                data-module="permissions"
                style={{ "--nav-accent": "#8368ef" } as React.CSSProperties}
              >
                <Link
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  href="/permissions"
                  className={`nav-main ${path === "/permissions" ? "active active-module" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span
                    className="nav-main-content"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span className="nav-icon">
                      <DashboardIcon name="ShieldCheck" />
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Permissions
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#f0edff",
                      color: "#7258e8",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      maxWidth: "50px",
                      width: "auto",
                      textAlign: "center",
                      display: "inline-block",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Admin
                  </span>
                  <NavigationPending />
                </Link>
              </div>

              <div
                className="nav-group"
                data-module="settings"
                style={{ "--nav-accent": "#f59e0b" } as React.CSSProperties}
              >
                <Link
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  href="/settings"
                  className={`nav-main ${
                    path === "/settings" || path === "/general-settings"
                      ? "active active-module"
                      : ""
                  }`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <span
                    className="nav-main-content"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span className="nav-icon">
                      <DashboardIcon name="Settings" />
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      General Settings
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      maxWidth: "50px",
                      width: "auto",
                      textAlign: "center",
                      display: "inline-block",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Admin
                  </span>
                  <NavigationPending />
                </Link>
              </div>
            </>
          )}
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="support-card">
            <DashboardIcon name="ConnectionIndicator" className="pulse-dot" />
            <b>{isPortalRoute ? "Verified Agent" : "Office Online"}</b>
            <span>{isPortalRoute ? (portalAgentData?.name || "Partner Portal Active") : "Control Center Active"}</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="app-header">
          <button className="icon menu-button" aria-label="Open navigation menu" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <Link className="mobile-header-brand" href={isPortalRoute ? `/portal/agent${effectiveAgentId ? `?agentId=${encodeURIComponent(effectiveAgentId)}` : ""}` : "/dashboard"}>
            <span
              className="brand-mark mobile-brand-icon"
              style={{
                display: "grid",
                placeItems: "center",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.softwareName}
                  style={{ width: "26px", height: "26px", objectFit: "contain", borderRadius: "4px" }}
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={26}
                  height={26}
                  style={{ objectFit: "contain" }}
                  priority
                  unoptimized
                />
              )}
            </span>
            <div className="mobile-brand-text">
              <b className="mobile-brand-title">{settings.softwareName}</b>
              <small className="mobile-brand-sub">{isPortalRoute ? "AGENT PARTNER PORTAL" : settings.softwareSubtitle}</small>
            </div>
          </Link>
          <div className={`global-search ${mobileSearchOpen ? "mobile-search-active" : ""}`}>
            <DashboardIcon name="Search" />
            <input
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder={isPortalRoute ? "Search candidate, phone, passport..." : "Search candidate, phone, lead..."}
              autoFocus={mobileSearchOpen}
            />
            <span className="search-shortcut">
              <Command size={13} /> K
            </span>
            {mobileSearchOpen && (
              <button
                type="button"
                className="mobile-search-close"
                aria-label="Close search"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setGlobalQuery("");
                  setResults([]);
                }}
              >
                <X size={18} />
              </button>
            )}
            {results.length > 0 && (
              <div className="search-results">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={isPortalRoute ? `/portal/agent/candidate/${result.id}${effectiveAgentId ? `?agentId=${encodeURIComponent(effectiveAgentId)}` : ""}` : `/file/${result.id}`}
                    onClick={() => {
                      setResults([]);
                      setGlobalQuery("");
                      setMobileSearchOpen(false);
                    }}
                  >
                    <b>
                      {result.fileNo} · {result.name}
                    </b>
                    <small>
                      {result.passport ?? "No passport"} · {result.country} ·{" "}
                      {result.stage}
                    </small>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="icon dashboard-header-search" aria-label="Focus candidate search" onClick={() => document.querySelector<HTMLInputElement>(".global-search input")?.focus()}><DashboardIcon name="Search1" /></button>
            <button
              className="icon mobile-search-btn"
              aria-label="Toggle search"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
            >
              <Search size={20} />
            </button>
            {isPortalRoute && profile?.roleKey === "SUPER_ADMIN" ? (
              <Link
                href="/dashboard"
                className="icon desktop-only-action"
                aria-label="Back to Admin Dashboard"
                title="Back to Admin Requirements Panel"
              >
                <DashboardIcon name="Layers" />
              </Link>
            ) : (
              <Link
                href="/settings"
                className="icon desktop-only-action"
                aria-label="General Settings"
                title="General Settings"
              >
                <DashboardIcon name="Settings" />
              </Link>
            )}
            <button className="icon notification" aria-label="Notifications">
              <DashboardIcon name="Bell" />
              {isPortalRoute ? (
                portalMissingDocsCount > 0 && <i>{portalMissingDocsCount}</i>
              ) : (
                Boolean(profile?.unreadNotifications) && (
                  <i>{profile?.unreadNotifications}</i>
                )
              )}
            </button>
            <span className="header-divider" aria-hidden="true" />
            <div className="profile">
              <div className="avatar">{initials}</div>
              <span>
                <b>{displayName}</b>
                <small>{displayRole}</small>
              </span>
              <DashboardIcon name="ChevronDown" />
            </div>
            <button data-action-ui="neutral" data-action-size="icon" className="icon logout-btn" title="Logout" aria-label="Logout" onClick={logout}>
              <DashboardIcon name="LogOut" />
            </button>
          </div>
        </header>
        <main>{children}</main>
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {isPortalRoute ? (
            <>
              <Link
                href={`/portal/agent${effectiveAgentId ? `?agentId=${encodeURIComponent(effectiveAgentId)}` : ""}`}
                className={`mobile-tab-item ${path === "/portal/agent" && !portalQuery.tab ? "active" : ""}`}
              >
                <Layers size={21} />
                <span>Dashboard</span>
              </Link>
              <Link
                href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=candidates`}
                className={`mobile-tab-item ${portalQuery.tab === "candidates" || path.startsWith("/portal/agent/candidate") ? "active" : ""}`}
              >
                <Users size={21} />
                <span>Candidates</span>
              </Link>
              <Link
                href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=missing`}
                className={`mobile-tab-item ${portalQuery.tab === "missing" ? "active" : ""}`}
              >
                <FileWarning size={21} />
                <span>Missing</span>
              </Link>
              <Link
                href={`/portal/agent?${effectiveAgentId ? `agentId=${encodeURIComponent(effectiveAgentId)}&` : ""}tab=ledger`}
                className={`mobile-tab-item ${portalQuery.tab === "ledger" ? "active" : ""}`}
              >
                <FileText size={21} />
                <span>Ledger</span>
              </Link>
              <button
                type="button"
                className={`mobile-tab-item ${open ? "active" : ""}`}
                onClick={() => setOpen(true)}
                aria-label="Open full menu"
              >
                <MoreHorizontal size={21} />
                <span>More</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`mobile-tab-item ${path === "/dashboard" ? "active" : ""}`}
              >
                <Layers size={21} />
                <span>Pipelines</span>
              </Link>
              <Link
                href="/candidates"
                className={`mobile-tab-item ${path.startsWith("/candidate") ? "active" : ""}`}
              >
                <Users size={21} />
                <span>Candidates</span>
              </Link>
              <Link
                href="/module/country-setup"
                className={`mobile-tab-item ${path.startsWith("/module/country-setup") || path.startsWith("/country-pipeline") || path.startsWith("/module/ksa") ? "active" : ""}`}
              >
                <Globe size={21} />
                <span>Routing</span>
              </Link>
              <Link
                href="/demands"
                className={`mobile-tab-item ${path.startsWith("/demands") || path.startsWith("/payments") ? "active" : ""}`}
              >
                <FileText size={21} />
                <span>Demands</span>
              </Link>
              <button
                type="button"
                className={`mobile-tab-item ${open ? "active" : ""}`}
                onClick={() => setOpen(true)}
                aria-label="Open full menu"
              >
                <MoreHorizontal size={21} />
                <span>More</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
