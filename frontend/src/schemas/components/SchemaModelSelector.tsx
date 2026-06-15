/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Database } from "lucide-react";
import { AppBadge, AppCopy, AppPanel, AppSectionTitle, AppSelect, cx } from "../../app/components";
import type { ModelDto, SignatureDto } from "../../models/api/modelService";
import { getSignatures } from "../../models/api/modelService";
import { GET_SIGNATURES_QUERY_KEY } from "../../models/hooks";
import {
  getModelAlgorithmLabel,
  getSignatureVersionLabel,
  sortSignaturesByVersionDesc,
} from "../../models/utils";
import { chooseSchemaSignature } from "../schema-signature-selection";

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

export function SchemaModelSelector({ models, value, onChange }: Props) {
  const [signatureIdsByModel, setSignatureIdsByModel] = useState<Record<string, string>>({});
  const signatureQueries = useQueries({
    queries: models.map((model) => ({
      queryKey: GET_SIGNATURES_QUERY_KEY({ modelId: model.id }),
      queryFn: () => getSignatures({ modelId: model.id }),
      enabled: Boolean(model.id),
      placeholderData: [] as SignatureDto[],
    })),
  });

  const selectedIds = new Set(value.map((item) => item.modelId));
  const selectedByModel = new Map(value.map((item) => [item.modelId, item]));
  const preferredSignature = (modelId: string, signatures: SignatureDto[]): SignatureDto | null => {
    const sorted = sortSignaturesByVersionDesc(signatures);
    const preferredId = signatureIdsByModel[modelId] ?? selectedByModel.get(modelId)?.signatureId;
    return chooseSchemaSignature(sorted, preferredId);
  };
  const toggle = (model: ModelDto, signature: SignatureDto | null) => {
    if (!signature) return;
    if (selectedIds.has(model.id)) {
      onChange(value.filter((item) => item.modelId !== model.id));
      return;
    }
    onChange([...value, { modelId: model.id, signatureId: signature.id, signature }]);
  };
  const chooseSignature = (model: ModelDto, signatures: SignatureDto[], signatureId: string) => {
    const signature = signatures.find((item) => item.id === signatureId);
    if (!signature) return;
    setSignatureIdsByModel((current) => ({ ...current, [model.id]: signature.id }));
    if (!selectedIds.has(model.id)) return;
    onChange(
      value.map((item) =>
        item.modelId === model.id
          ? { modelId: model.id, signatureId: signature.id, signature }
          : item,
      ),
    );
  };

  return (
    <AppPanel className="flex size-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <AppSectionTitle>Models</AppSectionTitle>
          <AppCopy>
            Choose models. MLSuite builds one canonical schema from their signatures.
          </AppCopy>
        </div>
        <AppBadge tone={value.length > 0 ? "accent" : "neutral"}>{value.length} selected</AppBadge>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model, index) => {
            const signatures = sortSignaturesByVersionDesc(
              (signatureQueries[index]?.data ?? []) as SignatureDto[],
            );
            const signature = preferredSignature(model.id, signatures);
            const selected = selectedIds.has(model.id);
            return (
              <div
                key={model.id}
                className={cx(
                  "grid min-h-24 w-full gap-3 rounded-[22px] border p-4 shadow-[var(--shadow-card)] transition",
                  selected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-quiet)]"
                    : "border-[var(--border-soft)] bg-[var(--surface-primary)] hover:border-[var(--text-primary)]",
                  !signature && "cursor-not-allowed opacity-45",
                )}
              >
                <button
                  type="button"
                  disabled={!signature}
                  onClick={() => toggle(model, signature)}
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
                <div className="grid gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                  <span>Signature</span>
                  <AppSelect
                    aria-label={`Signature for ${model.name}`}
                    disabled={!signatures.length}
                    value={signature?.id ?? ""}
                    onValueChange={(signatureId) => chooseSignature(model, signatures, signatureId)}
                    className="h-10 w-full px-3 text-sm font-medium"
                    options={
                      signatures.length
                        ? signatures.map((item) => ({
                            value: item.id,
                            label: `${item.name} · ${getSignatureVersionLabel(item)}`,
                          }))
                        : [{ value: "", label: "No signatures" }]
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppPanel>
  );
}
