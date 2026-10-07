/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight, Building2, Tag } from "lucide-react";
import { Link } from "react-router";
import { PublicFormSize } from "@/features/explore/components/PublicFormSize";
import { formatDate } from "@/shared/lib/date-time";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";

/**
 * One published bookmark in the feed: what it does, how much it asks for and gives back, who
 * published it, and a way in. The schema and snapshot behind it are its organization's own.
 */
export function PublicBookmarkCard({ bookmark }: { bookmark: PublicBookmarkSummaryDto }) {
  return (
    <Link
      to={`/explore/${encodeURIComponent(bookmark.publicId)}`}
      aria-label={`Open ${bookmark.name} by ${bookmark.organizationName}`}
      className={cx(
        "group flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-hover",
        FOCUS_RING,
      )}
    >
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-accent-strong">
          <Tag size={18} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em] text-fg">
          {bookmark.name}
        </h2>
      </header>

      {bookmark.description?.trim() ? (
        <p className="line-clamp-2 text-sm leading-5 text-fg-secondary">{bookmark.description}</p>
      ) : null}

      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-secondary">
        <PublicFormSize inputCount={bookmark.inputCount} reportCount={bookmark.reportCount} />
      </dl>

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4 text-xs text-fg-muted">
        {/* The publisher keeps its own line: on a narrow card the date would squeeze it out. */}
        <div className="grid min-w-0 gap-1">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-fg-secondary">
            <Building2 size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{bookmark.organizationName}</span>
          </span>
          <span>Updated {formatDate(bookmark.updatedAt)}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-strong">
          Open
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </footer>
    </Link>
  );
}
