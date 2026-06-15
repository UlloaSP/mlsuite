/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppSurface,
  AppTabs,
  AppButton,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import { ModelSignaturesTab } from "../components/ModelSignaturesTab";
import { ModelSummaryTab } from "../components/ModelSummaryTab";
import { useGetModels, useGetSignatures } from "../hooks";
import { findModelById, formatTimestamp, getModelAlgorithmLabel } from "../utils";

type ModelDetailTab = "summary" | "signatures";

const MODEL_DETAIL_TABS: ModelDetailTab[] = ["summary", "signatures"];

export function ModelDetailPage() {
  const navigate = useNavigate();
  const { modelId } = useParams<{ modelId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const { data: models = [], isLoading } = useGetModels();
  const model = useMemo(() => findModelById(models, modelId), [models, modelId]);
  const { data: signatures = [] } = useGetSignatures({ modelId: modelId ?? "" });

  const tabParam = searchParams.get("tab");
  const activeTab: ModelDetailTab = MODEL_DETAIL_TABS.includes(tabParam as ModelDetailTab)
    ? (tabParam as ModelDetailTab)
    : "signatures";

  const setTab = (tab: ModelDetailTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  if (!user || error) {
    return <NotFoundError />;
  }
  const canEditModels = workspace?.permissions.canEditModels ?? false;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
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
              breadcrumbs={[{ label: "Models", to: "/models" }, { label: model.name }]}
              eyebrow="Model Detail"
              title={model.name}
              description={`${getModelAlgorithmLabel(model)} · Created ${formatTimestamp(model.createdAt)}`}
              actions={
                canEditModels ? (
                  <AppButton
                    type="button"
                    onClick={() => navigate(`/models/${model.id}/signatures/create`)}
                  >
                    + New Schema
                  </AppButton>
                ) : null
              }
            />

            <AppTabs<ModelDetailTab>
              items={[
                { value: "summary", label: "Resumen" },
                { value: "signatures", label: "Schemas" },
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
                onOpenSignature={(signatureId) =>
                  navigate(`/models/${model.id}/signatures/${signatureId}?tab=history`)
                }
              />
            ) : null}
          </>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
