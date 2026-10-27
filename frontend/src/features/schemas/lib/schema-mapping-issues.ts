/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isHttpError } from "@/shared/api/http";
import type { SchemaMappingErrorDto, SchemaMappingIssueDto } from "@/shared/api/openapi.gen";
import { type EditorErrorCard, pointerToPos } from "./schema-diagnostics";

/** The mappings a refused save named, when the server refused the schema for them. */
export const refusedMappings = (error: unknown): SchemaMappingIssueDto[] => {
  if (!isHttpError(error) || error.status !== 400) return [];
  const { issues } = error.dto as Partial<SchemaMappingErrorDto>;
  return Array.isArray(issues) ? issues : [];
};

const unescape = (segment: string) => segment.replaceAll("~1", "/").replaceAll("~0", "~");

/** Each refused mapping as an error card at its place in the text being edited. */
export const mappingIssueCards = (
  text: string,
  issues: readonly SchemaMappingIssueDto[],
): EditorErrorCard[] =>
  issues.map((issue) => {
    const { line, column } = pointerToPos(text, issue.pointer);
    const path = issue.pointer.split("/").slice(1).map(unescape).join(".");
    return { line, column, path: path || "root", message: issue.message, severity: "error" };
  });
