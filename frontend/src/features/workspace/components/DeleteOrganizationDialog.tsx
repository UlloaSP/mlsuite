import { AppButton } from "@/shared/ui/AppButton";

export function DeleteOrganizationDialog({
  disabled,
  name,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delete organization?</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {name} will be deleted only if it has no models, schemas, plugins, teams, invitations, or
          audit events.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={() => void onConfirm()}
          >
            Delete
          </AppButton>
        </div>
      </div>
    </div>
  );
}
