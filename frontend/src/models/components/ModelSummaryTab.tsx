/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge, AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { ModelDto, SignatureDto } from "../api/modelService";
import {
	getLatestSignature,
	getModelAlgorithmLabel,
	getModelDerivedMetric,
	getSignatureVersionLabel,
} from "../utils";

type ModelSummaryTabProps = {
	model: ModelDto;
	signatures: SignatureDto[];
	onOpenLatestSignature: (signatureId: string) => void;
};

export function ModelSummaryTab({
	model,
	signatures,
	onOpenLatestSignature,
}: ModelSummaryTabProps) {
	const latestSignature = getLatestSignature(signatures);

	return (
		<div className="grid gap-4 xl:grid-cols-2">
			<AppPanel className="space-y-4">
				<AppSectionTitle>Model Metadata</AppSectionTitle>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Type</p>
						<p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{getModelAlgorithmLabel(model)}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">File</p>
						<p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{model.fileName}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Created</p>
						<p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{new Date(model.createdAt).toLocaleString()}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Derived Metric</p>
						<p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{getModelDerivedMetric(signatures)}</p>
					</div>
				</div>
			</AppPanel>

			<AppPanel className="space-y-4">
				<AppSectionTitle>Operational Status</AppSectionTitle>
				<AppBadge tone="success">active</AppBadge>
				<AppCopy>
					Model is available for signature creation and prediction workflows.
				</AppCopy>
			</AppPanel>

			<AppPanel className="space-y-4 xl:col-span-2">
				<AppSectionTitle>Latest Signature</AppSectionTitle>
				{latestSignature ? (
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-2">
							<p className="text-sm font-medium text-[var(--text-primary)]">
								{latestSignature.name} · {getSignatureVersionLabel(latestSignature)}
							</p>
							<AppCopy>
								Created {new Date(latestSignature.createdAt).toLocaleString()}
								{latestSignature.origin ? " · Based on previous version" : " · Initial version"}
							</AppCopy>
						</div>
						<AppButton
							type="button"
							variant="secondary"
							onClick={() => onOpenLatestSignature(latestSignature.id)}
						>
							Open Signature
						</AppButton>
					</div>
				) : (
					<AppCopy>No signatures registered for this model yet.</AppCopy>
				)}
			</AppPanel>
		</div>
	);
}
