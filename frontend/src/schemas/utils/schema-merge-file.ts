/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaDraftChangeDto } from "../../api/schemas/dtos";

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
  const result: PrintResult = { lines: [], ranges: new Map() };
  writeValue(result, value, "", 0, false);
  return result;
}

function writeValue(
  result: PrintResult,
  value: unknown,
  path: string,
  level: number,
  comma: boolean,
  prefix = "",
) {
  const start = result.lines.length;
  if (Array.isArray(value)) writeArray(result, value, path, level, comma, prefix);
  else if (isRecord(value)) writeObject(result, value, path, level, comma, prefix);
  else result.lines.push(`${indent(level)}${prefix}${JSON.stringify(value)}${comma ? "," : ""}`);
  result.ranges.set(path, { start, end: result.lines.length - 1 });
}

function writeArray(
  result: PrintResult,
  values: unknown[],
  path: string,
  level: number,
  comma: boolean,
  prefix: string,
) {
  if (values.length === 0) {
    result.lines.push(`${indent(level)}${prefix}[]${comma ? "," : ""}`);
    return;
  }
  result.lines.push(`${indent(level)}${prefix}[`);
  values.forEach((value, index) =>
    writeValue(result, value, `${path}/${index}`, level + 1, index < values.length - 1),
  );
  result.lines.push(`${indent(level)}]${comma ? "," : ""}`);
}

function writeObject(
  result: PrintResult,
  value: Record<string, unknown>,
  path: string,
  level: number,
  comma: boolean,
  prefix: string,
) {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    result.lines.push(`${indent(level)}${prefix}{}${comma ? "," : ""}`);
    return;
  }
  result.lines.push(`${indent(level)}${prefix}{`);
  entries.forEach(([key, child], index) =>
    writeValue(
      result,
      child,
      `${path}/${escapePointer(key)}`,
      level + 1,
      index < entries.length - 1,
      `${JSON.stringify(key)}: `,
    ),
  );
  result.lines.push(`${indent(level)}}${comma ? "," : ""}`);
}

const compareRanges = (left: Range, right: Range) =>
  left.start - right.start || right.end - left.end;
const contains = (parent: Range, child: Range) =>
  parent.start <= child.start && parent.end >= child.end;
const escapePointer = (value: string) => value.replaceAll("~", "~0").replaceAll("/", "~1");
const indent = (level: number) => "  ".repeat(level);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
