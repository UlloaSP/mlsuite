/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { formatDisplayValue, getVisibleSchemaInputs } from "../schema-run-display";
import type { JsonRecord } from "../types";

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
          <AppSectionTitle>Input Features</AppSectionTitle>
          <AppCopy>Visible values provided by user.</AppCopy>
        </div>
        {onToggle ? open ? <ChevronUp size={18} /> : <ChevronDown size={18} /> : null}
      </button>
      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          {inputs.map((input) => (
            <div key={input.key} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
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
