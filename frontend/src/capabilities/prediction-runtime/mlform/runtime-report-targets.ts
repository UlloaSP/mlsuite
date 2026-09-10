/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { mappedTarget, targetKey } from "@/capabilities/prediction-runtime/mlform/mapped-to";

type Binding = {
  modelId: string;
  modelName?: string;
};

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
    if (!isRecord(report)) return [report];
    const targets = bindings
      .map((binding) => ({ binding, target: targetKey(mappedTarget(report.mappedTo, binding)) }))
      .filter((item): item is { binding: Binding; target: string } => item.target !== undefined);
    if (targets.length === 0) return [report];
    const baseId = reportId(report, index);
    return targets.map(({ binding, target }) => ({
      ...report,
      id: targets.length === 1 ? baseId : `${baseId}-${binding.modelId}`,
      label: targets.length === 1 ? report.label : reportLabel(report, binding),
      mappedTo: { [binding.modelName ?? binding.modelId]: target },
    }));
  });

export const prepareRuntimeReports = (schema: unknown, bindings: readonly Binding[]): unknown =>
  !isRecord(schema) || !Array.isArray(schema.reports)
    ? schema
    : { ...schema, reports: expandByBinding(schema.reports, bindings) };
