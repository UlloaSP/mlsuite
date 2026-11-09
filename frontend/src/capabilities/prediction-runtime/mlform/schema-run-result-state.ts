/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Registry, Transport } from "mlform/runtime";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { mappedRoutes } from "@/capabilities/prediction-runtime/mlform/mapped-to";

type ReportState = { status?: string; payload?: unknown; error?: unknown };

type ReportController = { id: string; state?: ReportState };

type RoutedReport = { kind: string; mappedTo?: unknown };

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

const routeKey = (backend: unknown, mappedTo: unknown): string =>
  `${String(backend)}\u0000${String(mappedTo)}`;

/**
 * A report the server answered nothing for stays pending only while its plugin can fetch it in
 * the browser. No one else will answer any other such report: it is shown as not produced, so
 * the run settles and can be saved.
 */
export const settleUnfetchableReports = (
  transport: Transport,
  reports: readonly RoutedReport[],
  registry: Pick<Registry, "getReport">,
): Transport => {
  const unfetchable = new Set(
    reports
      .filter((report) => registry.getReport(report.kind)?.fetch === undefined)
      .flatMap((report) => mappedRoutes(report.mappedTo))
      .map((route) => routeKey(route.backend, route.mappedTo)),
  );
  return {
    async submit(request) {
      const response = await transport.submit(request);
      if (!isRecord(response) || !Array.isArray(response.reports)) return response;
      return {
        ...response,
        reports: response.reports.map((result: unknown) =>
          isRecord(result) &&
          result.status === "pending" &&
          unfetchable.has(routeKey(result.backend, result.mappedTo))
            ? { ...result, status: "skipped", reason: "No result" }
            : result,
        ),
      };
    },
  };
};
