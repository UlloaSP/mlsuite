import { Check, X } from "lucide-react";
import {
  useAcceptInvitation,
  useDeclineInvitation,
} from "@/features/notifications/api/notification.mutations";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { InvitationDto } from "@/shared/api/openapi.gen";

const OrganizationIcon = SECTION_ICONS.organizations;

/** An invitation addressed to this account's email, answered here by the invitee. */
export function PendingInvitationEntry({ invitation }: { invitation: InvitationDto }) {
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const busy = accept.isPending || decline.isPending;

  return (
    <CatalogEntry
      title={invitation.organizationName}
      titleAccessory={<AppBadge tone="info">Waiting for your answer</AppBadge>}
      icon={
        <span className="grid size-9 place-items-center rounded-control bg-info-subtle text-info-fg">
          <OrganizationIcon size={16} aria-hidden />
        </span>
      }
      description={`Invited as ${invitation.roleDefinition.name.toLowerCase()}`}
      actions={
        <div className="flex shrink-0 gap-2">
          <AppButton size="sm" disabled={busy} onClick={() => accept.mutate(invitation.id)}>
            <Check size={14} />
            Accept
          </AppButton>
          <AppButton
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => decline.mutate(invitation.id)}
          >
            <X size={14} />
            Decline
          </AppButton>
        </div>
      }
    />
  );
}
