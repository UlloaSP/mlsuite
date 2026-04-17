/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

export interface ExplainRequest {
	modelId: string;
	instance: Record<string, unknown>;
	traces: [];
	signal?: AbortSignal;
}

export interface ExplainResponse {
	explanations: string[];
}

export const explainByModelId = async ({
	modelId,
	instance,
	traces,
	signal,
}: ExplainRequest): Promise<ExplainResponse> =>
	appFetch<ExplainResponse>(
		`/api/analyzer/explain/by-id?modelId=${encodeURIComponent(modelId)}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal,
			body: JSON.stringify({
				instance,
				traces,
			}),
		},
	);
