"use client";

import { useEffect, useState, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Save,
  Users,
  LockKeyhole,
  Search,
  X,
  Check,
  Trash2,
  Info,
  AlertCircle,
  ChevronRight,
  Sliders,
  LayoutDashboard,
  PhoneCall,
  Calendar,
  Briefcase,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  FolderTree,
  Plane,
  AlertTriangle,
  Bell,
  Database,
  BarChart3,
  MapPin,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { PermissionMap, PermissionModule } from "@/lib/permission-policy";
import styles from "./access-control.module.css";
import { roleLabel, toAppRole } from "@/lib/roles";

type Role = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  status: string;
  updatedAt: string;
  userCount: number;
  granularPermissions: PermissionMap;
};

type Office = {
  id: string;
  name: string;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  username: string;
  status: string;
  role: { id: string; name: string };
  office: Office | null;
};

type RolesData = {
  roles: Role[];
  catalog: PermissionModule[];
  offices: Office[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : body.error?.message || "Request failed."
    );
  }
  return body;
}

const actionLabel: Record<string, string> = {
  read: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export / Download",
  assign: "Assign",
  import: "Import",
  verify: "Verify",
  refund: "Refund",
  hold: "Hold",
  return: "Return",
  reprocess: "Reprocess",
  approve: "Approve",
};

function getModuleIcon(id: string) {
  switch (id) {
    case "dashboard":
      return <LayoutDashboard size={18} />;
    case "call-center":
      return <PhoneCall size={18} />;
    case "registration":
      return <Calendar size={18} />;
    case "office-vendor":
      return <Briefcase size={18} />;
    case "agents":
      return <Users size={18} />;
    case "payment-collection":
      return <CreditCard size={18} />;
    case "document":
      return <FileText size={18} />;
    case "country-setup":
      return <Globe size={18} />;
    case "tutorials":
      return <GraduationCap size={18} />;
    case "files":
      return <FolderTree size={18} />;
    case "flights":
      return <Plane size={18} />;
    case "exceptions":
      return <AlertTriangle size={18} />;
    case "notifications":
      return <Bell size={18} />;
    case "master-data":
      return <Database size={18} />;
    case "reports":
      return <BarChart3 size={18} />;
    default:
      if (id.startsWith("ksa") || id.startsWith("dubai") || id.includes("country")) {
        return <MapPin size={18} />;
      }
      return <ShieldCheck size={18} />;
  }
}

export function AccessControlPanel() {
  const client = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<"roles" | "staff">("roles");
  const [selected, setSelected] = useState<string | null>(null);

  const roles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api<{ data: RolesData }>("/api/admin/roles"),
    refetchOnWindowFocus: false,
  });

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin-roles"] }),
      client.invalidateQueries({ queryKey: ["admin-users-list"] }),
      client.invalidateQueries({ queryKey: ["me"] }),
    ]);
    router.refresh();
  }

  if (roles.isPending) {
    return (
      <section className={styles.root}>
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Loading administration & access settings…</p>
        </div>
      </section>
    );
  }

  if (roles.isError) {
    return (
      <section className={styles.root}>
        <div className={styles.errorBox}>
          <AlertCircle size={36} color="#ff3b30" />
          <p>{roles.error.message}</p>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => roles.refetch()}
          >
            Retry Connection
          </button>
        </div>
      </section>
    );
  }

  const data = roles.data.data;
  const staffRoles = data.roles.filter((r) => r.kind !== "AGENT");
  const role =
    staffRoles.find((r) => r.id === selected) ??
    (selected === "new" ? undefined : staffRoles.find((r) => r.kind === "CALL_CENTER") ?? staffRoles[0]);

  const totalAssignedStaff = staffRoles.reduce((total, item) => total + item.userCount, 0);

  return (
    <section className={styles.root}>
      {/* Apple Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Dashboard</span>
        <ChevronRight size={13} className={styles.breadcrumbSeparator} />
        <span>Administration</span>
        <ChevronRight size={13} className={styles.breadcrumbSeparator} />
        <span className={styles.breadcrumbCurrent}>Permissions</span>
      </nav>

      {/* Apple Page Header */}
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <ShieldCheck size={28} />
        </div>
        <div className={styles.headerContent}>
          <h1>System Administration & Access Control</h1>
          <p>
            One Super Administrator manages staff access. Create a role, choose its permitted work, then assign it to staff.
          </p>
        </div>
      </header>

      {/* Apple Metrics Cards */}
      <section className={styles.metricsGrid} aria-label="Key access statistics">
        <article className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Staff Roles</span>
            <div className={`${styles.metricIconBadge} ${styles.metricBadgePurple}`}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className={styles.metricValue}>{staffRoles.length}</div>
          <p className={styles.metricDesc}>Default and custom roles</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Assigned Staff</span>
            <div className={`${styles.metricIconBadge} ${styles.metricBadgeBlue}`}>
              <Users size={16} />
            </div>
          </div>
          <div className={styles.metricValue}>{totalAssignedStaff}</div>
          <p className={styles.metricDesc}>Staff assigned to roles</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Permission Modules</span>
            <div className={`${styles.metricIconBadge} ${styles.metricBadgeGreen}`}>
              <LockKeyhole size={16} />
            </div>
          </div>
          <div className={styles.metricValue}>{data.catalog.length}</div>
          <p className={styles.metricDesc}>Available access controls</p>
        </article>
      </section>

      {/* Apple Segmented Control Tab Bar */}
      <nav className={styles.tabBar} aria-label="Administration sections">
        <div className={styles.segmentedControl} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "roles"}
            className={tab === "roles" ? styles.segmentActive : styles.segment}
            onClick={() => setTab("roles")}
          >
            <ShieldCheck size={16} />
            <span>Roles & Permissions</span>
            <span className={styles.segmentBadge}>{staffRoles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "staff"}
            className={tab === "staff" ? styles.segmentActive : styles.segment}
            onClick={() => setTab("staff")}
          >
            <Users size={16} />
            <span>Staff & Access</span>
          </button>
        </div>
      </nav>

      {/* Tab Panels */}
      {tab === "roles" ? (
        <div className={styles.masterDetailLayout}>
          {/* Master Sidebar (Staff Roles) */}
          <aside className={styles.sidebar} aria-label="Staff roles list">
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitleWrap}>
                <h2>Staff Roles</h2>
                <span className={styles.sidebarCount}>{staffRoles.length} active</span>
              </div>
              <button
                type="button"
                className={styles.newRoleBtn}
                aria-label="Create custom role"
                title="Create custom role"
                onClick={() => setSelected("new")}
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            </div>
            <p className={styles.sidebarSubtitle}>
              Two default roles. Add custom roles for your team.
            </p>

            <div className={styles.roleCardList} role="listbox" aria-label="Available staff roles">
              {staffRoles.map((r) => {
                const isSelected = selected === r.id || (!selected && r.kind === "CALL_CENTER");
                const isSuper = r.kind === "SUPER_ADMIN";
                const isCallCenter = r.kind === "CALL_CENTER";
                return (
                  <button
                    type="button"
                    role="option"
                    key={r.id}
                    aria-selected={isSelected}
                    className={`${styles.roleCard} ${isSelected ? styles.roleCardActive : ""}`}
                    onClick={() => setSelected(r.id)}
                  >
                    <div className={styles.roleCardIcon}>
                      {isSuper ? (
                        <ShieldCheck size={17} />
                      ) : isCallCenter ? (
                        <PhoneCall size={17} />
                      ) : (
                        <Sliders size={17} />
                      )}
                    </div>
                    <div className={styles.roleCardBody}>
                      <div className={styles.roleCardHeader}>
                        <strong className={styles.roleName}>
                          {roleLabel(r.name)}
                        </strong>
                        {isSuper && <span className={styles.roleBadgeProtected}>Protected</span>}
                      </div>
                      <div className={styles.roleCardMeta}>
                        <span>{r.kind === "CUSTOM" ? "Custom role" : "Default role"}</span>
                        <span className={styles.metaDot}>•</span>
                        <span>{r.userCount} {r.userCount === 1 ? "user" : "users"}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className={styles.roleCardChevron} />
                  </button>
                );
              })}
            </div>

            {data.roles.some((r) => r.kind === "AGENT") && (
              <div className={styles.sidebarNote}>
                <Info size={14} />
                <span>Existing agent portal accounts are kept separately; they are not staff roles.</span>
              </div>
            )}
          </aside>

          {/* Detail Panel (Role Editor) */}
          <RoleEditor
            key={role ? role.id + role.updatedAt : "new"}
            role={role}
            catalog={data.catalog}
            onSaved={async (id) => {
              await refresh();
              setSelected(id);
            }}
            onDeleted={async () => {
              setSelected(null);
              await refresh();
            }}
          />
        </div>
      ) : (
        <StaffManager roles={staffRoles} offices={data.offices} onChanged={refresh} />
      )}
    </section>
  );
}

function RoleEditor({
  role,
  catalog,
  onSaved,
  onDeleted,
}: {
  role?: Role;
  catalog: PermissionModule[];
  onSaved: (id: string) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [map, setMap] = useState<PermissionMap>(role?.granularPermissions ?? {});
  const [filter, setFilter] = useState("");

  const locked = role?.kind === "SUPER_ADMIN";
  const baseline = JSON.stringify(role?.granularPermissions ?? {});
  const dirty =
    name !== (role?.name ?? "") ||
    description !== (role?.description ?? "") ||
    JSON.stringify(map) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: () =>
      api<{ data: { id: string } }>("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          granularMap: map,
          ...(role ? { roleId: role.id, expectedUpdatedAt: role.updatedAt } : {}),
        }),
      }),
    onSuccess: async (result) => {
      toast.success("Role and permissions saved.");
      await onSaved(result.data.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () => api("/api/admin/roles?roleId=" + role!.id, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Unused role deleted.");
      await onDeleted();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggle(moduleId: string, action: string) {
    setMap((previous) => {
      const current = previous[moduleId] ?? [];
      const next = current.includes(action)
        ? action === "read"
          ? []
          : current.filter((a) => a !== action)
        : [...new Set([...current, "read", action])];
      return { ...previous, [moduleId]: next };
    });
  }

  function toggleModuleMaster(moduleId: string) {
    setMap((previous) => {
      const current = previous[moduleId] ?? [];
      const isEnabled = current.includes("read");
      if (isEnabled) {
        return { ...previous, [moduleId]: [] };
      }
      return { ...previous, [moduleId]: ["read"] };
    });
  }

  function handleSelectAllView() {
    setMap((previous) => {
      const next = { ...previous };
      for (const m of catalog) {
        const current = next[m.id] ?? [];
        if (!current.includes("read")) {
          next[m.id] = [...current, "read"];
        }
      }
      return next;
    });
  }

  function handleClearAll() {
    setMap({});
  }

  function handleDiscard() {
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setMap(role?.granularPermissions ?? {});
  }

  // Apple-grade Super Administrator screen
  if (locked) {
    return (
      <div className={styles.lockedPanel}>
        <div className={styles.lockedIconBox}>
          <ShieldCheck size={36} />
        </div>
        <span className={styles.lockedBadge}>System Protected Role</span>
        <h2>Super Administrator</h2>
        <p className={styles.lockedLead}>
          One protected account with full access. The Super Administrator creates roles, decides who can do each task, and assigns staff.
          This role cannot be renamed, removed or restricted from this screen.
        </p>
        <div className={styles.lockedGrid}>
          <div className={styles.lockedItem}>
            <LockKeyhole size={18} />
            <div>
              <h4>Root Platform Authority</h4>
              <p>Full permissions across all {catalog.length} system and country modules.</p>
            </div>
          </div>
          <div className={styles.lockedItem}>
            <Users size={18} />
            <div>
              <h4>1. Define staff roles</h4>
              <p>Create roles for your team, such as Data Entry, Processing Officer or Accounts.</p>
            </div>
          </div>
          <div className={styles.lockedItem}>
            <CreditCard size={18} />
            <div>
              <h4>2. Choose permitted work</h4>
              <p>Enable View first, then select Create, Edit, Delete, Export and other actions for each module. Unchecked actions are blocked.</p>
            </div>
          </div>
          <div className={styles.lockedItem}>
            <ShieldCheck size={18} />
            <div>
              <h4>3. Assign staff access</h4>
              <p>Add staff in Staff & Access, choose their role and office. Role changes apply on their next request.</p>
            </div>
          </div>
        </div>
        <div className={styles.lockedNote}>
          <Info size={15} />
          <span>The single Super Administrator cannot be assigned to other staff, disabled or demoted.</span>
        </div>
      </div>
    );
  }

  const enabledModulesCount = Object.values(map).filter((a) => a.includes("read")).length;
  const filteredCatalog = catalog.filter((m) =>
    (m.label + m.description).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <form
      className={styles.detailPanel}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {/* Apple Panel Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleWrap}>
          <div className={styles.panelBadgeRow}>
            <span
              className={`${styles.roleKindPill} ${
                role?.kind === "CUSTOM"
                  ? styles.pillCustom
                  : role?.kind === "SUPER_ADMIN"
                  ? styles.pillSuper
                  : styles.pillSystem
              }`}
            >
              {role?.kind === "CUSTOM"
                ? "Custom Role"
                : role?.kind === "SUPER_ADMIN"
                ? "Super Administrator"
                : "System Role"}
            </span>
            {dirty ? (
              <span className={`${styles.statusIndicator} ${styles.dirtyStatus}`}>
                <AlertCircle size={12} /> Unsaved changes
              </span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.cleanStatus}`}>
                <Check size={12} /> All changes saved
              </span>
            )}
          </div>
          <h2>{role ? "Edit role" : "Create custom role"}</h2>
          <p>
            {role
              ? `Changes apply to all ${role.userCount} assigned users on their next request.`
              : "A new role starts with no access. Select only the work it needs."}
          </p>
        </div>

        <div className={styles.panelActionGroup}>
          {dirty && (
            <button
              type="button"
              className={styles.discardBtn}
              onClick={handleDiscard}
              title="Discard unsaved changes"
            >
              <RotateCcw size={13} />
              <span>Discard</span>
            </button>
          )}
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={save.isPending || !dirty || name.trim().length < 2}
          >
            <Save size={15} />
            <span>{save.isPending ? "Saving…" : "Save role"}</span>
          </button>
        </div>
      </div>

      {/* Apple Grouped Form Inputs */}
      <div className={styles.formGroup}>
        <div className={styles.field}>
          <label htmlFor="role-name-input">Role name</label>
          <input
            id="role-name-input"
            className={styles.input}
            required
            minLength={2}
            maxLength={80}
            value={role?.kind === "CALL_CENTER" ? roleLabel(name) : name}
            disabled={role?.kind === "CALL_CENTER"}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dubai Processing Officer"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="role-description-input">Description</label>
          <input
            id="role-description-input"
            className={styles.input}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this team's responsibilities"
          />
        </div>
      </div>

      {/* Search & Bulk Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            aria-label="Find permission module"
            placeholder="Find a module or country…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setFilter("")}
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.toolbarActions}>
          <span className={styles.enabledCountBadge}>
            <Check size={13} />
            {enabledModulesCount} of {catalog.length} modules enabled
          </span>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleSelectAllView}
            title="Enable view access for all modules"
          >
            Enable All View
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleClearAll}
            title="Clear all granted permissions"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Apple Info Callout Banner */}
      <div className={styles.infoCallout}>
        <Info size={16} />
        <div>
          <strong>Permission Rules:</strong> View is required for other actions. Turning View off removes all actions
          for that module. Dossier access includes its candidate details; payments and account provisioning have additional checks.
        </div>
      </div>

      {/* Permission Modules Cards */}
      <fieldset disabled={save.isPending || remove.isPending} className={styles.modulesContainer}>
        {filteredCatalog.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={28} />
            <p>No permission modules match “{filter}”.</p>
          </div>
        ) : (
          filteredCatalog.map((m) => {
            const currentActions = map[m.id] ?? [];
            const isModuleEnabled = currentActions.includes("read");

            return (
              <div
                key={m.id}
                className={`${styles.moduleCard} ${isModuleEnabled ? styles.moduleCardActive : ""}`}
              >
                <div className={styles.moduleHeader}>
                  <div className={styles.moduleTitleGroup}>
                    <div className={styles.moduleIconBox}>
                      {getModuleIcon(m.id)}
                    </div>
                    <div className={styles.moduleText}>
                      <h3>{m.label}</h3>
                      <p>{m.description}</p>
                    </div>
                  </div>

                  {/* Module Master Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleModuleMaster(m.id)}
                    className={`${styles.masterToggleBtn} ${
                      isModuleEnabled ? styles.masterToggleBtnActive : ""
                    }`}
                    title={isModuleEnabled ? "Disable entire module" : "Enable module view"}
                  >
                    <Check size={12} />
                    <span>{isModuleEnabled ? "Enabled" : "Disabled"}</span>
                  </button>
                </div>

                {/* Action Chips */}
                <div className={styles.actionChipsGroup}>
                  {m.actions.map((action) => {
                    const isChecked = currentActions.includes(action);
                    return (
                      <label
                        key={action}
                        className={`${styles.actionChip} ${isChecked ? styles.actionChipChecked : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(m.id, action)}
                        />
                        {isChecked && <Check size={13} className={styles.chipCheckIcon} />}
                        <span>{actionLabel[action] ?? action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </fieldset>

      {/* Footer Controls */}
      <div className={styles.panelFooter}>
        <div>
          {role?.kind === "CUSTOM" && (
            <button
              type="button"
              className={styles.deleteBtn}
              disabled={role.userCount > 0 || remove.isPending}
              title={role.userCount > 0 ? "Reassign users before deleting" : undefined}
              onClick={() => {
                if (window.confirm(`Delete unused role “${role.name}”?`)) {
                  remove.mutate();
                }
              }}
            >
              <Trash2 size={14} />
              <span>Delete unused role</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          className={styles.saveBtn}
          disabled={save.isPending || !dirty || name.trim().length < 2}
        >
          <Save size={15} />
          <span>{save.isPending ? "Saving…" : "Save role"}</span>
        </button>
      </div>
    </form>
  );
}

function StaffManager({
  roles,
  offices,
  onChanged,
}: {
  roles: Role[];
  offices: Office[];
  onChanged: () => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const query = useQuery({
    queryKey: ["admin-users-list", page, search],
    queryFn: () =>
      api<{ data: Staff[]; meta: { total: number; totalPages: number } }>(
        `/api/admin/users?page=${page}&pageSize=25&q=${encodeURIComponent(search)}`
      ),
  });

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;
      case "INACTIVE":
        return styles.statusInactive;
      case "LOCKED":
        return styles.statusLocked;
      case "ON_LEAVE":
        return styles.statusLeave;
      default:
        return styles.statusInactive;
    }
  }

  return (
    <div className={styles.staffPanel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleWrap}>
          <h2>Staff Directory & Access</h2>
          <p>
            Office staff accounts created by Super Administrator. Manage agent portal accounts from their agent profiles.
          </p>
        </div>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
        >
          <Plus size={15} />
          <span>Add staff member</span>
        </button>
      </div>

      {/* Search Input */}
      <div className={styles.searchWrap}>
        <Search size={15} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          aria-label="Search staff"
          placeholder="Search name, email or username…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {search && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            aria-label="Clear staff search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Staff Modal Editor */}
      {(adding || editing) && (
        <StaffEditor
          key={editing?.id ?? "new"}
          user={editing}
          roles={roles}
          offices={offices}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAdding(false);
            setEditing(null);
            await onChanged();
          }}
        />
      )}

      {/* Staff Table */}
      {query.isPending ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Loading staff directory…</p>
        </div>
      ) : query.isError ? (
        <div className={styles.errorBox}>
          <AlertCircle size={32} color="#ff3b30" />
          <p>{query.error.message}</p>
          <button type="button" className={styles.ghostBtn} onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.staffTable}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Office</th>
                  <th>Status</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>{getInitials(user.name)}</div>
                        <div className={styles.userMeta}>
                          <span className={styles.userName}>{user.name}</span>
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.rolePill}>
                        {roleLabel(user.role.name)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.officePill}>
                        {user.office?.name ?? "Not assigned"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusClass(user.status)}`}>
                        <span className={styles.statusDot} />
                        <span>{user.status}</span>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.manageBtn}
                        onClick={() => {
                          setAdding(false);
                          setEditing(user);
                        }}
                      >
                        <span>Manage access</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {query.data.data.length === 0 && (
            <div className={styles.emptyState}>
              <Users size={32} />
              <p>No staff accounts match “{search}”.</p>
            </div>
          )}

          {/* Pagination Controls */}
          <div className={styles.paginationBar}>
            <span>
              {query.data.meta.total} accounts · Page {page} of {query.data.meta.totalPages || 1}
            </span>
            <div className={styles.paginationButtons}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= query.data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StaffEditor({
  user,
  roles,
  offices,
  onClose,
  onSaved,
}: {
  user: Staff | null;
  roles: Role[];
  offices: Office[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const usernameId = useId();
  const roleSelectId = useId();
  const officeSelectId = useId();
  const statusSelectId = useId();
  const passwordId = useId();

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ ok: boolean; reauthRequired?: boolean }>("/api/admin/users", {
        method: user ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (result) => {
      if (result.reauthRequired) {
        toast.success("Login details updated. Please sign in again.");
        router.replace("/login");
        router.refresh();
        return;
      }
      toast.success(user ? "Staff access updated." : "Staff account created.");
      await onSaved();
    },
    onError: (error: Error) => setError(error.message),
  });

  const isPortal = user && !roles.some((r) => r.id === user.role.id);
  const protectedUser = toAppRole(user?.role.name) === "SUPER_ADMIN";

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-editor-title"
    >
      <form
        className={styles.modalCard}
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const form = new FormData(event.currentTarget);
          const values = Object.fromEntries(form.entries());
          if (!values.password) delete values.password;
          if (user) {
            mutation.mutate({
              ...values,
              userId: user.id,
              officeId: values.officeId || null,
            });
          } else {
            if (!values.officeId) delete values.officeId;
            mutation.mutate(values);
          }
        }}
      >
        <div className={styles.modalHeader}>
          <h3 id="staff-editor-title">
            {user ? `Manage access: ${user.name}` : "Create staff account"}
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className={styles.alertBox} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <fieldset disabled={mutation.isPending} className={styles.modalFields}>
          {!user && (
            <>
              <div className={styles.field}>
                <label htmlFor={nameId}>Full name</label>
                <input
                  id={nameId}
                  name="name"
                  required
                  minLength={2}
                  className={styles.input}
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={usernameId}>Username</label>
                <input
                  id={usernameId}
                  name="username"
                  required
                  minLength={3}
                  autoComplete="off"
                  className={styles.input}
                  placeholder="sarah_j"
                />
              </div>
            </>
          )}

          <div className={styles.field}>
            <label htmlFor={emailId}>Work email / login email</label>
            <input
              id={emailId}
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              required
              maxLength={254}
              className={styles.input}
              placeholder="name@orbitrecruitment.com"
              autoComplete="off"
            />
            {user && <p className={styles.metricDesc}>Changing email or password signs this account out of all devices.</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor={roleSelectId}>Assigned role</label>
            <select
              id={roleSelectId}
              name="roleId"
              defaultValue={user?.role.id ?? roles.find((r) => r.kind === "CALL_CENTER")?.id}
              disabled={Boolean(isPortal || protectedUser)}
              required
              className={styles.modalSelect}
            >
              {isPortal && <option value={user.role.id}>{user.role.name}</option>}
              {roles
                .filter((r) => r.status === "ACTIVE" && (r.kind !== "SUPER_ADMIN" || protectedUser))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {roleLabel(r.name)}
                  </option>
                ))}
            </select>
            <p className={styles.metricDesc}>Staff can perform only the actions enabled for their assigned role. Edit permissions in Roles & Permissions.</p>
          </div>

          <div className={styles.field}>
            <label htmlFor={officeSelectId}>Branch office</label>
            <select
              id={officeSelectId}
              name="officeId"
              defaultValue={user?.office?.id ?? ""}
              className={styles.modalSelect}
            >
              <option value="">Not assigned</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {user && (
            <div className={styles.field}>
              <label htmlFor={statusSelectId}>Account status</label>
              <select
                id={statusSelectId}
                name="status"
                defaultValue={user.status}
                disabled={protectedUser}
                className={styles.modalSelect}
              >
                {["ACTIVE", "INACTIVE", "LOCKED", "ON_LEAVE"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor={passwordId}>
              {user ? "New password (optional)" : "Initial password"}
            </label>
            <div className={styles.passwordInputRow}>
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={12}
                maxLength={128}
                required={!user}
                autoComplete="new-password"
                placeholder="At least 12 characters"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showPassword}
                aria-controls={passwordId}
                onClick={() => setShowPassword(value => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {user && <p className={styles.metricDesc}>Existing passwords cannot be viewed. Leave blank to keep the current password, or enter at least 12 characters to reset it.</p>}
          </div>
        </fieldset>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={mutation.isPending}
          >
            <Save size={15} />
            <span>{mutation.isPending ? "Saving…" : "Save staff access"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
