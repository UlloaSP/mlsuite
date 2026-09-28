import { Copy, RotateCcw, X } from "lucide-react";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { RoleBadge } from "./RoleBadge";
import { StatusBadge } from "./admin/StatusBadge";
import type { OrganizationInvitationDto } from "@/features/workspace/api/workspace.types";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });

export function InvitationCard({
  invite,
  canManage,
  selected,
  onSelect,
  onResend,
  onRevoke,
}: {
  invite: OrganizationInvitationDto;
  canManage: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <CatalogEntry
      title={invite.email}
      icon={
        canManage ? (
          <AppCheckbox
            aria-label={`Select invitation ${invite.email}`}
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
          />
        ) : null
      }
      metadata={
        <>
          <RoleBadge value={invite.roleDefinition.name} />
          <span>Expires {dateFormatter.format(Date.parse(invite.expiresAt))}</span>
        </>
      }
      details={<StatusBadge value={invite.status} />}
      actions={
        canManage ? (
          <AppActionsMenu
            label={`Open actions for ${invite.email}`}
            actions={[
              {
                key: "resend",
                label: "Resend",
                icon: RotateCcw,
                disabled: invite.status === "ACCEPTED",
                onSelect: onResend,
              },
              {
                key: "copy",
                label: "Copy link",
                icon: Copy,
                disabled: !invite.token,
                onSelect: () =>
                  void navigator.clipboard?.writeText(
                    `${window.location.origin}/invite/${invite.token}`,
                  ),
              },
              { key: "revoke", label: "Revoke", icon: X, tone: "danger", onSelect: onRevoke },
            ]}
          />
        ) : null
      }
    />
  );
}
