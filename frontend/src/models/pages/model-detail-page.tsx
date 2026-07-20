/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { AppEmptyState } from "@/app/components/AppEmptyState";
import { AppPage } from "@/app/components/AppPage";
import { AppPageHeader } from "@/app/components/PageHeader";
import { AppSurface } from "@/app/components/AppSurface";
import { AppButton } from "@/app/components/AppButton";
import { NotFoundError } from "@/app/pages/error-page";
import { useUser } from "@/features/user/api/user-session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { ModelSummaryTab } from "@/models/components/ModelSummaryTab";
import { useGetModels } from "@/features/models/api/model.queries";
import { findModelById, formatTimestamp, getModelAlgorithmLabel } from "@/algorithms/models/utils";

export function ModelDetailPage() {
  const navigate = useNavigate();
  const { modelId } = useParams<{ modelId: string }>();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const { data: models = [], isLoading } = useGetModels();
  const model = useMemo(() => findModelById(models, modelId), [models, modelId]);

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
                    onClick={() => navigate(`/schemas/create?modelId=${model.id}`)}
                  >
                    + New Schema
                  </AppButton>
                ) : null
              }
            />

            <ModelSummaryTab model={model} onCreateSchema={() => navigate("/schemas/create")} />
          </>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
