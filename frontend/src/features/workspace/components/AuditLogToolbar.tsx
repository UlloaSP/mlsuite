/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_KINDS,
  AUDIT_TARGET_TYPES,
} from "@/features/workspace/lib/audit-actions";
import type { AuditFilterState } from "@/features/workspace/lib/use-audit-filters";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  ...Object.entries(AUDIT_ACTIONS).map(([value, { label }]) => ({ value, label })),
];
const ACTOR_KIND_OPTIONS = [
  { value: "all", label: "Anyone" },
  ...Object.entries(AUDIT_ACTOR_KINDS).map(([value, label]) => ({ value, label })),
];
const TARGET_OPTIONS = [
  { value: "all", label: "Any target" },
  ...Object.entries(AUDIT_TARGET_TYPES).map(([value, label]) => ({ value, label })),
];

/** Search and every filter of an audit catalog; `children` are the filters only one catalog has. */
export function AuditLogToolbar({
  filters,
  totalItems,
  children,
}: {
  filters: AuditFilterState;
  totalItems: number | undefined;
  children?: ReactNode;
}) {
  const { q, action, actorKind, actor, target, from, to } = filters.values;
  return (
    <AppToolbar variant="flat" className="justify-start">
      <AppSearchField
        className="min-w-[min(100%,320px)] flex-1"
        label="Search the audit log"
        placeholder="Search actor, target, details…"
        count={
          totalItems === undefined
            ? undefined
            : {
                shown: totalItems,
                total: totalItems,
                filtered: false,
                noun: totalItems === 1 ? "entry" : "entries",
              }
        }
        value={q}
        onChange={(value) => filters.setFilters({ q: value })}
      />
      {children}
      <AppSelect
        aria-label="Filter by action"
        className="w-full sm:w-56"
        options={ACTION_OPTIONS}
        value={action}
        onValueChange={(value) => filters.setFilters({ action: value })}
      />
      <AppSelect
        aria-label="Filter by kind of actor"
        className="w-full sm:w-40"
        options={ACTOR_KIND_OPTIONS}
        value={actorKind}
        onValueChange={(value) => filters.setFilters({ actorKind: value })}
      />
      <AppTextField
        aria-label="Filter by actor name"
        className="w-full sm:w-44"
        placeholder="Actor name"
        value={actor}
        onChange={(event) => filters.setFilters({ actor: event.currentTarget.value })}
      />
      <AppSelect
        aria-label="Filter by kind of target"
        className="w-full sm:w-44"
        options={TARGET_OPTIONS}
        value={target}
        onValueChange={(value) => filters.setFilters({ target: value })}
      />
      <AppTextField
        aria-label="From date"
        className="w-full sm:w-52"
        prefix="From"
        type="date"
        value={from}
        onChange={(event) => filters.setFilters({ from: event.currentTarget.value })}
      />
      <AppTextField
        aria-label="To date"
        className="w-full sm:w-52"
        prefix="To"
        type="date"
        value={to}
        onChange={(event) => filters.setFilters({ to: event.currentTarget.value })}
      />
    </AppToolbar>
  );
}
