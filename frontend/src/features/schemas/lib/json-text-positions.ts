/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { parseTree, type Node, type ParseError } from "jsonc-parser";

type Segment = string | number;

/** RFC 6901: "~1" is "/" and "~0" is "~", undone in that order. */
const unescapeSegment = (segment: string) => segment.replaceAll("~1", "/").replaceAll("~0", "~");
const escapeSegment = (segment: string) => segment.replaceAll("~", "~0").replaceAll("/", "~1");

/** A JSON pointer's segments, unescaped; "" is the whole document. */
export const pointerSegments = (pointer: string): string[] =>
  pointer === "" ? [] : pointer.slice(1).split("/").map(unescapeSegment);

const INDEX = /^(0|[1-9][0-9]*)$/;

/** The value under `node` that `segment` names: an array's index, or an object's key. */
const childAt = (node: Node, segment: Segment): Node | undefined => {
  if (node.type === "array") {
    const index = String(segment);
    return INDEX.test(index) ? node.children?.[Number(index)] : undefined;
  }
  if (node.type !== "object") return undefined;
  const property = node.children?.find((child) => child.children?.[0]?.value === String(segment));
  return property?.children?.[1];
};

/** The 0-based line of each offset in `text`, and that line's first offset. */
export const lineIndex = (text: string) => {
  const starts = [0];
  for (let offset = 0; offset < text.length; offset += 1) {
    if (text[offset] === "\n") starts.push(offset + 1);
  }
  const lineOf = (offset: number) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (starts[middle]! <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  };
  return { lineOf, lineStart: (line: number) => starts[line]! };
};

/** The node at `segments`, or undefined when the text does not parse or has no such value. */
export const nodeAt = (text: string, segments: Segment[]): Node | undefined => {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors);
  if (!tree || errors.length > 0) return undefined;
  return segments.reduce<Node | undefined>((node, segment) => node && childAt(node, segment), tree);
};

/** Every value's pointer (escaped, "" for the root) with the node that holds it. */
export const pointerNodes = (tree: Node): Map<string, { value: Node; member?: Node }> => {
  const nodes = new Map<string, { value: Node; member?: Node }>();
  const visit = (value: Node, pointer: string, member?: Node) => {
    nodes.set(pointer, { value, member });
    if (value.type === "object") {
      for (const property of value.children ?? []) {
        const [key, child] = property.children ?? [];
        if (key && child) visit(child, `${pointer}/${escapeSegment(String(key.value))}`, property);
      }
    } else if (value.type === "array") {
      (value.children ?? []).forEach((child, index) => visit(child, `${pointer}/${index}`));
    }
  };
  visit(tree, "");
  return nodes;
};
