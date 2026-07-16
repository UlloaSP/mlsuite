/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppButton } from "../AppButton";
import { cx } from "../cx";

type PaginationPageItem = number | "ellipsis";

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
    <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-[var(--border-soft)] pt-4">
      <AppButton
        disabled={page === 0 || disabled}
        variant="ghost"
        onClick={() => setPage((value) => Math.max(0, value - 1))}
      >
        <ChevronLeft className="size-4" />
        Previous
      </AppButton>
      {getPaginationPages(page, totalPages).map((item) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${page}-${totalPages}`}
            className="px-2 text-sm text-[var(--text-muted)]"
          >
            ...
          </span>
        ) : (
          <AppButton
            key={item}
            aria-current={page === item ? "page" : undefined}
            className={cx(
              page === item &&
                "border-[var(--border-strong)] bg-[var(--surface-primary)] text-[var(--text-primary)]",
            )}
            disabled={disabled}
            variant="secondary"
            onClick={() => setPage(item)}
          >
            {item + 1}
          </AppButton>
        ),
      )}
      <AppButton
        disabled={!hasNext || disabled}
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
      return ["ellipsis" as const, item];
    }
    return [item];
  });
}
