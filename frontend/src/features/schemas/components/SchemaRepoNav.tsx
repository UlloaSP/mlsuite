/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, GitPullRequestArrow, Tags } from "lucide-react";
import { Link } from "react-router";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppSkeleton } from "@/shared/ui/AppSkeleton";
import { cx } from "@/shared/ui/cx";
import {
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "@/features/schemas/api/schema-queries";

type Props = {
  active: "overview" | "changes" | "bookmarks" | "snapshots";
  schemaId: string;
};

/** Loading is undefined (skeleton badge); a failed count is null (no badge) rather than a false 0. */
const countOf = (query: { data?: readonly unknown[]; isError: boolean }) =>
  query.isError ? null : query.data?.length;

/** Counts come from the same cached queries the tab pages read. */
export function SchemaRepoNav({ active, schemaId }: Props) {
  const changes = countOf(useSchemaDrafts(schemaId));
  const bookmarks = countOf(useSchemaBookmarks(schemaId));
  const snapshots = countOf(useSchemaVersions(schemaId));
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
    <nav className="flex flex-wrap gap-2 border-b border-line pb-3">
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
                ? "bg-fg text-fg-inverse"
                : "text-fg-secondary hover:bg-surface-muted hover:text-fg",
            )}
          >
            {Icon ? <Icon size={15} /> : null}
            {item.label}
            {item.count === undefined ? (
              <AppSkeleton className="h-5 w-6" />
            ) : item.count !== null ? (
              <AppBadge tone="neutral">{item.count}</AppBadge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
