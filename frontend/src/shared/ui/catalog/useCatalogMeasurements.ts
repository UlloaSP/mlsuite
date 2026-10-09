import { useCallback, useEffect, useRef } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";

// A grid card is stretched to its row with `min-height`; its own height is read without it.
const naturalHeight = (element: HTMLElement) => {
  const stretched = element.style.minHeight;
  if (!stretched) return element.offsetHeight;
  element.style.minHeight = "0px";
  const height = element.offsetHeight;
  element.style.minHeight = stretched;
  return height;
};

/** Cards retain one parent across responsive layouts; a row is as tall as its tallest card. */
export function useCatalogMeasurements(
  virtualizer: Virtualizer<HTMLElement, HTMLElement>,
  columns: number,
) {
  const elements = useRef(new Set<HTMLElement>());
  const observer = useRef<ResizeObserver | null>(null);
  const measuredColumns = useRef(columns);
  const resize = useCallback(() => {
    const heights = new Map<number, number>();
    for (const element of elements.current) {
      const index = Number(element.dataset.index);
      heights.set(index, Math.max(heights.get(index) ?? 0, naturalHeight(element)));
    }
    heights.forEach((height, index) => {
      if (height > 0) virtualizer.resizeItem(index, height);
    });
  }, [virtualizer]);
  // Observing reports the first size after layout and before paint, outside React's commit.
  const measureItem = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    elements.current.add(element);
    observer.current?.observe(element);
    return () => {
      observer.current?.unobserve(element);
      elements.current.delete(element);
    };
  }, []);
  useEffect(() => {
    observer.current = new ResizeObserver(resize);
    elements.current.forEach((element) => observer.current?.observe(element));
    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, [resize]);
  useEffect(() => {
    if (measuredColumns.current === columns) return;
    measuredColumns.current = columns;
    // Rows hold different cards after a column change, so their sizes start over.
    virtualizer.measure();
    resize();
  }, [columns, resize, virtualizer]);
  return measureItem;
}
