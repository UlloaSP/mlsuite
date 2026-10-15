/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RequestOutcomeBadge } from "@/features/api-access/components/RequestOutcomeBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import type { ApiRequestDto } from "@/shared/api/openapi.gen";

/** The latest calls that were refused or failed, whenever they happened. */
export function RecentFailuresList({ failures }: { failures: ApiRequestDto[] }) {
  if (failures.length === 0) {
    return <AppEmptyState compact title="No refused or failed calls" />;
  }
  return (
    <ul aria-label="Recent failures" className="border-t border-line">
      {failures.map((failure) => (
        <li
          key={failure.requestId}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2.5 text-sm"
        >
          <RequestOutcomeBadge request={failure} />
          <span className="min-w-0 flex-1 truncate font-semibold text-fg">
            {failure.clientName}
          </span>
          <span className="text-xs text-fg-muted">
            <LiveRelativeTime value={failure.createdAt} /> ago
          </span>
        </li>
      ))}
    </ul>
  );
}
