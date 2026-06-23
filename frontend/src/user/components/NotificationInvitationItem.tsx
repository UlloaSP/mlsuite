import { Building2, Check, X } from "lucide-react";
import type { InvitationDto } from "../../api/workspace/dtos";
import { useAcceptInvitation, useDeclineInvitation } from "../../api/workspace/hooks";
import { AppButton } from "../../app/components/AppButton";

export function NotificationInvitationItem({ invitation }: { invitation: InvitationDto }) {
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const busy = accept.isPending || decline.isPending;

  return (
    <article className="flex items-start justify-between gap-4 border-t border-[var(--border-soft)] px-5 py-4 first:border-t-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]">
          <Building2 size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {invitation.organizationName}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Invited as {invitation.role.toLowerCase()}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <AppButton
          className="px-3 py-2"
          disabled={busy}
          onClick={() => accept.mutate(invitation.token)}
        >
          <Check size={14} />
          Accept
        </AppButton>
        <AppButton
          className="px-3 py-2"
          variant="secondary"
          disabled={busy}
          onClick={() => decline.mutate(invitation.token)}
        >
          <X size={14} />
          Decline
        </AppButton>
      </div>
    </article>
  );
}
