/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Dialog } from "radix-ui";
import { Paintbrush, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppIconButton } from "@/shared/ui/AppIconButton";
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
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[900] bg-black/30" />
        <Dialog.Content className="fixed right-0 top-0 z-[901] flex h-dvh w-[min(92vw,560px)] flex-col border-l border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                Create theme
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">
                Define both variants. Apply them together or separately afterward.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <AppIconButton aria-label="Close theme editor">
                <X size={18} />
              </AppIconButton>
            </Dialog.Close>
          </header>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
            <div className="app-scroll min-h-0 flex-1 overflow-auto p-5">
              <div className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">
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
              <p className="mt-4 min-h-5 text-sm text-[var(--danger-text)]" aria-live="polite">
                {lightError ? `Light: ${lightError}` : darkError ? `Dark: ${darkError}` : ""}
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-[var(--border-soft)] p-4">
              <Dialog.Close asChild>
                <AppButton variant="secondary">Cancel</AppButton>
              </Dialog.Close>
              <AppButton type="submit" disabled={!valid}>
                <Paintbrush size={16} /> Create theme
              </AppButton>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
