/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
	AppBreadcrumbs,
	AppButton,
	AppEmptyState,
	AppPage,
	AppPageHeader,
	AppSurface,
	AppTabs,
} from "../../app/components";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { useUser } from "../../user/hooks";
import { ModelSettingsTab } from "../components/ModelSettingsTab";
import { ModelSignaturesTab } from "../components/ModelSignaturesTab";
import { ModelSummaryTab } from "../components/ModelSummaryTab";
import { useGetModels, useGetSignatures } from "../hooks";
import { findModelById, getModelAlgorithmLabel } from "../utils";

type ModelDetailTab = "summary" | "signatures" | "settings";
type ToastState = string | null;

const MODEL_DETAIL_TABS: ModelDetailTab[] = ["summary", "signatures", "settings"];

export function ModelDetailPage() {
	const navigate = useNavigate();
	const { modelId } = useParams<{ modelId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const { data: user, error } = useUser();
	const { data: models = [], isLoading } = useGetModels();
	const model = useMemo(() => findModelById(models, modelId), [models, modelId]);
	const { data: signatures = [] } = useGetSignatures({ modelId: modelId ?? "" });
	const [toast, setToast] = useState<ToastState>(null);

	const tabParam = searchParams.get("tab");
	const activeTab: ModelDetailTab = MODEL_DETAIL_TABS.includes(tabParam as ModelDetailTab)
		? (tabParam as ModelDetailTab)
		: "signatures";

	useEffect(() => {
		if (!toast) {
			return;
		}

		const timeout = window.setTimeout(() => setToast(null), 2600);
		return () => window.clearTimeout(timeout);
	}, [toast]);

	const setTab = (tab: ModelDetailTab) => {
		const next = new URLSearchParams(searchParams);
		next.set("tab", tab);
		setSearchParams(next, { replace: true });
	};

	if (!user || error) {
		return <Unauthorized />;
	}

	return (
		<AppPage>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45 }}
				className="flex flex-1"
			>
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppBreadcrumbs
						items={[
							{ label: "Models", to: "/models" },
							{ label: model?.name ?? "Model" },
						]}
					/>

					{!model && !isLoading ? (
						<AppEmptyState
							title="Model not found"
							description="The selected model could not be resolved from the current dataset."
							action={
								<AppButton type="button" variant="secondary" onClick={() => navigate("/models")}>
									Back to Models
								</AppButton>
							}
						/>
					) : model ? (
						<>
							<AppPageHeader
								eyebrow="Model Detail"
								title={model.name}
								description={`${getModelAlgorithmLabel(model)} · Created ${new Date(model.createdAt).toLocaleString()}`}
								aside={
									<>
										<AppButton
											type="button"
											variant="secondary"
											onClick={() => setToast(`Deploy is not available yet for ${model.name}.`)}
										>
											Deploy
										</AppButton>
										<AppButton
											type="button"
											variant="secondary"
											onClick={() => {
												setTab("settings");
												setToast(`Settings backend controls are not available yet for ${model.name}.`);
											}}
										>
											Settings
										</AppButton>
									</>
								}
							/>

							<AppTabs<ModelDetailTab>
								items={[
									{ value: "summary", label: "Resumen" },
									{ value: "signatures", label: "Signatures" },
									{ value: "settings", label: "Configuración" },
								]}
								value={activeTab}
								onChange={setTab}
							/>

							{activeTab === "summary" ? (
								<ModelSummaryTab
									model={model}
									signatures={signatures}
									onOpenLatestSignature={(signatureId) =>
										navigate(`/models/${model.id}/signatures/${signatureId}?tab=history`)
									}
								/>
							) : null}

							{activeTab === "signatures" ? (
								<ModelSignaturesTab
									signatures={signatures}
									onCreate={() => navigate(`/models/${model.id}/signatures/create`)}
									onOpenSignature={(signatureId) =>
										navigate(`/models/${model.id}/signatures/${signatureId}?tab=history`)
									}
								/>
							) : null}

							{activeTab === "settings" ? <ModelSettingsTab model={model} /> : null}
						</>
					) : null}
				</AppSurface>
			</motion.div>

			{toast ? (
				<div className="fixed bottom-6 right-6 z-50 rounded-[20px] bg-[var(--text-primary)] px-5 py-4 text-sm font-medium text-[var(--text-inverse)] shadow-[var(--shadow-hover)]">
					{toast}
				</div>
			) : null}
		</AppPage>
	);
}
