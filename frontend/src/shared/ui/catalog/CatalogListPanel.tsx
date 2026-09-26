/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, ReactNode, SetStateAction } from "react";

import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { cx } from "@/shared/ui/cx";
import { useStableLoading } from "@/shared/ui/useStableLoading";
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
  const showLoading = useStableLoading(isLoading);
  const showItems = hasItems && !showLoading;
  const bodyClassName = cx(
    showItems && layout === "grid"
      ? "grid gap-3 pr-1 md:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-3 pr-1",
    !showItems && "min-h-full",
  );

  return (
    <>
      <section className="app-scroll min-h-0 flex-1 basis-0 overflow-y-auto py-4">
        <div className={bodyClassName}>
          {showLoading ? <AppLoadingState label={loadingLabel} /> : null}
          {!hasItems && !showLoading && errorMessage ? (
            <AppPanel className="flex flex-col gap-3 border-danger-border text-sm text-danger-fg">
              <p>{errorMessage}</p>
              {onRetry ? (
                <AppButton className="w-fit" variant="secondary" onClick={onRetry}>
                  Retry
                </AppButton>
              ) : null}
            </AppPanel>
          ) : null}
          {!hasItems && !showLoading && !errorMessage ? (
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
          {!showLoading ? children : null}
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
