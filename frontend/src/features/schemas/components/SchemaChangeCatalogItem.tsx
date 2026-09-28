/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertTriangle, GitCommitHorizontal, GitCompareArrows, PencilLine } from "lucide-react";
import { useNavigate } from "react-router";
import type { SchemaDraftDto } from "@/features/schemas/api/draft-types";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";

type Props = {
  baseSnapshotName?: string;
  draft: SchemaDraftDto;
  schemaId: string;
  onRename: (draft: SchemaDraftDto) => void;
};

export function SchemaChangeCatalogItem({ baseSnapshotName, draft, onRename, schemaId }: Props) {
  const navigate = useNavigate();
  const draftPath = `/schemas/${schemaId}/drafts/${draft.id}`;

  return (
    <CatalogEntry
      title={draft.name}
      titleAccessory={
        draft.status === "CONFLICT" ? (
          <AlertTriangle size={16} aria-label="Conflict" className="shrink-0 text-danger-fg" />
        ) : null
      }
      metadata={
        <>
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={14} />
            {baseSnapshotName ?? "Snapshot"} · v{draft.baseVersion}
          </span>
          <span>
            Updated <LiveRelativeTime value={draft.updatedAt} /> ago
          </span>
        </>
      }
      actions={
        <AppActionsMenu
          label={`Open actions for ${draft.name}`}
          actions={[
            { key: "rename", label: "Rename", icon: PencilLine, onSelect: () => onRename(draft) },
            {
              key: "review",
              label: "Review",
              icon: GitCompareArrows,
              onSelect: () => void navigate(`${draftPath}/conflicts`),
            },
          ]}
        />
      }
      to={draftPath}
    />
  );
}
