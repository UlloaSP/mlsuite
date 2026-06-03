/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { Check, Database } from "lucide-react";
import { AppBadge } from "../../app/components/ui-controls";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";
import { cx } from "../../app/components/ui-utils";
import type { ModelDto, SignatureDto } from "../../models/api/modelService";
import { getSignatures } from "../../models/api/modelService";
import { GET_SIGNATURES_QUERY_KEY } from "../../models/hooks";
import { getModelAlgorithmLabel, getSignatureVersionLabel } from "../../models/utils";

type Selection = {
  modelId: string;
  signatureId: string;
  signature: SignatureDto;
};

type Props = {
  models: ModelDto[];
  value: Selection[];
  onChange: (value: Selection[]) => void;
};

const selectedSignature = (signatures: SignatureDto[]): SignatureDto | null =>
  signatures.length > 0 ? signatures[0] : null;

export function SchemaModelSelector({ models, value, onChange }: Props) {
  const signatureQueries = useQueries({
    queries: models.map((model) => ({
      queryKey: GET_SIGNATURES_QUERY_KEY({ modelId: model.id }),
      queryFn: () => getSignatures({ modelId: model.id }),
      enabled: Boolean(model.id),
      placeholderData: [] as SignatureDto[],
    })),
  });

  const selectedIds = new Set(value.map((item) => item.modelId));
  const toggle = (model: ModelDto, signature: SignatureDto | null) => {
    if (!signature) return;
    if (selectedIds.has(model.id)) {
      onChange(value.filter((item) => item.modelId !== model.id));
      return;
    }
    onChange([...value, { modelId: model.id, signatureId: signature.id, signature }]);
  };

  return (
    <AppPanel className="flex size-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <AppSectionTitle>Models</AppSectionTitle>
          <AppCopy>Choose models. MLSuite builds one canonical schema from their signatures.</AppCopy>
        </div>
        <AppBadge tone={value.length > 0 ? "accent" : "neutral"}>{value.length} selected</AppBadge>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model, index) => {
            const signatures = (signatureQueries[index]?.data ?? []) as SignatureDto[];
            const signature = selectedSignature(signatures);
            const selected = selectedIds.has(model.id);
            return (
              <button
                key={model.id}
                type="button"
                disabled={!signature}
                onClick={() => toggle(model, signature)}
                className={cx(
                  "grid min-h-24 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border p-4 text-left shadow-[var(--shadow-card)] transition",
                  selected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-quiet)]"
                    : "border-[var(--border-soft)] bg-[var(--surface-primary)] hover:border-[var(--text-primary)]",
                  !signature && "cursor-not-allowed opacity-45",
                )}
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--accent-primary)]">
                  <Database size={17} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{model.name}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {signature ? getSignatureVersionLabel(signature) : "No signature available"} ·{" "}
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
            );
          })}
        </div>
      </div>
    </AppPanel>
  );
}
