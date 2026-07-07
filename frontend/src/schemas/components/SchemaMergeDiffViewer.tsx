/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MultiFileDiff, type FileContents } from "@pierre/diffs/react";
import { useMemo } from "react";

type Props = {
  currentSchema: unknown;
  incomingSchema: unknown;
};

const stringifySchema = (value: unknown) => `${JSON.stringify(value ?? {}, null, 2)}\n`;

export function SchemaMergeDiffViewer({ currentSchema, incomingSchema }: Props) {
  const currentFile = useMemo<FileContents>(
    () => ({
      name: "current.schema.json",
      contents: stringifySchema(currentSchema),
      lang: "json",
      cacheKey: `current-${stringifySchema(currentSchema)}`,
    }),
    [currentSchema],
  );
  const incomingFile = useMemo<FileContents>(
    () => ({
      name: "incoming.schema.json",
      contents: stringifySchema(incomingSchema),
      lang: "json",
      cacheKey: `incoming-${stringifySchema(incomingSchema)}`,
    }),
    [incomingSchema],
  );

  return (
    <div className="min-h-[560px] overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]">
      <MultiFileDiff
        oldFile={currentFile}
        newFile={incomingFile}
        disableWorkerPool
        options={{
          diffStyle: "split",
          diffIndicators: "classic",
          hunkSeparators: "line-info-basic",
          lineDiffType: "word",
          overflow: "wrap",
          theme: { light: "github-light", dark: "github-dark" },
        }}
      />
    </div>
  );
}
