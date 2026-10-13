/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, useState } from "react";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import type { ModelParameter } from "@/features/models/lib/model-manifest";

/** The parameters the model itself reports, grouped by the step or family they belong to. */
export function ModelParametersTab({ parameters }: { parameters: ModelParameter[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return parameters;
    return parameters.filter((parameter) =>
      [parameter.group, parameter.name, parameter.value].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [parameters, query]);
  const groups = useMemo(() => {
    const byGroup = new Map<string, ModelParameter[]>();
    for (const parameter of shown) {
      byGroup.set(parameter.group, [...(byGroup.get(parameter.group) ?? []), parameter]);
    }
    return [...byGroup.entries()];
  }, [shown]);

  if (parameters.length === 0) {
    return (
      <AppEmptyState
        compact
        title="No parameters"
        description="The model reports none that survive in its bundle."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AppSearchField
        label="Search parameters"
        placeholder="Search by name or value"
        value={query}
        onChange={setQuery}
        className="w-full sm:w-96"
        count={{
          shown: shown.length,
          total: parameters.length,
          filtered: query.trim() !== "",
          noun: parameters.length === 1 ? "parameter" : "parameters",
        }}
      />
      {groups.length > 0 ? (
        groups.map(([group, items]) => (
          <section key={group} className="flex flex-col gap-2">
            <h2 className="font-mono text-sm font-semibold text-fg">{group}</h2>
            <dl className="grid gap-x-10 border-b border-line lg:grid-cols-2">
              {items.map((parameter) => (
                <div
                  key={parameter.name}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-t border-line py-2"
                >
                  <dt className="min-w-0 break-words font-mono text-xs leading-5 text-fg-secondary">
                    {parameter.name}
                  </dt>
                  <dd className="min-w-0 break-words font-mono text-xs leading-5 text-fg">
                    {parameter.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      ) : (
        <AppEmptyState compact title={`No parameters match "${query.trim()}"`} />
      )}
    </div>
  );
}
