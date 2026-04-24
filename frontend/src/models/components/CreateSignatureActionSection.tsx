/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RefreshCcw, Save } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	AppButton,
	AppSelect,
	AppTextField
} from "../../app/components";
import { getActiveCustomExplanationDefinitions } from "../../app/utils/mlform/custom-explanation";
import {
	schemaAtom,
	schemaErrorsAtom,
	schemaTextAtom,
} from "../../editor/atoms";
import { useCreateSignatureMutation, useGetSignatures } from "../hooks";
import { applyExplanationFeedbackMetadata } from "../signature-feedback-metadata";

function compareSemverDesc(
	major: number,
	minor: number,
	patch: number,
	major1: number,
	minor1: number,
	patch1: number,
): number {
	if (major !== major1) return major1 - major;
	if (minor !== minor1) return minor1 - minor;
	return patch1 - patch;
}

type BumpKind = "patch" | "minor" | "major";

function getNextVersion(
	signature: { major: number; minor: number; patch: number } | undefined,
	bump: BumpKind,
): string {
	if (!signature) {
		return "";
	}

	if (bump === "major") {
		return `${signature.major + 1}.0.0`;
	}

	if (bump === "minor") {
		return `${signature.major}.${signature.minor + 1}.0`;
	}

	return `${signature.major}.${signature.minor}.${signature.patch + 1}`;
}

export function CreateSignatureActionSection() {
	const { modelId } = useParams<{ modelId: string }>();
	const navigate = useNavigate();

	const { data: signatures = [] } = useGetSignatures({ modelId: modelId! });
	const mutation = useCreateSignatureMutation();

	const [, setSchemaText] = useAtom(schemaTextAtom);
	const [schema, setSchema] = useAtom(schemaAtom);
	const [schemaErrors] = useAtom(schemaErrorsAtom);

	const [signatureName, setSignatureName] = useState("");
	const [signatureId, setSignatureId] = useState<string>("");
	const [bumpKind, setBumpKind] = useState<BumpKind>("patch");
	const [isLoading, setIsLoading] = useState(false);

	const selectedSignature = useMemo(
		() => signatures.find((signature) => String(signature.id) === String(signatureId)),
		[signatureId, signatures],
	);
	const version = useMemo(
		() => getNextVersion(selectedSignature, bumpKind),
		[selectedSignature, bumpKind],
	);
	const isFormValid =
		schemaErrors <= 0 && signatureName.trim() && version && signatureId;

	const handleSaveSignature = async () => {
		const [major, minor, patch] = version.split(".").map(Number);
		setIsLoading(true);
		try {
			const customExplanationDefinitions = await getActiveCustomExplanationDefinitions();
			await mutation.mutateAsync({
				modelId: modelId!,
				name: signatureName,
				inputSignature: applyExplanationFeedbackMetadata(schema, customExplanationDefinitions),
				major: major,
				minor: minor,
				patch: patch,
				origin: signatureId,
			});
			navigate(`/models/${modelId}?tab=signatures`);
		} catch (err) {
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!signatures.length) return;
		const [latest] = [...signatures].sort((a, b) =>
			compareSemverDesc(a.major, a.minor, a.patch, b.major, b.minor, b.patch),
		);
		setSignatureId(latest.id.toString()); // ← conversión aquí
	}, [signatures]);

	useEffect(() => {
		if (!signatureId) return;
		const sig = signatures.find((s) => s.id.toString() === signatureId);
		if (!sig) return;
		setSchema(sig.inputSignature);
		setSchemaText(JSON.stringify(sig.inputSignature, null, 2));
	}, [setSchema, setSchemaText, signatureId, signatures]);

	return (
		<motion.div className="shrink-0">

			<div className="grid gap-4 xl:grid-cols-[minmax(240px,1.2fr)_minmax(280px,1.4fr)_minmax(360px,1.7fr)_auto]">
				<div className="space-y-2">
					<label className="text-sm font-semibold text-[var(--text-primary)]">
						Base Version
					</label>
					<AppSelect
						value={signatureId}
						onChange={(e) => setSignatureId(e.target.value)}
						className="w-full"
						disabled={!signatures.length}
					>
						{signatures.length ? null : (
							<option value="">No base signatures available</option>
						)}
						{signatures.map((signature) => (
							<option key={signature.id} value={signature.id}>
								{signature.name} (v{signature.major}.{signature.minor}.{signature.patch})
							</option>
						))}
					</AppSelect>
				</div>

				<div className="space-y-2">
					<label
						htmlFor="signature-name"
						className="text-sm font-semibold text-[var(--text-primary)]"
					>
						Signature Name
					</label>
					<AppTextField
						id="signature-name"
						type="text"
						value={signatureName}
						onChange={(e) => setSignatureName(e.target.value)}
						placeholder="Ej: Customer Churn input contract"
						className="w-full"
					/>
				</div>

				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<label className="text-sm font-semibold text-[var(--text-primary)]">
							Version Bump
						</label>
						{selectedSignature ? (
							<span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
								v{selectedSignature.major}.{selectedSignature.minor}.{selectedSignature.patch}
								{" "}
								<span className="text-[var(--text-muted)]">-&gt;</span>
								{" "}
								v{version}
							</span>
						) : (
							<span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
								No version
							</span>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{(["major", "minor", "patch"] as const).map((value) => {
							const active = bumpKind === value;
							return (
								<AppButton
									key={value}
									type="button"
									variant={active ? "primary" : "secondary"}
									onClick={() => setBumpKind(value)}
									className="px-3 py-2 text-xs uppercase tracking-[0.18em]"
								>
									{value}
								</AppButton>
							);
						})}
					</div>
				</div>

				<div className="flex min-w-[180px] items-end">
					<AppButton
						onClick={handleSaveSignature}
						disabled={!isFormValid || isLoading}
						className="w-full"
					>
						{isLoading ? (
							<>
								<span className="animate-spin">
									<RefreshCcw size={18} />
								</span>
								<span>Saving...</span>
							</>
						) : (
							<>
								<Save size={18} />
								<span>Save</span>
							</>
						)}
					</AppButton>
				</div>
			</div>
		</motion.div>
	);
}
