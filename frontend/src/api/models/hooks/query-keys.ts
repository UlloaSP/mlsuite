/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const GET_MODELS_QUERY_KEY = ["getModels"] as const;
export const MODEL_CATALOG_PAGE_SIZE = 24;
export const MODEL_CATALOG_PAGE_QUERY_KEY = ["modelCatalogPages"] as const;
export const INSPECT_ARTIFACT_QUERY_KEY = ["inspectArtifact"] as const;
export const MATCH_ARTIFACTS_QUERY_KEY = ["matchArtifacts"] as const;
export const CREATE_MODEL_QUERY_KEY = ["createModel"] as const;

export const modelCatalogPageQueryKey = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => [
  ...MODEL_CATALOG_PAGE_QUERY_KEY,
  organizationId ?? "none",
  page,
  MODEL_CATALOG_PAGE_SIZE,
  search,
  sort,
  status,
];
