/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Trash2 } from "lucide-react";
import { m as motion } from "motion/react";
import { AppBadge, AppButton } from "../../../app/components";
import { type PluginPageItem, TYPE_META, formatTimestamp } from "../plugin-catalog-shared";

type PluginCatalogListItemProps = {
  canManage: boolean;
  index: number;
  isBusy: boolean;
  item: PluginPageItem;
  onDelete: (item: PluginPageItem) => void | Promise<void>;
};

export function PluginCatalogListItem({
  canManage,
  index,
  isBusy,
  item,
  onDelete,
}: PluginCatalogListItemProps) {
  const meta = TYPE_META[item.pluginType];
  const displayName = item.kind ?? item.fileName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      className="grid gap-3 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 transition lg:grid-cols-[minmax(260px,1fr)_auto]"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold text-[var(--text-primary)]">
            {displayName}
          </p>
          <AppBadge tone={meta.tone} className="px-2.5 py-1 text-[0.7rem]">
            {meta.label}
          </AppBadge>
        </div>

        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          {`Updated ${formatTimestamp(item.updatedAt)}`}
        </p>
      </div>

      <div className="flex items-center justify-start gap-2 lg:justify-end">
        {canManage ? (
          <AppButton
            type="button"
            onClick={() => {
              void onDelete(item);
            }}
            disabled={isBusy}
            variant="secondary"
            className="hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)] hover:text-[var(--danger-text)]"
          >
            <Trash2 size={14} />
            Delete
          </AppButton>
        ) : null}
      </div>
    </motion.div>
  );
}
