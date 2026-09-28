/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, GitCommitHorizontal, PencilLine, Tag } from "lucide-react";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { schemaVersionId } from "@/features/schemas/lib/version-selection";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";

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
  ];

  return (
    <CatalogEntry
      title={version.name}
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
  );
}
