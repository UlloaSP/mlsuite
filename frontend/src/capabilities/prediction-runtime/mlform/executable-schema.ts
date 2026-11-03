/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

const isMappedTo = (value: unknown): boolean =>
  typeof value === "string" || typeof value === "number" || isRecord(value);

/**
 * Returns the version with reports ready to save or run: every report must carry
 * its `mappedTo` binding, and editor-only `id`/`source` keys are dropped. A binding is
 * MLForm's: a bare output (a name or a position such as `0`) that serves every bound
 * model, or a map keyed by model.
 */
export const toExecutableSchemaVersion = <T extends { formSchema: JsonRecord }>(version: T): T => {
  const reports = Array.isArray(version.formSchema.reports)
    ? version.formSchema.reports.filter(isRecord)
    : [];
  return {
    ...version,
    formSchema: {
      ...version.formSchema,
      reports: reports.map((report, index) => {
        if (!isMappedTo(report.mappedTo))
          throw new Error(`Schema report ${index + 1} falta mappedTo`);
        const { id: _id, source: _source, ...executable } = report;
        return executable;
      }),
    },
  };
};
