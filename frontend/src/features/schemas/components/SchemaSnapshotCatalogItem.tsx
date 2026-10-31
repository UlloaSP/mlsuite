/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, GitCommitHorizontal, PencilLine, Tag, Trash2 } from "lucide-react";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useDeleteSchemaContent } from "@/features/schemas/api/schema-content-deletion";
import { schemaVersionId, schemaVersionName } from "@/features/schemas/lib/version-selection";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  onBookmark: (version: SchemaVersionDto) => void;
  onClone?: (version: SchemaVersionDto) => void;
  onCreateChange: (version: SchemaVersionDto) => void;
  schemaId: string;
  version: SchemaVersionDto;
};

export function SchemaSnapshotCatalogItem({
  onBookmark,
  onClone,
  onCreateChange,
  schemaId,
  version,
}: Props) {
  const canDelete = useCan("canDeleteModels");
  const deletion = useDeleteSchemaContent(schemaId, "schema-versions");
  const { confirm, dialog } = useActionDialog();
  const remove = async () => {
    const confirmed = await confirm({
      title: `Delete ${schemaVersionName(version)}?`,
      description:
        "Only a snapshot nothing uses can go: no inference, review, bookmark or open change.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) deletion.mutate(version.id);
  };
  const actions: AppMenuAction[] = [
    {
      key: "change",
      label: "New change",
      icon: PencilLine,
      onSelect: () => onCreateChange(version),
    },
    { key: "bookmark", label: "Bookmark", icon: Tag, onSelect: () => onBookmark(version) },
    ...(onClone
      ? [
          {
            key: "clone",
            label: "Create schema from snapshot",
            icon: Copy,
            onSelect: () => onClone(version),
          },
        ]
      : []),
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
  ];

  return (
    <>
      {dialog}
      <CatalogEntry
        title={schemaVersionName(version)}
        icon={<GitCommitHorizontal size={16} className="mt-1 text-fg-secondary" />}
        metadata={
          <span>
            v{version.version} · Published <LiveRelativeTime value={version.createdAt} /> ago
          </span>
        }
        actions={
          <AppActionsMenu
            label={`Open actions for ${version.name} v${version.version}`}
            actions={actions}
          />
        }
        to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}`}
      />
    </>
  );
}
