/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  CalendarDays,
  KeyRound,
  Mail,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatDate } from "@/shared/lib/date-time";
import { useState } from "react";
import { toast } from "sonner";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserInfoBadge } from "./UserInfoBadge";
import type { AdminUserDto } from "@/shared/api/openapi.gen";

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
  const [dialogError, setDialogError] = useState<string>();
  const closeDialogs = () => {
    setDialogError(undefined);
    setDeleteOpen(false);
    setRoleOpen(false);
  };
  // Dialog actions keep the dialog open and show the failure inside it.
  const runInDialog = async (action: () => Promise<void>) => {
    try {
      await action();
      closeDialogs();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : String(error));
    }
  };
  const displayName = item.fullName || item.username || item.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <CatalogEntry
        title={displayName}
        icon={
          item.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt=""
              className="size-12 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-strong">
              {initials}
            </span>
          )
        }
        description={item.email}
        metadata={
          <>
            <UserInfoBadge icon={<ShieldCheck size={14} />} label={item.systemRole} />
            <UserInfoBadge
              icon={item.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              label={item.enabled ? "Enabled" : "Disabled"}
            />
            <UserInfoBadge icon={<CalendarDays size={14} />} label={formatDate(item.createdAt)} />
            <UserInfoBadge icon={<Mail size={14} />} label={item.username} />
          </>
        }
        actions={
          <AppActionsMenu
            label={`Open actions for ${displayName}`}
            disabled={disabled}
            actions={[
              {
                key: "password",
                label: "Change password",
                icon: KeyRound,
                onSelect: onResetPassword,
              },
              {
                key: "role",
                label: "Change role",
                icon: ShieldCheck,
                onSelect: () => setRoleOpen(true),
              },
              {
                key: "enabled",
                label: item.enabled ? "Disable user" : "Enable user",
                icon: item.enabled ? UserX : UserCheck,
                onSelect: () =>
                  void onUpdate({ enabled: !item.enabled }).catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : String(error)),
                  ),
              },
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                tone: "danger",
                onSelect: () => setDeleteOpen(true),
              },
            ]}
          />
        }
      />
      {deleteOpen ? (
        <DeleteUserDialog
          disabled={disabled}
          error={dialogError}
          user={item}
          onCancel={closeDialogs}
          onConfirm={() => runInDialog(onDelete)}
        />
      ) : null}
      {roleOpen ? (
        <ChangeRoleDialog
          disabled={disabled}
          error={dialogError}
          user={item}
          onCancel={closeDialogs}
          onConfirm={(systemRole) => runInDialog(() => onUpdate({ systemRole }))}
        />
      ) : null}
    </>
  );
}
