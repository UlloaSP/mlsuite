const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

export default async function renderExplanation(ctx: {
	request: { reportId?: string };
	signal: AbortSignal;
}) {
	const response = await fetch("https://api.github.com/zen", {
		method: "GET",
		signal: ctx.signal,
		headers: {
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub Zen fetch failed: ${response.status}`);
	}

	const quote = (await response.text()).trim();

	return {
		title: "Habibi Internet API",
		blocks: [
			"Source: external internet API.",
			"Endpoint: https://api.github.com/zen",
			`Quote: ${quote}`,
		],
		emptyText: "GitHub Zen returned no text.",
	};
}
