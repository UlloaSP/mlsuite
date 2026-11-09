/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { StatusBadge } from "@/features/workspace/components/admin/StatusBadge";
import { OverviewListPanel } from "./OverviewListPanel";
import type { InvitationDto } from "@/shared/api/openapi.gen";

export function OverviewInvitationsPanel({
  invitations,
  pending,
  to,
}: {
  invitations: InvitationDto[];
  pending: number | undefined;
  to: string;
}) {
  return (
    <OverviewListPanel
      title="Latest invitations"
      summary={pending === undefined ? undefined : `${pending} pending`}
      isEmpty={invitations.length === 0}
      emptyText="No invitations sent yet."
      linkLabel="Manage invitations"
      to={to}
    >
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex items-center gap-3 px-5 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">{invitation.email}</span>
            <span className="block truncate text-xs text-fg-secondary">
              {invitation.roleDefinition.name} · sent{" "}
              <LiveRelativeTime value={invitation.createdAt} />
            </span>
          </span>
          <StatusBadge value={invitation.status} />
        </li>
      ))}
    </OverviewListPanel>
  );
}
