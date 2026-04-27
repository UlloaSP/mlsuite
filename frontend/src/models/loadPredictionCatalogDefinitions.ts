/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	getActiveCustomFieldDefinitions,
	type CatalogFieldDefinition,
} from "../app/utils/mlform/custom-field";
import {
	getActiveCustomExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../app/utils/mlform/custom-explanation";
import {
	getActiveCustomReportDefinitions,
	type CatalogReportDefinition,
} from "../app/utils/mlform/custom-report";

export type PredictionCatalogDefinitions = {
	fieldDefinitions: readonly CatalogFieldDefinition[];
	reportDefinitions: readonly CatalogReportDefinition[];
	explanationDefinitions: readonly CatalogExplanationDefinition[];
};

export const loadPredictionCatalogDefinitions = async (): Promise<PredictionCatalogDefinitions> => {
	const [fieldDefinitions, reportDefinitions, explanationDefinitions] = await Promise.all([
		getActiveCustomFieldDefinitions(),
		getActiveCustomReportDefinitions(),
		getActiveCustomExplanationDefinitions(),
	]);
	return {
		fieldDefinitions,
		reportDefinitions,
		explanationDefinitions,
	};
};
