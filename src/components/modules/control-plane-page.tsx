"use client";

import { Activity, Building2, Check, Database, Save, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { operationalModuleIds } from "@/lib/roles";

type Tab = "users" | "offices" | "permissions" | "settings" | "audit";
type User = { id: string; name: string; email: string; username: string; status: string; roleId: string; officeId: string | null; role: string; office: string };
type Office = { id: string; code: string; name: string; city: string | null; country: string | null; status: string };
type Role = { id: string; name: string; users: number; modules: string[] };
type Setting = { id: string; group: string; key: string; value: string };
type Audit = { id: string; action: string; module: string; recordId: string; actor: string; role: string; createdAt: string };
type Props = { superAdmin: boolean; currentOfficeId: string | null; initialTab: string; users: User[]; offices: Office[]; roles: Role[]; settings: Setting[]; audit: Audit[] };

export function ControlPlanePage({ superAdmin, currentOfficeId, initialTab, users: initialUsers, offices: initialOffices, roles, settings: initialSettings, audit }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab as Tab);
  const [users, setUsers] = useState(initialUsers);
  const [offices, setOffices] = useState(initialOffices);
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const configurableRoles = useMemo(() => roles.filter((role) => role.name !== "Super Administrator"), [roles]);
  const allowedRoles = useMemo(() => superAdmin ? configurableRoles : roles.filter((role) => role.name === "Call Center"), [configurableRoles, roles, superAdmin]);
  const [selectedRoleId, setSelectedRoleId] = useState(configurableRoles[0]?.id ?? "");
  const [roleModules, setRoleModules] = useState<Record<string, string[]>>(() => Object.fromEntries(roles.map((role) => [role.id, role.modules])));
  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return query ? users.filter((user) => [user.name, user.email, user.username, user.role, user.office].some((value) => value.toLowerCase().includes(query))) : users;
  }, [userQuery, users]);

  function changeTab(next: Tab) {
    setTab(next);
    if (superAdmin) window.history.replaceState(null, "", `/super-admin/control?tab=${next}`);
  }

  async function send(url: string, method: string, payload: unknown) {
    setSaving(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? body.error ?? "Save failed");
      toast.success("Saved to MySQL successfully");
      return body.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const roleId = String(form.get("roleId"));
      const officeId = String(form.get("officeId") || currentOfficeId || "") || null;
      const created = await send("/api/admin/users", "POST", { name: form.get("name"), email: form.get("email"), username: form.get("username"), employeeId: form.get("employeeId") || undefined, phone: form.get("phone") || undefined, password: form.get("password"), roleId, officeId: officeId ?? undefined });
      setUsers((current) => [{ id: created.id, name: created.name, email: String(form.get("email")), username: String(form.get("username")), status: created.status, roleId, officeId, role: allowedRoles.find((role) => role.id === roleId)?.name ?? "Call Center", office: offices.find((office) => office.id === officeId)?.name ?? "Unassigned" }, ...current]);
      formElement.reset();
    } catch {}
  }

  async function updateStatus(userId: string, status: string) {
    try { await send("/api/admin/users", "PATCH", { userId, status }); setUsers((current) => current.map((user) => user.id === userId ? { ...user, status } : user)); } catch {}
  }

  async function createOffice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const created = await send("/api/admin/control-plane", "POST", { action: "CREATE_OFFICE", code: form.get("code"), name: form.get("name"), city: form.get("city") || undefined, country: form.get("country") || undefined, phone: form.get("phone") || undefined, email: form.get("email") || undefined });
      setOffices((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      formElement.reset();
    } catch {}
  }

  async function savePermissions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const modules = roleModules[selectedRoleId] ?? [];
      await send("/api/admin/control-plane", "POST", { action: "UPDATE_PERMISSIONS", roleId: selectedRoleId, modules });
      router.refresh();
    } catch {}
  }

  async function saveSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const saved = await send("/api/admin/control-plane", "POST", { action: "SAVE_SETTING", group: form.get("group"), key: form.get("key"), value: form.get("value") });
      setSettings((current) => [...current.filter((item) => !(item.group === saved.group && item.key === saved.key)), { id: saved.id, group: saved.group, key: saved.key, value: typeof saved.value === "string" ? saved.value : JSON.stringify(saved.value) }].sort((a, b) => `${a.group}.${a.key}`.localeCompare(`${b.group}.${b.key}`)));
      formElement.reset();
    } catch {}
  }

  function toggleModule(module: string) {
    setRoleModules((current) => {
      const selected = current[selectedRoleId] ?? [];
      return { ...current, [selectedRoleId]: selected.includes(module) ? selected.filter((item) => item !== module) : [...selected, module] };
    });
  }

  const tabs = [{ id: "users", label: "Users", icon: Users }, ...(superAdmin ? [{ id: "permissions", label: "Roles & permissions", icon: ShieldCheck }, { id: "offices", label: "Offices", icon: Building2 }, { id: "settings", label: "Settings", icon: Database }, { id: "audit", label: "Audit activity", icon: Activity }] : [])] as const;

  return <div className="control-plane">
    <div className="admin-page-head"><div><span>{superAdmin ? "GLOBAL SYSTEM CONTROL" : "CALL CENTER MANAGEMENT"}</span><h1>{superAdmin ? "Super Admin Control Plane" : "Admin Control Plane"}</h1><p>One secure workspace for users, roles, offices, settings and audited database changes.</p></div></div>
    <div className="control-tabs" role="tablist">{tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} key={item.id} className={tab === item.id ? "active" : ""} onClick={() => changeTab(item.id as Tab)}><item.icon size={17} />{item.label}</button>)}</div>

    {tab === "users" && <div className="control-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2><UserPlus size={18} /> Create user</h2><p>{superAdmin ? "Create Administrator or Call Center accounts and assign an office." : "Create Call Center users for your office."}</p></div></div><form className="control-form" onSubmit={createUser}><label>Full name<input name="name" required minLength={2} /></label><label>Email<input name="email" type="email" required /></label><label>Username<input name="username" required minLength={3} /></label><label>Employee ID<input name="employeeId" /></label><label>Phone<input name="phone" /></label><label>Temporary password<input name="password" type="password" required minLength={10} /></label><label>Role<select name="roleId" required>{allowedRoles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><label>Office<select name="officeId" defaultValue={currentOfficeId ?? ""} disabled={!superAdmin}>{offices.map((office) => <option value={office.id} key={office.id}>{office.name}</option>)}</select></label><button disabled={saving}><UserPlus size={16} />Create database user</button></form></section><section className="admin-panel control-list"><div className="admin-panel-head"><div><h2>Current users</h2><p>{filteredUsers.length} of {users.length} account(s) in scope.</p></div></div><label className="control-search"><Search size={16} /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search user, role or office" /></label><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Role / Office</th><th>Access</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><b>{user.name}</b><small>{user.email}</small></td><td><b>{user.role}</b><small>{user.office}</small></td><td><select aria-label={`Access status for ${user.name}`} value={user.status} disabled={saving} onChange={(event) => void updateStatus(user.id, event.target.value)}><option>ACTIVE</option><option>INACTIVE</option><option>LOCKED</option><option>ON_LEAVE</option></select></td></tr>)}</tbody></table></div></section></div>}

    {tab === "permissions" && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Fixed roles & permission matrix</h2><p>Exactly three roles are supported. Super Administrator stays protected with full access.</p></div></div><div className="role-summary">{roles.map((role) => <article key={role.id}><b>{role.name}</b><span>{role.users} user(s)</span><small>{role.name === "Super Administrator" ? "Full protected access" : `${role.modules.length} modules enabled`}</small></article>)}</div><form className="permission-form" onSubmit={savePermissions}><label>Configure role<select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)} required>{configurableRoles.map((role) => <option value={role.id} key={role.id}>{role.name} ({role.users} users)</option>)}</select></label><fieldset>{operationalModuleIds.map((module) => <label key={module} className={(roleModules[selectedRoleId] ?? []).includes(module) ? "selected" : ""}><input type="checkbox" checked={(roleModules[selectedRoleId] ?? []).includes(module)} onChange={() => toggleModule(module)} /><Check size={14} />{module.replaceAll("-", " ")}</label>)}</fieldset><button disabled={saving || !selectedRoleId}><Save size={16} />Save permission matrix</button></form></section>}

    {tab === "offices" && <div className="control-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Create office</h2><p>Add a branch for user and operational-data assignment.</p></div></div><form className="control-form" onSubmit={createOffice}><label>Office code<input name="code" required /></label><label>Office name<input name="name" required /></label><label>City<input name="city" /></label><label>Country<input name="country" /></label><label>Phone<input name="phone" /></label><label>Email<input name="email" type="email" /></label><button disabled={saving}><Building2 size={16} />Add office to database</button></form></section><section className="admin-panel control-list"><div className="admin-panel-head"><div><h2>Office directory</h2><p>{offices.length} configured office(s).</p></div></div>{offices.map((office) => <div className="control-row" key={office.id}><Building2 size={18} /><span><b>{office.name}</b><small>{office.code} · {office.city ?? "No city"} · {office.country ?? "No country"}</small></span><i>{office.status}</i></div>)}</section></div>}

    {tab === "settings" && <div className="control-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>System setting</h2><p>Save configurable application values without changing code.</p></div></div><form className="control-form" onSubmit={saveSetting}><label>Group<input name="group" placeholder="general" required /></label><label>Key<input name="key" placeholder="company_name" required /></label><label className="wide">Value<textarea name="value" required /></label><button disabled={saving}><Save size={16} />Save setting</button></form></section><section className="admin-panel control-list"><div className="admin-panel-head"><div><h2>Saved settings</h2><p>{settings.length} value(s).</p></div></div>{settings.map((setting) => <div className="control-row" key={setting.id}><Database size={18} /><span><b>{setting.group}.{setting.key}</b><small>{setting.value}</small></span></div>)}</section></div>}

    {tab === "audit" && <section className="admin-panel audit-panel"><div className="admin-panel-head"><div><h2><Activity size={18} /> Audit & activity</h2><p>Latest {audit.length} immutable administration and operational events.</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Module / Record</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td><b>{entry.actor}</b><small>{entry.role}</small></td><td><i>{entry.action.replaceAll("_", " ")}</i></td><td><b>{entry.module}</b><small>{entry.recordId}</small></td></tr>)}</tbody></table></div></section>}
  </div>;
}
