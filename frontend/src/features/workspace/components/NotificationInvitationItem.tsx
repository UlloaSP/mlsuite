import { Building2 } from "lucide-react";
import type { InvitationDto } from "@/shared/api/openapi.gen";

/**
 * An invitation addressed to this account's email. MLsuite verifies no email address, so joining
 * takes the invitation link the inviter sends: the notice says where to look, and offers no way
 * to join without it.
 */
export function NotificationInvitationItem({ invitation }: { invitation: InvitationDto }) {
  return (
    <article className="flex items-start gap-3 border-t border-line px-5 py-4 first:border-t-0">
      <div className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-subtle text-accent-strong">
        <Building2 size={16} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{invitation.organizationName}</p>
        <p className="mt-1 text-xs text-fg-secondary">
          Invited as {invitation.roleDefinition.name.toLowerCase()}. Open the invitation link the
          person who invited you sent, to join or decline.
        </p>
      </div>
    </article>
  );
}
