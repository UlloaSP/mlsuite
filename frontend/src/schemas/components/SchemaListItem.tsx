/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, FileJson } from "lucide-react";
import type { SchemaDto } from "../../api/schemas/dtos";
import { SchemaActionsMenu, type SchemaAction } from "./SchemaActionsMenu";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

type SchemaListItemProps = {
  canDelete: boolean;
  canEdit: boolean;
  item: SchemaDto;
  onAction: (action: SchemaAction) => void;
  onOpen: () => void;
};

export function SchemaListItem({
  canDelete,
  canEdit,
  item,
  onAction,
  onOpen,
}: SchemaListItemProps) {
  return (
    <article className="group rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 transition hover:border-[var(--text-primary)]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer text-left">
          <div className="flex items-center gap-2">
            <FileJson size={16} className="shrink-0 text-[var(--text-muted)]" />
            <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
              {item.name}
            </h2>
            {item.archivedAt ? (
              <span className="rounded border border-[var(--border-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
            {item.description || "Organization-level form snapshot"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <CalendarDays size={14} />
            <span>{formatDate(item.updatedAt ?? item.createdAt)}</span>
          </div>
        </button>
        <SchemaActionsMenu
          canDelete={canDelete}
          canEdit={canEdit}
          onAction={onAction}
          schemaName={item.name}
        />
      </div>
    </article>
  );
}

function formatDate(value: string | undefined): string {
  if (!value) return "No date";
  return DATE_FORMATTER.format(new Date(value));
}
