type ExplainResponse = {
	explanations?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const stripTreeToken = (value: string): string =>
	value
		.trim()
		.replace(/^[*\d.)\-\s]+/, "")
		.replace(/^[|_\\/\->:\s]+/, "")
		.trim();

const formatExplanationTree = (value: string): string => {
	const parts = value
		.split(/(?:\s*\|\s*){2,}/)
		.map((part) => stripTreeToken(part))
		.filter((part) => part.length > 0);

	if (parts.length === 0) {
		return value.trim();
	}

	if (parts.length === 1) {
		return parts[0];
	}

	return parts
		.map((part, index) => {
			if (index === 0) {
				return part;
			}

			const indent = "  ".repeat(index - 1);
			const branch = index === parts.length - 1 ? "└─" : "├─";
			return `${indent}${branch} ${part}`;
		})
		.join("\n");
};

export default defineExplanationKind({
	kind: "Crystal Tree",
	schema: z
		.object({
			kind: z.literal("Crystal Tree"),
			id: z.string().optional(),
			label: z.string().optional(),
			description: z.string().optional(),
			chromeless: z.boolean().default(true),
			endpoint: z.string().min(1).default("/api/analyzer/explain/by-id"),
			modelId: z.string().optional(),
		})
		.passthrough(),
	feedbackQuestionnaire: createQuestionnaireSchema({
		steps: [
			{
				title: "Explanation Feedback",
				description: "Rate clarity, usefulness, and trust.",
				fields: [
					{
						kind: "rating",
						label: "Clarity",
						max: 5,
					},
					{
						kind: "rating",
						label: "Usefulness",
						max: 5,
					},
					{
						kind: "rating",
						label: "Trust",
						max: 5,
					},
				],
			},
		],
	}),
	fetch: ({ config }) => ({
		submit: async (request) => {
			const modelId =
				config.modelId ??
				(typeof request.meta?.modelId === "string" ? request.meta.modelId : undefined);
			// Inestable y temporal: plugin reads backend base URL from transport `meta`
			// until explanation plugins get an explicit API-origin contract.
			const backendUrl =
				typeof request.meta?.backendUrl === "string" ? request.meta.backendUrl : undefined;

			if (!modelId) {
				return {
					modelId: null,
					explanations: [],
					endpoint: config.endpoint,
					title: config.label ?? "Mimosa Explanation",
				};
			}

			const endpoint = backendUrl
				? new URL(config.endpoint, backendUrl).toString()
				: config.endpoint;

			const response = await fetch(
				`${endpoint}?modelId=${encodeURIComponent(modelId)}`,
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
				endpoint,
				title: config.label ?? "Mimosa Explanation",
			};
		},
	}),
	render: {
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

			const tree = blocks.map((block) => formatExplanationTree(block)).join("\n\n");

			return {
				type: "text",
				value: tree,
			};
		},
	},
});
