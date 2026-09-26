/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Paintbrush } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppTabs } from "@/shared/ui/AppTabs";
import {
  createCustomTheme,
  DEFAULT_CUSTOM_PALETTES,
  hasThemePaletteSyntax,
  themePaletteContrastError,
  type CustomTheme,
  type ThemePalette,
} from "@/shared/ui/theme-catalog";
import { ThemeColorFields } from "./ThemeColorFields";

export function CreateThemeDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (theme: CustomTheme) => void;
}) {
  const [draft, setDraft] = useState<{
    name: string;
    mode: "light" | "dark";
    light: ThemePalette;
    dark: ThemePalette;
  }>({
    name: "",
    mode: "light",
    light: { ...DEFAULT_CUSTOM_PALETTES.light },
    dark: { ...DEFAULT_CUSTOM_PALETTES.dark },
  });
  const { name, mode, light, dark } = draft;
  const lightError = hasThemePaletteSyntax(light)
    ? themePaletteContrastError(light)
    : "Use six-digit hex colors.";
  const darkError = hasThemePaletteSyntax(dark)
    ? themePaletteContrastError(dark)
    : "Use six-digit hex colors.";
  const valid = name.trim().length > 0 && !lightError && !darkError;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    onCreate(createCustomTheme(name, light, dark));
    setDraft({
      name: "",
      mode: "light",
      light: { ...DEFAULT_CUSTOM_PALETTES.light },
      dark: { ...DEFAULT_CUSTOM_PALETTES.dark },
    });
  };
  return (
    <AppDialog
      open={open}
      variant="sheet"
      onClose={onClose}
      title="Create theme"
      description="Define both variants. Apply them together or separately afterward."
      onSubmit={submit}
      footer={
        <>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={!valid}>
            <Paintbrush size={16} /> Create theme
          </AppButton>
        </>
      }
    >
      <div className="grid gap-2 text-sm font-semibold text-fg">
        <span>Theme name</span>
        <AppTextField
          aria-label="Theme name"
          autoFocus
          value={name}
          maxLength={40}
          placeholder="Aurora"
          required
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </div>
      <AppTabs
        id="theme-appearance"
        aria-label="Theme appearance"
        className="mt-6"
        items={[
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]}
        value={mode}
        onChange={(nextMode) => setDraft({ ...draft, mode: nextMode })}
      />
      <div
        id={`theme-appearance-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`theme-appearance-tab-${mode}`}
        tabIndex={0}
        className="mt-5"
      >
        <ThemeColorFields
          mode={mode}
          palette={mode === "light" ? light : dark}
          onChange={(palette) => setDraft({ ...draft, [mode]: palette })}
        />
      </div>
      <p className="mt-4 min-h-5 text-sm text-danger-fg" aria-live="polite">
        {lightError ? `Light: ${lightError}` : darkError ? `Dark: ${darkError}` : ""}
      </p>
    </AppDialog>
  );
}
