/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { formatDisplayValue, getVisibleSchemaInputs } from "@/capabilities/prediction-runtime/data/input-display";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

type Props = {
  schema: unknown;
  inputData: JsonRecord;
  open?: boolean;
  onToggle?: () => void;
};

export function SchemaRunInputsPanel({ schema, inputData, open = true, onToggle }: Props) {
  const inputs = getVisibleSchemaInputs(schema, inputData);
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Inputs</AppSectionTitle>
          <AppCopy>Visible values provided by user.</AppCopy>
        </div>
        {onToggle ? open ? <ChevronUp size={18} /> : <ChevronDown size={18} /> : null}
      </button>
      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          {inputs.map((input) => (
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
      ) : null}
    </AppPanel>
  );
}
