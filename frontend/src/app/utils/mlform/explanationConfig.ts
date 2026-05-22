/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  ExplanationConfig,
  ExplanationFetchRequest,
  NormalizedExplanationConfig,
} from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { isRecord } from "./shared";

export const toBackendPatchedRequest = (
  request: ExplanationFetchRequest,
): ExplanationFetchRequest => {
  const backendFieldValues = isRecord(request.meta.backendFieldValues)
    ? request.meta.backendFieldValues
    : null;

  if (!backendFieldValues) {
    return request;
  }

  return {
    ...request,
    values: backendFieldValues,
    fieldValues: backendFieldValues,
    serializedValues: backendFieldValues,
    serializedFieldValues: backendFieldValues,
  };
};

export const normalizeExplanationConfig = <TConfig extends ExplanationConfig>(
  config: NormalizedExplanationConfig<TConfig>,
): NormalizedExplanationConfig<TConfig> => {
  const endpoint = (config as Record<string, unknown>).endpoint;
  const backendUrl = getBackendBaseUrl();

  if (
    typeof endpoint !== "string" ||
    endpoint.trim().length === 0 ||
    typeof backendUrl !== "string" ||
    backendUrl.trim().length === 0 ||
    !/^(?:\/|\.\/|\.\.\/)/.test(endpoint)
  ) {
    return config;
  }

  return {
    ...config,
    endpoint: new URL(endpoint, backendUrl).toString(),
  };
};
