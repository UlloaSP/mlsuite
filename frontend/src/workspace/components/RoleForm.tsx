import { useState } from "react";
import { X } from "lucide-react";
import { AppButton, AppTextArea, AppTextField } from "../../app/components";
import type { PermissionKey, RoleDefinitionDto } from "../types";

type RolePermission = {
  key: PermissionKey;
  label: string;
  description: string;
  dangerous: boolean;
};

type RolePermissionGroup = {
  name: string;
  permissions: RolePermission[];
};

export function RoleForm({
  roleDefinition,
  initial,
  permissionGroups,
  onClose,
  onSave,
}: {
  roleDefinition: RoleDefinitionDto | null;
  initial?: { name: string; description?: string; permissionKeys: PermissionKey[] };
  permissionGroups: RolePermissionGroup[];
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description?: string;
    permissionKeys: PermissionKey[];
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? roleDefinition?.name ?? "");
  const [description, setDescription] = useState(
    initial?.description ?? roleDefinition?.description ?? "",
  );
  const [selected, setSelected] = useState<PermissionKey[]>(
    initial?.permissionKeys ?? roleDefinition?.permissions.map((p) => p.key) ?? [],
  );
  const canSave = Boolean(name.trim() && selected.length > 0);
  const toggle = (permission: PermissionKey, checked: boolean) => {
    setSelected((current) =>
      checked ? [...current, permission] : current.filter((key) => key !== permission),
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="flex h-[min(86vh,760px)] w-full max-w-[840px] flex-col overflow-hidden rounded-xl bg-[var(--surface-primary)] shadow-[var(--shadow-card)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold">
              {roleDefinition ? "Edit Role" : "Create New Role"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {selected.length} permissions selected
            </p>
          </div>
          <button
            type="button"
            aria-label="Close role form"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.2fr)]">
            <AppTextField
              className="rounded-xl shadow-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Role name"
            />
            <AppTextArea
              className="min-h-24 rounded-xl shadow-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div className="min-h-0 overflow-y-auto pr-2">
            <div className="space-y-5">
              {permissionGroups.map((group) => (
                <section key={group.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {group.name}
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {
                        group.permissions.filter((permission) => selected.includes(permission.key))
                          .length
                      }
                      /{group.permissions.length}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex cursor-pointer gap-3 py-3 text-sm hover:bg-[var(--surface-muted)]"
                      >
                        <input
                          type="checkbox"
                          aria-label={permission.label}
                          checked={selected.includes(permission.key)}
                          onChange={(e) => toggle(permission.key, e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {permission.label}
                          </span>
                          <br />
                          <span className="text-[var(--text-secondary)]">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4">
          <AppButton variant="secondary" className="rounded-xl" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            className="rounded-xl"
            disabled={!canSave}
            onClick={() => onSave({ name, description, permissionKeys: selected })}
          >
            {roleDefinition ? "Save Role" : "Create Role"}
          </AppButton>
        </footer>
      </div>
    </div>
  );
}
