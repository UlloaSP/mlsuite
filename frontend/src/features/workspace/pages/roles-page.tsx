import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { organizationRolesQueryKey } from "@/features/workspace/api/workspace.keys";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabs } from "@/shared/ui/AppTabs";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import {
  createRole,
  createRoleFromTemplate,
  deleteRole,
  duplicateRole,
  updateRole,
} from "@/features/workspace/api/roles.api";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { RoleDrawer } from "@/features/workspace/components/RoleDrawer";
import { RoleForm } from "@/features/workspace/components/RoleForm";
import { RoleRow } from "@/features/workspace/components/RoleRow";
import { useOrganizationRolesQuery } from "@/features/workspace/api/workspace.queries";
import type {
  PermissionKey,
  RoleDefinitionDto,
  RoleTemplateDto,
} from "@/features/workspace/api/workspace.types";

type Tab = "roles" | "templates" | "permissions";

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- Drawer, modal, tab, and search state are separate controls with separate lifetimes.
export function RolesPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const qc = useQueryClient();
  const { data: workspace } = useWorkspaceContext();
  const { data } = useOrganizationRolesQuery(id);
  const [tab, setTab] = useState<Tab>("roles");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RoleDefinitionDto | null>(null);
  const [editing, setEditing] = useState<RoleDefinitionDto | null>(null);
  const [template, setTemplate] = useState<RoleTemplateDto | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: organizationRolesQueryKey(id) });
  const roles = useMemo(
    () =>
      (data?.roles ?? []).filter((role) =>
        `${role.name} ${role.description}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [data?.roles, search],
  );

  if (workspace && !workspace.permissions.canViewMembers) return <NotFoundError />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="Roles & Templates"
          description="Manage role definitions, templates, and permission coverage."
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Roles & Templates" }]}
          actions={
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
          <AdminDataPanel title="Templates" description="Start from predefined access profiles">
            <div className="grid gap-3 p-6 pt-2 md:grid-cols-2">
              {data?.templates.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setTemplate(item)}
                  className="rounded-[16px] border border-[var(--border-soft)] p-4 text-left hover:bg-[var(--surface-tertiary)]"
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
          <AdminDataPanel title="All Permissions" description="Backend permission catalog">
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
          <RoleDrawer
            role={selected}
            onClose={() => setSelected(null)}
            onEdit={() => setEditing(selected)}
            onDuplicate={() =>
              void duplicateRole(id, selected.id, `${selected.name} Copy`).then(invalidate)
            }
            onDelete={() =>
              void deleteRole(id, selected.id).then(() => {
                setSelected(null);
                void invalidate();
              })
            }
          />
        ) : null}
        {editing ? (
          <RoleForm
            roleDefinition={editing.id ? editing : null}
            permissionGroups={data?.permissionCatalog ?? []}
            onClose={() => setEditing(null)}
            onSave={(payload) => {
              const op = editing.id ? updateRole(id, editing.id, payload) : createRole(id, payload);
              void op.then(() => {
                setEditing(null);
                void invalidate();
              });
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
              void createRoleFromTemplate(id, {
                templateId: template.id,
                name: payload.name,
                permissionKeys: payload.permissionKeys,
              }).then(() => {
                setTemplate(null);
                void invalidate();
              });
            }}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
