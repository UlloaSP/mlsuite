/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type PredictionExplanationReportProps = {
	label: string;
	explanations?: string[];
	error?: string | null;
};

const EMPTY_EXPLANATIONS: string[] = [];

export function PredictionExplanationReport({
	label,
	explanations = EMPTY_EXPLANATIONS,
	error = null,
}: PredictionExplanationReportProps) {
	if (!error && explanations.length === 0) {
		return null;
	}

	return (
		<div className="space-y-3">
			<h3 className="font-semibold text-neutral-900 dark:text-white">{label}</h3>

			{error ? (
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
					{error}
				</div>
			) : (
				<div className="space-y-3">
					{explanations.map((tree, index) => (
						<pre
							key={`${label}-${index + 1}`}
							className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs leading-6 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{tree}
						</pre>
					))}
				</div>
			)}
		</div>
	);
}
