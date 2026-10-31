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
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { PurgeDialog } from "@/capabilities/purge/PurgeDialog";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { UserInfoBadge } from "./UserInfoBadge";
import type { AdminUserDto } from "@/shared/api/openapi.gen";

type Role = AdminUserDto["systemRole"];

export function UserCatalogTile({
  disabled,
  item,
  onResetPassword,
  onUpdate,
}: {
  disabled: boolean;
  item: AdminUserDto;
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

  return (
    <>
      <CatalogEntry
        title={displayName}
        icon={
          <PersonAvatar
            avatarUrl={item.avatarUrl}
            className="size-12 rounded-full text-sm"
            name={displayName}
          />
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
                key: "purge",
                label: "Purge",
                icon: Trash2,
                tone: "danger",
                onSelect: () => setDeleteOpen(true),
              },
            ]}
          />
        }
      />
      {deleteOpen ? <PurgeDialog scope="USER" targetId={item.id} onClose={closeDialogs} /> : null}
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
