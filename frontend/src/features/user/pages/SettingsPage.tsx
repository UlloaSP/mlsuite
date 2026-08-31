/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin

THESIS: Personalization should feel immediate and legible, never like administration.
OWN-WORLD: MLSuite surfaces, warm type, semantic tokens, and precise visual previews.
STORY: Choose a color system, tune contrast, place navigation, continue working.
FIRST VIEWPORT: Standard header followed by color-scheme previews and the preset gallery.
FORM: One calm settings document; route-owned, responsive, and free of duplicate navigation.
*/

import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppTabs } from "@/shared/ui/AppTabs";
import { useSearchParams } from "react-router";
import { SettingsAppearanceSection } from "@/features/user/components/SettingsAppearanceSection";
import { SettingsKeybindingsSection } from "@/features/user/components/SettingsKeybindingsSection";
import { SettingsLayoutSection } from "@/features/user/components/SettingsLayoutSection";
import { SettingsTypographySection } from "@/features/user/components/SettingsTypographySection";

type SettingsSection = "appearance" | "typography" | "keybindings" | "layout";

const SECTIONS = [
  { label: "Appearance", value: "appearance" },
  { label: "Typography", value: "typography" },
  { label: "Keybindings", value: "keybindings" },
  { label: "Layout", value: "layout" },
] satisfies { label: string; value: SettingsSection }[];

const isSettingsSection = (value: string | null): value is SettingsSection =>
  SECTIONS.some((section) => section.value === value);

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: SettingsSection = isSettingsSection(requestedSection)
    ? requestedSection
    : "appearance";
  const setSection = (next: SettingsSection) => {
    const updated = new URLSearchParams(searchParams);
    if (next === "appearance") updated.delete("section");
    else updated.set("section", next);
    setSearchParams(updated);
  };
  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-auto app-scroll">
        <AppPageHeader
          eyebrow="Personal settings"
          title="Settings"
          description="Customize appearance, typography, shortcuts, and navigation on this browser."
          breadcrumbs={[{ label: "Settings" }]}
        />
        <main className="mx-auto flex w-full max-w-5xl flex-col pb-10">
          <AppTabs
            id="personal-settings"
            aria-label="Personal settings sections"
            items={SECTIONS}
            value={section}
            onChange={setSection}
            className="mb-8"
          />
          <div
            id={`personal-settings-panel-${section}`}
            role="tabpanel"
            aria-labelledby={`personal-settings-tab-${section}`}
            tabIndex={0}
          >
            {section === "appearance" ? <SettingsAppearanceSection /> : null}
            {section === "typography" ? <SettingsTypographySection /> : null}
            {section === "keybindings" ? <SettingsKeybindingsSection /> : null}
            {section === "layout" ? <SettingsLayoutSection /> : null}
          </div>
          <p className="mt-10 border-t border-[var(--border-soft)] pt-5 text-xs text-[var(--text-muted)]">
            Preferences are saved in this browser and apply immediately.
          </p>
        </main>
      </AppSurface>
    </AppPage>
  );
}
