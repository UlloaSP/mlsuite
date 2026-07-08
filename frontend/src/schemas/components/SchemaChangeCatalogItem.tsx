/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertTriangle, GitCompareArrows, PencilLine } from "lucide-react";
import { Link } from "react-router";
import type { SchemaDraftDto } from "../../api/schemas/dtos";
import { formatSchemaDate, shortSchemaId } from "../../algorithms/schema/schema-metadata";
import { AppBadge, AppButton } from "../../app/components";

const draftTone = (status: string): "warning" | "danger" | "success" =>
  status === "CONFLICT" ? "danger" : status === "PUBLISHED" ? "success" : "warning";

type Props = {
  draft: SchemaDraftDto;
  schemaId: string;
};

export function SchemaChangeCatalogItem({ draft, schemaId }: Props) {
  return (
    <article className="grid gap-4 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 transition hover:border-[var(--text-primary)] lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {draft.name}
          </h2>
          {draft.status === "CONFLICT" ? (
            <AlertTriangle size={16} className="shrink-0 text-[var(--danger-text)]" />
          ) : null}
          <AppBadge tone={draftTone(draft.status)}>{draft.status}</AppBadge>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {shortSchemaId(draft.id)} · base v{draft.baseVersion} · updated{" "}
          {formatSchemaDate(draft.updatedAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Link to={`/schemas/${schemaId}/drafts/${draft.id}`}>
          <AppButton variant="secondary">
            <PencilLine size={16} />
            Edit
          </AppButton>
        </Link>
        <Link to={`/schemas/${schemaId}/drafts/${draft.id}/conflicts`}>
          <AppButton variant="secondary">
            <GitCompareArrows size={16} />
            Review
          </AppButton>
        </Link>
      </div>
    </article>
  );
}
