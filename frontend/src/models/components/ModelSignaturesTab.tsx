/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { SignatureDto } from "../api/modelService";
import { compareSignatureVersionsDesc } from "../utils";
import { SignatureListItem } from "./SignatureListItem";

type ModelSignaturesTabProps = {
	signatures: SignatureDto[];
	onCreate: () => void;
	onOpenSignature: (signatureId: string) => void;
};

export function ModelSignaturesTab({
	signatures,
	onCreate,
	onOpenSignature,
}: ModelSignaturesTabProps) {
	const sorted = [...signatures].sort(compareSignatureVersionsDesc);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<AppSectionTitle>Signatures</AppSectionTitle>
					<AppCopy>Browse the version lineage attached to this model.</AppCopy>
				</div>
				<AppButton type="button" variant="secondary" onClick={onCreate}>
					+ New Signature
				</AppButton>
			</div>

			{sorted.length === 0 ? (
				<AppPanel className="text-center">
					<AppCopy>No signatures available for this model yet.</AppCopy>
				</AppPanel>
			) : (
				<div className="space-y-3">
					{sorted.map((signature) => (
						<SignatureListItem
							key={signature.id}
							item={signature}
							onOpen={() => onOpenSignature(signature.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
