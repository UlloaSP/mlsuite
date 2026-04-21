type ExplainResponse = {
	explanations?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export default defineExplanationKind({
	kind: "mimosa",
	schema: z
		.object({
			kind: z.literal("mimosa"),
			id: z.string().optional(),
			label: z.string().optional(),
			description: z.string().optional(),
			endpoint: z.string().min(1).default("/api/analyzer/explain/by-id"),
			modelId: z.string().optional(),
		})
		.passthrough(),
	fetch: ({ config }) => ({
		submit: async (request) => {
			const modelId =
				config.modelId ??
				(typeof request.meta?.modelId === "string" ? request.meta.modelId : undefined);

			if (!modelId) {
				return {
					modelId: null,
					explanations: [],
					endpoint: config.endpoint,
					title: config.label ?? "Mimosa Explanation",
				};
			}

			const response = await fetch(
				`${config.endpoint}?modelId=${encodeURIComponent(modelId)}`,
				{
					method: "POST",
					signal: request.signal,
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						instance: request.serializedFieldValues ?? request.serializedValues ?? {},
						traces: [],
					}),
				},
			);

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const payload = (await response.json()) as ExplainResponse;
			const blocks = Array.isArray(payload.explanations)
				? payload.explanations.filter(
						(item): item is string => typeof item === "string" && item.trim().length > 0,
					)
				: [];

			return {
				modelId,
				explanations: blocks,
				endpoint: config.endpoint,
				title: config.label ?? "Mimosa Explanation",
			};
		},
	}),
	render: {
		summary: ({ config, state, result }) => {
			const payload = isRecord(result) ? result : null;
			const blocks = Array.isArray(payload?.explanations)
				? payload.explanations.filter(
						(item): item is string => typeof item === "string" && item.trim().length > 0,
					)
				: [];

			return {
				title: config.label ?? "Mimosa Explanation",
				description: config.description,
				value: blocks.length > 0 ? `${blocks.length} item(s)` : undefined,
				tone: state.status === "error" ? "danger" : "neutral",
			};
		},
		content: ({ state, result }) => {
			if (state.error) {
				return {
					type: "notice",
					title: "Explanation failed",
					body: state.error,
					tone: "danger",
				};
			}

			const payload = isRecord(result) ? result : null;
			const modelId =
				typeof payload?.modelId === "string" && payload.modelId.trim().length > 0
					? payload.modelId
					: null;
			const endpoint =
				typeof payload?.endpoint === "string" && payload.endpoint.trim().length > 0
					? payload.endpoint
					: "";
			const blocks = Array.isArray(payload?.explanations)
				? payload.explanations.filter(
						(item): item is string => typeof item === "string" && item.trim().length > 0,
					)
				: [];

			if (!modelId) {
				return {
					type: "notice",
					title: "Configuration required",
					body: "No modelId configured for custom explanation.",
					tone: "warning",
				};
			}

			if (blocks.length === 0) {
				return {
					type: "notice",
					title: "No explanations",
					body: "No explanations returned.",
					tone: "warning",
				};
			}

			return [
				{
					type: "kv",
					label: "Request context",
					entries: [
						{ label: "modelId", value: modelId },
						{ label: "endpoint", value: endpoint },
					],
				},
				{
					type: "list",
					label: "Explanations",
					items: blocks,
					ordered: true,
				},
			];
		},
	},
});
