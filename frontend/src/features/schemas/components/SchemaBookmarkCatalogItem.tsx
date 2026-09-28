/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, Play, Tag } from "lucide-react";
import { Link } from "react-router";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

/** A bookmark in its schema's repository; opening it goes to its Predict workspace. */
export function SchemaBookmarkCatalogItem({ bookmark }: { bookmark: SchemaBookmarkDto }) {
  const workspacePath = `/predict/${bookmark.id}`;

  return (
    <CatalogEntry
      title={bookmark.name}
      icon={<Tag size={16} className="mt-1 text-fg-secondary" />}
      metadata={
        <>
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={14} />
            {snapshotLabel(bookmark.versionName, bookmark.version)}
          </span>
          <span>
            Updated <LiveRelativeTime value={bookmark.updatedAt} /> ago
          </span>
        </>
      }
      actions={
        <Link to={workspacePath} className={appButtonClass({ size: "sm" })}>
          <Play size={14} />
          Predict
        </Link>
      }
      to={workspacePath}
    />
  );
}
