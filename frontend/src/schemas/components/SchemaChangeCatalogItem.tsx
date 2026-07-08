/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  AlertTriangle,
  GitCommitHorizontal,
  GitCompareArrows,
  MoreHorizontal,
  PencilLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { SchemaDraftDto } from "../../api/schemas/dtos";
import { AppIconButton, cx } from "../../app/components";
import { LiveRelativeTime } from "../../app/components/LiveRelativeTime";

type Props = {
  baseSnapshotName?: string;
  draft: SchemaDraftDto;
  schemaId: string;
  onRename: (draft: SchemaDraftDto) => void;
};

export function SchemaChangeCatalogItem({ baseSnapshotName, draft, onRename, schemaId }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  return (
    <article
      className={cx(
        "relative grid rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] transition hover:border-[var(--text-primary)] lg:grid-cols-[minmax(0,1fr)_auto]",
        menuOpen ? "z-30" : "z-0",
      )}
    >
      <Link
        to={`/schemas/${schemaId}/drafts/${draft.id}`}
        aria-label={`Edit ${draft.name}`}
        className="absolute inset-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      />
      <div className="pointer-events-none relative min-w-0 p-4">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {draft.name}
          </h2>
          {draft.status === "CONFLICT" ? (
            <AlertTriangle size={16} className="shrink-0 text-[var(--danger-text)]" />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <GitCommitHorizontal size={15} />
            {baseSnapshotName ?? "Snapshot"} · v{draft.baseVersion}
          </span>
          <span>·</span>
          <span>
            updated <LiveRelativeTime value={draft.updatedAt} /> ago
          </span>
        </div>
      </div>
      <div ref={menuRef} className="relative z-10 flex items-center p-4 lg:justify-end">
        <AppIconButton
          type="button"
          aria-label={`Open actions for ${draft.name}`}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} />
        </AppIconButton>
        {menuOpen ? (
          <div className="absolute right-4 top-[calc(100%-0.25rem)] z-20 min-w-[170px] rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                setMenuOpen(false);
                onRename(draft);
              }}
            >
              <PencilLine size={15} />
              Rename
            </button>
            <Link
              to={`/schemas/${schemaId}/drafts/${draft.id}/conflicts`}
              className={menuItemClass}
              onClick={() => setMenuOpen(false)}
            >
              <GitCompareArrows size={15} />
              Review
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

const menuItemClass =
  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]";
