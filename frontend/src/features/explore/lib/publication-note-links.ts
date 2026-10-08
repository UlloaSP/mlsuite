/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type NoteSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

// A web address, or a DOI written bare ("10.1000/xyz123") or with its prefix ("doi:10.1000/xyz123").
const LINK = /(https?:\/\/[^\s<>"']+)|(?:\bdoi:\s*)?(10\.\d{4,9}\/[^\s<>"']+)/gi;
// Punctuation that closes the sentence around a link is not part of it.
const TRAILING = /[.,;:!?)\]]+$/;

/**
 * Splits a publication note into plain text and the links written in it, so a DOI or an address
 * to the paper can be followed. Nothing else in the note is markup: it is shown as typed.
 */
export function noteSegments(note: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let last = 0;
  for (const match of note.matchAll(LINK)) {
    const whole = match[0];
    const trimmed = whole.replace(TRAILING, "");
    const start = match.index;
    if (start > last) segments.push({ kind: "text", text: note.slice(last, start) });
    const doi = match[2]?.replace(TRAILING, "");
    segments.push({
      kind: "link",
      text: trimmed,
      href: match[1] ? trimmed : `https://doi.org/${doi}`,
    });
    last = start + trimmed.length;
  }
  if (last < note.length) segments.push({ kind: "text", text: note.slice(last) });
  return segments;
}
