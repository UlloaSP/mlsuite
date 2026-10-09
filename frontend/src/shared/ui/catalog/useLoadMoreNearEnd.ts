import { useEffect, useState, type RefObject } from "react";

type LoadMoreOptions = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Last row in view, not counting rows kept mounted for focus or overscan. */
  lastVisible: number;
  count: number;
  /** Rows left below the view that trigger the next page. */
  margin: number;
  hasNext: boolean;
  isBusy: boolean;
  hasError: boolean;
  onLoadMore: () => unknown;
};

/**
 * The one rule every virtual list follows: fetch the next page when the view nears the loaded
 * end, or when scroll memory asks for an offset the loaded rows cannot reach yet. A failed
 * page waits for an explicit retry.
 */
export function useLoadMoreNearEnd({
  scrollRef,
  lastVisible,
  count,
  margin,
  hasNext,
  isBusy,
  hasError,
  onLoadMore,
}: LoadMoreOptions) {
  const [restoreTick, setRestoreTick] = useState(0);
  useEffect(() => {
    const element = scrollRef.current;
    const restore = () => setRestoreTick((tick) => tick + 1);
    element?.addEventListener("catalog-restore", restore);
    return () => element?.removeEventListener("catalog-restore", restore);
  }, [scrollRef]);
  useEffect(() => {
    const element = scrollRef.current;
    const target = Number(element?.dataset.catalogRestoreTop);
    const restoring = element != null && target > element.scrollHeight - element.clientHeight;
    const nearEnd = count === 0 || (lastVisible >= 0 && lastVisible >= count - margin);
    if (hasNext && !isBusy && !hasError && (nearEnd || restoring)) {
      void onLoadMore();
    }
  }, [count, hasError, hasNext, isBusy, lastVisible, margin, onLoadMore, restoreTick, scrollRef]);
}
