/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import { AppChoiceCard } from "@/shared/ui/AppChoiceCard";
import { AppShortcut } from "@/shared/ui/AppShortcut";
import { AppSwitch } from "@/shared/ui/AppSwitch";
import { useFullscreen } from "@/shared/ui/display-controls";
import { shortcutBindingsAtom } from "@/shared/ui/shortcut-state";
import { sidebarPositionAtom, type SidebarPosition } from "@/shared/ui/sidebar-position";
import { SidebarPositionPreview } from "./SidebarPositionPreview";

const POSITIONS: { label: string; value: SidebarPosition }[] = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

export function SettingsLayoutSection() {
  const [position, setPosition] = useAtom(sidebarPositionAtom);
  const bindings = useAtomValue(shortcutBindingsAtom);
  const { isFullscreen, supported, toggleFullscreen } = useFullscreen();

  return (
    <fieldset className="border-t border-line pt-8">
      <legend className="text-xl font-semibold tracking-[-0.02em] text-fg">Layout</legend>
      <p className="mt-1 text-sm leading-6 text-fg-secondary">
        Choose which edge owns navigation and how much of the screen the workspace uses.
      </p>
      <div className="mt-5 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {POSITIONS.map((option) => (
          <AppChoiceCard
            key={option.value}
            checked={position === option.value}
            label={option.label}
            name="sidebar-position"
            value={option.value}
            onChange={() => setPosition(option.value)}
          >
            <SidebarPositionPreview position={option.value} />
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
