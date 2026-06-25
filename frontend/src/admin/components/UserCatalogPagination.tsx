/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, SetStateAction } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../app/components";

export function UserCatalogPagination({
  disabled,
  page,
  setPage,
  totalPages,
}: {
  disabled: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}) {
  return (
    <div className="shrink-0 border-t border-[var(--border-soft)] bg-[var(--surface-primary)] py-3 text-sm text-[var(--text-secondary)]">
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={disabled || page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            />
          </PaginationItem>
          {getPaginationPages(page, totalPages).map((item) =>
            item.kind === "ellipsis" ? (
              <PaginationItem key={item.key}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item.page}>
                <PaginationLink
                  disabled={disabled || item.page === page}
                  isActive={item.page === page}
                  onClick={() => setPage(item.page)}
                >
                  {item.page + 1}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              disabled={disabled || page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

type PaginationPageItem = { kind: "ellipsis"; key: string } | { kind: "page"; page: number };

function getPaginationPages(currentPage: number, totalPages: number): PaginationPageItem[] {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, page) => ({ kind: "page", page }));
  const lastPage = totalPages - 1;
  if (currentPage <= 2) return pages(0, 1, 2).concat(ellipsis("end"), pages(lastPage));
  if (currentPage >= lastPage - 2) {
    return pages(0).concat(ellipsis("start"), pages(lastPage - 2, lastPage - 1, lastPage));
  }
  return pages(0).concat(
    ellipsis("start"),
    pages(currentPage - 1, currentPage, currentPage + 1),
    ellipsis("end"),
    pages(lastPage),
  );
}

function pages(...items: number[]): PaginationPageItem[] {
  return items.map((page) => ({ kind: "page", page }));
}

function ellipsis(key: string): PaginationPageItem[] {
  return [{ kind: "ellipsis", key }];
}
