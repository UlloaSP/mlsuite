/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import type { FeatureImportanceDto } from "@/shared/api/openapi.gen";

const COLLAPSED_ROWS = 12;
const VALUE_FORMAT = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 });

/**
 * Features ranked by importance. Libraries state importances on their own scales, so bars
 * compare features of this model with each other and the figure is shown as the model gave it.
 */
export function FeatureImportanceChart({ importances }: { importances: FeatureImportanceDto[] }) {
  const [expanded, setExpanded] = useState(false);
  const ranked = useMemo(
    () => [...importances].sort((left, right) => right.importance - left.importance),
    [importances],
  );
  const largest = Math.max(...ranked.map((item) => Math.abs(item.importance)), 0);
  const shown = expanded ? ranked : ranked.slice(0, COLLAPSED_ROWS);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2.5">
        {shown.map((item) => (
          <li
            key={item.feature}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1"
          >
            <span className="min-w-0 break-words text-sm text-fg">{item.feature}</span>
            <span className="font-mono text-xs tabular-nums text-fg-secondary">
              {VALUE_FORMAT.format(item.importance)}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <span
                className="block h-full rounded-full bg-chart-1"
                style={{
                  width: `${largest > 0 ? (Math.abs(item.importance) / largest) * 100 : 0}%`,
                }}
              />
            </span>
          </li>
        ))}
      </ol>
      {ranked.length > COLLAPSED_ROWS ? (
        <AppButton
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? `Show top ${COLLAPSED_ROWS}` : `Show all ${ranked.length}`}
        </AppButton>
      ) : null}
    </div>
  );
}
