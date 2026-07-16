/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Mail, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { AdminUserDto } from "../../api/admin-users/dtos";
import { AppBadge } from "../../app/components";
import { UserActionsMenu } from "./UserActionsMenu";
import { ChangeRoleDialog, DeleteUserDialog } from "./UserCatalogDialogs";

type Role = AdminUserDto["systemRole"];

export function UserCatalogTile({
  disabled,
  item,
  onDelete,
  onResetPassword,
  onUpdate,
}: {
  disabled: boolean;
  item: AdminUserDto;
  onDelete: () => Promise<void>;
  onResetPassword: () => void;
  onUpdate: (payload: { enabled?: boolean; systemRole?: Role }) => Promise<void>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const displayName = item.fullName || item.username || item.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <article className="grid gap-5 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-start gap-3">
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt=""
            className="size-12 shrink-0 rounded object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded bg-[var(--accent-quiet)] text-sm font-semibold text-[var(--accent-primary-strong)]">
            {initials}
          </span>
        )}
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {displayName}
            </h2>
            <p className="truncate text-sm text-[var(--text-secondary)]">{item.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Info icon={<ShieldCheck size={14} />} label={item.systemRole} />
            <Info
              icon={item.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              label={item.enabled ? "Enabled" : "Disabled"}
            />
            <Info icon={<CalendarDays size={14} />} label={formatCreatedAt(item.createdAt)} />
            <Info icon={<Mail size={14} />} label={item.username} />
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

function Info({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <AppBadge className="rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
      {icon}
      <span className="truncate">{label}</span>
    </AppBadge>
  );
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
