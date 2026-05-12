/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { SignatureDto } from "../api/modelService";
import { compareSignatureVersionsDesc } from "../utils";
import { SignatureListItem } from "./SignatureListItem";

type ModelSignaturesTabProps = {
	signatures: SignatureDto[];
	onOpenSignature: (signatureId: string) => void;
};

export function ModelSignaturesTab({
	signatures,
	onOpenSignature,
}: ModelSignaturesTabProps) {
	const sorted = [...signatures].sort(compareSignatureVersionsDesc);

	return (
		<div className="space-y-4">
			<div>
				<div>
					<AppSectionTitle>Schemas</AppSectionTitle>
					<AppCopy>Browse the version lineage attached to this model.</AppCopy>
				</div>
			</div>

			{sorted.length === 0 ? (
				<AppPanel className="text-center">
					<AppCopy>No schemas available for this model yet.</AppCopy>
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
