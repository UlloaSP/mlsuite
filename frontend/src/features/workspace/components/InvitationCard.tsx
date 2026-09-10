import { RotateCcw, X } from "lucide-react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPanel } from "@/shared/ui/AppPanel";
import { RoleBadge } from "./RoleBadge";
import { StatusBadge } from "./admin/StatusBadge";
import type { OrganizationInvitationDto } from "@/features/workspace/api/workspace.types";

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
    <AppPanel variant="catalog">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-2 break-words">
          <div className="flex items-center gap-3">
            {canManage ? (
              <input
                type="checkbox"
                aria-label={`Select invitation ${invite.email}`}
                checked={selected}
                onChange={(event) => onSelect(event.target.checked)}
              />
            ) : null}
            <p className="text-base font-semibold">{invite.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <RoleBadge value={invite.roleDefinition?.name ?? invite.role} />
            <span>Expires {dateFormatter.format(Date.parse(invite.expiresAt))}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-28 shrink-0 text-center">
            <StatusBadge value={invite.status} />
          </div>
          {canManage ? (
            <>
              <AppButton
                variant="secondary"
                disabled={invite.status === "ACCEPTED"}
                onClick={onResend}
              >
                <RotateCcw size={14} />
                Resend
              </AppButton>
              <AppButton
                variant="secondary"
                disabled={!invite.token}
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${window.location.origin}/invite/${invite.token}`,
                  )
                }
              >
                Copy
              </AppButton>
              <AppButton variant="danger" onClick={onRevoke}>
                <X size={14} />
                Revoke
              </AppButton>
            </>
          ) : null}
        </div>
      </div>
    </AppPanel>
  );
}
