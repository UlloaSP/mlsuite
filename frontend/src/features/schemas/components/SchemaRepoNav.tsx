/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, GitPullRequestArrow, Tags } from "lucide-react";
import { Link } from "react-router";
import { AppBadge } from "@/shared/ui/AppBadge";
import { cx } from "@/shared/ui/cx";

type Props = {
  active: "overview" | "changes" | "bookmarks" | "snapshots";
  schemaId: string;
  changes: number;
  bookmarks: number;
  snapshots: number;
};

export function SchemaRepoNav({ active, schemaId, changes, bookmarks, snapshots }: Props) {
  const items = [
    { id: "overview", label: "Overview", to: `/schemas/${schemaId}`, count: null, icon: null },
    {
      id: "changes",
      label: "Changes",
      to: `/schemas/${schemaId}/changes`,
      count: changes,
      icon: GitPullRequestArrow,
    },
    {
      id: "bookmarks",
      label: "Bookmarks",
      to: `/schemas/${schemaId}/bookmarks`,
      count: bookmarks,
      icon: Tags,
    },
    {
      id: "snapshots",
      label: "Snapshots",
      to: `/schemas/${schemaId}/snapshots`,
      count: snapshots,
      icon: GitCommitHorizontal,
    },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[var(--border-soft)] pb-3">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.id === active;
        return (
          <Link
            key={item.id}
            to={item.to}
            className={cx(
              "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition",
              selected
                ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {Icon ? <Icon size={15} /> : null}
            {item.label}
            {item.count !== null ? <AppBadge tone="neutral">{item.count}</AppBadge> : null}
          </Link>
        );
      })}
    </nav>
  );
}
