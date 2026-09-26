import { useState } from "react";
import type { AdminUser } from "@/features/admin/api/admin-user.types";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSelect } from "@/shared/ui/AppSelect";

type Role = AdminUser["systemRole"];
const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

export function ChangeRoleDialog({
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
  onConfirm: (role: Role) => Promise<void>;
}) {
  const [role, setRole] = useState<Role>(user.systemRole);
  return (
    <AppDialog
      open
      busy={disabled}
      error={error}
      onClose={onCancel}
      title="Change role"
      description={user.fullName}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            disabled={disabled || role === user.systemRole}
            onClick={() => void onConfirm(role)}
          >
            Save role
          </AppButton>
        </>
      }
    >
      <AppSelect
        aria-label="System role"
        value={role}
        onValueChange={(value) => setRole(value as Role)}
        className="w-full"
        options={ROLE_OPTIONS}
      />
    </AppDialog>
  );
}
