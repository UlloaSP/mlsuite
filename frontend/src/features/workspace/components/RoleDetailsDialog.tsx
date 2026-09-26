import { Shield } from "lucide-react";
import { badgeLabel } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import type { RoleDefinitionDto } from "@/features/workspace/api/workspace.types";

export function RoleDetailsDialog({
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
    <AppDialog
      open
      size="lg"
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <Shield className="shrink-0" size={20} />
          {role.name}
        </span>
      }
      description={role.description}
      footer={
        <>
          {role.actions.canDelete && role.userCount > 0 ? (
            <p id="role-delete-help" className="w-full text-sm text-fg-secondary">
              Assign these users to another role before deleting this role.
            </p>
          ) : null}
          {role.actions.canDelete ? (
            <AppButton
              variant="danger"
              disabled={role.userCount > 0}
              aria-describedby={role.userCount > 0 ? "role-delete-help" : undefined}
              onClick={onDelete}
            >
              Delete
            </AppButton>
          ) : null}
          {role.actions.canDuplicate ? (
            <AppButton variant="secondary" onClick={onDuplicate}>
              Duplicate
            </AppButton>
          ) : null}
          {role.actions.canEdit ? <AppButton onClick={onEdit}>Edit role</AppButton> : null}
        </>
      }
    >
      <dl className="grid gap-4 border-y border-line py-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-fg-secondary">Assigned users</dt>
          <dd className="mt-1 text-sm font-semibold">{role.userCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-fg-secondary">Scope</dt>
          <dd className="mt-1 text-sm font-semibold">{badgeLabel(role.scope)}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="font-semibold">Permissions ({role.permissions.length})</h3>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {role.permissions.map((permission) => (
            <div key={permission.key} className="py-3 text-sm">
              <p className="font-semibold">{permission.label}</p>
              <p className="mt-0.5 text-fg-secondary">{permission.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AppDialog>
  );
}
