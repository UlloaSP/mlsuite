/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import type { AdminUserDto } from "../../api/admin-users/dtos";
import { AppButton, AppSelect } from "../../app/components";

type Role = AdminUserDto["systemRole"];

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

export function DeleteUserDialog({
  disabled,
  user,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  user: AdminUserDto;
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

export function ChangeRoleDialog({
  disabled,
  user,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  user: AdminUserDto;
  onCancel: () => void;
  onConfirm: (role: Role) => Promise<void>;
}) {
  const [role, setRole] = useState<Role>(user.systemRole);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-hover)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Change role</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{user.fullName}</p>
        <AppSelect
          value={role}
          onValueChange={(value) => setRole(value as Role)}
          className="mt-4 w-full"
          options={ROLE_OPTIONS}
        />
        <div className="mt-5 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
}
