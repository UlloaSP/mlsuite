/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  AlertTriangle,
  GitCommitHorizontal,
  GitCompareArrows,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useDeleteSchemaContent } from "@/features/schemas/api/schema-content-deletion";
import type { SchemaDraftDto } from "@/features/schemas/api/draft-types";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { useActionDialog } from "@/shared/ui/use-action-dialog";

type Props = {
  baseSnapshotName?: string;
  draft: SchemaDraftDto;
  schemaId: string;
  onRename: (draft: SchemaDraftDto) => void;
};

export function SchemaChangeCatalogItem({ baseSnapshotName, draft, onRename, schemaId }: Props) {
  const navigate = useNavigate();
  const draftPath = `/schemas/${schemaId}/drafts/${draft.id}`;
  const canDelete = useCan("canCreateModels");
  const deletion = useDeleteSchemaContent(schemaId, "schema-drafts");
  const { confirm, dialog } = useActionDialog();
  const remove = async () => {
    const confirmed = await confirm({
      title: `Delete ${draft.name}?`,
      description: "This change has not been published, so its edits are lost.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) deletion.mutate(draft.id);
  };

  return (
    <>
      {dialog}
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
              ...(canDelete
                ? [
                    {
                      key: "delete",
                      label: "Delete",
                      icon: Trash2,
                      tone: "danger" as const,
                      onSelect: () => void remove(),
                    },
                  ]
                : []),
            ]}
          />
        }
        to={draftPath}
      />
    </>
  );
}
