/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Trash2 } from "lucide-react";
import { modifierName } from "@/shared/lib/relative-time";
import { type PluginPageItem, TYPE_META } from "@/features/plugins/lib/catalog-page-model";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";

type PluginCatalogListItemProps = {
  canManage: boolean;
  isBusy: boolean;
  item: PluginPageItem;
  onDelete: (item: PluginPageItem) => void | Promise<void>;
};

export function PluginCatalogListItem({
  canManage,
  isBusy,
  item,
  onDelete,
}: PluginCatalogListItemProps) {
  const meta = TYPE_META[item.pluginType];
  const displayName = item.kind ?? item.fileName;
  const modifier = modifierName(item.updatedByName, item.updatedByEmail);

  return (
    <CatalogEntry
      title={displayName}
      titleAccessory={<AppBadge tone={meta.tone}>{meta.label}</AppBadge>}
      metadata={
        <>
          <span>By {modifier}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            Updated <LiveRelativeTime value={item.updatedAt} />
          </span>
        </>
      }
      actions={
        canManage ? (
          <AppActionsMenu
            label={`Open actions for ${displayName}`}
            disabled={isBusy}
            actions={[
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                tone: "danger",
                onSelect: () => {
                  void onDelete(item);
                },
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
