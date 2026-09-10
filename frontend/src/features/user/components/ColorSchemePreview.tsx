/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ThemeMode } from "@/shared/ui/appearance-state";

const palette = {
  dark: { background: "#15191d", border: "#343a40", muted: "#4b535c", surface: "#22272d" },
  light: { background: "#f5f5f5", border: "#d7d7d7", muted: "#c5c5c5", surface: "#ffffff" },
};

export function ColorSchemePreview({ mode }: { mode: ThemeMode }) {
  const left = mode === "dark" ? palette.dark : palette.light;
  const right = mode === "light" ? palette.light : palette.dark;

  return (
    <span
      aria-hidden="true"
      className="grid h-24 w-full max-w-56 grid-cols-2 overflow-hidden rounded-xl border border-[var(--border-soft)]"
    >
      {[left, right].map((colors, index) => (
        <span
          key={`${colors.background}-${index}`}
          className="flex min-w-0 gap-2 p-2"
          style={{ backgroundColor: colors.background }}
        >
          <span
            className="w-6 shrink-0 rounded-md border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-2 pt-2">
            <span className="h-2 w-4/5 rounded-full" style={{ backgroundColor: colors.muted }} />
            <span className="h-2 w-3/5 rounded-full" style={{ backgroundColor: colors.muted }} />
            <span className="mt-auto h-2 rounded-full bg-[var(--accent-primary)]" />
          </span>
        </span>
      ))}
    </span>
  );
}
