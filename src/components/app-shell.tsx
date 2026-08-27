"use client";

import { Bell, ChevronDown, Command, Headphones, LogOut, Menu, Search, Settings, ShieldCheck, X } from "lucide-react";
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
  const path = usePathname();
  const routeParts = path.split("/").filter(Boolean);
  const selectedModule = routeParts[0] === "module" ? routeParts[1] : null;
  const selectedPage = routeParts[0] === "module" ? routeParts[2] : null;

  const visible = useMemo(() => {
    const allowed = profile?.roleKey === "SUPER_ADMIN"
      ? allModuleIds
      : (profile?.allowedModules || (profile ? moduleIdsForRole(profile.roleKey) : allModuleIds));
    return modules.filter((module) => !module.hidden && allowed.includes(module.id) && (module.label.toLowerCase().includes(moduleQuery.toLowerCase()) || module.items.some((item) => item.label.toLowerCase().includes(moduleQuery.toLowerCase()))));
  }, [moduleQuery, profile]);

  useEffect(() => {
    void fetch("/api/me").then((response) => response.ok ? response.json() : null).then((body) => setProfile(body?.data ?? null));
    void fetch("/api/nav-counts").then((response) => response.ok ? response.json() : null).then((body) => setNavCounts(body?.data ?? {}));
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

  const initials = profile?.name.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "CC";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Headphones size={20} /></span>
          <span><b>ORBIT</b><small>CALL CENTER PANEL</small></span>
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
              const singleCount = navCounts[module.id]?.[singleItem.label] ?? 0;
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

