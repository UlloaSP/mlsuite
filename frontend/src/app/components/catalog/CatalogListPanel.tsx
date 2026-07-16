/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, ReactNode, SetStateAction } from "react";

import { AppButton } from "../AppButton";
import { AppEmptyState } from "../AppEmptyState";
import { AppPanel } from "../AppPanel";
import { cx } from "../cx";
import { CatalogPaginationFooter } from "./CatalogPaginationFooter";

export type CatalogEmptyState = {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: string;
};

export type CatalogListPanelProps = {
  children: ReactNode;
  emptyState: CatalogEmptyState;
  emptyWrapperClassName?: string;
  errorMessage: string | null;
  hasNext: boolean;
  isBusy: boolean;
  isLoading: boolean;
  itemCount: number;
  layout?: "grid" | "list";
  loadingLabel: string;
  onRetry?: () => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
};

export function CatalogListPanel({
  children,
  emptyState,
  emptyWrapperClassName,
  errorMessage,
  hasNext,
  isBusy,
  isLoading,
  itemCount,
  layout = "list",
  loadingLabel,
  onRetry,
  page,
  setPage,
  totalPages,
}: CatalogListPanelProps) {
  const hasItems = itemCount > 0;
  const bodyClassName = cx(
    layout === "grid"
      ? "grid gap-3 pr-1 md:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-3 pr-1",
    !hasItems && "min-h-full",
  );

  return (
    <>
      <section className="min-h-0 flex-1 basis-0 overflow-y-auto py-4">
        <div className={bodyClassName}>
          {!hasItems && isLoading ? (
            <AppPanel className="text-sm text-[var(--text-secondary)]">{loadingLabel}</AppPanel>
          ) : null}
          {!hasItems && errorMessage ? (
            <AppPanel className="flex flex-col gap-3 border-[var(--status-danger-border)] text-sm text-[var(--status-danger-text)]">
              <p>{errorMessage}</p>
              {onRetry ? (
                <AppButton className="w-fit" variant="secondary" onClick={onRetry}>
                  Retry
                </AppButton>
              ) : null}
            </AppPanel>
          ) : null}
          {!hasItems && !isLoading && !errorMessage ? (
            <div className={cx("flex min-h-full", emptyWrapperClassName)}>
              <AppEmptyState
                className="flex-1"
                action={emptyState.action}
                description={emptyState.description}
                icon={emptyState.icon}
                title={emptyState.title}
              />
            </div>
          ) : null}
          {children}
        </div>
      </section>
      <CatalogPaginationFooter
        disabled={isBusy}
        hasNext={hasNext}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
      />
    </>
  );
}
