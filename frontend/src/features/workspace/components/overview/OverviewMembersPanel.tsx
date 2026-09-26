/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatCompactRelativeTime } from "@/shared/lib/relative-time";
import type { OrganizationMembershipRowDto } from "@/features/workspace/api/workspace.types";
import { OverviewListPanel } from "./OverviewListPanel";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export function OverviewMembersPanel({
  members,
  to,
  total,
}: {
  members: OrganizationMembershipRowDto[];
  to: string;
  total: number | undefined;
}) {
  return (
    <OverviewListPanel
      title="Newest members"
      summary={total === undefined ? undefined : `${total} active`}
      isEmpty={members.length === 0}
      emptyText="No members yet."
      linkLabel="Manage members"
      to={to}
    >
      {members.map((member) => {
        const name = member.fullName || member.email;
        return (
          <li key={member.id} className="flex items-center gap-3 px-5 py-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-8 shrink-0 rounded-lg border border-line object-cover"
              />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-subtle text-2xs font-semibold text-accent-strong">
                {initials(name)}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{name}</span>
              <span className="block truncate text-xs text-fg-secondary">{member.email}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs font-medium text-fg-secondary">
                {member.role.name}
              </span>
              <time dateTime={member.createdAt} className="block text-2xs text-fg-muted">
                joined {formatCompactRelativeTime(member.createdAt)} ago
              </time>
            </span>
          </li>
        );
      })}
    </OverviewListPanel>
  );
}
