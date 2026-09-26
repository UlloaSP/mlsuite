/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BrainCircuit, CalendarDays, FileJson, Rows3, ScrollText } from "lucide-react";
import type { SchemaCatalogItemDto } from "@/features/schemas/api/schema-types";
import { modifierName } from "@/shared/lib/relative-time";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { SchemaActionsMenu, type SchemaAction } from "./SchemaActionsMenu";

type SchemaListItemProps = {
  canDelete: boolean;
  canEdit: boolean;
  item: SchemaCatalogItemDto;
  onAction: (action: SchemaAction) => void;
  onOpen: () => void;
};

const metrics = [
  { key: "modelCount", label: "Models", icon: BrainCircuit },
  { key: "fieldCount", label: "Fields", icon: Rows3 },
  { key: "reportCount", label: "Reports", icon: ScrollText },
] as const;

export function SchemaListItem({
  canDelete,
  canEdit,
  item,
  onAction,
  onOpen,
}: SchemaListItemProps) {
  const modifier = modifierName(item.updatedByName, item.updatedByEmail);
  return (
    <article className="group grid gap-4 rounded border border-line bg-surface p-4 transition hover:border-fg lg:grid-cols-[minmax(0,1fr)_minmax(300px,auto)_auto]">
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 cursor-pointer gap-4 text-left lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(300px,auto)]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileJson size={16} className="shrink-0 text-fg-muted" />
            <h2 className="truncate text-base font-semibold text-fg">{item.name}</h2>
            {item.archivedAt ? (
              <span className="rounded border border-line px-2 py-0.5 text-xs font-semibold text-fg-secondary">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-fg-secondary">
            {item.description || "Organization-level form snapshot"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-2">
              {item.updatedByAvatarUrl ? (
                <img src={item.updatedByAvatarUrl} alt="" className="size-5 rounded object-cover" />
              ) : (
                <span className="grid size-5 place-items-center rounded bg-surface-muted text-3xs font-semibold text-fg-secondary">
                  {modifier.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[180px] truncate">By {modifier}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              Updated <LiveRelativeTime value={item.updatedAt} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className="rounded bg-surface-subtle px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-fg-secondary">
                  <Icon size={14} />
                  {metric.label}
                </div>
                <p className="mt-1 text-xl font-semibold text-fg">{item[metric.key]}</p>
              </div>
            );
          })}
        </div>
      </button>
      <div className="justify-self-end self-start">
        <SchemaActionsMenu
          archived={Boolean(item.archivedAt)}
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={onAction}
          schemaName={item.name}
        />
      </div>
    </article>
  );
}
