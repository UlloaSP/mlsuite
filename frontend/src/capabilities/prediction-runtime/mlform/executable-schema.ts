/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

const isMappedTo = (value: unknown): boolean =>
  typeof value === "string" || typeof value === "number" || isRecord(value);

const reportsOf = (version: { formSchema: JsonRecord }): JsonRecord[] =>
  Array.isArray(version.formSchema.reports) ? version.formSchema.reports.filter(isRecord) : [];

/**
 * Returns the version with reports ready to run: every report must carry its `mappedTo`
 * binding. A binding is MLForm's: a bare output (a name or a position such as `0`) that serves
 * every bound model, or a map keyed by model. Reports keep their stored `id`, which names the
 * copy a run stores of them.
 */
export const toExecutableSchemaVersion = <T extends { formSchema: JsonRecord }>(version: T): T => {
  const reports = reportsOf(version);
  reports.forEach((report, index) => {
    if (!isMappedTo(report.mappedTo)) throw new Error(`Schema report ${index + 1} has no mappedTo`);
  });
  return { ...version, formSchema: { ...version.formSchema, reports } };
};

/** An editor's version as it is saved: ready to run, without the editor-only `id`/`source` keys. */
export const toSavedSchemaVersion = <T extends { formSchema: JsonRecord }>(version: T): T => {
  const executable = toExecutableSchemaVersion(version);
  return {
    ...executable,
    formSchema: {
      ...executable.formSchema,
      reports: reportsOf(executable).map((report) => {
        const { id: _id, source: _source, ...saved } = report;
        return saved;
      }),
    },
  };
};
