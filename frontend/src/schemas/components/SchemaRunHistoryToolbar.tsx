/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { AppSelect, AppTextField, AppToolbar } from "../../app/components";
import type { PredictionRunStatus, PredictionRunDto, SchemaVersionDto } from "../types";
import { SchemaRunExportButton } from "./SchemaRunExportButton";

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
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <AppSelect
            aria-label="Inference status"
            value={status}
            onValueChange={(nextStatus) => onStatusChange(nextStatus as SchemaRunStatusFilter)}
            className="min-w-40"
            options={[
              { value: "all", label: "All status" },
              { value: "SUCCESS", label: "SUCCESS" },
              { value: "PARTIAL_SUCCESS", label: "PARTIAL_SUCCESS" },
              { value: "FAILED", label: "FAILED" },
            ]}
          />
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <SlidersHorizontal size={15} className="text-[var(--text-muted)]" />
          <AppSelect
            aria-label="Feedback status"
            value={feedbackStatus}
            onValueChange={(nextStatus) =>
              onFeedbackStatusChange(nextStatus as SchemaRunFeedbackStatusFilter)
            }
            className="min-w-40"
            options={[
              { value: "all", label: "All feedback" },
              { value: "COMPLETED", label: "Completed" },
              { value: "PENDING", label: "Pending" },
            ]}
          />
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <CalendarDays size={15} className="text-[var(--text-muted)]" />
          <AppSelect
            aria-label="Inference date range"
            value={dateRange}
            onValueChange={(nextDateRange) =>
              onDateRangeChange(nextDateRange as SchemaRunDateRangeFilter)
            }
            className="min-w-36"
            options={[
              { value: "all", label: "All dates" },
              { value: "today", label: "Today" },
              { value: "last7", label: "Last 7 days" },
              { value: "last30", label: "Last 30 days" },
            ]}
          />
        </div>
      </div>
      <SchemaRunExportButton runs={runs} version={version} />
    </AppToolbar>
  );
}
