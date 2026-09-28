/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type ModelLabelSource = {
  type: string;
  specificType: string;
};

const toIdString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

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

export const getModelAlgorithmLabel = (model: ModelLabelSource): string =>
  `${getModelTypeLabel(model.type)} - ${model.specificType}`;

export const getPredictionShortId = (id: unknown): string => {
  const normalized = toIdString(id);
  return normalized.length <= 8 ? normalized : normalized.slice(0, 8);
};
