/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";

const DEFAULTS = {
  q: "",
  action: "all",
  actorKind: "all",
  actor: "",
  target: "all",
  from: "",
  to: "",
  organization: "all",
};

/** The start of a day picked in the viewer's own zone, as the instant the API compares with. */
const dayStart = (day: string, addDays = 0) => {
  const start = new Date(`${day}T00:00:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  start.setDate(start.getDate() + addDays);
  return start.toISOString();
};

/**
 * An audit catalog's filters, kept in the URL, and what they ask the API for. The period covers
 * the whole of both days picked: the API's end is exclusive, so it is the morning after.
 */
export function useAuditFilters() {
  const filters = useUrlFilters(DEFAULTS);
  const { q, action, actorKind, actor, target, from, to, organization } = filters.values;
  const search = useDebouncedValue(q.trim());
  const actorName = useDebouncedValue(actor.trim());
  const controls = Object.fromEntries(
    Object.entries({
      search,
      filter: action,
      actorKind: actorKind === "all" ? undefined : actorKind,
      actor: actorName || undefined,
      targetType: target === "all" ? undefined : target,
      from: from ? dayStart(from) : undefined,
      to: to ? dayStart(to, 1) : undefined,
      organization: organization === "all" ? undefined : organization,
    }).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  return { ...filters, controls };
}

export type AuditFilterState = ReturnType<typeof useAuditFilters>;
