import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import type { usePublicRunCatalog } from "@/features/explore/api/public-catalog-api";
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
  query: ReturnType<typeof usePublicRunCatalog>;
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
export function PublicRunSession({ runs, query, loading, reviewed, selectedId, onSelect }: Props) {
  return (
    <aside
      aria-label="Your runs"
      className="flex max-h-96 w-full shrink-0 flex-col rounded-card border border-line bg-surface lg:max-h-none lg:w-80"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Your runs</h2>
        <span className="text-xs text-fg-muted">
          {query.data?.totalItems ? `${query.data.totalItems} kept` : "None yet"}
        </span>
      </header>
      {/* Stacked above the form the aside has no height of its own, so the list brings one. */}
      <div className="flex h-72 min-h-0 flex-col px-3 lg:h-auto lg:flex-1">
        <CatalogListPanel
          itemCount={runs.length}
          hasNext={query.hasNextPage}
          isLoading={loading}
          isBusy={query.isFetching}
          loadingLabel="Looking for your earlier runs…"
          errorMessage={query.error?.message ?? null}
          onLoadMore={() => query.fetchNextPage()}
          onRetry={() =>
            void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
          }
          emptyState={{
            title: "No runs yet",
            description:
              "Each run you make here is kept for this browser. Open one to see its results again or to review it.",
          }}
        >
          {runs.map((run) => {
            const selected = run.id === selectedId;
            return (
              <button
                key={run.id}
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
            );
          })}
        </CatalogListPanel>
      </div>
    </aside>
  );
}
