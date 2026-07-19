/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MultiFileDiff, UnresolvedFile, type FileContents } from "@pierre/diffs/react";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { themeWithHtmlAtom } from "@/app/atoms";
import { cx } from "@/app/components/cx";
import type { SchemaDraftChangeDto, SchemaDraftMergeSide } from "@/api/schemas/dtos";
import { buildSchemaMergeFile } from "@/schemas/utils/schema-merge-file";

type Props = {
  currentLabel: string;
  currentDocument: unknown;
  incomingLabel: string;
  incomingDocument: unknown;
  changes?: SchemaDraftChangeDto[];
  className?: string;
  onResolve?: (paths: string[], side: SchemaDraftMergeSide) => void;
};

const stringifySchema = (value: unknown) => `${JSON.stringify(value ?? {}, null, 2)}\n`;
const EMPTY_CHANGES: SchemaDraftChangeDto[] = [];

export function SchemaMergeDiffViewer({
  currentLabel,
  currentDocument,
  incomingLabel,
  incomingDocument,
  changes = EMPTY_CHANGES,
  className,
  onResolve,
}: Props) {
  const theme = useAtomValue(themeWithHtmlAtom);
  const selectableChanges = useMemo(() => changes.filter((change) => change.conflict), [changes]);
  const currentFile = useMemo<FileContents>(() => {
    const contents = stringifySchema(currentDocument);
    return { name: "current.schema.json", contents, lang: "json", cacheKey: contents };
  }, [currentDocument]);
  const incomingFile = useMemo<FileContents>(() => {
    const contents = stringifySchema(incomingDocument);
    return { name: "incoming.schema.json", contents, lang: "json", cacheKey: contents };
  }, [incomingDocument]);
  const mergeData = useMemo(() => {
    const result = buildSchemaMergeFile({
      changes: selectableChanges,
      currentLabel,
      currentSchema: currentDocument,
      incomingLabel,
      incomingSchema: incomingDocument,
    });
    return {
      file: {
        name: `${incomingLabel}.merge.json`,
        contents: result.contents,
        lang: "json",
        cacheKey: result.contents,
      } satisfies FileContents,
      groups: result.conflictGroups,
    };
  }, [selectableChanges, currentLabel, currentDocument, incomingLabel, incomingDocument]);

  return (
    <div
      className={cx(
        "min-h-0 overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]",
        className,
      )}
    >
      {selectableChanges.length > 0 ? (
        <div className="size-full min-h-0 overflow-auto">
          <UnresolvedFile
            key={mergeData.file.cacheKey}
            file={mergeData.file}
            disableWorkerPool
            options={{
              collapsedContextThreshold: 8,
              diffIndicators: "bars",
              expansionLineCount: 12,
              hunkSeparators: "metadata",
              maxContextLines: 12,
              overflow: "wrap",
              theme: theme === "dark" ? "pierre-dark" : "pierre-light",
            }}
            renderHeaderMetadata={() => `${selectableChanges.length} changes`}
            renderMergeConflictUtility={(action) => (
              <div data-merge-conflict-actions-content="">
                <span className="mr-2 max-w-[40ch] min-w-0 truncate font-mono text-[11px] text-[var(--text-muted)]">
                  {mergeData.groups[action.conflictIndex]?.paths.join(", ") ??
                    `change ${action.conflictIndex + 1}`}
                </span>
                {(["current", "incoming"] as const).map((side, index) => (
                  <MergeButton
                    key={side}
                    conflictIndex={action.conflictIndex}
                    label={side === "current" ? currentLabel : incomingLabel}
                    paths={mergeData.groups[action.conflictIndex]?.paths ?? []}
                    side={side}
                    separator={index > 0}
                    onClick={() => {
                      const paths = mergeData.groups[action.conflictIndex]?.paths;
                      if (paths) onResolve?.(paths, side);
                    }}
                  />
                ))}
              </div>
            )}
          />
        </div>
      ) : (
        <div className="size-full min-h-0 overflow-auto">
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
              theme: theme === "dark" ? "github-dark" : "github-light",
            }}
          />
        </div>
      )}
    </div>
  );
}

function MergeButton({
  conflictIndex,
  label,
  onClick,
  paths,
  separator,
  side,
}: {
  conflictIndex: number;
  label: string;
  onClick: () => void;
  paths: string[];
  separator: boolean;
  side: SchemaDraftMergeSide;
}) {
  return (
    <>
      {separator ? <span data-merge-conflict-action-separator="">|</span> : null}
      <button
        aria-label={`Use ${label} for ${paths.join(", ")}`}
        data-merge-conflict-action={side}
        data-merge-conflict-conflict-index={conflictIndex}
        onClick={onClick}
        type="button"
      >
        use {label}
      </button>
    </>
  );
}
