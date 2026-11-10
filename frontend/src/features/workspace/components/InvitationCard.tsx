import { RotateCcw, X } from "lucide-react";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { RoleBadge } from "./RoleBadge";
import { StatusBadge } from "./admin/StatusBadge";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import type { InvitationDto } from "@/shared/api/openapi.gen";
import { isOpenInvitation } from "@/features/workspace/lib/invitation-status";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });

/** Only an open invitation has an expiry to tell; an answered or revoked one has its status alone. */
const expiry = (invite: InvitationDto): string | null => {
  if (!invite.expiresAt) return null;
  const date = dateFormatter.format(Date.parse(invite.expiresAt));
  if (invite.status === "PENDING") return `Expires ${date}`;
  return invite.status === "EXPIRED" ? `Expired ${date}` : null;
};

export function InvitationCard({
  invite,
  canManage,
  selected,
  onSelect,
  onResend,
  onRevoke,
}: {
  invite: InvitationDto;
  canManage: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const open = isOpenInvitation(invite);
  return (
    <CatalogEntry
      title={invite.email}
      icon={
        canManage ? (
          <AppCheckbox
            aria-label={`Select invitation ${invite.email}`}
            checked={selected}
            disabled={!open}
            onChange={(event) => onSelect(event.target.checked)}
          />
        ) : null
      }
      metadata={
        <>
          <RoleBadge value={invite.roleDefinition.name} />
          {expiry(invite) ? <span>{expiry(invite)}</span> : null}
        </>
      }
      details={<StatusBadge value={invite.status} />}
      actions={
        canManage && open ? (
          <AppActionsMenu
            label={`Open actions for ${invite.email}`}
            actions={[
              { key: "resend", label: "Resend", icon: RotateCcw, onSelect: onResend },
              { key: "revoke", label: "Revoke", icon: X, tone: "danger", onSelect: onRevoke },
            ]}
          />
        ) : null
      }
    />
  );
}
