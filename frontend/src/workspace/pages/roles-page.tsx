import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Lock, Plus, Shield } from "lucide-react";
import { m as motion } from "motion/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppBadge, AppButton, AppPage, AppPageHeader, AppSurface, AppTabs, AppTextArea, AppTextField } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { createRole, createRoleFromTemplate, deleteRole, duplicateRole, getRoles, updateRole } from "../api/roleAdminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { useWorkspaceContext } from "../hooks";
import type { PermissionKey, RoleDefinitionDto, RoleTemplateDto } from "../types";

type Tab = "roles" | "templates" | "permissions";

// react-doctor-disable-next-line react-doctor/prefer-useReducer -- Drawer, modal, tab, and search state are separate controls with separate lifetimes.
export function RolesPage() {
	const { organizationId = "" } = useParams();
	const id = Number(organizationId);
	const qc = useQueryClient();
	const { data: workspace } = useWorkspaceContext();
	const { data } = useQuery({ queryKey: ["roles", id], queryFn: () => getRoles(id), enabled: Boolean(id) });
	const [tab, setTab] = useState<Tab>("roles");
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<RoleDefinitionDto | null>(null);
	const [editing, setEditing] = useState<RoleDefinitionDto | null>(null);
	const [template, setTemplate] = useState<RoleTemplateDto | null>(null);
	const invalidate = () => qc.invalidateQueries({ queryKey: ["roles", id] });
	const roles = useMemo(
		() => (data?.roles ?? []).filter((role) => `${role.name} ${role.description}`.toLowerCase().includes(search.toLowerCase())),
		[data?.roles, search],
	);

	if (workspace && !workspace.permissions.canViewMembers) return <NotFoundError />;

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						title="Roles & Permissions"
						description="Manage roles, templates, and access control."
						backHref={`/workspace/organizations/${id}`}
						aside={<><AppButton variant="secondary" onClick={() => setTab("templates")}><Copy size={16} />From Template</AppButton><AppButton onClick={() => setEditing({ id: 0, name: "", slug: "", description: "", scope: "ORGANIZATION", locked: false, userCount: 0, permissions: [], actions: { canView: true, canEdit: true, canDelete: false, canDuplicate: false, canAssign: true } })}><Plus size={16} />Create Role</AppButton></>}
					/>
					<AppTabs<Tab> items={[{ label: "Roles", value: "roles" }, { label: "Templates", value: "templates" }, { label: "All Permissions", value: "permissions" }]} value={tab} onChange={setTab} />
					{tab === "roles" ? (
						<AdminDataPanel title="All Roles" description="Configure access levels for your organization" search={search} onSearch={setSearch}>
							<div className="space-y-3 p-6 pt-2">
								{roles.map((role) => <RoleRow key={role.id} role={role} onOpen={() => setSelected(role)} />)}
							</div>
						</AdminDataPanel>
					) : null}
					{tab === "templates" ? (
						<AdminDataPanel title="Templates" description="Start from predefined access profiles">
							<div className="grid gap-3 p-6 pt-2 md:grid-cols-2">
								{data?.templates.map((item) => (
									<button type="button" key={item.id} onClick={() => setTemplate(item)} className="rounded-[16px] border border-[var(--border-soft)] p-4 text-left hover:bg-[var(--surface-tertiary)]">
										<p className="font-semibold">{item.name} <AppBadge>{item.category}</AppBadge></p>
										<p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
										<p className="mt-4 text-xs text-[var(--text-secondary)]">{item.permissionKeys.length} permissions</p>
									</button>
								))}
							</div>
						</AdminDataPanel>
					) : null}
					{tab === "permissions" ? (
						<AdminDataPanel title="All Permissions" description="Backend permission catalog">
							<div className="grid gap-4 p-6 pt-2 md:grid-cols-2">
								{data?.permissionCatalog.map((group) => (
									<div key={group.name} className="rounded-[16px] border border-[var(--border-soft)] p-4">
										<p className="mb-3 font-semibold">{group.name}</p>
										<div className="space-y-2">{group.permissions.map((perm) => <p key={perm.key} className="text-sm"><KeyRound size={14} className="mr-2 inline" />{perm.label}</p>)}</div>
									</div>
								))}
							</div>
						</AdminDataPanel>
					) : null}
					{selected ? <RoleDrawer role={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(selected)} onDuplicate={() => void duplicateRole(id, selected.id, `${selected.name} Copy`).then(invalidate)} onDelete={() => void deleteRole(id, selected.id).then(() => { setSelected(null); void invalidate(); })} /> : null}
					{editing ? <RoleForm role={editing.id ? editing : null} permissions={data?.permissionCatalog.flatMap((group) => group.permissions) ?? []} onClose={() => setEditing(null)} onSave={(payload) => {
						const op = editing.id ? updateRole(id, editing.id, payload) : createRole(id, payload);
						void op.then(() => { setEditing(null); void invalidate(); });
					}} /> : null}
					{template ? <RoleForm role={null} initial={{ name: template.name, description: template.description, permissionKeys: template.permissionKeys as PermissionKey[] }} permissions={data?.permissionCatalog.flatMap((group) => group.permissions) ?? []} onClose={() => setTemplate(null)} onSave={(payload) => {
						void createRoleFromTemplate(id, { templateId: template.id, name: payload.name, permissionKeys: payload.permissionKeys }).then(() => { setTemplate(null); void invalidate(); });
					}} /> : null}
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}

function RoleRow({ role, onOpen }: { role: RoleDefinitionDto; onOpen: () => void }) {
	return (
		<button type="button" onClick={onOpen} className="w-full rounded-[16px] border border-[var(--border-soft)] p-4 text-left hover:bg-[var(--surface-tertiary)]">
			<div className="flex items-start gap-4">
				<div className="rounded-[12px] bg-[var(--surface-tertiary)] p-3"><Lock size={20} /></div>
				<div className="min-w-0 flex-1">
					<p className="font-semibold">{role.name} {role.locked ? <AppBadge>Locked</AppBadge> : null} <AppBadge>{role.userCount} users</AppBadge></p>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">{role.description}</p>
					<div className="mt-3 flex flex-wrap gap-2">{role.permissions.slice(0, 5).map((p) => <AppBadge key={p.key}>{p.label}</AppBadge>)}{role.permissions.length > 5 ? <AppBadge>+{role.permissions.length - 5} more</AppBadge> : null}</div>
				</div>
			</div>
		</button>
	);
}

function RoleDrawer({ role, onClose, onEdit, onDuplicate, onDelete }: { role: RoleDefinitionDto; onClose: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/35">
			<aside className="h-full w-full max-w-[520px] overflow-auto bg-white p-6 shadow-[var(--shadow-card)]">
				<div className="flex justify-between"><div><Shield size={28} /><h2 className="mt-3 text-xl font-semibold">{role.name}</h2><p className="text-sm text-[var(--text-secondary)]">{role.description}</p></div><button onClick={onClose}>x</button></div>
				<div className="mt-5 flex gap-2">{role.actions.canEdit ? <AppButton onClick={onEdit}>Edit</AppButton> : null}{role.actions.canDuplicate ? <AppButton variant="secondary" onClick={onDuplicate}>Duplicate</AppButton> : null}{role.actions.canDelete ? <AppButton variant="danger" onClick={onDelete}>Delete</AppButton> : null}</div>
				<div className="mt-8 rounded-[16px] border border-[var(--border-soft)] p-4">
					<p className="font-semibold">Role Information</p>
					<p className="mt-4 text-sm text-[var(--text-secondary)]">Users with this role <span className="float-right text-[var(--text-primary)]">{role.userCount}</span></p>
					<p className="mt-4 text-sm text-[var(--text-secondary)]">Type <span className="float-right text-[var(--text-primary)]">{role.scope}</span></p>
				</div>
				<div className="mt-6 rounded-[16px] border border-[var(--border-soft)] p-4">
					<p className="mb-4 font-semibold">Permissions ({role.permissions.length})</p>
					<div className="space-y-2">{role.permissions.map((perm) => <div key={perm.key} className="rounded-[12px] bg-[var(--surface-tertiary)] p-3 text-sm">{perm.label}</div>)}</div>
				</div>
			</aside>
		</div>
	);
}

function RoleForm({ role, initial, permissions, onClose, onSave }: { role: RoleDefinitionDto | null; initial?: { name: string; description?: string; permissionKeys: PermissionKey[] }; permissions: Array<{ key: PermissionKey; label: string; description: string; dangerous: boolean }>; onClose: () => void; onSave: (payload: { name: string; description?: string; permissionKeys: PermissionKey[] }) => void }) {
	const [name, setName] = useState(initial?.name ?? role?.name ?? "");
	const [description, setDescription] = useState(initial?.description ?? role?.description ?? "");
	const [selected, setSelected] = useState<PermissionKey[]>(initial?.permissionKeys ?? role?.permissions.map((p) => p.key) ?? []);
	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
			<div className="max-h-[88vh] w-full max-w-[620px] overflow-auto rounded-[20px] bg-white p-6 shadow-[var(--shadow-card)]">
				<div className="mb-5 flex justify-between"><div><h2 className="text-xl font-semibold">{role ? "Edit Role" : "Create New Role"}</h2><p className="text-sm text-[var(--text-secondary)]">{selected.length} permissions selected</p></div><button onClick={onClose}>x</button></div>
				<div className="grid gap-4">
					<AppTextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" />
					<AppTextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
					<div className="grid gap-2">{permissions.map((permission) => {
						const checked = selected.includes(permission.key);
						return <label key={permission.key} className="flex gap-3 rounded-[14px] border border-[var(--border-soft)] p-3 text-sm"><input type="checkbox" aria-label={permission.label} checked={checked} onChange={(e) => setSelected((current) => e.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span><b>{permission.label}</b><br /><span className="text-[var(--text-secondary)]">{permission.description}</span></span></label>;
					})}</div>
					<div className="flex justify-end gap-3"><AppButton variant="secondary" onClick={onClose}>Cancel</AppButton><AppButton disabled={!name.trim() || selected.length === 0} onClick={() => onSave({ name, description, permissionKeys: selected })}>Save Role</AppButton></div>
				</div>
			</div>
		</div>
	);
}
