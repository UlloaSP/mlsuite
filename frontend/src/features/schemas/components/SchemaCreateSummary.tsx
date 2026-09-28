/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save, X } from "lucide-react";
import type { SelectedSchemaModel } from "@/features/schemas/lib/merge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppSpinner } from "@/shared/ui/AppSpinner";
import { AppSummaryRow } from "@/shared/ui/AppSummaryRow";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";

type Props = {
  busy: boolean;
  canSubmit: boolean;
  description: string;
  error?: string;
  fieldCount: number;
  name: string;
  reportCount: number;
  selected: SelectedSchemaModel[];
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onRemove: (modelId: string) => void;
};

const countClass = (value: number) =>
  value ? "font-semibold text-fg" : "font-normal text-fg-muted";

/** The schema's identity, what it will contain, and the create action. */
export function SchemaCreateSummary({
  busy,
  canSubmit,
  description,
  error,
  fieldCount,
  name,
  reportCount,
  selected,
  onDescriptionChange,
  onNameChange,
  onRemove,
}: Props) {
  return (
    <aside
      aria-label="New schema"
      className="flex w-full shrink-0 flex-col rounded-card border border-line bg-surface lg:w-80"
    >
      <div className="flex flex-col gap-4 border-b border-line p-5">
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-fg">Name</span>
          <AppTextField
            aria-label="Schema name"
            className="w-full"
            placeholder="e.g. Credit risk intake"
            required
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-fg">
            Description <span className="font-normal text-fg-muted">(optional)</span>
          </span>
          <AppTextArea
            aria-label="Schema description"
            className="w-full"
            placeholder="What this schema is for"
            rows={3}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </div>
      </div>

      <div className="border-b border-line px-5 py-3">
        <AppSummaryRow
          first
          label="Models"
          value={String(selected.length)}
          valueClass={countClass(selected.length)}
        />
        <AppSummaryRow
          label="Fields"
          value={String(fieldCount)}
          valueClass={countClass(fieldCount)}
        />
        <AppSummaryRow
          label="Reports"
          value={String(reportCount)}
          valueClass={countClass(reportCount)}
        />
      </div>

      <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {selected.length === 0 ? (
          <p className="py-2 text-xs text-fg-muted">Select at least one model.</p>
        ) : (
          <ul aria-label="Selected models" className="flex flex-col gap-1">
            {selected.map((item) => (
              <li key={item.modelId} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{item.modelName}</span>
                <AppButton
                  aria-label={`Remove ${item.modelName}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(String(item.modelId))}
                >
                  <X size={14} />
                </AppButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-line p-5">
        {error ? <AppInlineAlert>{error}</AppInlineAlert> : null}
        <AppButton className="w-full" type="submit" disabled={!canSubmit || busy}>
          {busy ? <AppSpinner size={14} /> : <Save size={14} />}
          {busy ? "Creating…" : "Create schema"}
        </AppButton>
      </div>
    </aside>
  );
}
