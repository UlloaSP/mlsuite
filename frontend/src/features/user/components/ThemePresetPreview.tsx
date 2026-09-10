/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Moon, Sun } from "lucide-react";
import { AppThemeSwatch } from "@/shared/ui/AppThemeSwatch";
import { cx } from "@/shared/ui/cx";

type PreviewColors = { dark: readonly [string, string]; light: readonly [string, string] };

export function ThemePresetPreview({
  label,
  preview,
  selectedDark,
  selectedLight,
  onSelect,
}: {
  label: string;
  preview: PreviewColors;
  selectedDark: boolean;
  selectedLight: boolean;
  onSelect: (mode: "light" | "dark") => void;
}) {
  return (
    <div className="pointer-events-none relative z-10 flex items-center justify-center gap-6 py-2">
      {(["light", "dark"] as const).map((mode) => {
        const selected = mode === "light" ? selectedLight : selectedDark;
        const Icon = mode === "light" ? Sun : Moon;
        return (
          <button
            key={mode}
            type="button"
            aria-label={`Use ${label} for ${mode} mode`}
            aria-pressed={selected}
            className={cx(
              "pointer-events-auto relative size-16 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-secondary)]",
              selected &&
                "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--surface-secondary)]",
            )}
            onClick={() => onSelect(mode)}
          >
            <AppThemeSwatch colors={preview[mode]} mode={mode} />
            <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)]">
              {selected ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
