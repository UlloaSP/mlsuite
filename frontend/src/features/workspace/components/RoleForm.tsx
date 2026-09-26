import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import type { PermissionKey, RoleDefinitionDto } from "@/features/workspace/api/workspace.types";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";

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
  const selectedSet = new Set(selected);
  const canSave = Boolean(name.trim() && selected.length > 0);
  const toggle = (permission: PermissionKey, checked: boolean) => {
    setSelected((current) =>
      checked ? [...current, permission] : current.filter((key) => key !== permission),
    );
  };

  return (
    <AppDialog
      open
      size="lg"
      onClose={onClose}
      title={roleDefinition ? "Edit role" : "Create role"}
      description={`${selected.length} permissions selected`}
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            disabled={!canSave}
            onClick={() => onSave({ name, description, permissionKeys: selected })}
          >
            {roleDefinition ? "Save role" : "Create role"}
          </AppButton>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <label htmlFor="role-name" className="block text-sm font-semibold">
            Name
          </label>
          <AppTextField
            id="role-name"
            autoFocus
            className="w-full shadow-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="role-description" className="block text-sm font-semibold">
            Description
          </label>
          <AppTextArea
            id="role-description"
            className="w-full shadow-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this role"
          />
        </div>
      </div>
      <div className="mt-6">
        <div className="space-y-5">
          {permissionGroups.map((group) => (
            <section key={group.name}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-fg">{group.name}</h3>
                <span className="text-xs text-fg-secondary">
                  {group.permissions.filter((permission) => selectedSet.has(permission.key)).length}
                  /{group.permissions.length}
                </span>
              </div>
              <div className="divide-y divide-line border-y border-line">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer gap-3 py-3 text-sm hover:bg-surface-muted"
                  >
                    <AppCheckbox
                      aria-label={permission.label}
                      checked={selectedSet.has(permission.key)}
                      onChange={(e) => toggle(permission.key, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold text-fg">{permission.label}</span>
                      <br />
                      <span className="text-fg-secondary">{permission.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppDialog>
  );
}
