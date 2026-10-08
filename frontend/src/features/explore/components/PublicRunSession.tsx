/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { formatTimestamp } from "@/shared/lib/date-time";
import type { PublicRunDto } from "@/shared/api/openapi.gen";

type Props = {
  runs: readonly PublicRunDto[];
  /** True while the first read of the session is on its way. */
  loading: boolean;
  /** Which run is reviewed, by id: the server keeps the answers, the page only shows the mark. */
  reviewed: (run: PublicRunDto) => boolean;
  selectedId: number | null;
  onSelect: (run: PublicRunDto) => void;
};

/**
 * Every run this browser made on the bookmark, newest first, as the server keeps them: the
 * page's session, which a reload or a later visit finds again. Choosing one shows its results
 * again, and the review the visitor gave or can give.
 */
export function PublicRunSession({ runs, loading, reviewed, selectedId, onSelect }: Props) {
  return (
    <aside
      aria-label="Your runs"
      className="flex max-h-96 w-full shrink-0 flex-col rounded-card border border-line bg-surface lg:max-h-none lg:w-80"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Your runs</h2>
        <span className="text-xs text-fg-muted">
          {runs.length === 0 ? "None yet" : `${runs.length} kept`}
        </span>
      </header>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {runs.length === 0 ? (
          <p className="px-1 py-2 text-sm text-fg-muted">
            {loading
              ? "Looking for your earlier runs…"
              : "Each run you make here is kept for this browser. Open one to see its results again or to review it."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {runs.map((run) => {
              const selected = run.id === selectedId;
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(run)}
                    className={cx(
                      "flex w-full cursor-pointer flex-col gap-1 rounded-card border bg-surface p-3 text-left transition-colors",
                      selected ? "border-accent" : "border-line hover:border-line-strong",
                      FOCUS_RING,
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-fg">
                        {formatTimestamp(run.createdAt)}
                      </span>
                      {reviewed(run) ? <AppBadge tone="success">Reviewed</AppBadge> : null}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {run.reports.length === 1 ? "1 result" : `${run.reports.length} results`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
