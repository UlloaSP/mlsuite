import { PermissionCatalog } from "@/features/workspace/components/PermissionCatalog";
import { Copy, Plus } from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabs } from "@/shared/ui/AppTabs";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useRoleMutations } from "@/features/workspace/api/role.mutations";
import { RoleDetailsDialog } from "@/features/workspace/components/RoleDetailsDialog";
import { RoleForm } from "@/features/workspace/components/RoleForm";
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

import { RolesCatalog, type RolesTab } from "@/features/workspace/components/RolesCatalog";

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
  const rolesQuery = useOrganizationRolesQuery(id, canAccessRoles);
  const data = rolesQuery.data;
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const tab: RolesTab =
    requestedTab === "templates" || requestedTab === "permissions" ? requestedTab : "roles";
  const setTab = (value: RolesTab) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === "roles") next.delete("tab");
      else next.set("tab", value);
      next.delete("q");
      next.delete("page");
      return next;
    });
  const [selected, setSelected] = useState<RoleDefinitionDto | null>(null);
  const [editing, setEditing] = useState<RoleDefinitionDto | null>(null);
  const [template, setTemplate] = useState<RoleTemplateDto | null>(null);
  const roleMutations = useRoleMutations(id);

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !canAccessRoles) return <RouteStatusPage status={403} />;
  const canManage = Boolean(permissions?.canManageMemberRoles);

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
        <AppTabs<RolesTab>
          items={[
            { label: data ? `Roles (${data.roles.length})` : "Roles", value: "roles" },
            {
              label: data ? `Templates (${data.templates.length})` : "Templates",
              value: "templates",
            },
            {
              label: data
                ? `All Permissions (${data.permissionCatalog.reduce((total, group) => total + group.permissions.length, 0)})`
                : "All Permissions",
              value: "permissions",
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "permissions" ? (
          <PermissionCatalog
            groups={data?.permissionCatalog ?? []}
            loading={dashboard.isPending || rolesQuery.isPending}
            error={rolesQuery.isError}
            onRetry={() => {
              void rolesQuery.refetch();
            }}
          />
        ) : (
          <RolesCatalog
            organizationId={id}
            tab={tab}
            data={data}
            loading={dashboard.isPending || rolesQuery.isPending}
            error={rolesQuery.isError}
            onRetry={() => {
              void rolesQuery.refetch();
            }}
            canManage={canManage}
            onRole={setSelected}
            onTemplate={setTemplate}
          />
        )}
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
