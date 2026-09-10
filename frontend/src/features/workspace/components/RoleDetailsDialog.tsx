import { Shield, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { AppButton } from "@/shared/ui/AppButton";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="role-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[86vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-xl border-0 bg-[var(--surface-primary)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-card)] backdrop:bg-black/35"
    >
      <div className="flex max-h-[86vh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <Shield className="mt-0.5 shrink-0" size={24} />
            <div className="min-w-0">
              <h2 id="role-details-title" className="text-xl font-semibold">
                {role.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{role.description}</p>
            </div>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Close role details"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <dl className="grid gap-4 border-y border-[var(--border-soft)] py-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Assigned users
              </dt>
              <dd className="mt-1 text-sm font-semibold">{role.userCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Scope
              </dt>
              <dd className="mt-1 text-sm font-semibold">{role.scope}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="font-semibold">Permissions ({role.permissions.length})</h3>
            <div className="mt-3 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {role.permissions.map((permission) => (
                <div key={permission.key} className="py-3 text-sm">
                  <p className="font-semibold">{permission.label}</p>
                  <p className="mt-0.5 text-[var(--text-secondary)]">{permission.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--border-soft)] px-6 py-4">
          {role.actions.canDelete && role.userCount > 0 ? (
            <p id="role-delete-help" className="w-full text-sm text-[var(--text-secondary)]">
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
        </footer>
      </div>
    </dialog>
  );
}
