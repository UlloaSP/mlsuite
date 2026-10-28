/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

type ReportState = { status?: string; payload?: unknown; error?: unknown };

type ReportController = { id: string; state?: ReportState };

const statusOf = (state: ReportState | undefined): string => state?.status ?? "idle";

/**
 * Whether the form still resolves a report its plugin fetches in the browser. Such a payload is
 * only shown: a run keeps what the server produced, a plugin report's explanation included.
 */
export const schemaRunReportsPending = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
): boolean =>
  reports.some((report) => {
    const status = statusOf(reportStates[report.id] ?? report.state);
    return status === "idle" || status === "loading";
  });

export const reportStatesFromSnapshot = (value: unknown): Record<string, ReportState> =>
  isRecord(value) ? (value as Record<string, ReportState>) : {};
