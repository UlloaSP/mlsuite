/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  getCustomFieldDefinitions,
  type CatalogFieldDefinition,
} from "../../plugin/custom-field-catalog";
import {
  getCustomReportDefinitions,
  type CatalogReportDefinition,
} from "../../plugin/custom-report-catalog";

/**
 * PredictionCatalogDefinitions: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: loads custom prediction field/report definitions from the plugin catalog.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PredictionCatalogDefinitions = {
  fieldDefinitions: readonly CatalogFieldDefinition[];
  reportDefinitions: readonly CatalogReportDefinition[];
};

/**
 * loadPredictionCatalogDefinitions: loads and caches async catalog data
 *
 * Purpose: loads custom prediction field/report definitions from the plugin catalog.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const loadPredictionCatalogDefinitions = async (): Promise<PredictionCatalogDefinitions> => {
  const [fieldDefinitions, reportDefinitions] = await Promise.all([
    getCustomFieldDefinitions(),
    getCustomReportDefinitions(),
  ]);
  return {
    fieldDefinitions,
    reportDefinitions,
  };
};
