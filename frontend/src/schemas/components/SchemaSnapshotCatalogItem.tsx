/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal, MoreHorizontal, PencilLine, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import { schemaVersionId } from "../../algorithms/schema/version-selection";
import { AppIconButton, cx } from "../../app/components";
import { LiveRelativeTime } from "../../app/components/LiveRelativeTime";

type Props = {
  onBookmark: (version: SchemaVersionDto) => void;
  onCreateChange: (version: SchemaVersionDto) => void;
  schemaId: string;
  version: SchemaVersionDto;
};

export function SchemaSnapshotCatalogItem({
  onBookmark,
  onCreateChange,
  schemaId,
  version,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const versionId = schemaVersionId(version);

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
        to={`/schemas/${schemaId}/versions/${versionId}`}
        aria-label={`Open ${version.name} v${version.version}`}
        className="absolute inset-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      />
      <div className="pointer-events-none relative min-w-0 p-4">
        <div className="flex items-center gap-2">
          <GitCommitHorizontal size={16} className="shrink-0 text-[var(--text-secondary)]" />
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {version.name}
          </h2>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          v{version.version} · published <LiveRelativeTime value={version.createdAt} /> ago
        </p>
      </div>
      <div ref={menuRef} className="relative z-10 flex items-center p-4 lg:justify-end">
        <AppIconButton
          type="button"
          aria-label={`Open actions for ${version.name} v${version.version}`}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} />
        </AppIconButton>
        {menuOpen ? (
          <div className="absolute right-4 top-[calc(100%-0.25rem)] z-20 min-w-[170px] rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onCreateChange(version);
              }}
              className={menuItemClass}
            >
              <PencilLine size={15} />
              New change
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onBookmark(version);
              }}
              className={menuItemClass}
            >
              <Tag size={15} />
              Bookmark
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

const menuItemClass =
  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]";
