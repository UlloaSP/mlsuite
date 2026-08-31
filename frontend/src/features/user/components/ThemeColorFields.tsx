/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppTextField } from "@/shared/ui/AppTextField";
import type { ThemePalette } from "@/shared/ui/theme-catalog";

const COLOR_FIELDS = [
  ["background", "Background"],
  ["surface", "Surface"],
  ["muted", "Muted surface"],
  ["text", "Text"],
  ["textMuted", "Muted text"],
  ["accent", "Accent"],
] as const;

export function ThemeColorFields({
  mode,
  palette,
  onChange,
}: {
  mode: "light" | "dark";
  palette: ThemePalette;
  onChange: (palette: ThemePalette) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {COLOR_FIELDS.map(([key, label]) => (
        <div key={key} className="grid gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
          <span>{label}</span>
          <div className="flex items-center gap-2">
            <input
              aria-label={`Pick ${mode} ${label}`}
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(palette[key]) ? palette[key] : "#000000"}
              onChange={(event) => onChange({ ...palette, [key]: event.target.value })}
              className="size-10 shrink-0 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-1"
            />
            <AppTextField
              aria-label={`${mode} ${label}`}
              value={palette[key]}
              pattern="#[0-9a-fA-F]{6}"
              maxLength={7}
              required
              className="min-w-0 flex-1"
              onChange={(event) => onChange({ ...palette, [key]: event.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
