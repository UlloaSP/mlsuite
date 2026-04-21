type ChartPoint = {
	label: string;
	value: number;
	color: string;
};

const COLORS = ["#2563eb", "#0f766e", "#f97316", "#7c3aed", "#dc2626"];

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const toFiniteNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
};

const createDefaultPoints = (): ChartPoint[] => [
	{ label: "petal_length", value: 92, color: COLORS[0] },
	{ label: "sepal_width", value: 64, color: COLORS[1] },
	{ label: "petal_width", value: 37, color: COLORS[2] },
	{ label: "sepal_length", value: 81, color: COLORS[3] },
];

const createPointsFromValues = (values: Record<string, unknown>): ChartPoint[] => {
	const numericEntries = Object.entries(values)
		.slice(0, 5)
		.map(([label, value]) => ({
			label,
			value: toFiniteNumber(value),
		}))
		.filter((entry): entry is { label: string; value: number } => entry.value !== null);

	if (numericEntries.length === 0) {
		return createDefaultPoints();
	}

	const maxValue = Math.max(...numericEntries.map((entry) => Math.abs(entry.value)), 1);

	return numericEntries.map((entry, index) => ({
		label: entry.label,
		value: clamp(Math.round((Math.abs(entry.value) / maxValue) * 100), 18, 100),
		color: COLORS[index % COLORS.length],
	}));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isChartPoint = (value: unknown): value is ChartPoint =>
	isRecord(value) &&
	typeof value.label === "string" &&
	typeof value.value === "number" &&
	Number.isFinite(value.value) &&
	typeof value.color === "string";

const toChartPoints = (value: unknown): ChartPoint[] => {
	if (!isRecord(value) || !Array.isArray(value.points)) {
		return [];
	}

	return value.points.filter(isChartPoint);
};

export default defineExplanationKind({
	kind: "abcdef",
	schema: z
		.object({
			kind: z.literal("abcdef"),
			id: z.string().optional(),
			label: z.string().optional(),
			description: z.string().optional(),
		})
		.passthrough(),
	fetch: ({ config }) => ({
		submit: async (request) => {
			await new Promise((resolve) => setTimeout(resolve, 180));

			if (request.signal.aborted) {
				throw new Error("Aborted");
			}

			const values =
				request.serializedValues && typeof request.serializedValues === "object"
					? request.serializedValues
					: {};
			const points = createPointsFromValues(values);

			return {
				points,
				reportId: String(request.meta?.reportId ?? "unknown"),
				title: config.label ?? "ABCDEF Mock Chart",
			};
		},
	}),
	render: {
		summary: ({ config, state, result }) => {
			const points = toChartPoints(result);
			return {
				title: config.label ?? "ABCDEF Mock Chart",
				description:
					config.description ??
					"Synthetic explanation profile generated from submitted values.",
				value: points.length > 0 ? `${points.length} series` : undefined,
				badge: state.status === "done" ? "ACTIVE MOCK" : undefined,
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

			const points = toChartPoints(result);
			if (points.length === 0) {
				return {
					type: "notice",
					title: "No mock chart data",
					body: "No synthetic chart points could be generated for this submission.",
					tone: "warning",
				};
			}

			const payload = isRecord(result) ? result : null;
			const reportId =
				typeof payload?.reportId === "string" && payload.reportId.trim().length > 0
					? payload.reportId
					: "unknown";
			const topPoint = points.reduce((best, point) =>
				point.value > best.value ? point : best,
			);

			return [
				{
					type: "kv",
					label: "Run context",
					entries: [
						{ label: "Report", value: reportId },
						{ label: "Series", value: points.length },
					],
				},
				{
					type: "metric",
					label: "Top feature",
					value: `${topPoint.label} (${topPoint.value}%)`,
					hint: "Highest normalized synthetic contribution.",
					tone: "info",
				},
				{
					type: "table",
					label: "Normalized feature impact",
					columns: ["feature", "value", "color"],
					rows: points.map((point) => ({
						feature: point.label,
						value: `${point.value}%`,
						color: point.color,
					})),
				},
				{
					type: "list",
					label: "Series detail",
					items: points.map((point) => `${point.label}: ${point.value}%`),
				},
			];
		},
	},
});
