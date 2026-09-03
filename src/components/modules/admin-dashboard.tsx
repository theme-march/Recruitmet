import { Activity, Building2, Files, Headphones, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export type AdminDashboardData = {
  title: string;
  subtitle: string;
  superAdmin: boolean;
  metrics: { users: number; offices: number; calls: number; files: number; activeSessions: number; roles: number };
  recentUsers: { id: string; name: string; role: string; office: string; status: string }[];
};

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const cards = [
    { label: data.superAdmin ? "Total system users" : "Office team users", value: data.metrics.users, icon: Users, tone: "violet" },
    { label: data.superAdmin ? "Active offices" : "Office call records", value: data.superAdmin ? data.metrics.offices : data.metrics.calls, icon: data.superAdmin ? Building2 : Headphones, tone: "blue" },
    { label: "Processing files", value: data.metrics.files, icon: Files, tone: "green" },
    { label: data.superAdmin ? "Configured roles" : "Active sessions", value: data.superAdmin ? data.metrics.roles : data.metrics.activeSessions, icon: data.superAdmin ? ShieldCheck : Activity, tone: "orange" },
  ];
  return <div className="admin-dashboard">
    <div className="admin-page-head"><div><span>{data.superAdmin ? "SYSTEM ADMINISTRATION" : "OPERATIONS MANAGEMENT"}</span><h1>{data.title}</h1><p>{data.subtitle}</p></div><div className="admin-head-actions"><Link href={data.superAdmin ? "/super-admin/control?tab=users" : "/admin/control"}>Open control plane</Link>{data.superAdmin && <Link className="primary" href="/super-admin/control?tab=permissions">Roles & permissions</Link>}</div></div>
    <section className="admin-kpis">{cards.map((card) => <article key={card.label}><div className={card.tone}><card.icon size={20} /></div><span>{card.label}</span><strong>{card.value.toLocaleString()}</strong><small>Live MySQL data</small></article>)}</section>
    <section className="admin-dashboard-grid"><article className="admin-panel"><div className="admin-panel-head"><div><h2>Team & access overview</h2><p>Recently added users and their current access level.</p></div><Link href={data.superAdmin ? "/super-admin/control?tab=users" : "/admin/control"}>View all</Link></div><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Office</th><th>Status</th></tr></thead><tbody>{data.recentUsers.map((user) => <tr key={user.id}><td><b>{user.name}</b></td><td>{user.role}</td><td>{user.office}</td><td><i className={user.status === "ACTIVE" ? "online" : ""}>{user.status}</i></td></tr>)}</tbody></table></div></article>
      <article className="admin-panel quick-panel"><div className="admin-panel-head"><div><h2>Quick controls</h2><p>Role-appropriate management actions.</p></div></div><Link href={data.superAdmin ? "/super-admin/control?tab=users" : "/admin/control"}><Users size={18} /><span><b>Add or manage user</b><small>{data.superAdmin ? "Assign one of the three system roles" : "Create and manage Call Center users"}</small></span></Link>{data.superAdmin && <Link href="/super-admin/control?tab=permissions"><ShieldCheck size={18} /><span><b>Permission matrix</b><small>Control access across every module</small></span></Link>}<Link href="/module/call-center/work-call-list"><Headphones size={18} /><span><b>Monitor call center</b><small>Review leads and officer activity</small></span></Link></article>
    </section>
  </div>;
}
