/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppTextArea } from "../../app/components";
import type { ExplanationFeedbackDto } from "../api/modelService";

type PredictionExplanationFeedbackFieldsProps = {
	explanationFeedback: ExplanationFeedbackDto[];
	values: Record<string, string>;
	onChange: (id: string, value: string) => void;
};

export function PredictionExplanationFeedbackFields({
	explanationFeedback,
	values,
	onChange,
}: PredictionExplanationFeedbackFieldsProps) {
	if (explanationFeedback.length === 0) {
		return null;
	}

	return (
		<div className="grid gap-3">
			{explanationFeedback.map((item) => (
				<div key={item.id} className="space-y-2 rounded-[18px] bg-[var(--surface-muted)] p-4">
					<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
						Explanation {item.order + 1}
					</p>
					<pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[var(--text-primary)]">
						{String(item.value ?? "")}
					</pre>
					<label className="text-sm font-medium text-[var(--text-primary)]">
						Ground Truth explanation_{item.order}
					</label>
					<AppTextArea
						value={values[item.id] ?? ""}
						onChange={(event) => onChange(item.id, event.target.value)}
						placeholder="Enter corrected explanation..."
						className="w-full"
					/>
				</div>
			))}
		</div>
	);
}
