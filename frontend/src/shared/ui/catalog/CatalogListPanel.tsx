import { Children, type ReactNode } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { catalogItemKey, CATALOG_OVERSCAN, useCatalogVirtualizer } from "./useCatalogVirtualizer";
import { useLoadMoreNearEnd } from "./useLoadMoreNearEnd";

export type CatalogEmptyState = {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: string;
};

export type CatalogListPanelProps = {
  children: ReactNode;
  emptyState: CatalogEmptyState;
  errorMessage: string | null;
  hasNext: boolean;
  isBusy: boolean;
  isLoading: boolean;
  itemCount: number;
  layout?: "grid" | "list";
  scrollMemoryKey?: string | false;
  loadingLabel: string;
  onRetry?: () => void;
  onLoadMore: () => unknown;
};

export function CatalogListPanel({
  children,
  emptyState,
  errorMessage,
  hasNext,
  isBusy,
  isLoading,
  itemCount,
  layout = "list",
  scrollMemoryKey = "list",
  loadingLabel,
  onRetry,
  onLoadMore,
}: CatalogListPanelProps) {
  const items = Children.toArray(children);
  const { columnCount, scrollRef, setFocusedItem, measureItem, virtualizer } =
    useCatalogVirtualizer(items, layout, scrollMemoryKey);
  const showLoading = useStableLoading(isLoading);
  const rows = virtualizer.getVirtualItems();
  useLoadMoreNearEnd({
    scrollRef,
    lastVisible: virtualizer.range?.endIndex ?? -1,
    count: Math.ceil(items.length / columnCount),
    margin: CATALOG_OVERSCAN + 3,
    hasNext,
    isBusy,
    hasError: errorMessage != null,
    onLoadMore,
  });

  return (
    <section
      ref={scrollRef}
      data-scroll-memory={scrollMemoryKey || undefined}
      data-catalog-loading={isBusy || hasNext}
      aria-busy={isBusy}
      className="app-scroll min-h-0 flex-1 basis-0 overflow-y-auto py-4"
    >
      {showLoading ? <AppLoadingState label={loadingLabel} layout={layout} /> : null}
      {!showLoading && itemCount === 0 && errorMessage == null ? (
        <AppEmptyState
          compact
          className="rounded-card border border-dashed border-line"
          {...emptyState}
        />
      ) : null}
      {!showLoading && items.length > 0 ? (
        <div role="list" className="relative pr-1" style={{ height: virtualizer.getTotalSize() }}>
          {rows.flatMap((row) =>
            items
              .slice(row.index * columnCount, (row.index + 1) * columnCount)
              .map((item, column) => (
                <div
                  key={
                    item && typeof item === "object" && "key" in item
                      ? String(item.key)
                      : row.index * columnCount + column
                  }
                  role="listitem"
                  data-index={row.index}
                  ref={measureItem}
                  className="absolute top-0 min-w-0 pr-1"
                  style={{
                    transform: `translateY(${row.start}px)`,
                    width: `calc((100% - ${(columnCount - 1) * 12}px) / ${columnCount})`,
                    left: `calc(${(column * 100) / columnCount}% + ${(column * 12) / columnCount}px)`,
                  }}
                  onFocusCapture={() =>
                    setFocusedItem(catalogItemKey(item, row.index * columnCount + column))
                  }
                  onBlurCapture={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget) &&
                      !(
                        event.relatedTarget instanceof Element &&
                        event.relatedTarget.closest("[role=dialog]")
                      )
                    )
                      setFocusedItem(null);
                  }}
                >
                  {item}
                </div>
              )),
          )}
        </div>
      ) : null}
      {errorMessage != null && !showLoading ? (
        <div className="flex flex-col items-start gap-3 py-3">
          <AppInlineAlert>{errorMessage}</AppInlineAlert>
          {onRetry ? (
            <AppButton size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </AppButton>
          ) : null}
        </div>
      ) : null}
      {!showLoading && hasNext && errorMessage == null ? (
        <div className="py-3">
          {isBusy ? (
            <span role="status" className="text-sm text-muted">
              {loadingLabel}
            </span>
          ) : (
            <AppButton size="sm" variant="secondary" onClick={() => void onLoadMore()}>
              Load more
            </AppButton>
          )}
        </div>
      ) : null}
    </section>
  );
}
