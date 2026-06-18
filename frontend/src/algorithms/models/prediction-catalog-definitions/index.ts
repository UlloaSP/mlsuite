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

export type PredictionCatalogDefinitions = {
  fieldDefinitions: readonly CatalogFieldDefinition[];
  reportDefinitions: readonly CatalogReportDefinition[];
};

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
