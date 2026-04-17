/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { ModelDto } from "../api/modelService";
import { getModelAlgorithmLabel } from "../utils";

type ModelSettingsTabProps = {
	model: ModelDto;
};

export function ModelSettingsTab({
	model,
}: ModelSettingsTabProps) {
	return (
		<div className="grid gap-4 xl:grid-cols-2">
			<AppPanel className="space-y-4">
				<AppSectionTitle>Model Metadata</AppSectionTitle>
				<div className="space-y-3 text-sm text-[var(--text-secondary)]">
					<p><span className="font-medium text-[var(--text-primary)]">Name:</span> {model.name}</p>
					<p><span className="font-medium text-[var(--text-primary)]">Algorithm:</span> {getModelAlgorithmLabel(model)}</p>
					<p><span className="font-medium text-[var(--text-primary)]">File:</span> {model.fileName}</p>
					<p><span className="font-medium text-[var(--text-primary)]">Created:</span> {new Date(model.createdAt).toLocaleString()}</p>
				</div>
			</AppPanel>

			<AppPanel className="space-y-4">
				<AppSectionTitle>Future Controls</AppSectionTitle>
				<ul className="space-y-3 text-sm text-[var(--text-secondary)]">
					<li>Deploy target: Not available yet</li>
					<li>Runtime settings: Not available yet</li>
					<li>Retention policy: Not available yet</li>
				</ul>
				<AppCopy>
					This area is scaffolded for future backend support. Actions remain intentionally unavailable in this iteration.
				</AppCopy>
			</AppPanel>
		</div>
	);
}
