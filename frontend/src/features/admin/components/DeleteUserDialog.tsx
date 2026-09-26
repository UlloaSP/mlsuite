import type { AdminUser } from "@/features/admin/api/admin-user.types";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";

export function DeleteUserDialog({
  disabled,
  error,
  user,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  error?: string;
  user: AdminUser;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AppDialog
      open
      busy={disabled}
      error={error}
      onClose={onCancel}
      title="Delete user?"
      description={`${user.fullName} will be removed if no protected records still reference this account.`}
      footer={
        <>
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
        </>
      }
    />
  );
}
