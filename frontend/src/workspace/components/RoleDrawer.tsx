import { Shield } from "lucide-react";
import { AppButton } from "../../app/components";
import type { RoleDefinitionDto } from "../types";

export function RoleDrawer({
  role,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  role: RoleDefinitionDto;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
      <aside className="h-full w-full max-w-[520px] overflow-auto bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex justify-between">
          <div>
            <Shield size={28} />
            <h2 className="mt-3 text-xl font-semibold">{role.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{role.description}</p>
          </div>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="mt-5 flex gap-2">
          {role.actions.canEdit ? <AppButton onClick={onEdit}>Edit</AppButton> : null}
          {role.actions.canDuplicate ? (
            <AppButton variant="secondary" onClick={onDuplicate}>
              Duplicate
            </AppButton>
          ) : null}
          {role.actions.canDelete ? (
            <AppButton variant="danger" onClick={onDelete}>
              Delete
            </AppButton>
          ) : null}
        </div>
        <div className="mt-8 rounded-xl border border-[var(--border-soft)] p-4">
          <p className="font-semibold">Role Information</p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Users with this role{" "}
            <span className="float-right text-[var(--text-primary)]">{role.userCount}</span>
          </p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Type <span className="float-right text-[var(--text-primary)]">{role.scope}</span>
          </p>
        </div>
        <div className="mt-6 rounded-xl border border-[var(--border-soft)] p-4">
          <p className="mb-4 font-semibold">Permissions ({role.permissions.length})</p>
          <div className="space-y-2">
            {role.permissions.map((perm) => (
              <div key={perm.key} className="rounded-lg bg-[var(--surface-tertiary)] p-3 text-sm">
                {perm.label}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
