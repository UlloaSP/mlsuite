import { useEffect, useRef, type SetStateAction } from "react";
import { useSearchParams } from "react-router";
import { getCatalogTotalPages } from "./catalogPageUtils";

export function useClientCatalogPage<T>(items: T[], resetKey: string, isLoading = false) {
  const [params, setParams] = useSearchParams();
  const previousKey = useRef(resetKey);
  const reset = previousKey.current !== resetKey;
  const requested = Number(params.get("page"));
  const requestedPage = Number.isInteger(requested) && requested > 0 ? requested - 1 : 0;
  const pageSize = 10;
  const totalPages = getCatalogTotalPages(items.length, pageSize);
  const page = reset ? 0 : Math.min(requestedPage, totalPages - 1);

  useEffect(() => {
    if (isLoading || (!reset && requestedPage === page)) return;
    previousKey.current = resetKey;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (page === 0) next.delete("page");
        else next.set("page", String(page + 1));
        return next;
      },
      { replace: true },
    );
  }, [isLoading, page, requestedPage, reset, resetKey, setParams]);

  const setPage = (nextPage: SetStateAction<number>) => {
    const value = typeof nextPage === "function" ? nextPage(page) : nextPage;
    const next = new URLSearchParams(params);
    if (value <= 0) next.delete("page");
    else next.set("page", String(Math.min(value, totalPages - 1) + 1));
    setParams(next);
  };

  return {
    page,
    setPage,
    totalPages,
    hasNext: page + 1 < totalPages,
    visibleItems: items.slice(page * pageSize, (page + 1) * pageSize),
  };
}
