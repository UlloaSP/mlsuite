type ExplainResponse = {
	explanations?: unknown;
};

export default async function renderExplanation(ctx: {
	modelId: string;
	instance: Record<string, unknown>;
	signal: AbortSignal;
	fetchJson: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}) {
	const response = await ctx.fetchJson<ExplainResponse>(
		`/api/analyzer/explain/by-id?modelId=${encodeURIComponent(ctx.modelId)}`,
		{
			method: "POST",
			signal: ctx.signal,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				instance: ctx.instance,
				traces: [],
			}),
		},
	);

	const blocks = Array.isArray(response.explanations)
		? response.explanations.filter(
				(item): item is string => typeof item === "string" && item.trim().length > 0,
			)
		: [];

	return {
		blocks,
	};
}
