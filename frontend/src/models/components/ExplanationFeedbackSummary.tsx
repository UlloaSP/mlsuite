/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import {
	formatFeedbackValue,
	getQuestionnaireFieldDescriptors,
	type QuestionnaireFieldDescriptor,
} from "../questionnaire-feedback";
import type { QuestionnaireSchema } from "../questionnaire-schema";

type ExplanationFeedbackSummaryProps = {
	schema?: QuestionnaireSchema;
	values?: Record<string, unknown>;
};

export function ExplanationFeedbackSummary({
	schema,
	values = {},
}: ExplanationFeedbackSummaryProps) {
	if (!schema) {
		return <AppCopy>No feedback questionnaire configured for this explanation.</AppCopy>;
	}

	const fields = getQuestionnaireFieldDescriptors(schema).filter(
		(field: QuestionnaireFieldDescriptor) => values[field.id] !== undefined,
	);

	return (
		<AppPanel className="space-y-4">
			<AppSectionTitle>Saved Feedback</AppSectionTitle>
			{fields.length > 0 ? (
				<div className="space-y-3">
					{fields.map((field) => (
						<div
							key={field.id}
							className="flex items-center justify-between rounded-[18px] bg-[var(--surface-muted)] px-4 py-3"
						>
							<span className="text-sm font-medium text-[var(--text-secondary)]">
								{field.label}
							</span>
							<span className="font-mono text-sm text-[var(--text-primary)]">
								{formatFeedbackValue(values[field.id])}
							</span>
						</div>
					))}
				</div>
			) : (
				<AppCopy>No feedback saved yet.</AppCopy>
			)}
		</AppPanel>
	);
}
