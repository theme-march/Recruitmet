"use client";

import {
  Building2,
  ChevronDown,
  Command,
  FileText,
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
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { moduleItemPath, moduleItemSlug, modules } from "@/lib/modules";
import { allModuleIds, moduleIdsForRole } from "@/lib/roles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { countryCandidatesQueryOptions } from "@/lib/queries/country-candidates";
import { NavigationPending } from "@/components/layout/navigation-pending";
import { countriesQueryOptions } from "@/lib/queries/countries";
import { getCountryFlagEmoji } from "@/lib/country-pipeline";

import { DashboardIcon, DashboardBrandMark, type DashboardIconName } from "@/components/layout/dashboard-icon";
import { meQueryOptions } from "@/lib/queries/me";
type SearchResult = {
  id: string;
  fileNo: string;
  name: string;
  passport: string | null;
  country: string;
  stage: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [moduleQuery, setModuleQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const profileQuery = useQuery(meQueryOptions());
  const profile = profileQuery.data?.data ?? null;
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
    "country-setup": "Globe", tutorials: "GraduationCap",
  };
  const isPortalRoute = path.startsWith("/portal");
  const routeParts = path.split("/").filter(Boolean);
  const selectedModule = routeParts[0] === "module" ? routeParts[1] : null;
  const selectedPage = routeParts[0] === "module" ? routeParts[2] : null;

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
          (m.id === "call-center" && allowed.includes("registration"))),
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
    const current = path.match(/^\/module\/([^/]+)/)?.[1];
    setExpandedModule(current || null);
  }, [path]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      void fetch(`/api/search?q=${encodeURIComponent(globalQuery.trim())}`)
        .then((response) => (response.ok ? response.json() : []))
        .then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [globalQuery]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const initials =
    profile?.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("") ?? "AG";

  if (isPortalRoute) {
    return (
      <div className="agent-portal-shell"
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header className="portal-shell-header"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid var(--line)",
            height: "64px",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 50,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "transparent",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                style={{ objectFit: "contain" }}
                priority
                unoptimized
              />
            </div>
            <div>
              <b
                style={{
                  fontSize: "14.5px",
                  letterSpacing: "-0.01em",
                  color: "var(--ink)",
                  display: "block",
                }}
              >
                ORBIT
              </b>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  color: "#007aff",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Agent Partner Portal
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "4px 12px",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#f0edff",
                  color: "#7258e8",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "11.5px",
                }}
              >
                {initials}
              </div>
              <div style={{ textAlign: "left" }}>
                <b
                  style={{
                    fontSize: "12px",
                    color: "var(--ink)",
                    display: "block",
                  }}
                >
                  {profile?.name || "Agent Partner"}
                </b>
                <span
                  style={{
                    fontSize: "10.5px",
                    color: "#10b981",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <ShieldCheck size={11} /> Verified Agent
                </span>
              </div>
            </div>

            <button data-action-ui="neutral" data-action-size="normal"
              type="button"
              onClick={logout}
              title="Logout from Portal"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 13px",
                borderRadius: "8px",
                background: "#fff1f2",
                color: "#e11d48",
                border: "1px solid #fecdd3",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </header>

        <main style={{ flex: 1, width: "100%", maxWidth: "100%" }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell home-sidebar-shell ${isDesignDashboard ? "figma-dashboard-shell" : ""}`}>
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
            <DashboardBrandMark />
          </span>
          <span>
            <b>ORBIT</b>
            <small>Requirements PANEL</small>
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
            const navSection = (item: typeof module) => item.id === "dashboard" || item.id === "call-center" ? "RECRUITMENT" : (item as any).isCountry ? "COUNTRIES" : ["payment-collection", "document"].includes(item.id) ? "OPERATIONS" : ["country-setup", "tutorials"].includes(item.id) ? "ADMINISTRATION" : "COUNTRIES";
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
                module.id === "document" || module.id === "payment-collection";
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
                data-module="candidate-options"
                style={{ "--nav-accent": "#8368ef" } as React.CSSProperties}
              >
                <Link
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  href="/candidate-options"
                  className={`nav-main ${
                    path === "/candidate-options"
                      ? "active active-module"
                      : ""
                  }`}
                >
                  <span className="nav-main-content">
                    <span className="nav-icon">
                      <DashboardIcon name="Database" />
                    </span>
                    <span>Candidate Form Options</span>
                  </span>
                  <NavigationPending />
                </Link>
              </div>

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
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="support-card">
            <DashboardIcon name="ConnectionIndicator" className="pulse-dot" />
            <b>Office Online</b>
            <span>Control Center Active</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="app-header">
          <button className="icon menu-button" aria-label="Open navigation menu" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <Link className="mobile-header-brand" href="/dashboard">
            <span
              className="brand-mark mobile-brand-icon"
              style={{
                display: "grid",
                placeItems: "center",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={26}
                height={26}
                style={{ objectFit: "contain" }}
                priority
                unoptimized
              />
            </span>
            <div className="mobile-brand-text">
              <b className="mobile-brand-title">ORBIT</b>
              <small className="mobile-brand-sub">Requirements PANEL</small>
            </div>
          </Link>
          <div className={`global-search ${mobileSearchOpen ? "mobile-search-active" : ""}`}>
            <DashboardIcon name="Search" />
            <input
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
              placeholder="Search candidate, phone, lead..."
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
                    href={`/file/${result.id}`}
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
            <button className="icon desktop-only-action" aria-label="Settings">
              <DashboardIcon name="Settings" />
            </button>
            <button className="icon notification" aria-label="Notifications">
              <DashboardIcon name="Bell" />
              {Boolean(profile?.unreadNotifications) && (
                <i>{profile?.unreadNotifications}</i>
              )}
            </button>
            <span className="header-divider" aria-hidden="true" />
            <div className="profile">
              <div className="avatar">{initials}</div>
              <span>
                <b>{profile?.name ?? "Account"}</b>
                <small>
                  {profile?.role ??
                    (profileQuery.isPending ? "Loading…" : "Unavailable")}
                </small>
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
        </nav>
      </div>
    </div>
  );
}
