/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

/**
 * Returns the version with reports ready to save or run: every report must carry
 * its `mappedTo` binding, and editor-only `id`/`source` keys are dropped.
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
        if (!isRecord(report.mappedTo))
          throw new Error(`Schema report ${index + 1} falta mappedTo`);
        const { id: _id, source: _source, ...executable } = report;
        return executable;
      }),
    },
  };
};
