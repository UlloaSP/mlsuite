/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { AppSelect, AppTextField, AppToolbar } from "../../app/components";
import type { PredictionDto } from "../api/modelService";
import { ExportButton } from "./ExportButton";

export type PredictionFeedbackStatusFilter = "all" | "COMPLETED" | "PENDING";
export type PredictionDateRangeFilter = "all" | "today" | "last7" | "last30";

const STATUS_LABELS: Record<PredictionFeedbackStatusFilter, string> = {
  all: "All feedback",
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
};

const DATE_RANGE_LABELS: Record<PredictionDateRangeFilter, string> = {
  all: "All dates",
  today: "Today",
  last7: "Last 7 days",
  last30: "Last 30 days",
};

type PredictionHistoryToolbarProps = {
  query: string;
  status: PredictionFeedbackStatusFilter;
  dateRange: PredictionDateRangeFilter;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: PredictionFeedbackStatusFilter) => void;
  onDateRangeChange: (value: PredictionDateRangeFilter) => void;
  predictions: PredictionDto[];
  signatureSchema?: unknown;
};

export function PredictionHistoryToolbar({
  query,
  status,
  dateRange,
  onQueryChange,
  onStatusChange,
  onDateRangeChange,
  predictions,
  signatureSchema,
}: PredictionHistoryToolbarProps) {
  return (
    <AppToolbar>
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <AppTextField
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by prediction name…"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          className="min-w-[280px] flex-1"
        />

        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <AppSelect
            aria-label="Feedback status"
            value={status}
            onValueChange={(nextStatus) =>
              onStatusChange(nextStatus as PredictionFeedbackStatusFilter)
            }
            className="min-w-40"
            options={(
              Object.entries(STATUS_LABELS) as Array<[PredictionFeedbackStatusFilter, string]>
            ).map(([value, label]) => ({ value, label }))}
          />
        </div>

        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <CalendarDays size={15} className="text-[var(--text-muted)]" />
          <AppSelect
            aria-label="Date range"
            value={dateRange}
            onValueChange={(nextDateRange) =>
              onDateRangeChange(nextDateRange as PredictionDateRangeFilter)
            }
            className="min-w-36"
            options={(
              Object.entries(DATE_RANGE_LABELS) as Array<[PredictionDateRangeFilter, string]>
            ).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
      <ExportButton predictions={predictions} signatureSchema={signatureSchema} />
    </AppToolbar>
  );
}
