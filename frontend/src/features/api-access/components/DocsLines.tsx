/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** Short paragraphs of the API documentation, one per line. */
export function DocsLines({ lines }: { lines: string[] }) {
  return (
    <div className="grid gap-2 text-sm leading-6 text-fg-secondary">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
