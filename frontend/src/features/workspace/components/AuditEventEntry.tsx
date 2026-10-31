/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Bot, Cable, Globe, History, UserRound, type LucideIcon } from "lucide-react";
import {
  AUDIT_ACTOR_KINDS,
  auditActionLabel,
  auditDetails,
  auditTargetLabel,
  isPlatformAction,
} from "@/features/workspace/lib/audit-actions";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import type { AuditEventDto } from "@/shared/api/openapi.gen";

const ACTOR_ICONS: Record<AuditEventDto["actor"]["kind"], LucideIcon> = {
  USER: UserRound,
  SYSTEM: Bot,
  API_CLIENT: Cable,
  VISITOR: Globe,
};

/** Who acted: a person by name; anyone else says what they are, as well as what they were called. */
function actorLabel({ kind, name }: AuditEventDto["actor"]) {
  const noun = AUDIT_ACTOR_KINDS[kind];
  if (!name || name === noun) return noun;
  return kind === "USER" ? name : `${noun} · ${name}`;
}

/** One audit log entry: what was done, by whom, when, and to what, with the details recorded. */
export function AuditEventEntry({
  event,
  showOrganization = false,
}: {
  event: AuditEventDto;
  showOrganization?: boolean;
}) {
  const ActorIcon = ACTOR_ICONS[event.actor.kind];
  return (
    <CatalogEntry
      title={auditActionLabel(event.action)}
      titleAccessory={
        isPlatformAction(event.action) ? <AppBadge tone="info">Platform</AppBadge> : null
      }
      icon={<History size={16} className="mt-1 text-fg-secondary" />}
      description={auditDetails(event.metadata) || undefined}
      metadata={
        <>
          <span>{formatTimestamp(event.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <ActorIcon size={14} />
            {actorLabel(event.actor)}
          </span>
          <span>
            {auditTargetLabel(event.targetType)}
            {event.targetId ? <span className="ml-1 font-mono">#{event.targetId}</span> : null}
          </span>
          {showOrganization ? <span>{event.organizationName ?? "Platform"}</span> : null}
          {event.ip ? <span className="font-mono">{event.ip}</span> : null}
          {event.requestId ? (
            <span>
              Request <span className="font-mono">{event.requestId.slice(0, 8)}</span>
            </span>
          ) : null}
        </>
      }
    />
  );
}
