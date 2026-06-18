/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type PredictionOutput = {
  type?: string;
  probabilities?: number[][];
  mapping?: Array<string | number>;
  values?: Array<string | number>;
};

export type DerivedPredictionTarget = {
  order: number;
  value: unknown;
};

const asOutput = (value: Record<string, unknown>): PredictionOutput | null => {
  const outputs = value.outputs;
  if (!Array.isArray(outputs) || outputs.length === 0) {
    return null;
  }
  const first = outputs[0];
  return typeof first === "object" && first !== null ? (first as PredictionOutput) : null;
};

const getTargetClassLabel = (
  schemaDefinition: unknown,
  order: number,
  classIndex: number,
): string | null => {
  if (
    typeof schemaDefinition !== "object" ||
    schemaDefinition === null ||
    !Array.isArray((schemaDefinition as { reports?: unknown }).reports)
  ) {
    return null;
  }
  const report = (schemaDefinition as { reports: unknown[] }).reports[order];
  if (
    typeof report !== "object" ||
    report === null ||
    !Array.isArray((report as { labels?: unknown }).labels)
  ) {
    return null;
  }
  const label = (report as { labels: unknown[] }).labels[classIndex];
  return typeof label === "string" ? label : null;
};

export function derivePredictionTargets(
  prediction: Record<string, unknown>,
  schemaDefinition: unknown,
): DerivedPredictionTarget[] {
  const output = asOutput(prediction);
  if (!output) {
    return [];
  }

  if (output.type === "classifier" && Array.isArray(output.probabilities)) {
    return output.probabilities.map((target, index) => {
      const maxIndex = target.indexOf(Math.max(...target));
      return {
        order: index,
        value: {
          value:
            getTargetClassLabel(schemaDefinition, index, maxIndex) ??
            output.mapping?.[maxIndex] ??
            maxIndex,
          classIndex: maxIndex,
          probability: target[maxIndex],
        },
      };
    });
  }

  if (output.type === "regressor" && Array.isArray(output.values)) {
    return output.values.map((target, index) => ({
      order: index,
      value: target,
    }));
  }

  return [];
}
