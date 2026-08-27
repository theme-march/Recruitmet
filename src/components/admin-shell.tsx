"use client";

import { Activity, Building2, Database, Headphones, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  children: React.ReactNode;
  profile: { name: string; role: string; office: string | null };
  variant: "admin" | "super-admin";
};

export function AdminShell({ children, profile, variant }: Props) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const searchParams = useSearchParams();
  const root = variant === "super-admin" ? "/super-admin" : "/admin";
  const superAdmin = variant === "super-admin";
  const items = superAdmin
    ? [
        { label: "Control Center", href: root, icon: LayoutDashboard },
        { label: "Officer Staff", href: "/super-admin/control?tab=users", tab: "users", icon: Users },
        { label: "Lead Control & Oversight", href: "/super-admin/work-calls", icon: Headphones },
        { label: "Master Demands & Vacancies", href: "/super-admin/master-data", icon: Building2 },
        { label: "Interview Drives", href: "/super-admin/interviews", icon: ShieldCheck },
        { label: "System Permissions", href: "/super-admin/control?tab=permissions", tab: "permissions", icon: ShieldCheck },
        { label: "Audit & Activity Logs", href: "/super-admin/control?tab=audit", tab: "audit", icon: Activity },
      ]
    : [
        { label: "Operations Overview", href: root, icon: LayoutDashboard },
        { label: "Team Management", href: "/admin/control", icon: Users },
        { label: "Call Center Queue", href: "/module/call-center/work-call-list", icon: Headphones },
        { label: "Country Processing", href: "/module/ksa/passport-list", icon: Building2 },
      ];
  const initials = profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <div className={`admin-shell ${superAdmin ? "super-admin-shell" : ""}`}>
      {open && <button className="admin-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={open ? "open" : ""}>
        <div className="admin-brand">
          <span>O</span>
          <div>
            <b>ORBIT</b>
            <small>{superAdmin ? "SUPER ADMIN CONTROL" : "MANAGEMENT"}</small>
          </div>
          <button onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        </div>
        <div className="admin-role-card">
          <ShieldCheck size={20} />
          <div>
            <small>Signed in as</small>
            <b>{profile.role}</b>
          </div>
        </div>
        <nav>
          {items.map((item) => {
            const selectedTab = searchParams.get("tab") ?? "users";
            const active =
              path === item.href ||
              ("tab" in item && path === "/super-admin/control" && selectedTab === item.tab);
            return (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className={active ? "active" : ""}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-side-foot">
          <Link href="/dashboard">
            <Headphones size={17} /> Open Office Panel
          </Link>
          <button onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header>
          <button className="admin-menu" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <b>{superAdmin ? "Super Admin Command Center" : "Admin Management Center"}</b>
            <small>{profile.office ?? "Headquarters"}</small>
          </div>
          <div className="admin-profile">
            <span>{initials}</span>
            <div>
              <b>{profile.name}</b>
              <small>{profile.role}</small>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </section>
    </div>
  );
}

