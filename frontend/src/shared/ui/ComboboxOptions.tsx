import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { AppComboboxItem } from "./AppCombobox";
import { useLoadMoreNearEnd } from "./catalog/useLoadMoreNearEnd";
import { cx } from "./cx";

const OVERSCAN = 4;

type ComboboxOptionsProps<TId extends string | number> = {
  id: string;
  label: string;
  items: AppComboboxItem<TId>[];
  activeIndex: number;
  selectedId?: TId;
  emptyLabel: string;
  loading?: boolean;
  error?: boolean;
  hasNext?: boolean;
  onLoadMore?: () => unknown;
  onRetry?: () => unknown;
  onChoose: (item: AppComboboxItem<TId>) => void;
};

/**
 * The virtual option list. It mounts inside the combobox's top-layer popup, so its scroll
 * element exists when the list is measured. A failed request adds a "Retry" option after the
 * loaded ones: `activeIndex === items.length`.
 */
export function ComboboxOptions<TId extends string | number>({
  id,
  label,
  items,
  activeIndex,
  selectedId,
  emptyLabel,
  loading = false,
  error = false,
  hasNext = false,
  onLoadMore,
  onRetry,
  onChoose,
}: ComboboxOptionsProps<TId>) {
  const ref = useRef<HTMLDivElement>(null);
  const lastActiveIndex = useRef<number | undefined>(undefined);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 60,
    overscan: OVERSCAN,
    getItemKey: (index) => items[index]!.id,
    rangeExtractor: (range) =>
      [
        ...new Set(
          [...defaultRangeExtractor(range), activeIndex].filter(
            (index) => index >= 0 && index < items.length,
          ),
        ),
      ].sort((a, b) => a - b),
  });
  useEffect(() => {
    if (lastActiveIndex.current === activeIndex) return;
    lastActiveIndex.current = activeIndex;
    if (items[activeIndex]) virtualizer.scrollToIndex(activeIndex);
    else if (activeIndex === items.length && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [activeIndex, items, virtualizer]);
  useLoadMoreNearEnd({
    scrollRef: ref,
    lastVisible: virtualizer.range?.endIndex ?? -1,
    count: items.length,
    margin: OVERSCAN + 3,
    hasNext,
    isBusy: loading,
    hasError: error,
    onLoadMore: () => onLoadMore?.(),
  });

  return (
    <>
      <div
        ref={ref}
        id={id}
        role="listbox"
        aria-label={label}
        aria-busy={loading}
        className="max-h-[min(16rem,var(--radix-popover-content-available-height))] overflow-y-auto p-2"
      >
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((row) => {
            const item = items[row.index]!;
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                id={`${id}-option-${row.index}`}
                role="option"
                aria-selected={selectedId === item.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChoose(item);
                }}
                style={{ transform: `translateY(${row.start}px)` }}
                className={cx(
                  "absolute left-0 top-0 flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition",
                  row.index === activeIndex ? "bg-surface-muted" : "hover:bg-surface-muted",
                )}
              >
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="size-9 shrink-0 rounded-control object-cover"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-xs font-semibold text-accent-strong">
                    {item.label.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{item.label}</span>
                  {item.description ? (
                    <span className="block truncate text-xs text-fg-secondary">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {selectedId === item.id ? <Check size={16} aria-label="Selected" /> : null}
              </div>
            );
          })}
        </div>
        {error ? (
          <div
            id={`${id}-option-${items.length}`}
            role="option"
            aria-selected={false}
            onMouseDown={(event) => {
              event.preventDefault();
              void onRetry?.();
            }}
            className={cx(
              "cursor-pointer rounded-control px-3 py-2 text-sm text-fg",
              activeIndex === items.length ? "bg-surface-muted" : "hover:bg-surface-muted",
            )}
          >
            Could not load results. Retry
          </div>
        ) : null}
      </div>
      {!items.length && !loading && !error ? (
        <div className="px-3 py-4 text-sm text-fg-secondary">{emptyLabel}</div>
      ) : null}
      {loading ? (
        <div role="status" className="px-3 py-2 text-sm text-fg-secondary">
          Loading…
        </div>
      ) : null}
    </>
  );
}
