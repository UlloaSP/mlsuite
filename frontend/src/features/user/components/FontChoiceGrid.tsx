/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppChoiceCard } from "@/shared/ui/AppChoiceCard";

type FontOption<T extends string> = { value: T; label: string; stack: string };

export function FontChoiceGrid<T extends string>({
  fonts,
  name,
  sample,
  value,
  onChange,
}: {
  fonts: readonly FontOption<T>[];
  name: string;
  sample: string;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fonts.map((font) => (
        <AppChoiceCard
          key={font.value}
          checked={value === font.value}
          className="min-w-0"
          label={font.label}
          name={name}
          value={font.value}
          onChange={() => onChange(font.value)}
        >
          <span className="min-w-0 text-center text-fg" style={{ fontFamily: font.stack }}>
            <span className="block text-3xl font-semibold leading-none">Aa</span>
            <span className="mt-2 block truncate text-xs text-fg-secondary">{sample}</span>
          </span>
        </AppChoiceCard>
      ))}
    </div>
  );
}
