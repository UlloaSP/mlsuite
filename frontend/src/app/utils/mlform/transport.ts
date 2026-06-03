/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { type PredictionPayloadField, getBackendKey, isRecord } from "./shared";
import { normalizeAnalyzerPredictionResult } from "./analyzer-result-normalization";

const toAnalyzerPayload = (
  serializedValues: Record<string, unknown>,
  fields: readonly PredictionPayloadField[],
): Record<string, unknown> =>
  fields.reduce<Record<string, unknown>>((payload, field) => {
    if (shouldIncludeInAnalyzerPayload(field) && field.id in serializedValues) {
      payload[getBackendKey(field)] = serializedValues[field.id];
    }
    return payload;
  }, {});

const hasMappedOptions = (field: PredictionPayloadField): boolean =>
  Array.isArray((field as Record<string, unknown>).options) &&
  ((field as Record<string, unknown>).options as unknown[]).some(
    (option: unknown) => isRecord(option) && isRecord(option.mapping),
  );

const shouldIncludeInAnalyzerPayload = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false &&
  !(field.kind === "mapped-category" && hasMappedOptions(field));

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
