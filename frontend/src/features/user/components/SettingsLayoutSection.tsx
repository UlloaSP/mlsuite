/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AppChoiceCard } from "@/shared/ui/AppChoiceCard";
import { sidebarPositionAtom, type SidebarPosition } from "@/shared/ui/sidebar-position";
import { SidebarPositionPreview } from "./SidebarPositionPreview";

const POSITIONS: { label: string; value: SidebarPosition }[] = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

export function SettingsLayoutSection() {
  const [position, setPosition] = useAtom(sidebarPositionAtom);

  return (
    <fieldset className="border-t border-[var(--border-soft)] pt-8">
      <legend className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        Layout
      </legend>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        Choose which edge owns navigation on desktop and mobile.
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
    </fieldset>
  );
}
