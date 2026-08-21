import { Copy, KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabs } from "@/shared/ui/AppTabs";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useRoleMutations } from "@/features/workspace/api/role.mutations";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { RoleDetailsDialog } from "@/features/workspace/components/RoleDetailsDialog";
import { RoleForm } from "@/features/workspace/components/RoleForm";
import { RoleRow } from "@/features/workspace/components/RoleRow";
import {
  useOrganizationAdminDashboardQuery,
  useOrganizationRolesQuery,
} from "@/features/workspace/api/workspace.queries";
import type {
  PermissionKey,
  RoleDefinitionDto,
  RoleTemplateDto,
} from "@/features/workspace/api/workspace.types";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

type Tab = "roles" | "templates" | "permissions";

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- Dialog, tab, and search state are separate controls with separate lifetimes.
export function RolesPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const permissions = dashboard.data?.permissions;
  const canAccessRoles = Boolean(
    permissions?.canViewMembers ||
    permissions?.canInviteMembers ||
    permissions?.canManageMemberRoles,
  );
  const { data } = useOrganizationRolesQuery(id, canAccessRoles);
  const [tab, setTab] = useState<Tab>("roles");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RoleDefinitionDto | null>(null);
  const [editing, setEditing] = useState<RoleDefinitionDto | null>(null);
  const [template, setTemplate] = useState<RoleTemplateDto | null>(null);
  const roleMutations = useRoleMutations(id);
  const roles = useMemo(
    () =>
      (data?.roles ?? []).filter((role) =>
        `${role.name} ${role.description}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [data?.roles, search],
  );

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !canAccessRoles) return <RouteStatusPage status={403} />;
  const canManage = Boolean(permissions?.canManageMemberRoles);

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="Roles & Templates"
          description="Manage role definitions, templates, and permission coverage."
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Roles & Templates" }]}
          actions={
            canManage ? (
              <>
                <AppButton variant="secondary" onClick={() => setTab("templates")}>
                  <Copy size={16} />
                  From Template
                </AppButton>
                <AppButton
                  onClick={() =>
                    setEditing({
                      id: 0,
                      name: "",
                      slug: "",
                      description: "",
                      scope: "ORGANIZATION",
                      locked: false,
                      userCount: 0,
                      permissions: [],
                      actions: {
                        canView: true,
                        canEdit: true,
                        canDelete: false,
                        canDuplicate: false,
                        canAssign: true,
                      },
                    })
                  }
                >
                  <Plus size={16} />
                  Create Role
                </AppButton>
              </>
            ) : undefined
          }
        />
        <AppTabs<Tab>
          items={[
            { label: "Roles", value: "roles" },
            { label: "Templates", value: "templates" },
            { label: "All Permissions", value: "permissions" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "roles" ? (
          <AdminDataPanel
            flat
            title="All Roles"
            description="Configure access levels for your organization"
            search={search}
            onSearch={setSearch}
          >
            <div className="space-y-3 p-6 pt-2">
              {roles.map((role) => (
                <RoleRow key={role.id} role={role} onOpen={() => setSelected(role)} />
              ))}
            </div>
          </AdminDataPanel>
        ) : null}
        {tab === "templates" ? (
          <AdminDataPanel
            flat
            title="Templates"
            description="Start from predefined access profiles"
          >
            <div className="grid gap-3 p-6 pt-2 md:grid-cols-2">
              {data?.templates.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  disabled={!canManage}
                  onClick={() => setTemplate(item)}
                  className="rounded-lg border border-[var(--border-soft)] p-4 text-left transition-colors enabled:hover:border-[var(--text-secondary)] disabled:cursor-default"
                >
                  <p className="font-semibold">
                    {item.name} <AppBadge>{item.category}</AppBadge>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                  <p className="mt-4 text-xs text-[var(--text-secondary)]">
                    {item.permissionKeys.length} permissions
                  </p>
                </button>
              ))}
            </div>
          </AdminDataPanel>
        ) : null}
        {tab === "permissions" ? (
          <AdminDataPanel flat title="All Permissions" description="Backend permission catalog">
            <div className="grid gap-4 p-6 pt-2 md:grid-cols-2">
              {data?.permissionCatalog.map((group) => (
                <div
                  key={group.name}
                  className="rounded-[16px] border border-[var(--border-soft)] p-4"
                >
                  <p className="mb-3 font-semibold">{group.name}</p>
                  <div className="space-y-2">
                    {group.permissions.map((perm) => (
                      <p key={perm.key} className="text-sm">
                        <KeyRound size={14} className="mr-2 inline" />
                        {perm.label}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AdminDataPanel>
        ) : null}
        {selected ? (
          <RoleDetailsDialog
            role={selected}
            onClose={() => setSelected(null)}
            onEdit={() => {
              setEditing(selected);
              setSelected(null);
            }}
            onDuplicate={() =>
              roleMutations.duplicate.mutate({
                roleId: selected.id,
                name: `${selected.name} Copy`,
              })
            }
            onDelete={() =>
              roleMutations.delete.mutate(selected.id, { onSuccess: () => setSelected(null) })
            }
          />
        ) : null}
        {editing ? (
          <RoleForm
            roleDefinition={editing.id ? editing : null}
            permissionGroups={data?.permissionCatalog ?? []}
            onClose={() => setEditing(null)}
            onSave={(payload) => {
              if (editing.id) {
                roleMutations.update.mutate(
                  { roleId: editing.id, payload },
                  { onSuccess: () => setEditing(null) },
                );
              } else {
                roleMutations.create.mutate(payload, { onSuccess: () => setEditing(null) });
              }
            }}
          />
        ) : null}
        {template ? (
          <RoleForm
            roleDefinition={null}
            initial={{
              name: template.name,
              description: template.description,
              permissionKeys: template.permissionKeys as PermissionKey[],
            }}
            permissionGroups={data?.permissionCatalog ?? []}
            onClose={() => setTemplate(null)}
            onSave={(payload) => {
              roleMutations.createFromTemplate.mutate(
                {
                  templateId: template.id,
                  name: payload.name,
                  permissionKeys: payload.permissionKeys,
                },
                { onSuccess: () => setTemplate(null) },
              );
            }}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
