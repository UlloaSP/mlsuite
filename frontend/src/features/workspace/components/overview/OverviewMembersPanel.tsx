/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { profilePath } from "@/shared/lib/profile-path";
import { formatCompactRelativeTime } from "@/shared/lib/relative-time";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { OverviewListPanel } from "./OverviewListPanel";
import type { OrganizationMembershipRowDto } from "@/shared/api/openapi.gen";

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
            <PersonAvatar
              avatarUrl={member.avatarUrl}
              className="size-8 rounded-full text-2xs"
              name={name}
            />
            <span className="min-w-0 flex-1">
              {member.profileHandle ? (
                <Link
                  to={profilePath(member.profileHandle)}
                  className={cx(
                    "block truncate rounded-sm text-sm font-medium text-fg hover:underline",
                    FOCUS_RING,
                  )}
                >
                  {name}
                </Link>
              ) : (
                <span className="block truncate text-sm font-medium text-fg">{name}</span>
              )}
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
