"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Save, Users, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import type { PermissionMap, PermissionModule } from "@/lib/permission-policy";
import styles from "./access-control.module.css";

type Role = { id: string; name: string; description: string | null; kind: string; status: string; updatedAt: string; userCount: number; granularPermissions: PermissionMap };
type Office = { id: string; name: string };
type Staff = { id: string; name: string; email: string; username: string; status: string; role: { id: string; name: string }; office: Office | null };
type RolesData = { roles: Role[]; catalog: PermissionModule[]; offices: Office[] };
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message || "Request failed.");
  return body;
}
const actionLabel: Record<string, string> = { read: "View", create: "Create", edit: "Edit", delete: "Delete", export: "Export / Download", assign: "Assign", import: "Import", verify: "Verify", refund: "Refund", hold: "Hold", return: "Return", reprocess: "Reprocess" };

export function AccessControlPanel() {
  const client = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<"roles" | "staff">("roles");
  const [selected, setSelected] = useState<string | null>(null);
  const roles = useQuery({ queryKey: ["admin-roles"], queryFn: () => api<{ data: RolesData }>("/api/admin/roles"), refetchOnWindowFocus: false });
  async function refresh() {
    await Promise.all([client.invalidateQueries({ queryKey: ["admin-roles"] }), client.invalidateQueries({ queryKey: ["admin-users-list"] }), client.invalidateQueries({ queryKey: ["me"] })]);
    router.refresh();
  }
  if (roles.isPending) return <section className={styles.root}><p role="status">Loading roles and access settings…</p></section>;
  if (roles.isError) return <section className={styles.root}><p role="alert">{roles.error.message}</p><button onClick={() => roles.refetch()}>Retry</button></section>;
  const data = roles.data.data;
  const staffRoles = data.roles.filter(r => r.kind !== "AGENT");
  const role = staffRoles.find(r => r.id === selected) ?? (selected === "new" ? undefined : staffRoles.find(r => r.kind === "CALL_CENTER"));
  return <section className={styles.root}>
    <header className={styles.header}><div><small>ADMINISTRATION / ACCESS CONTROL</small><h1><ShieldCheck size={27} /> System Administration & Access Control</h1><p>Create roles, choose permitted work, then assign staff. Unchecked actions are blocked on the server.</p></div></header>
    <nav className={styles.tabs} aria-label="Administration sections">
      <button aria-pressed={tab === "roles"} onClick={() => setTab("roles")}><ShieldCheck size={16} /> Roles & Permissions</button>
      <button aria-pressed={tab === "staff"} onClick={() => setTab("staff")}><Users size={16} /> Staff & Access</button>
    </nav>
    {tab === "roles" ? <div className={styles.layout}>
      <aside className={styles.roleList}><div className={styles.row}><h2>Staff roles</h2><button aria-label="Create role" onClick={() => setSelected("new")}><Plus size={18} /></button></div>
        <p>Two default roles. Add custom roles for your team.</p>
        {staffRoles.map(r => <button className={styles.roleCard} key={r.id} aria-pressed={role?.id === r.id} onClick={() => setSelected(r.id)}><strong>{r.kind === "CALL_CENTER" ? "Call Center Officer" : r.name}</strong><span>{r.kind === "CUSTOM" ? "Custom role" : "Default role"} · {r.userCount} users</span></button>)}
        {data.roles.some(r => r.kind === "AGENT") && <p>Existing agent portal accounts are kept separately; they are not staff roles.</p>}
      </aside>
      <RoleEditor key={role ? role.id + role.updatedAt : "new"} role={role} catalog={data.catalog} onSaved={async id => { await refresh(); setSelected(id); }} onDeleted={async () => { setSelected(null); await refresh(); }} />
    </div> : <StaffManager roles={staffRoles} offices={data.offices} onChanged={refresh} />}
  </section>;
}

function RoleEditor({ role, catalog, onSaved, onDeleted }: { role?: Role; catalog: PermissionModule[]; onSaved: (id: string) => Promise<void>; onDeleted: () => Promise<void> }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [map, setMap] = useState<PermissionMap>(role?.granularPermissions ?? {});
  const [filter, setFilter] = useState("");
  const locked = role?.kind === "SUPER_ADMIN";
  const baseline = JSON.stringify(role?.granularPermissions ?? {});
  const dirty = name !== (role?.name ?? "") || description !== (role?.description ?? "") || JSON.stringify(map) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = useMutation({
    mutationFn: () => api<{ data: { id: string } }>("/api/admin/roles", { method: "POST", body: JSON.stringify({ name, description, granularMap: map, ...(role ? { roleId: role.id, expectedUpdatedAt: role.updatedAt } : {}) }) }),
    onSuccess: async result => { toast.success("Role and permissions saved."); await onSaved(result.data.id); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: () => api("/api/admin/roles?roleId=" + role!.id, { method: "DELETE" }),
    onSuccess: async () => { toast.success("Unused role deleted."); await onDeleted(); }, onError: (error: Error) => toast.error(error.message),
  });
  function toggle(module: string, action: string) {
    setMap(previous => {
      const current = previous[module] ?? [];
      const next = current.includes(action) ? (action === "read" ? [] : current.filter(a => a !== action)) : [...new Set([...current, "read", action])];
      return { ...previous, [module]: next };
    });
  }
  if (locked) return <div className={styles.panel}><LockKeyhole size={32} /><h2>Super Administrator</h2><p>Protected system role with full access. Only Super Administrators can create roles and assign staff.</p><p>This role cannot be renamed, removed or restricted from this screen.</p></div>;
  return <form className={styles.panel} onSubmit={event => { event.preventDefault(); save.mutate(); }}>
    <div className={styles.row}><div><h2>{role ? "Edit role" : "Create custom role"}</h2><p>{role ? `Changes apply to all ${role.userCount} assigned users on their next request.` : "A new role starts with no access. Select only the work it needs."}</p></div><button className={styles.primary} disabled={save.isPending || !dirty || name.trim().length < 2}><Save size={16} /> {save.isPending ? "Saving…" : "Save role"}</button></div>
    <div className={styles.fields}><label>Role name<input required minLength={2} maxLength={80} value={name} disabled={role?.kind === "CALL_CENTER"} onChange={e => setName(e.target.value)} placeholder="e.g. Dubai Processing Officer" /></label><label>Description<input maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this team's responsibilities" /></label></div>
    <div className={styles.row}><input aria-label="Find permission module" placeholder="Find a module or country…" value={filter} onChange={e => setFilter(e.target.value)} /><span>{Object.values(map).filter(a => a.includes("read")).length} modules enabled</span><button type="button" onClick={() => setMap({})}>Clear all</button></div>
    <p className={styles.hint}>View is required for other actions. Turning View off removes all actions for that module. Dossier access includes its candidate details; payments and account provisioning have additional checks.</p>
    <fieldset disabled={save.isPending || remove.isPending} className={styles.permissions}>
      {catalog.filter(m => (m.label + m.description).toLowerCase().includes(filter.toLowerCase())).map(m => <div className={styles.permission} key={m.id}><div><h3>{m.label}</h3><p>{m.description}</p></div><div className={styles.checks}>{m.actions.map(action => <label key={action}><input type="checkbox" checked={(map[m.id] ?? []).includes(action)} onChange={() => toggle(m.id, action)} />{actionLabel[action] ?? action}</label>)}</div></div>)}
    </fieldset>
    <div className={styles.row}><span role="status">{dirty ? "Unsaved changes" : "All changes saved"}</span>{role?.kind === "CUSTOM" && <button type="button" disabled={role.userCount > 0 || remove.isPending} title={role.userCount ? "Reassign users before deleting" : undefined} onClick={() => { if (window.confirm(`Delete unused role “${role.name}”?`)) remove.mutate(); }}>Delete unused role</button>}</div>
  </form>;
}

function StaffManager({ roles, offices, onChanged }: { roles: Role[]; offices: Office[]; onChanged: () => Promise<void> }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const query = useQuery({ queryKey: ["admin-users-list", page, search], queryFn: () => api<{ data: Staff[]; meta: { total: number; totalPages: number } }>(`/api/admin/users?page=${page}&pageSize=25&q=${encodeURIComponent(search)}`) });
  return <div className={styles.panel}>
    <div className={styles.row}><div><h2>Staff & Access</h2><p>Each staff member has one role. Deactivate accounts instead of deleting their history.</p></div><button className={styles.primary} onClick={() => { setEditing(null); setAdding(true); }}><Plus size={16} /> Add staff</button></div>
    <input aria-label="Search staff" placeholder="Search name, email or username…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
    {(adding || editing) && <StaffEditor key={editing?.id ?? "new"} user={editing} roles={roles} offices={offices} onClose={() => { setAdding(false); setEditing(null); }} onSaved={async () => { setAdding(false); setEditing(null); await onChanged(); }} />}
    {query.isPending ? <p role="status">Loading staff…</p> : query.isError ? <p role="alert">{query.error.message}<button onClick={() => query.refetch()}>Retry</button></p> : <>
      <div className={styles.tableWrap}><table><thead><tr><th>Staff member</th><th>Role</th><th>Office</th><th>Status</th><th>Access</th></tr></thead><tbody>{query.data.data.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.role.name === "Call Center" ? "Call Center Officer" : user.role.name}</td><td>{user.office?.name ?? "Not assigned"}</td><td>{user.status}</td><td><button onClick={() => { setAdding(false); setEditing(user); }}>Manage access</button></td></tr>)}</tbody></table></div>
      {!query.data.data.length && <p>No staff match this search.</p>}
      <div className={styles.row}><span>{query.data.meta.total} accounts · Page {page} of {query.data.meta.totalPages}</span><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={page >= query.data.meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</button></div>
    </>}
  </div>;
}
function StaffEditor({ user, roles, offices, onClose, onSaved }: { user: Staff | null; roles: Role[]; offices: Office[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/admin/users", { method: user ? "PATCH" : "POST", body: JSON.stringify(body) }),
    onSuccess: async () => { toast.success(user ? "Staff access updated." : "Staff account created."); await onSaved(); },
    onError: (error: Error) => setError(error.message),
  });
  const isPortal = user && !roles.some(r => r.id === user.role.id);
  const protectedUser = user?.role.name === "Super Administrator";
  return <form className={styles.staffForm} onSubmit={event => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    if (!values.password) delete values.password;
    if (user) mutation.mutate({ ...values, userId: user.id, officeId: values.officeId || null });
    else { if (!values.officeId) delete values.officeId; mutation.mutate(values); }
  }}>
    <h3>{user ? `Manage access: ${user.name}` : "Create staff account"}</h3>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={mutation.isPending} className={styles.fields}>
      {!user && <><label>Full name<input name="name" required minLength={2} /></label><label>Email<input name="email" type="email" required /></label><label>Username<input name="username" required minLength={3} autoComplete="off" /></label></>}
      <label>Role<select name="roleId" defaultValue={user?.role.id ?? roles.find(r => r.kind === "CALL_CENTER")?.id} disabled={Boolean(isPortal || protectedUser)} required>{isPortal && <option value={user.role.id}>{user.role.name}</option>}{roles.filter(r => r.status === "ACTIVE").map(r => <option key={r.id} value={r.id}>{r.name === "Call Center" ? "Call Center Officer" : r.name}</option>)}</select></label>
      <label>Office<select name="officeId" defaultValue={user?.office?.id ?? ""}><option value="">Not assigned</option>{offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      {user && <label>Status<select name="status" defaultValue={user.status} disabled={protectedUser}>{["ACTIVE", "INACTIVE", "LOCKED", "ON_LEAVE"].map(s => <option key={s}>{s}</option>)}</select></label>}
      <label>{user ? "Reset password (optional)" : "Initial password"}<input name="password" type="password" minLength={12} maxLength={128} required={!user} autoComplete="new-password" placeholder="At least 12 characters" /></label>
    </fieldset>
    <div className={styles.row}><button className={styles.primary} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save staff access"}</button><button type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</button></div>
  </form>;
}
