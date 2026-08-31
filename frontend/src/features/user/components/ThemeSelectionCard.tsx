/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ThemeId } from "@/shared/ui/theme-catalog";
import type { ThemeSelection } from "@/shared/ui/appearance-state";
import { ThemePresetPreview } from "./ThemePresetPreview";

export function ThemeSelectionCard({
  id,
  label,
  preview,
  selection,
  onApply,
}: {
  id: ThemeId;
  label: string;
  preview: { dark: readonly [string, string]; light: readonly [string, string] };
  selection: ThemeSelection;
  onApply: (target: "both" | "light" | "dark") => void;
}) {
  const selectedLight = selection.light === id;
  const selectedDark = selection.dark === id;
  return (
    <article className="relative flex flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-3 transition hover:border-[var(--border-strong)]">
      <ThemePresetPreview
        label={label}
        preview={preview}
        selectedDark={selectedDark}
        selectedLight={selectedLight}
        onSelect={onApply}
      />
      <button
        type="button"
        aria-label={`Use ${label} for light and dark modes`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
        onClick={() => onApply("both")}
      />
      <span className="pointer-events-none relative mt-auto min-w-0 truncate px-1 pt-4 text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </span>
    </article>
  );
}
