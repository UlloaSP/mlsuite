/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppEyebrow } from "@/shared/ui/AppEyebrow";
import { AppPanel } from "@/shared/ui/AppPanel";
import type { OwnProfileDto } from "@/shared/api/openapi.gen";

const COUNTS = [
  ["models", "Models"],
  ["schemas", "Schemas"],
  ["plugins", "Plugins"],
  ["inferences", "Inferences"],
] as const;

/** How much their personal account holds: for its owner alone, whatever their profile shows. */
export function ProfileSummary({ profile }: { profile: OwnProfileDto }) {
  return (
    <AppPanel>
      <AppEyebrow>Your personal account · only you see this</AppEyebrow>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {COUNTS.map(([key, label]) => (
          <div key={key}>
            <dt className="text-sm text-fg-secondary">{label}</dt>
            <dd className="text-2xl font-semibold text-fg">{profile[key]}</dd>
          </div>
        ))}
      </dl>
    </AppPanel>
  );
}
