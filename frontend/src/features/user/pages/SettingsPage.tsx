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
import { AppTabPanel, AppTabs } from "@/shared/ui/AppTabs";
import { cx } from "@/shared/ui/cx";
import { FORM_MAX_WIDTH } from "@/shared/ui/page-layout";
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
      {/* Header and tabs stay put; only the active section scrolls. */}
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-clip pb-0">
        <AppPageHeader
          className={FORM_MAX_WIDTH}
          title="Settings"
          description="Customize appearance, typography, shortcuts, and navigation on this browser."
          breadcrumbs={[{ label: "Settings" }]}
        />
        <AppTabs
          aria-label="Personal settings sections"
          className={cx(FORM_MAX_WIDTH, "shrink-0")}
          items={SECTIONS}
          value={section}
          onChange={setSection}
        >
          {/* Full-width scroller keeps its scrollbar at the page edge; keyed so each section opens at the top. */}
          <AppTabPanel
            key={section}
            value={section}
            className="app-scroll -mx-6 min-h-0 flex-1 overflow-y-auto px-6"
          >
            <main className={cx(FORM_MAX_WIDTH, "flex flex-col pb-10")}>
              {section === "appearance" ? <SettingsAppearanceSection /> : null}
              {section === "typography" ? <SettingsTypographySection /> : null}
              {section === "keybindings" ? <SettingsKeybindingsSection /> : null}
              {section === "layout" ? <SettingsLayoutSection /> : null}
              <p className="mt-10 border-t border-line pt-5 text-xs text-fg-muted">
                Preferences are saved in this browser and apply immediately.
              </p>
            </main>
          </AppTabPanel>
        </AppTabs>
      </AppSurface>
    </AppPage>
  );
}
