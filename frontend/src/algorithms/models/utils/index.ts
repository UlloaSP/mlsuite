/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ModelDto } from "../../../models/api/modelService";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toIdString = (value: unknown): string => String(value ?? "");
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

export const toTimestampMillis = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const formatTimestamp = (value: string): string => {
  const timestamp = toTimestampMillis(value);
  return timestamp === 0 ? value : dateTimeFormatter.format(timestamp);
};

export const findModelById = (models: ModelDto[], modelId?: string): ModelDto | undefined =>
  models.find((model) => toIdString(model.id) === toIdString(modelId));

const getModelTypeLabel = (type: string): string => {
  switch (type) {
    case "classifier":
      return "Classifier";
    case "regressor":
      return "Regressor";
    default:
      return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : "Model";
  }
};

export const getModelAlgorithmLabel = (model: Pick<ModelDto, "type" | "specificType">): string =>
  `${getModelTypeLabel(model.type)} - ${model.specificType}`;

export const getPredictionOutputs = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.outputs)) {
    return [];
  }

  return value.outputs.filter(isRecord);
};

export const getPredictionShortId = (id: unknown): string => {
  const normalized = toIdString(id);
  return normalized.length <= 8 ? normalized : normalized.slice(0, 8);
};

export const getPredictionExecutionTime = (value: unknown): number | null => {
  const outputs = getPredictionOutputs(value);
  const executionTime = outputs[0]?.execution_time;
  return typeof executionTime === "number" ? executionTime : null;
};

export const formatExecutionTime = (time: number | null): string => {
  if (time === null) {
    return "N/A";
  }

  if (time < 1000) {
    return `${time.toFixed(2)} ms`;
  }

  if (time < 60000) {
    return `${(time / 1000).toFixed(2)} s`;
  }

  if (time < 3600000) {
    return `${(time / 60000).toFixed(2)} min`;
  }

  return `${(time / 3600000).toFixed(2)} h`;
};
