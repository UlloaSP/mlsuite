const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export default defineExplanationKind({
	kind: "habiba",
	schema: z
		.object({
			kind: z.literal("habiba"),
			id: z.string().optional(),
			label: z.string().optional(),
			description: z.string().optional(),
			endpoint: z.string().url().default("https://api.github.com/zen"),
		})
		.passthrough(),
	fetch: ({ config }) => ({
		submit: async (request) => {
			const response = await fetch(config.endpoint, {
				method: "GET",
				signal: request.signal,
				headers: {
					Accept: "application/vnd.github+json",
				},
			});

			if (!response.ok) {
				throw new Error(`GitHub Zen fetch failed: ${response.status}`);
			}

			const quote = (await response.text()).trim();

			return {
				quote,
				endpoint: config.endpoint,
				title: config.label ?? "Habibi Internet API",
			};
		},
	}),
	render: {
		summary: ({ config, state, result }) => {
			const payload = isRecord(result) ? result : null;
			const quote = typeof payload?.quote === "string" ? payload.quote : "";

			return {
				title: config.label ?? "Habibi Internet API",
				description:
					config.description ??
					"Source: external internet API (GitHub Zen endpoint).",
				badge: quote.length > 0 ? "LIVE" : undefined,
				tone: state.status === "error" ? "danger" : "info",
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
			const endpoint =
				typeof payload?.endpoint === "string" && payload.endpoint.trim().length > 0
					? payload.endpoint
					: "https://api.github.com/zen";
			const quote =
				typeof payload?.quote === "string" && payload.quote.trim().length > 0
					? payload.quote
					: null;

			if (!quote) {
				return {
					type: "notice",
					title: "No content",
					body: "GitHub Zen returned no text.",
					tone: "warning",
				};
			}

			return [
				{
					type: "kv",
					label: "Source",
					entries: [{ label: "Endpoint", value: endpoint }],
				},
				{
					type: "text",
					label: "Quote",
					value: quote,
					tone: "neutral",
				},
			];
		},
	},
});
