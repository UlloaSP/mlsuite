/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const PREFIX = "[schema-plugin-debug]";

export const schemaRunDebug = (step: string, details?: unknown): void => {
  console.log(PREFIX, step, details ?? "");
};

export const schemaRunDebugError = (step: string, error: unknown, details?: unknown): void => {
  console.error(PREFIX, step, { error, details });
};
