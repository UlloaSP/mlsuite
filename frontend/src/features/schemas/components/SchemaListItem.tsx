/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, FileJson, Rows3, ScrollText } from "lucide-react";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { SchemaCatalogItemDto } from "@/features/schemas/api/schema-types";
import { modifierName } from "@/shared/lib/relative-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { SchemaActionsMenu, type SchemaAction } from "./SchemaActionsMenu";

type SchemaListItemProps = {
  canDelete: boolean;
  canEdit: boolean;
  item: SchemaCatalogItemDto;
  onAction: (action: SchemaAction) => void;
  /** The detail page this row opens. */
  to: string;
};

const metrics = [
  { key: "modelCount", label: "Models", icon: SECTION_ICONS.models },
  { key: "fieldCount", label: "Fields", icon: Rows3 },
  { key: "reportCount", label: "Reports", icon: ScrollText },
] as const;

export function SchemaListItem({ canDelete, canEdit, item, onAction, to }: SchemaListItemProps) {
  const modifier = modifierName(item.updatedByName, item.updatedByEmail);
  return (
    <CatalogEntry
      title={item.name}
      titleAccessory={item.archivedAt ? <AppBadge>Archived</AppBadge> : null}
      icon={<FileJson size={16} className="mt-1 text-fg-muted" />}
      description={item.description || "Organization-level form snapshot"}
      metadata={
        <>
          <span className="inline-flex items-center gap-2">
            {item.updatedByAvatarUrl ? (
              <img
                src={item.updatedByAvatarUrl}
                alt=""
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-5 place-items-center rounded-full bg-surface-muted text-3xs font-semibold text-fg-secondary">
                {modifier.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="max-w-[180px] truncate">By {modifier}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            Updated <LiveRelativeTime value={item.updatedAt} />
          </span>
        </>
      }
      details={metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <span key={metric.key} className="inline-flex items-center gap-1.5">
            <Icon size={14} className="text-fg-muted" />
            <span className="font-semibold text-fg">{item[metric.key]}</span>
            {metric.label}
          </span>
        );
      })}
      actions={
        <SchemaActionsMenu
          archived={Boolean(item.archivedAt)}
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={onAction}
          schemaName={item.name}
        />
      }
      to={to}
    />
  );
}
