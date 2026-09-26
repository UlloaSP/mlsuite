/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Mail, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { formatDate } from "@/shared/lib/date-time";
import { useState } from "react";
import type { AdminUser } from "@/features/admin/api/admin-user.types";
import { UserActionsMenu } from "./UserActionsMenu";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserInfoBadge } from "./UserInfoBadge";

type Role = AdminUser["systemRole"];

export function UserCatalogTile({
  disabled,
  item,
  onDelete,
  onResetPassword,
  onUpdate,
}: {
  disabled: boolean;
  item: AdminUser;
  onDelete: () => Promise<void>;
  onResetPassword: () => void;
  onUpdate: (payload: { enabled?: boolean; systemRole?: Role }) => Promise<void>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const displayName = item.fullName || item.username || item.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <article className="grid gap-5 rounded-card border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-start gap-3">
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt=""
            className="size-12 shrink-0 rounded object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded bg-accent-subtle text-sm font-semibold text-accent-strong">
            {initials}
          </span>
        )}
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-fg">{displayName}</h2>
            <p className="truncate text-sm text-fg-secondary">{item.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <UserInfoBadge icon={<ShieldCheck size={14} />} label={item.systemRole} />
            <UserInfoBadge
              icon={item.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              label={item.enabled ? "Enabled" : "Disabled"}
            />
            <UserInfoBadge icon={<CalendarDays size={14} />} label={formatDate(item.createdAt)} />
            <UserInfoBadge icon={<Mail size={14} />} label={item.username} />
          </div>
        </div>
      </div>
      <UserActionsMenu
        disabled={disabled}
        enabled={item.enabled}
        onChangeRole={() => setRoleOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onResetPassword={onResetPassword}
        onToggleEnabled={() => void onUpdate({ enabled: !item.enabled })}
      />
      {deleteOpen ? (
        <DeleteUserDialog
          disabled={disabled}
          user={item}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={async () => {
            await onDelete();
            setDeleteOpen(false);
          }}
        />
      ) : null}
      {roleOpen ? (
        <ChangeRoleDialog
          disabled={disabled}
          user={item}
          onCancel={() => setRoleOpen(false)}
          onConfirm={async (systemRole) => {
            await onUpdate({ systemRole });
            setRoleOpen(false);
          }}
        />
      ) : null}
    </article>
  );
}
