/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import { isRecord } from "@/capabilities/mlform/shared";
import { mappedTarget, targetKey } from "@/capabilities/mlform/mapped-to";

type Binding = {
  modelId: string;
  modelName?: string;
};

export type RuntimeReportTargets = Readonly<Record<string, string>>;

const reportId = (report: Record<string, unknown>, index: number): string =>
  typeof report.id === "string" && report.id.trim()
    ? report.id
    : typeof report.label === "string" && report.label.trim()
      ? report.label
      : `report-${index + 1}`;

const reportLabel = (report: Record<string, unknown>, binding: Binding): string | undefined => {
  const label = typeof report.label === "string" ? report.label : undefined;
  const model = binding.modelName ?? binding.modelId;
  return label && model ? `${label} ${model}` : label;
};

const expandByBinding = (reports: unknown[], bindings: readonly Binding[]): unknown[] =>
  reports.flatMap((report, index) => {
    if (!isRecord(report) || !isRecord(report.mappedTo)) return [report];
    const targets = bindings
      .map((binding) => ({ binding, target: targetKey(mappedTarget(report.mappedTo, binding)) }))
      .filter((item): item is { binding: Binding; target: string } => item.target !== undefined);
    if (targets.length <= 1) return [report];
    const baseId = reportId(report, index);
    return targets.map(({ binding, target }) => ({
      ...report,
      id: `${baseId}-${binding.modelId}`,
      label: reportLabel(report, binding),
      mappedTo: { [binding.modelName ?? binding.modelId]: target },
    }));
  });

const replaceMappedTarget = (mappedTo: unknown, target: string): unknown => {
  if (!isRecord(mappedTo)) return target;
  return Object.fromEntries(Object.keys(mappedTo).map((key) => [key, target]));
};

export const prepareRuntimeReports = (
  schema: unknown,
  bindings: readonly Binding[],
): { schema: unknown; sourceTargets: RuntimeReportTargets } => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) {
    return { schema, sourceTargets: {} };
  }
  const reports = expandByBinding(schema.reports, bindings);
  const targets = reports.map((report) =>
    isRecord(report) ? targetKey(mappedTarget(report.mappedTo)) : undefined,
  );
  const sourceTargets: Record<string, string> = {};
  const runtimeReports = reports.map((report, index) => {
    if (!isRecord(report)) return report;
    const sourceTarget = targets[index];
    if (!sourceTarget || targets.filter((target) => target === sourceTarget).length < 2) {
      return report;
    }
    const id = normalizeSchemaId(reportId(report, index));
    sourceTargets[id] = sourceTarget;
    return { ...report, mappedTo: replaceMappedTarget(report.mappedTo, `report:${id}`) };
  });
  return { schema: { ...schema, reports: runtimeReports }, sourceTargets };
};

export const sourceReportTarget = (
  report: { id?: unknown; mappedTo?: unknown },
  binding: Binding,
  sourceTargets: RuntimeReportTargets,
): string | undefined => {
  const runtimeTarget = targetKey(mappedTarget(report.mappedTo, binding));
  if (!runtimeTarget) return undefined;
  const id = typeof report.id === "string" ? normalizeSchemaId(report.id) : "";
  return sourceTargets[id] ?? runtimeTarget;
};
