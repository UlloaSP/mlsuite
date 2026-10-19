/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { History, UserRound } from "lucide-react";
import {
  auditActionLabel,
  auditTargetLabel,
  isPlatformAction,
} from "@/features/workspace/lib/audit-actions";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import type { AuditEventDto } from "@/shared/api/openapi.gen";

/** One audit log entry: what was done, by whom, when, and to what, with the details recorded. */
export function AuditEventEntry({ event }: { event: AuditEventDto }) {
  return (
    <CatalogEntry
      title={auditActionLabel(event.action)}
      titleAccessory={
        isPlatformAction(event.action) ? <AppBadge tone="info">Platform</AppBadge> : null
      }
      icon={<History size={16} className="mt-1 text-fg-secondary" />}
      description={event.metadata ?? undefined}
      metadata={
        <>
          <span>{formatTimestamp(event.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <UserRound size={14} />
            {event.actor.name}
          </span>
          <span>
            {auditTargetLabel(event.targetType)}
            {event.targetId ? <span className="ml-1 font-mono">#{event.targetId}</span> : null}
          </span>
        </>
      }
    />
  );
}
