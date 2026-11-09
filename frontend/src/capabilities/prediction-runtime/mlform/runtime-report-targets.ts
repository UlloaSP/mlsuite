/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { mappedTarget, targetKey } from "@/capabilities/prediction-runtime/mlform/mapped-to";
import {
  storedReportId,
  type StoredReportRoute,
} from "@/capabilities/prediction-runtime/data/stored-report";

type Binding = {
  /** Schema previews bind synthetic string ids before any model is saved. */
  modelId: number | string;
  modelName?: string;
};

/** One form report as one model produces it in a run form. */
export type RuntimeReportRoute<TBinding extends Binding = Binding> = StoredReportRoute & {
  /** The report's id in the run form. */
  id: string;
  binding: TBinding;
  /** MLForm's backend for the model. */
  backend: string;
  /** What MLForm routes the report's result by: unique for each report of one model. */
  key: string;
};

// MLForm keeps explicit ids literal and rejects whitespace, so any other id is generated from
// the label the way MLForm generates one. The form's id only names the report in the form; the
// copy a run stores is named by the route's stored id.
const reportId = (report: Record<string, unknown>, index: number): string =>
  typeof report.id === "string" && /^\S+$/.test(report.id)
    ? report.id
    : normalizeSchemaId(typeof report.label === "string" ? report.label : "") ||
      `report-${index + 1}`;

const reportLabel = (report: Record<string, unknown>, binding: Binding): string | undefined => {
  const label = typeof report.label === "string" ? report.label : undefined;
  const model = binding.modelName ?? binding.modelId;
  return label && model ? `${label} ${model}` : label;
};

export const backendOf = (binding: Binding): string => String(binding.modelName ?? binding.modelId);

/**
 * Each report once per model that produces it. MLForm takes one result per model output, while
 * two reports may read the same output (a class and its explanation): the first report on an
 * output is routed by the output itself, a later one by the output and its position.
 */
const routesByReport = <TBinding extends Binding>(
  reports: readonly unknown[],
  bindings: readonly TBinding[],
): RuntimeReportRoute<TBinding>[][] => {
  const routed = new Set<string>();
  return reports.map((report, order) => {
    if (!isRecord(report)) return [];
    const targets = bindings
      .map((binding) => ({ binding, target: targetKey(mappedTarget(report.mappedTo, binding)) }))
      .filter((item): item is { binding: TBinding; target: string } => item.target !== undefined);
    const baseId = reportId(report, order);
    return targets.map(({ binding, target }) => {
      const backend = backendOf(binding);
      const first = !routed.has(`${backend}\u0000${target}`);
      routed.add(`${backend}\u0000${target}`);
      return {
        id: targets.length === 1 ? baseId : `${baseId}-${binding.modelId}`,
        binding,
        backend,
        target,
        key: first ? target : `${target}:${order}`,
        storedId: storedReportId(report, order),
      };
    });
  });
};

const reportsOf = (schema: unknown): unknown[] =>
  isRecord(schema) && Array.isArray(schema.reports) ? schema.reports : [];

/** Every report of a stored schema as a run form routes it, model by model. */
export const runtimeReportRoutes = <TBinding extends Binding>(
  schema: unknown,
  bindings: readonly TBinding[],
): RuntimeReportRoute<TBinding>[] => routesByReport(reportsOf(schema), bindings).flat();

export const prepareRuntimeReports = (schema: unknown, bindings: readonly Binding[]): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return schema;
  const routes = routesByReport(schema.reports, bindings);
  const reports = schema.reports.flatMap((report, index) => {
    const reportRoutes = routes[index] ?? [];
    if (!isRecord(report) || reportRoutes.length === 0) return [report];
    return reportRoutes.map((route) => ({
      ...report,
      id: route.id,
      label: reportRoutes.length === 1 ? report.label : reportLabel(report, route.binding),
      mappedTo: { [route.backend]: route.key },
    }));
  });
  return { ...schema, reports };
};
