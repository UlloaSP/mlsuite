/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, useState } from "react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import type { ModelInputRow } from "@/features/models/lib/model-schema-rows";

const TH = "px-4 py-2.5 text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary";

/** The form fields the bundle's schema gives the model, and what each one feeds. */
export function ModelInputsTab({ inputs }: { inputs: ModelInputRow[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return inputs;
    return inputs.filter((input) =>
      [input.label, input.kind, ...input.targets, ...input.options].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [inputs, query]);

  return (
    <div className="flex flex-col gap-4">
      <AppSearchField
        label="Search inputs"
        placeholder="Search by field, kind or feature"
        value={query}
        onChange={setQuery}
        className="w-full sm:w-96"
        count={{
          shown: shown.length,
          total: inputs.length,
          filtered: query.trim() !== "",
          noun: inputs.length === 1 ? "field" : "fields",
        }}
      />
      {shown.length > 0 ? (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-subtle">
                <th className={TH}>Field</th>
                <th className={TH}>Kind</th>
                <th className={TH}>Feeds</th>
                <th className={TH}>Training type</th>
                <th className={TH}>Required</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((input) => (
                <tr
                  key={`${input.label}-${input.targets.join()}`}
                  className="border-b border-line align-top last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{input.label}</p>
                    {input.options.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-fg-muted">
                        {input.options.join(", ")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <AppBadge>{input.kind}</AppBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs leading-5 text-fg-secondary">
                    {input.targets.join(", ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs leading-5 text-fg-secondary">
                    {input.dtypes.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{input.required ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AppEmptyState compact title={`No inputs match "${query.trim()}"`} />
      )}
    </div>
  );
}
