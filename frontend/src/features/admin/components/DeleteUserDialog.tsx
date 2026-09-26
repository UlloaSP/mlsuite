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
    <div className="fixed inset-0 z-(--z-overlay) grid place-items-center bg-overlay p-4">
      <div className="w-full max-w-sm rounded border border-line bg-surface p-5 shadow-hover">
        <h2 className="text-lg font-semibold text-fg">Delete user?</h2>
        <p className="mt-2 text-sm text-fg-secondary">
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
