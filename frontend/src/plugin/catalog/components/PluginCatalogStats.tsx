/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BarChart3, Puzzle, TableProperties } from "lucide-react";
import { cx } from "../../../app/components";

type PluginCatalogStatsProps = {
  fieldPlugins: number;
  reportPlugins: number;
  totalPlugins: number;
};

const STAT_ITEMS = [
  {
    icon: Puzzle,
    key: "totalPlugins",
    label: "Total plugins",
    tone: "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
  },
  {
    icon: TableProperties,
    key: "fieldPlugins",
    label: "Field plugins",
    tone: "bg-[var(--warning-quiet)] text-[var(--warning-text)]",
  },
  {
    icon: BarChart3,
    key: "reportPlugins",
    label: "Report plugins",
    tone: "bg-[var(--success-quiet)] text-[var(--success-text)]",
  },
] as const;

export function PluginCatalogStats({
  fieldPlugins,
  reportPlugins,
  totalPlugins,
}: PluginCatalogStatsProps) {
  const values = { fieldPlugins, reportPlugins, totalPlugins };
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="flex items-center gap-4 border-[var(--border-soft)] md:border-r md:last:border-r-0"
          >
            <span className={cx("rounded-[16px] p-3", item.tone)}>
              <Icon size={26} />
            </span>
            <span>
              <strong className="block text-2xl font-semibold text-[var(--text-primary)]">
                {values[item.key]}
              </strong>
              <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
