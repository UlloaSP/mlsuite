/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { AppToolbar } from "../../app/components/ui";
import { AppTextField } from "../../app/components/ui-controls";
import type { PredictionRunStatus, PredictionRunDto, SchemaVersionDto } from "../types";
import { SchemaRunExportButton } from "./SchemaRunExportButton";
import { SchemaRunShareButton } from "./SchemaRunShareButton";

export type SchemaRunStatusFilter = "all" | PredictionRunStatus;
export type SchemaRunFeedbackStatusFilter = "all" | "COMPLETED" | "PENDING";
export type SchemaRunDateRangeFilter = "all" | "today" | "last7" | "last30";

type Props = {
  query: string;
  status: SchemaRunStatusFilter;
  feedbackStatus: SchemaRunFeedbackStatusFilter;
  dateRange: SchemaRunDateRangeFilter;
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: SchemaRunStatusFilter) => void;
  onFeedbackStatusChange: (value: SchemaRunFeedbackStatusFilter) => void;
  onDateRangeChange: (value: SchemaRunDateRangeFilter) => void;
};

export function SchemaRunHistoryToolbar({
  query,
  status,
  feedbackStatus,
  dateRange,
  runs,
  version,
  onQueryChange,
  onStatusChange,
  onFeedbackStatusChange,
  onDateRangeChange,
}: Props) {
  return (
    <AppToolbar>
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <AppTextField
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by inference name..."
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          className="min-w-[260px] flex-1"
        />
        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm shadow-[var(--shadow-card)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <select
            aria-label="Inference status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as SchemaRunStatusFilter)}
            className="bg-transparent outline-none"
          >
            <option value="all">All status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PARTIAL_SUCCESS">PARTIAL_SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm shadow-[var(--shadow-card)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <select
            aria-label="Feedback status"
            value={feedbackStatus}
            onChange={(event) =>
              onFeedbackStatusChange(event.target.value as SchemaRunFeedbackStatusFilter)
            }
            className="bg-transparent outline-none"
          >
            <option value="all">All feedback</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm shadow-[var(--shadow-card)]">
          <CalendarDays size={15} className="text-[var(--text-muted)]" />
          <select
            aria-label="Inference date range"
            value={dateRange}
            onChange={(event) => onDateRangeChange(event.target.value as SchemaRunDateRangeFilter)}
            className="bg-transparent outline-none"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
          </select>
        </label>
      </div>
      <SchemaRunShareButton runs={runs} version={version} />
      <SchemaRunExportButton runs={runs} version={version} />
    </AppToolbar>
  );
}
