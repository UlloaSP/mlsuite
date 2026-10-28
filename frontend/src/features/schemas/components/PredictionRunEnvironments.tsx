/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { runtimeEnvironmentQueryOptions } from "@/features/schemas/api/runtime-environment-queries";
import type {
  PredictionResultDto,
  RuntimeEnvironmentDto,
  SchemaModelBindingDto,
} from "@/shared/api/openapi.gen";

/** The packages that hold a model; the rest of an environment is their dependencies. */
const MODEL_LIBRARIES = new Set(["scikit-learn", "xgboost", "catboost", "onnxruntime"]);

type Props = {
  results: readonly Pick<PredictionResultDto, "id" | "modelId" | "environmentKey">[];
  bindings: readonly Pick<SchemaModelBindingDto, "modelId" | "modelName">[];
};

const describeEnvironment = (environment: RuntimeEnvironmentDto): string =>
  [
    `Python ${environment.pythonVersion}`,
    `mlbundle ${environment.writerVersion}`,
    ...environment.packages
      .filter((item) => MODEL_LIBRARIES.has(item.name))
      .map((item) => `${item.name} ${item.version}`),
    ...(environment.legacy ? ["legacy environment"] : []),
  ].join(" · ");

/**
 * The environment that computed each model's result. Results stored before environments name
 * none and show nothing.
 */
export function PredictionRunEnvironments({ results, bindings }: Props) {
  const computed = results.filter(
    (result): result is typeof result & { environmentKey: string } =>
      result.environmentKey !== null,
  );
  const keys = [...new Set(computed.map((result) => result.environmentKey))];
  const environments = useQueries({ queries: keys.map(runtimeEnvironmentQueryOptions) });
  if (computed.length === 0) return null;

  return (
    <ul aria-label="Environments" className="flex flex-col gap-1 text-xs text-fg-secondary">
      {computed.map((result) => {
        const query = environments[keys.indexOf(result.environmentKey)];
        const model =
          bindings.find((binding) => binding.modelId === result.modelId)?.modelName ??
          `Model ${result.modelId}`;
        return (
          <li key={result.id}>
            <span className="text-fg-muted">{model} ran in</span>{" "}
            {query?.data
              ? describeEnvironment(query.data)
              : query?.isError
                ? "an environment that could not be loaded"
                : "…"}
          </li>
        );
      })}
    </ul>
  );
}
