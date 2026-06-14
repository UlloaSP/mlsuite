/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Power, Trash2 } from "lucide-react";
import { m as motion } from "motion/react";
import { AppBadge, AppButton, AppIconButton, cx } from "../components";
import {
  type PluginPageItem,
  TYPE_META,
  formatSize,
  formatTimestamp,
} from "./plugin-catalog-shared";

type PluginCatalogListItemProps = {
  canManage: boolean;
  index: number;
  isBusy: boolean;
  item: PluginPageItem;
  onDelete: (item: PluginPageItem) => void | Promise<void>;
  onToggle: (item: PluginPageItem) => void | Promise<void>;
};

export function PluginCatalogListItem({
  canManage,
  index,
  isBusy,
  item,
  onDelete,
  onToggle,
}: PluginCatalogListItemProps) {
  const meta = TYPE_META[item.pluginType];
  const displayName = item.kind ?? item.fileName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      className="grid gap-4 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(260px,1.2fr)_minmax(160px,0.65fr)_auto]"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cx(
              "inline-flex size-2.5 rounded-full",
              item.active ? "bg-[var(--accent-primary)]" : "bg-[var(--text-muted)]",
            )}
          />
          <p className="truncate text-base font-semibold text-[var(--text-primary)]">
            {displayName}
          </p>
          <AppBadge tone={meta.tone} className="px-2.5 py-1 text-[0.7rem]">
            {meta.label}
          </AppBadge>
        </div>

        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {`Updated ${formatTimestamp(item.updatedAt)} · ${formatSize(item.sizeBytes)}`}
        </p>
      </div>

      {canManage ? (
        <div className="flex items-center justify-start gap-2 lg:justify-end">
          <AppButton
            type="button"
            onClick={() => {
              void onToggle(item);
            }}
            disabled={isBusy}
            variant={item.active ? "secondary" : "primary"}
          >
            <Power size={14} />
            {item.active ? "Deactivate" : "Activate"}
          </AppButton>

          <AppIconButton
            type="button"
            onClick={() => {
              void onDelete(item);
            }}
            disabled={isBusy}
            aria-label={`Delete ${displayName}`}
            className="hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)] hover:text-[var(--danger-text)]"
          >
            <Trash2 size={16} />
          </AppIconButton>
        </div>
      ) : null}
    </motion.div>
  );
}
