/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { parseTree } from "jsonc-parser";
import { lineIndex, pointerNodes } from "./json-text-positions";
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

/**
 * The value printed with two-space indents, and for every JSON pointer the lines it spans: from
 * its key's line (a member) or its value's, to the line its value ends on.
 */
function printJson(value: unknown): PrintResult {
  const json = JSON.stringify(value, null, 2);
  const { lineOf } = lineIndex(json);
  const ranges = new Map<string, Range>();
  for (const [pointer, { value: node, member }] of pointerNodes(parseTree(json)!)) {
    ranges.set(pointer, {
      start: lineOf((member ?? node).offset),
      end: lineOf(node.offset + node.length),
    });
  }
  return { lines: json.split("\n"), ranges };
}

const compareRanges = (left: Range, right: Range) =>
  left.start - right.start || right.end - left.end;
const contains = (parent: Range, child: Range) =>
  parent.start <= child.start && parent.end >= child.end;
