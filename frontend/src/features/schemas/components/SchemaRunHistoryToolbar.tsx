/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search, SlidersHorizontal } from "lucide-react";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import type {
  PredictionRunDto,
  PredictionRunStatus,
} from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { SchemaRunExportButton } from "./SchemaRunExportButton";

export type SchemaRunStatusFilter = "all" | PredictionRunStatus;
export type SchemaRunFeedbackStatusFilter = "all" | "COMPLETED" | "PENDING" | "NOT_REQUIRED";
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
    <AppToolbar variant="flat">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <AppTextField
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by inference name…"
          prefix={<Search size={16} className="text-fg-muted" />}
          className="min-w-[260px] flex-1"
        />
        <SlidersHorizontal size={15} className="text-fg-muted" />
        <AppSelect
          aria-label="Inference status"
          value={status}
          onValueChange={(nextStatus) => onStatusChange(nextStatus as SchemaRunStatusFilter)}
          className="min-w-40"
          options={[
            { value: "all", label: "All statuses" },
            { value: "SUCCESS", label: "Success" },
            { value: "PARTIAL_SUCCESS", label: "Partial success" },
            { value: "FAILED", label: "Failed" },
          ]}
        />
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
            { value: "NOT_REQUIRED", label: "Not configured" },
          ]}
        />
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
      <SchemaRunExportButton runs={runs} version={version} />
    </AppToolbar>
  );
}
