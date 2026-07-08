/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, Tag } from "lucide-react";
import { Link } from "react-router";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { formatSchemaDate, shortSchemaId } from "../../algorithms/schema/schema-metadata";
import { schemaVersionId } from "../../algorithms/schema/version-selection";
import { AppBadge, AppButton } from "../../app/components";

type Props = {
  onBookmark: (version: SchemaVersionDto) => void;
  schemaId: string;
  version: SchemaVersionDto;
};

export function SchemaSnapshotCatalogItem({ onBookmark, schemaId, version }: Props) {
  return (
    <article className="grid gap-4 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 transition hover:border-[var(--text-primary)] lg:grid-cols-[minmax(0,1fr)_auto]">
      <Link to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}`} className="min-w-0">
        <div className="flex items-center gap-2">
          <GitCommitHorizontal size={16} className="shrink-0 text-[var(--text-secondary)]" />
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {version.name} · v{version.version}
          </h2>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {shortSchemaId(version.id)} · {formatSchemaDate(version.createdAt)}
        </p>
      </Link>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <AppBadge tone="neutral">{countVisibleSchemaFields(version.formSchema)} fields</AppBadge>
        <AppBadge tone="neutral">{version.bindings.length} bindings</AppBadge>
        <Link to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}`}>
          <AppButton variant="secondary">Open</AppButton>
        </Link>
        <AppButton variant="secondary" onClick={() => onBookmark(version)}>
          <Tag size={16} />
          Bookmark
        </AppButton>
      </div>
    </article>
  );
}
