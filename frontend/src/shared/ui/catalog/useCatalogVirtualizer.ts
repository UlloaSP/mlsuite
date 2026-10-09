import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { defaultRangeExtractor, useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useCatalogMeasurements } from "./useCatalogMeasurements";

export const CATALOG_OVERSCAN = 4;
const REMEMBERED_LISTS = 24;

// Measured row sizes per visit, so returning to a list lays it out as it was scrolled and the
// remembered scroll offset lands on the same row. Keyed by row identity inside each entry.
const measuredSizes = new Map<string, VirtualItem[]>();

const gridColumns = () =>
  matchMedia("(min-width: 1280px)").matches ? 3 : matchMedia("(min-width: 768px)").matches ? 2 : 1;

export const catalogItemKey = (item: ReactNode, index: number) =>
  item && typeof item === "object" && "key" in item && item.key != null ? String(item.key) : index;

export function useCatalogVirtualizer(
  items: ReactNode[],
  layout: "list" | "grid",
  memoryKey: string | false,
) {
  const scrollRef = useRef<HTMLElement>(null);
  const [columns, setColumns] = useState(1);
  const [focusedItem, setFocusedItem] = useState<string | number | null>(null);
  const focusedIndex =
    focusedItem == null
      ? -1
      : items.findIndex((item, index) => catalogItemKey(item, index) === focusedItem);
  // Before the first paint, so a grid never shows one frame as a single column.
  useLayoutEffect(() => {
    if (layout !== "grid") return;
    const medium = matchMedia("(min-width: 768px)");
    const wide = matchMedia("(min-width: 1280px)");
    const update = () => setColumns(gridColumns());
    update();
    medium.addEventListener("change", update);
    wide.addEventListener("change", update);
    return () => {
      medium.removeEventListener("change", update);
      wide.removeEventListener("change", update);
    };
  }, [layout]);
  const columnCount = layout === "grid" ? columns : 1;
  // The router names each history entry in `history.state.key`; the same entry is the same visit.
  const visit: unknown = (globalThis.history?.state as { key?: unknown } | null)?.key;
  const sizesKey = memoryKey ? `${String(visit ?? "")}:${memoryKey}:${columnCount}` : null;
  const virtualizer = useVirtualizer<HTMLElement, HTMLElement>({
    count: Math.ceil(items.length / columnCount),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (layout === "grid" ? 260 : 112),
    overscan: CATALOG_OVERSCAN,
    gap: 12,
    initialMeasurementsCache: sizesKey ? measuredSizes.get(sizesKey) : undefined,
    getItemKey: (index) => {
      return catalogItemKey(items[index * columnCount], index * columnCount);
    },
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      const focusedRow = focusedIndex < 0 ? null : Math.floor(focusedIndex / columnCount);
      if (focusedRow != null && focusedRow < range.count && !indexes.includes(focusedRow)) {
        indexes.push(focusedRow);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
  });
  useEffect(() => {
    if (!sizesKey) return;
    return () => {
      measuredSizes.delete(sizesKey);
      measuredSizes.set(sizesKey, virtualizer.measurementsCache);
      const oldest = measuredSizes.keys().next().value;
      if (measuredSizes.size > REMEMBERED_LISTS && oldest !== undefined) {
        measuredSizes.delete(oldest);
      }
    };
  }, [sizesKey, virtualizer]);
  const measureItem = useCatalogMeasurements(virtualizer, columnCount);
  return { columnCount, scrollRef, setFocusedItem, measureItem, virtualizer };
}
