/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, Database } from "lucide-react";
import { AppBadge, AppCopy, AppPanel, AppSectionTitle, cx } from "../../app/components";
import { isRecord } from "../../algorithms/mlform/shared";
import type { ModelDto } from "../../api/models/services";
import { getModelAlgorithmLabel } from "../../algorithms/models/utils";

type Selection = {
  modelId: string;
  modelName: string;
  model: ModelDto;
};

type Props = {
  models: ModelDto[];
  value: Selection[];
  onChange: (value: Selection[]) => void;
};

export function SchemaModelSelector({ models, value, onChange }: Props) {
  const selectedIds = new Set(value.map((item) => item.modelId));
  const hasSchema = (model: ModelDto) =>
    isRecord(model.inputSchema) && Array.isArray(model.inputSchema.fields);
  const toggle = (model: ModelDto) => {
    if (!hasSchema(model)) return;
    if (selectedIds.has(model.id)) {
      onChange(value.filter((item) => item.modelId !== model.id));
      return;
    }
    onChange([...value, { modelId: model.id, modelName: model.name, model }]);
  };

  return (
    <AppPanel className="flex size-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <AppSectionTitle>Models</AppSectionTitle>
          <AppCopy>
            Choose one or more models. MLSuite uses each generated schema snapshot.
          </AppCopy>
        </div>
        <AppBadge tone={value.length > 0 ? "accent" : "neutral"}>{value.length} selected</AppBadge>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => {
            const available = hasSchema(model);
            const selected = selectedIds.has(model.id);
            return (
              <div
                key={model.id}
                className={cx(
                  "grid min-h-24 w-full gap-3 rounded-[22px] border p-4 shadow-[var(--shadow-card)] transition",
                  selected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-quiet)]"
                    : "border-[var(--border-soft)] bg-[var(--surface-primary)] hover:border-[var(--text-primary)]",
                  !available && "cursor-not-allowed opacity-45",
                )}
              >
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => toggle(model)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent-primary)]">
                    <Database size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {model.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {available ? "Schema available" : "No schema available"} ·{" "}
                      {getModelAlgorithmLabel(model)}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "grid size-8 place-items-center rounded-full border",
                      selected
                        ? "border-transparent bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "border-[var(--border-soft)] text-transparent",
                    )}
                  >
                    <Check size={15} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppPanel>
  );
}
