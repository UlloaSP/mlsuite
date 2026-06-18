/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest, Transport } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import { type PredictionPayloadField, isRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import { normalizeAnalyzerPredictionResult } from "../../../algorithms/mlform/analyzer-result-normalization";

/** optionTarget: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const optionTarget = (option: unknown): string | undefined =>
  isRecord(option) ? targetKey(mappedTarget(option.mappedTo)) : undefined;

/** optionValue: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const optionValue = (option: unknown): unknown =>
  isRecord(option) ? (option.value ?? option.label) : undefined;

/** appendOneHotValues: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/**
 * toAnalyzerPayload: converts data into another contract shape
 *
 * Purpose: adapts legacy prediction form submissions to analyzer API requests.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
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

/** shouldIncludeInAnalyzerPayload: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const shouldIncludeInAnalyzerPayload = (field: PredictionPayloadField): boolean =>
  field.includeInSubmission !== false;

/** parseResponse: internal normalization helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/**
 * createPredictionTransport: creates a configured runtime object or schema object
 *
 * Purpose: adapts legacy prediction form submissions to analyzer API requests.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: May create network-capable runtime objects; validation happens before requests where possible.
 */
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
