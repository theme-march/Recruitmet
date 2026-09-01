"use client";

import { Bell, Building2, ChevronDown, Command, Globe, Headphones, LogOut, Menu, Search, Settings, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { moduleItemPath, moduleItemSlug, modules } from "@/lib/modules";
import { allModuleIds, moduleIdsForRole, type AppRole } from "@/lib/roles";

type Profile = { name: string; role: string; roleKey: AppRole; home: string; office: string | null; unreadNotifications: number; allowedModules?: string[] };
type SearchResult = { id: string; fileNo: string; name: string; passport: string | null; country: string; stage: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [moduleQuery, setModuleQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [navCounts, setNavCounts] = useState<Record<string, Record<string, number>>>({});
  const [dbCountries, setDbCountries] = useState<Array<{ id: string; name: string; code: string; active: boolean; candidateCount: number }>>([]);
  const path = usePathname();
  const isPortalRoute = path.startsWith("/portal");
  const routeParts = path.split("/").filter(Boolean);
  const selectedModule = routeParts[0] === "module" ? routeParts[1] : null;
  const selectedPage = routeParts[0] === "module" ? routeParts[2] : null;

  const visible = useMemo(() => {
    if (!profile || profile?.roleKey === "AGENT" || isPortalRoute) {
      return [];
    }

    const allowed = profile.roleKey === "SUPER_ADMIN"
      ? allModuleIds
      : (profile.allowedModules || moduleIdsForRole(profile.roleKey));

    const nonCountryModules = modules.filter(
      (m) => !["ksa", "dubai", "other-country"].includes(m.id) && !m.hidden && allowed.includes(m.id as any)
    );

    const countryMods = dbCountries.length > 0
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

            const icon = lower.includes("saudi") ? Globe : lower.includes("dubai") ? Building2 : Globe;

            return {
              id,
              label: c.name,
              icon,
              items: [{ id: "1", label: "Candidates List" }],
              candidateCount: c.candidateCount,
            };
          })
      : modules.filter((m) => ["ksa", "dubai", "other-country"].includes(m.id));

    const callCenterIdx = nonCountryModules.findIndex((m) => m.id === "call-center");
    const combined = [...nonCountryModules];
    if (callCenterIdx >= 0) {
      combined.splice(callCenterIdx + 1, 0, ...countryMods as any);
    } else {
      combined.push(...countryMods as any);
    }

    return combined.filter(
      (m) =>
        m.label.toLowerCase().includes(moduleQuery.toLowerCase()) ||
        m.items.some((item) => item.label.toLowerCase().includes(moduleQuery.toLowerCase()))
    );
  }, [moduleQuery, profile, dbCountries]);

  useEffect(() => {
    void fetch("/api/me").then((response) => response.ok ? response.json() : null).then((body) => setProfile(body?.data ?? null));
    void fetch("/api/nav-counts").then((response) => response.ok ? response.json() : null).then((body) => setNavCounts(body?.data ?? {}));
    void fetch("/api/countries").then((response) => response.ok ? response.json() : null).then((body) => setDbCountries(body?.data ?? []));
  }, [path]);

  useEffect(() => {
    const current = path.match(/^\/module\/([^/]+)/)?.[1];
    setExpandedModule(current || null);
  }, [path]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalQuery.trim().length < 2) { setResults([]); return; }
      void fetch(`/api/search?q=${encodeURIComponent(globalQuery.trim())}`).then((response) => response.ok ? response.json() : []).then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [globalQuery]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const initials = profile?.name.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "AG";

  if (isPortalRoute) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
        <header
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
                background: "#7258e8",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: "15px",
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <b style={{ fontSize: "14.5px", letterSpacing: "-0.01em", color: "var(--ink)", display: "block" }}>
                ORBIT
              </b>
              <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#7258e8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Agent Partner Portal
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid var(--line)" }}>
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
                <b style={{ fontSize: "12px", color: "var(--ink)", display: "block" }}>
                  {profile?.name || "Agent Partner"}
                </b>
                <span style={{ fontSize: "10.5px", color: "#10b981", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <ShieldCheck size={11} /> Verified Agent
                </span>
              </div>
            </div>

            <button
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

        <main style={{ flex: 1, width: "100%", maxWidth: "100%" }}>{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Users size={20} /></span>
          <span><b>ORBIT</b><small>CANDIDATES PANEL</small></span>
          <button className="icon mobile" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <div className="side-search">
          <Search size={16} />
          <input value={moduleQuery} onChange={(event) => setModuleQuery(event.target.value)} placeholder="Quick filter..." />
          <kbd>Ctrl K</kbd>
        </div>
        <nav>
          {visible.map((module, index) => {
            const activeModule = module.id === "dashboard" ? path === "/dashboard" : selectedModule === module.id;
            const expanded = expandedModule === module.id || Boolean(moduleQuery);
            const accent = ["#5ca8ec", "#f7bd23", "#8368ef", "#4fd3a1"][index % 4];

            if (module.id === "dashboard") {
              return (
                <div className="nav-group" key={module.id} style={{ "--nav-accent": accent } as React.CSSProperties}>
                  <Link prefetch={true} onClick={() => setOpen(false)} href="/dashboard" className={`nav-main dashboard-link ${activeModule ? "active" : ""}`}>
                    <span className="nav-icon"><module.icon size={19} /></span>
                    <span>{module.label}</span>
                  </Link>
                </div>
              );
            }

            if (module.items.length === 1) {
              const singleItem = module.items[0];
              const singleCount =
                module.id === "country-setup"
                  ? (dbCountries.length || (navCounts[module.id]?.[singleItem.label] ?? 0))
                  : (module as any).candidateCount !== undefined
                  ? (module as any).candidateCount
                  : (navCounts[module.id]?.[singleItem.label] ?? 0);
              const hideBadge = module.id === "document" || module.id === "payment-collection";
              return (
                <div className="nav-group" key={module.id} style={{ "--nav-accent": accent } as React.CSSProperties}>
                  <Link
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    href={moduleItemPath(module.id, singleItem.label)}
                    className={`nav-main ${activeModule ? "active active-module" : ""}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span className="nav-main-content">
                      <span className="nav-icon"><module.icon size={19} /></span>
                      <span>{module.label}</span>
                    </span>
                    {!hideBadge && <span className="nav-badge">{singleCount}</span>}
                  </Link>
                </div>
              );
            }

            return (
              <div className={`nav-group ${expanded ? "expanded" : ""}`} key={module.id} style={{ "--nav-accent": accent } as React.CSSProperties}>
                <button
                  type="button"
                  className={`nav-main nav-toggle ${activeModule ? "active-module" : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setExpandedModule((current) => current === module.id ? null : module.id)}
                >
                  <span className="nav-icon"><module.icon size={19} /></span>
                  <span>{module.label}</span>
                  <ChevronDown className="nav-chevron" size={16} />
                </button>
                <div className="nav-children">
                  {module.items.map((item) => {
                    const itemActive = activeModule && selectedPage === moduleItemSlug(item.label);
                    const count = navCounts[module.id]?.[item.label] ?? 0;
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
                        <span className="nav-badge">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {profile?.roleKey === "SUPER_ADMIN" && (
            <div className="nav-group" style={{ "--nav-accent": "#8368ef" } as React.CSSProperties}>
              <Link
                prefetch={true}
                onClick={() => setOpen(false)}
                href="/permissions"
                className={`nav-main ${path === "/permissions" ? "active active-module" : ""}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}
              >
                <span className="nav-main-content" style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span className="nav-icon"><ShieldCheck size={19} /></span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Permissions</span>
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
              </Link>
            </div>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="support-card">
            <div className="pulse-dot" />
            <b>Office Online</b>
            <span>Call Center Active</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header>
          <button className="icon menu-button" onClick={() => setOpen(true)}><Menu /></button>
          <Link className="mobile-header-brand" href="/dashboard"><b>ORBIT</b><small>OFFICE PANEL</small></Link>
          <div className="global-search">
            <Search size={18} />
            <input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search candidate, phone, lead..." />
            <span><Command size={13} /> K</span>
            {results.length > 0 && (
              <div className="search-results">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/file/${result.id}`}
                    onClick={() => { setResults([]); setGlobalQuery(""); }}
                  >
                    <b>{result.fileNo} · {result.name}</b>
                    <small>{result.passport ?? "No passport"} · {result.country} · {result.stage}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="icon"><Settings size={19} /></button>
            <button className="icon notification">
              <Bell size={19} />
              {Boolean(profile?.unreadNotifications) && <i>{profile?.unreadNotifications}</i>}
            </button>
            <div className="profile">
              <div className="avatar">{initials}</div>
              <span>
                <b>{profile?.name ?? "Officer"}</b>
                <small>{profile?.role ?? "Call Center"}</small>
              </span>
              <ChevronDown size={16} />
            </div>
            <button className="icon" title="Logout" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

