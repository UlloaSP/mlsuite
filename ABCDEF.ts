type ChartPoint = {
	label: string;
	value: number;
	color: string;
};

const COLORS = ["#2563eb", "#0f766e", "#f97316", "#7c3aed", "#dc2626"];

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

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

const createPointsFromRequest = (ctx: any): ChartPoint[] => {
	const rawValues = ctx?.request?.serializedValues;
	const entries = Object.entries(
		rawValues && typeof rawValues === "object" ? rawValues : {},
	).slice(0, 5);

	const numericEntries = entries
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

export default async function renderExplanation(ctx: any) {
	await new Promise((resolve) => setTimeout(resolve, 180));

	if (ctx?.signal?.aborted) {
		throw new Error("Aborted");
	}

	const points = createPointsFromRequest(ctx);
	const maxValue = Math.max(...points.map((point) => point.value), 1);
	const bars = points
		.map((point, index) => {
			const x = 36 + index * 88;
			const height = Math.round((point.value / maxValue) * 122);
			const y = 156 - height;
			const safeLabel = escapeHtml(point.label.slice(0, 14));
			return `
				<g>
					<rect x="${x}" y="${y}" width="42" height="${height}" rx="12" fill="${point.color}" opacity="0.92" />
					<text x="${x + 21}" y="176" text-anchor="middle" fill="#475569" font-size="11" font-family="ui-monospace, SFMono-Regular, monospace">${safeLabel}</text>
					<text x="${x + 21}" y="${y - 10}" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif">${point.value}%</text>
				</g>
			`;
		})
		.join("");

	const legend = points
		.map(
			(point) =>
				`<span style="display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(148,163,184,0.24);border-radius:999px;padding:6px 10px;background:#ffffff;">
					<span style="width:10px;height:10px;border-radius:999px;background:${point.color};display:inline-block;"></span>
					<span>${escapeHtml(point.label)} ${point.value}%</span>
				</span>`,
		)
		.join("");

	return {
		title: "ABCDEF Mock Chart",
		html: `
			<section style="display:grid;gap:16px;padding:18px;border-radius:20px;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 52%,#fff7ed 100%);border:1px solid rgba(148,163,184,0.24);box-shadow:0 18px 44px rgba(15,23,42,0.08);">
				<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
					<div>
						<div style="font:700 13px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.22em;text-transform:uppercase;color:#2563eb;">Mock explanation</div>
						<h3 style="margin:8px 0 0;font:700 24px/1.1 ui-serif,Georgia,serif;color:#0f172a;">Prediction shape</h3>
						<p style="margin:8px 0 0;font:400 13px/1.6 ui-sans-serif,system-ui,sans-serif;color:#475569;">No backend explanation needed. Custom file paints synthetic bars from request values.</p>
					</div>
					<div style="padding:8px 12px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font:700 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:0.2em;text-transform:uppercase;">active mock</div>
				</div>
				<svg viewBox="0 0 420 190" width="100%" height="220" role="img" aria-label="Mock explanation chart">
					<line x1="24" y1="156" x2="404" y2="156" stroke="#cbd5e1" stroke-width="2" />
					<line x1="24" y1="28" x2="24" y2="156" stroke="#e2e8f0" stroke-width="2" />
					${bars}
				</svg>
				<div style="display:flex;flex-wrap:wrap;gap:10px;font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;color:#334155;">${legend}</div>
			</section>
		`,
		blocks: [
			`Mock renderer active for report ${ctx?.request?.reportId ?? "unknown"}.`,
			`Series size ${points.length}. SVG built inside custom explanation file.`,
			"Behavior mocked. No analyzer explanation fetch required.",
		],
		emptyText: "No mock chart data available.",
	};
}
