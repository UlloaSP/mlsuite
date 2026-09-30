/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { stringify } from "json-source-map";
import type { SchemaDraftChangeDto } from "@/shared/api/openapi.gen";

type Range = { end: number; start: number };
type PrintResult = { lines: string[]; ranges: Map<string, Range> };
type ConflictGroup = { paths: string[] };
type Block = ConflictGroup & { lines: string[]; range: Range };

export type SchemaMergeFileResult = {
  contents: string;
  conflictGroups: ConflictGroup[];
};

export function buildSchemaMergeFile({
  changes,
  currentLabel,
  currentSchema,
  incomingLabel,
  incomingSchema,
}: {
  changes: SchemaDraftChangeDto[];
  currentLabel: string;
  currentSchema: unknown;
  incomingLabel: string;
  incomingSchema: unknown;
}): SchemaMergeFileResult {
  const current = printJson(currentSchema);
  const incoming = printJson(incomingSchema);
  const paths = [...new Set(changes.map(({ path }) => path))];
  const groups = paths
    .map((path) => ({ anchor: sharedAncestor(path, current, incoming), paths: [path] }))
    .sort((left, right) =>
      compareRanges(current.ranges.get(left.anchor)!, current.ranges.get(right.anchor)!),
    )
    .reduce<Array<{ anchor: string; paths: string[] }>>((result, group) => {
      const parent = result.find(({ anchor }) =>
        contains(current.ranges.get(anchor)!, current.ranges.get(group.anchor)!),
      );
      if (parent) parent.paths.push(...group.paths);
      else result.push(group);
      return result;
    }, []);
  const blocks: Block[] = groups.map(({ anchor, paths: groupPaths }) => {
    const range = current.ranges.get(anchor)!;
    const incomingRange = incoming.ranges.get(anchor)!;
    return {
      paths: groupPaths,
      range,
      lines: [
        `<<<<<<< ${currentLabel}`,
        ...current.lines.slice(range.start, range.end + 1),
        "=======",
        ...incoming.lines.slice(incomingRange.start, incomingRange.end + 1),
        `>>>>>>> ${incomingLabel}`,
      ],
    };
  });
  const merged = [...current.lines];
  for (const block of [...blocks].sort((left, right) => right.range.start - left.range.start)) {
    merged.splice(block.range.start, block.range.end - block.range.start + 1, ...block.lines);
  }
  return {
    contents: `${merged.join("\n")}\n`,
    conflictGroups: blocks.map(({ paths: groupPaths }) => ({ paths: groupPaths })),
  };
}

function sharedAncestor(path: string, current: PrintResult, incoming: PrintResult) {
  let candidate = path.startsWith("/") ? path : "";
  while (!current.ranges.has(candidate) || !incoming.ranges.has(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf("/"));
  }
  return candidate;
}

function printJson(value: unknown): PrintResult {
  // Any JSON value is accepted at runtime; the typings leave out null.
  const { json, pointers } = stringify(value as object, null, 2);
  const ranges = new Map<string, Range>();
  for (const [path, pointer] of Object.entries(pointers)) {
    ranges.set(path, {
      start: pointer.key?.line ?? pointer.value.line,
      end: pointer.valueEnd.line,
    });
  }
  return { lines: json.split("\n"), ranges };
}

const compareRanges = (left: Range, right: Range) =>
  left.start - right.start || right.end - left.end;
const contains = (parent: Range, child: Range) =>
  parent.start <= child.start && parent.end >= child.end;
