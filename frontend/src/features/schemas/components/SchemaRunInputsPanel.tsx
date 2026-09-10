/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppTextField } from "@/shared/ui/AppTextField";
import {
  formatDisplayValue,
  getVisibleSchemaInputs,
} from "@/capabilities/prediction-runtime/data/input-display";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

type Props = {
  schema: unknown;
  inputData: JsonRecord;
};

export function SchemaRunInputsPanel({ schema, inputData }: Props) {
  const [query, setQuery] = useState("");
  const inputs = useMemo(() => getVisibleSchemaInputs(schema, inputData), [inputData, schema]);
  const filteredInputs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return inputs;
    return inputs.filter((input) =>
      [input.key, input.label, formatDisplayValue(input.value)].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [inputs, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AppTextField
          aria-label="Search inputs"
          placeholder="Search inputs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<Search size={16} />}
          className="w-full sm:w-72"
        />
      </div>
      {filteredInputs.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredInputs.map((input) => (
            <div key={input.key} className="rounded bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {input.label}
              </p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                {formatDisplayValue(input.value)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <AppCopy>{`No inputs match "${query.trim()}".`}</AppCopy>
      )}
    </div>
  );
}
