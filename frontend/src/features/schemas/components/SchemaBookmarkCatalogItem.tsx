/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, History, Play, Tag } from "lucide-react";
import { Link } from "react-router";
import type { SchemaBookmarkDto } from "@/features/schemas/api/schema-types";
import { AppButton } from "@/shared/ui/AppButton";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";

type Props = {
  bookmark: SchemaBookmarkDto;
  schemaId: string;
};

export function SchemaBookmarkCatalogItem({ bookmark, schemaId }: Props) {
  return (
    <article className="grid gap-4 rounded border border-line bg-surface p-4 transition hover:border-fg lg:grid-cols-[minmax(0,1fr)_auto]">
      <Link
        to={`/schemas/${schemaId}/bookmarks/${bookmark.id}/runs/create`}
        className="min-w-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex items-center gap-2">
          <Tag size={16} className="shrink-0 text-fg-secondary" />
          <h2 className="truncate text-base font-semibold text-fg">{bookmark.name}</h2>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-secondary">
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={15} />
            {bookmark.versionName} · v{bookmark.version}
          </span>
          <span>·</span>
          <span>
            updated <LiveRelativeTime value={bookmark.updatedAt} /> ago
          </span>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Link to={`/schemas/${schemaId}/bookmarks/${bookmark.id}/runs/create`}>
          <AppButton>
            <Play size={16} />
            Run
          </AppButton>
        </Link>
        <Link to={`/schemas/${schemaId}/bookmarks/${bookmark.id}/runs`}>
          <AppButton variant="secondary">
            <History size={16} />
            History
          </AppButton>
        </Link>
      </div>
    </article>
  );
}
