/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowDown, ArrowUp, Pin, X } from "lucide-react";
import { useState } from "react";
import { useOwnProfileBookmarks, useReplacePins } from "@/features/user/api/profile-api";
import { requestFailure } from "@/features/user/lib/request-failure";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppTooltip } from "@/shared/ui/AppTooltip";
import type { PublicBookmarkSummaryDto } from "@/shared/api/openapi.gen";

const MAX_PINS = 6;
const ROW = "flex min-w-0 items-center gap-2 rounded-card border border-line bg-surface px-3 py-2";

const moved = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
};

/** Which of their published bookmarks lead their profile, and in what order. */
export function ProfilePinsEditor({ pinned }: { pinned: PublicBookmarkSummaryDto[] }) {
  const [draft, setDraft] = useState(pinned);
  const [search, setSearch] = useState("");
  const catalog = useOwnProfileBookmarks(useDebouncedValue(search));
  const save = useReplacePins();
  const chosen = new Set(draft.map((bookmark) => bookmark.publicId));
  // The catalog leaves out what is saved as pinned, so what was just unpinned comes from here.
  const unpinned = pinned.filter(
    (bookmark) =>
      !chosen.has(bookmark.publicId) &&
      bookmark.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const available = [...unpinned, ...(catalog.data?.items ?? [])].filter(
    (bookmark) => !chosen.has(bookmark.publicId),
  );
  const unchanged =
    draft.length === pinned.length &&
    draft.every((bookmark, index) => bookmark.publicId === pinned[index]?.publicId);
  const change = (next: PublicBookmarkSummaryDto[]) => {
    save.reset();
    setDraft(next);
  };

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold text-fg">Pinned bookmarks</h2>
        <AppCopy className="mt-1">
          Up to {MAX_PINS} of your published bookmarks, shown first on your profile. A pin goes away
          when its bookmark is unpublished.
        </AppCopy>
      </div>
      {draft.length > 0 ? (
        <ol className="grid gap-2">
          {draft.map((bookmark, index) => (
            <li key={bookmark.publicId} className={ROW}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                {bookmark.name}
              </span>
              <AppTooltip label={`Move ${bookmark.name} up`}>
                <AppIconButton
                  aria-label={`Move ${bookmark.name} up`}
                  disabled={index === 0}
                  onClick={() => change(moved(draft, index, index - 1))}
                >
                  <ArrowUp size={16} />
                </AppIconButton>
              </AppTooltip>
              <AppTooltip label={`Move ${bookmark.name} down`}>
                <AppIconButton
                  aria-label={`Move ${bookmark.name} down`}
                  disabled={index === draft.length - 1}
                  onClick={() => change(moved(draft, index, index + 1))}
                >
                  <ArrowDown size={16} />
                </AppIconButton>
              </AppTooltip>
              <AppTooltip label={`Unpin ${bookmark.name}`}>
                <AppIconButton
                  aria-label={`Unpin ${bookmark.name}`}
                  onClick={() => change(draft.filter((_, at) => at !== index))}
                >
                  <X size={16} />
                </AppIconButton>
              </AppTooltip>
            </li>
          ))}
        </ol>
      ) : null}
      <AppSearchField
        label="Search your published bookmarks"
        placeholder="Search your published bookmarks"
        value={search}
        onChange={setSearch}
      />
      {available.length > 0 ? (
        <ul className="grid max-h-64 gap-2 overflow-y-auto app-scroll">
          {available.map((bookmark) => (
            <li key={bookmark.publicId} className={ROW}>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{bookmark.name}</span>
              <AppButton
                size="sm"
                variant="secondary"
                disabled={draft.length >= MAX_PINS}
                onClick={() => change([...draft, bookmark])}
              >
                <Pin size={14} aria-hidden="true" />
                Pin
              </AppButton>
            </li>
          ))}
        </ul>
      ) : catalog.isLoading ? null : (
        <AppEmptyState
          compact
          className="rounded-card border border-dashed border-line"
          title={search.trim() ? "No matching bookmarks" : "Nothing left to pin"}
          description={search.trim() ? undefined : "Bookmarks you publish can be pinned here."}
        />
      )}
      {catalog.data?.hasNext ? (
        <AppButton
          className="justify-self-start"
          size="sm"
          variant="secondary"
          disabled={catalog.isFetchingNextPage}
          onClick={() => void catalog.fetchNextPage()}
        >
          {catalog.isFetchingNextPage ? "Loading…" : "Load more"}
        </AppButton>
      ) : null}
      {catalog.isError ? <AppInlineAlert>{requestFailure(catalog.error)}</AppInlineAlert> : null}
      {save.isError ? <AppInlineAlert>{requestFailure(save.error)}</AppInlineAlert> : null}
      {save.isSuccess ? (
        <p role="status" className="text-sm text-success-fg">
          Pins saved.
        </p>
      ) : null}
      <AppButton
        className="justify-self-start"
        disabled={unchanged || save.isPending}
        onClick={() => save.mutate(draft.map((bookmark) => bookmark.publicId))}
      >
        {save.isPending ? <AppSpinner /> : null}
        {save.isPending ? "Saving…" : "Save pins"}
      </AppButton>
    </section>
  );
}
