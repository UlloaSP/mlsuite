/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import { type PredictionPayloadField, isRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import { normalizeAnalyzerPredictionResult } from "../../../algorithms/mlform/analyzer-result-normalization";

const optionTarget = (option: unknown): string | undefined =>
  isRecord(option) ? targetKey(mappedTarget(option.mappedTo)) : undefined;

const optionValue = (option: unknown): unknown =>
  isRecord(option) ? (option.value ?? option.label) : undefined;

const appendOneHotValues = (
  payload: Record<string, unknown>,
  field: PredictionPayloadField,
  serializedValues: Record<string, unknown>,
): boolean => {
  if (field.kind !== "onehot-category" || !Array.isArray(field.options)) return false;
  const selected = serializedValues[field.id];
  field.options.forEach((option) => {
    const target = optionTarget(option);
    if (!target) return;
    payload[target] =
      target in serializedValues
        ? serializedValues[target]
        : String(optionValue(option)) === String(selected)
          ? 1
          : 0;
  });
  return true;
};

export const toAnalyzerPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): Record<string, unknown> =>
  fields.reduce<Record<string, unknown>>((payload, field) => {
    if (appendOneHotValues(payload, field, serializedValues)) return payload;
    if (shouldIncludeInAnalyzerPayload(field) && field.id in serializedValues) {
      const target = targetKey(mappedTarget(field.mappedTo));
      if (target) payload[target] = serializedValues[field.id];
    }
    return payload;
  }, {});

const shouldIncludeInAnalyzerPayload = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false;

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const createPredictionTransport = (
  modelId: string,
  fields: readonly PredictionPayloadField[],
): Transport => ({
  async submit(request: SubmitRequest) {
    const payload = toAnalyzerPayload(request.serializedValues, fields);
    const formData = new FormData();
    formData.set(
      "data",
      new File([JSON.stringify(payload)], "data.json", {
        type: "application/json",
      }),
    );

    const response = await fetch(
      `${getBackendBaseUrl()}/api/analyzer/predictions?modelId=${modelId}`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );

    const parsed = await parseResponse(response);

    if (!response.ok) {
      const message =
        isRecord(parsed) && typeof parsed.message === "string"
          ? parsed.message
          : response.statusText || "Prediction request failed.";
      throw new Error(message);
    }

    const normalized = normalizeAnalyzerPredictionResult({
      parsed,
      modelId,
      modelInput: payload,
      reports: request.reports,
    });

    return {
      reports: normalized.reports,
      meta: normalized.meta,
      raw: normalized.raw,
    };
  },
});
