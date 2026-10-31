/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PublicBookmarkCard } from "@/capabilities/public-bookmarks/PublicBookmarkCard";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import type { PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";

const GRID = "grid gap-3 sm:grid-cols-2";

type BookmarkPages = {
  data?: { hasNext: boolean; items: PublicBookmarkSummaryDto[] };
  error: unknown;
  fetchNextPage: () => unknown;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  refetch: () => unknown;
};

/**
 * What a person publishes: their pins first, in their order, then the rest. A profile's sections
 * share one scroll, so the rest grows by asking instead of virtualizing a list inside the page.
 */
export function ProfileBookmarks({
  bookmarks,
  pinned,
}: {
  bookmarks: BookmarkPages;
  pinned: PublicBookmarkSummaryDto[];
}) {
  const rest = bookmarks.data?.items ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {pinned.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-fg">Pinned</h2>
          <div className={GRID}>
            {pinned.map((bookmark) => (
              <PublicBookmarkCard key={bookmark.publicId} bookmark={bookmark} />
            ))}
          </div>
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg">Published bookmarks</h2>
        {bookmarks.isLoading ? <AppLoadingState label="Loading bookmarks…" layout="grid" /> : null}
        {bookmarks.error ? (
          <div className="flex flex-col items-start gap-3">
            <AppInlineAlert>These bookmarks could not be loaded.</AppInlineAlert>
            <AppButton size="sm" variant="secondary" onClick={() => void bookmarks.refetch()}>
              Try again
            </AppButton>
          </div>
        ) : null}
        {!bookmarks.isLoading && !bookmarks.error && rest.length === 0 ? (
          <AppEmptyState
            compact
            className="rounded-card border border-dashed border-line"
            title={pinned.length > 0 ? "Nothing else published" : "Nothing published yet"}
          />
        ) : null}
        {rest.length > 0 ? (
          <div className={GRID}>
            {rest.map((bookmark) => (
              <PublicBookmarkCard key={bookmark.publicId} bookmark={bookmark} />
            ))}
          </div>
        ) : null}
        {bookmarks.data?.hasNext ? (
          <AppButton
            className="self-start"
            disabled={bookmarks.isFetchingNextPage}
            size="sm"
            variant="secondary"
            onClick={() => void bookmarks.fetchNextPage()}
          >
            {bookmarks.isFetchingNextPage ? "Loading…" : "Load more"}
          </AppButton>
        ) : null}
      </section>
    </div>
  );
}
