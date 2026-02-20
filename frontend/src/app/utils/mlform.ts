/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MLForm } from "mlform";

import {
	BooleanStrategy,
	CategoryStrategy,
	ClassifierStrategy,
	DateStrategy,
	NumberStrategy,
	RegressorStrategy,
	TextStrategy,
} from "mlform/strategies";

export function initMLForm(modelId: string) {
	const mlform = new MLForm(
		`${import.meta.env.VITE_BACKEND_URL}/api/analyzer/predict/by-id?modelId=${modelId}`,
	);

	mlform.register(new DateStrategy());
	mlform.register(new RegressorStrategy());
	mlform.register(new ClassifierStrategy());
	mlform.register(new NumberStrategy());
	mlform.register(new TextStrategy());
	mlform.register(new CategoryStrategy());
	mlform.register(new BooleanStrategy());

	return mlform;
}
