/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { AppTextField, AppToolbar } from "../../app/components";
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
          placeholder="Search by prediction name..."
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          className="min-w-[280px] flex-1"
        />

        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <select
            aria-label="Feedback status"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as PredictionFeedbackStatusFilter)
            }
            className="bg-transparent text-[var(--text-primary)] outline-none"
          >
            {(Object.entries(STATUS_LABELS) as Array<[PredictionFeedbackStatusFilter, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
          <CalendarDays size={15} className="text-[var(--text-muted)]" />
          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(event) => onDateRangeChange(event.target.value as PredictionDateRangeFilter)}
            className="bg-transparent text-[var(--text-primary)] outline-none"
          >
            {(Object.entries(DATE_RANGE_LABELS) as Array<[PredictionDateRangeFilter, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <ExportButton predictions={predictions} signatureSchema={signatureSchema} />
    </AppToolbar>
  );
}
