import type { AdminUser } from "@/features/admin/api/admin-user.types";
import { AppButton } from "@/shared/ui/AppButton";

export function DeleteUserDialog({
  disabled,
  user,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  user: AdminUser;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delete user?</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {user.fullName} will be removed if no protected records still reference this account.
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
