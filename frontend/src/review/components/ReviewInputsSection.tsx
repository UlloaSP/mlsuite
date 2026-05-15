type ReviewInputsSectionProps = {
	inputs: Record<string, unknown>;
};

export function ReviewInputsSection({ inputs }: ReviewInputsSectionProps) {
	return (
		<div className="divide-y divide-[var(--border-soft)]">
			{Object.entries(inputs).map(([key, value]) => (
				<div key={key} className="grid gap-1 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
					<p className="text-sm font-semibold text-[var(--text-primary)]">{key}</p>
					<p className="font-mono text-sm text-[var(--text-primary)]">
						{typeof value === "number" ? value.toLocaleString() : String(value)}
					</p>
				</div>
			))}
		</div>
	);
}
