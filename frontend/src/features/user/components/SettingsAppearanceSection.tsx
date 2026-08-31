/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Paintbrush } from "lucide-react";
import { useAtom } from "jotai";
import { useState } from "react";
import { AppChoiceCard } from "@/shared/ui/AppChoiceCard";
import { AppButton } from "@/shared/ui/AppButton";
import {
  customThemesAtom,
  themeModeAtom,
  themeSelectionAtom,
  type ThemeMode,
} from "@/shared/ui/appearance-state";
import { THEME_PRESETS, type CustomTheme, type ThemeId } from "@/shared/ui/theme-catalog";
import { ColorSchemePreview } from "./ColorSchemePreview";
import { ContrastControl } from "./ContrastControl";
import { CreateThemeDialog } from "./CreateThemeDialog";
import { ThemeSelectionCard } from "./ThemeSelectionCard";

const MODES: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export function SettingsAppearanceSection() {
  const [mode, setMode] = useAtom(themeModeAtom);
  const [selection, setSelection] = useAtom(themeSelectionAtom);
  const [customThemes, setCustomThemes] = useAtom(customThemesAtom);
  const [createOpen, setCreateOpen] = useState(false);
  const themes: Array<{
    value: ThemeId;
    label: string;
    preview: { light: readonly [string, string]; dark: readonly [string, string] };
  }> = [
    ...THEME_PRESETS,
    ...customThemes.map((theme) => ({
      value: theme.id,
      label: theme.name,
      preview: {
        light: [theme.light.background, theme.light.accent] as const,
        dark: [theme.dark.background, theme.dark.accent] as const,
      },
    })),
  ];
  const applyTheme = (themeId: ThemeId, target: "both" | "light" | "dark") => {
    if (target === "both") {
      setSelection({ light: themeId, dark: themeId });
      return;
    }
    setSelection({ ...selection, [target]: themeId });
    setMode(target);
  };
  const createTheme = (theme: CustomTheme) => {
    setCustomThemes([...customThemes, theme]);
    setSelection({ light: theme.id, dark: theme.id });
    setCreateOpen(false);
  };

  return (
    <section aria-labelledby="appearance-heading">
      <div>
        <h2
          id="appearance-heading"
          className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
        >
          Appearance
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Choose a built-in palette, follow your system, and tune interface definition.
        </p>
      </div>

      <fieldset className="mt-7">
        <legend className="text-base font-semibold text-[var(--text-primary)]">Color scheme</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map((option) => (
            <AppChoiceCard
              key={option.value}
              checked={mode === option.value}
              label={option.label}
              name="color-scheme"
              value={option.value}
              onChange={() => setMode(option.value)}
            >
              <ColorSchemePreview mode={option.value} />
            </AppChoiceCard>
          ))}
        </div>
      </fieldset>

      <section className="mt-9" aria-labelledby="themes-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="themes-heading" className="text-base font-semibold text-[var(--text-primary)]">
              Themes
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Apply a full pair, or choose either orb for only that mode.
            </p>
          </div>
          <AppButton variant="secondary" className="px-3 py-2" onClick={() => setCreateOpen(true)}>
            <Paintbrush size={15} /> Create theme
          </AppButton>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((option) => (
            <ThemeSelectionCard
              key={option.value}
              id={option.value}
              label={option.label}
              preview={option.preview}
              selection={selection}
              onApply={(target) => applyTheme(option.value, target)}
            />
          ))}
        </div>
      </section>

      <ContrastControl />
      <CreateThemeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createTheme}
      />
    </section>
  );
}
