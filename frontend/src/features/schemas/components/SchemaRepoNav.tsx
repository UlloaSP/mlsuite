/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, GitPullRequestArrow, Tags } from "lucide-react";
import { Link } from "react-router";
import { AppSkeleton } from "@/shared/ui/AppSkeleton";
import { cx } from "@/shared/ui/cx";
import { TAB_LIST_CLASS, tabCountClass, tabItemClass } from "@/shared/ui/tab-styles";
import {
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "@/features/schemas/api/schema-queries";

type Props = {
  active: "overview" | "changes" | "bookmarks" | "snapshots";
  schemaId: string;
};

/** Loading is undefined (skeleton count); a failed count is null (no count) rather than a false 0. */
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
    <nav aria-label="Schema sections" className={cx(TAB_LIST_CLASS, "shrink-0")}>
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.id === active;
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-current={selected ? "page" : undefined}
            className={tabItemClass(selected)}
          >
            {Icon ? <Icon size={15} /> : null}
            {item.label}
            {item.count === undefined ? (
              <AppSkeleton className="h-5 w-6 rounded-full" />
            ) : item.count !== null ? (
              <span className={tabCountClass(selected)}>{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
