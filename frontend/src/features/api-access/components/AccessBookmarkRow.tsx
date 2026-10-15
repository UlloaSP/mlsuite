/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BookOpen, BrainCircuit, FileJson2, GitCommitHorizontal } from "lucide-react";
import { Link } from "react-router";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { appButtonClass } from "@/shared/ui/button-styles";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { ApiAccessBookmarkDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmark: ApiAccessBookmarkDto;
  disabled: boolean;
  /** Absent for members who may only view API access. */
  onRevoke?: (bookmark: ApiAccessBookmarkDto) => void;
};

/** A bookmark a client may run: whether clients can run it now, and if not, why. */
export function AccessBookmarkRow({ bookmark, disabled, onRevoke }: Props) {
  return (
    <li className="flex flex-wrap items-start gap-3 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-fg">{bookmark.name}</p>
          {bookmark.refusal ? (
            <AppBadge tone="warning">Cannot run</AppBadge>
          ) : (
            <AppBadge tone="success">Runnable</AppBadge>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <FileJson2 size={14} />
            {bookmark.schemaName}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={14} />
            {snapshotLabel(bookmark.versionName, bookmark.version)}
          </span>
          {bookmark.modelName ? (
            <span className="inline-flex items-center gap-1">
              <BrainCircuit size={14} />
              {bookmark.modelName}
            </span>
          ) : null}
          {bookmark.apiId ? <span className="font-mono">{bookmark.apiId}</span> : null}
        </p>
        {bookmark.refusal ? (
          <p className="mt-1 text-xs text-warning-fg">{bookmark.refusal}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/api-access/docs?bookmark=${bookmark.id}`}
          className={appButtonClass({ size: "sm", variant: "secondary" })}
        >
          <BookOpen size={14} />
          Docs
        </Link>
        {onRevoke ? (
          <AppButton
            size="sm"
            variant="secondary"
            disabled={disabled}
            aria-label={`Take ${bookmark.name} away`}
            onClick={() => onRevoke(bookmark)}
          >
            Remove
          </AppButton>
        ) : null}
      </div>
    </li>
  );
}
