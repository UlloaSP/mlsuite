/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** A snippet to read or copy, in the app's code style. */
export function DocsCodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <pre
      data-code-block
      aria-label={label}
      className="app-scroll overflow-auto rounded-card border border-line bg-surface-inverse p-4 font-mono text-code text-fg-inverse"
    >
      <code>{code}</code>
    </pre>
  );
}
