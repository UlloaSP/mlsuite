/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import { AppChoiceCard } from "@/shared/ui/AppChoiceCard";
import { AppShortcut } from "@/shared/ui/AppShortcut";
import { AppSwitch } from "@/shared/ui/AppSwitch";
import { animateLayoutChange } from "@/shared/ui/layout-transition";
import { useFullscreen } from "@/shared/ui/display-controls";
import { shortcutBindingsAtom } from "@/shared/ui/shortcut-state";
import {
  sidebarPositionAtom,
  sidebarStyleAtom,
  type SidebarPosition,
  type SidebarStyle,
} from "@/shared/ui/sidebar-preferences";
import { SidebarLayoutPreview } from "./SidebarLayoutPreview";

const POSITIONS: { label: string; value: SidebarPosition }[] = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const STYLES: { label: string; value: SidebarStyle }[] = [
  { label: "Fixed", value: "fixed" },
  { label: "Floating", value: "floating" },
];

const OPTION_HEADING = "text-sm font-semibold text-fg";

export function SettingsLayoutSection() {
  const [position, setPosition] = useAtom(sidebarPositionAtom);
  const [variant, setVariant] = useAtom(sidebarStyleAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { isFullscreen, supported, toggleFullscreen } = useFullscreen();

  return (
    <fieldset className="border-t border-line pt-8">
      <legend className="text-xl font-semibold tracking-[-0.02em] text-fg">Layout</legend>
      <p className="mt-1 text-sm leading-6 text-fg-secondary">
        Choose where navigation lives, how it meets the page, and how much of the screen the
        workspace uses.
      </p>
      <h3 className={`mt-6 ${OPTION_HEADING}`}>Sidebar position</h3>
      <div className="mt-3 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {POSITIONS.map((option) => (
          <AppChoiceCard
            key={option.value}
            checked={position === option.value}
            label={option.label}
            name="sidebar-position"
            value={option.value}
            onChange={() => animateLayoutChange(() => setPosition(option.value))}
          >
            <SidebarLayoutPreview position={option.value} variant={variant} />
          </AppChoiceCard>
        ))}
      </div>
      <h3 className={`mt-6 ${OPTION_HEADING}`}>Sidebar style</h3>
      <p className="mt-1 text-sm text-fg-secondary">
        Fixed runs along the screen edge; floating sits inset as a panel on the page background.
      </p>
      <div className="mt-3 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {STYLES.map((option) => (
          <AppChoiceCard
            key={option.value}
            checked={variant === option.value}
            label={option.label}
            name="sidebar-style"
            value={option.value}
            onChange={() => animateLayoutChange(() => setVariant(option.value))}
          >
            <SidebarLayoutPreview position={position} variant={option.value} />
          </AppChoiceCard>
        ))}
      </div>
      <AppSwitch
        className="mt-8 max-w-2xl border-t border-line pt-5"
        label="Fullscreen"
        description={
          supported
            ? "Hide browser chrome to give the workspace the whole screen."
            : "This browser does not allow pages to enter fullscreen."
        }
        checked={isFullscreen}
        disabled={!supported}
        onChange={toggleFullscreen}
        trailing={<AppShortcut binding={bindings["toggle-fullscreen"]} />}
      />
    </fieldset>
  );
}
