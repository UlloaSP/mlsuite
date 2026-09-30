/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppButton } from "@/shared/ui/AppButton";
import { cx } from "@/shared/ui/cx";

type PaginationPageItem = number | { before: number };

type CatalogPaginationFooterProps = {
  disabled: boolean;
  hasNext: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
};

export function CatalogPaginationFooter({
  disabled,
  hasNext,
  page,
  setPage,
  totalPages,
}: CatalogPaginationFooterProps) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-t border-line pt-4">
      <AppButton
        disabled={page === 0 || disabled}
        size="sm"
        variant="ghost"
        onClick={() => setPage((value) => Math.max(0, value - 1))}
      >
        <ChevronLeft className="size-4" />
        Previous
      </AppButton>
      {getPaginationPages(page, totalPages).map((item) =>
        typeof item !== "number" ? (
          <span
            key={`ellipsis-before-${item.before}`}
            className="hidden px-1 text-sm text-fg-muted sm:inline"
          >
            ...
          </span>
        ) : (
          <AppButton
            key={item}
            aria-current={page === item ? "page" : undefined}
            // Page numbers need room; phones get the "Page x of y" line instead.
            className={cx("hidden min-w-8 sm:inline-flex", page === item && "border-line-strong")}
            disabled={disabled}
            size="sm"
            variant={page === item ? "secondary" : "ghost"}
            onClick={() => setPage(item)}
          >
            {item + 1}
          </AppButton>
        ),
      )}
      <span className="px-2 text-xs text-fg-secondary sm:hidden">
        Page {page + 1} of {Math.max(totalPages, 1)}
      </span>
      <AppButton
        disabled={!hasNext || disabled}
        size="sm"
        variant="ghost"
        onClick={() => setPage((value) => value + 1)}
      >
        Next
        <ChevronRight className="size-4" />
      </AppButton>
    </footer>
  );
}

function getPaginationPages(currentPage: number, totalPages: number): PaginationPageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const pages = new Set([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1]);
  const normalized = [...pages]
    .filter((item) => item >= 0 && item < totalPages)
    .sort((left, right) => left - right);

  return normalized.flatMap((item, index) => {
    const previous = normalized[index - 1];
    if (index > 0 && previous !== undefined && item - previous > 1) {
      return [{ before: item }, item];
    }
    return [item];
  });
}
