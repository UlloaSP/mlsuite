/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, History, Play, Tag } from "lucide-react";
import { Link } from "react-router";
import type { SchemaBookmarkDto } from "@/features/schemas/api/schema-types";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";

type Props = {
  bookmark: SchemaBookmarkDto;
  schemaId: string;
};

export function SchemaBookmarkCatalogItem({ bookmark, schemaId }: Props) {
  const runPath = `/schemas/${schemaId}/bookmarks/${bookmark.id}/runs/create`;

  return (
    <CatalogEntry
      title={bookmark.name}
      icon={<Tag size={16} className="mt-1 text-fg-secondary" />}
      metadata={
        <>
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={14} />
            {bookmark.versionName} · v{bookmark.version}
          </span>
          <span>
            Updated <LiveRelativeTime value={bookmark.updatedAt} /> ago
          </span>
        </>
      }
      actions={
        <>
          <Link to={runPath} className={appButtonClass({ size: "sm" })}>
            <Play size={14} />
            Run
          </Link>
          <Link
            to={`/schemas/${schemaId}/bookmarks/${bookmark.id}/runs`}
            className={appButtonClass({ size: "sm", variant: "secondary" })}
          >
            <History size={14} />
            History
          </Link>
        </>
      }
      to={runPath}
    />
  );
}
