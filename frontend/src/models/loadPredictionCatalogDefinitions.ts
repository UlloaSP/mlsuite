/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  getActiveCustomFieldDefinitions,
  type CatalogFieldDefinition,
} from "../app/utils/mlform/custom-field";
import {
  getActiveCustomReportDefinitions,
  type CatalogReportDefinition,
} from "../app/utils/mlform/custom-report";

export type PredictionCatalogDefinitions = {
  fieldDefinitions: readonly CatalogFieldDefinition[];
  reportDefinitions: readonly CatalogReportDefinition[];
};

export const loadPredictionCatalogDefinitions = async (): Promise<PredictionCatalogDefinitions> => {
  const [fieldDefinitions, reportDefinitions] = await Promise.all([
    getActiveCustomFieldDefinitions(),
    getActiveCustomReportDefinitions(),
  ]);
  return {
    fieldDefinitions,
    reportDefinitions,
  };
};
