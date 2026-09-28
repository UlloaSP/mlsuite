/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { HttpError } from "@/shared/api/http";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppButton } from "@/shared/ui/AppButton";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { ModelSummaryTab } from "@/features/models/components/ModelSummaryTab";
import { useModel } from "@/features/models/api/model.queries";
import {
  formatTimestamp,
  getModelAlgorithmLabel,
} from "@/capabilities/prediction-runtime/data/model-utils";

export function ModelDetailPage() {
  const navigate = useNavigate();
  const { modelId } = useParams<{ modelId: string }>();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const modelQuery = useModel(modelId);
  const showLoader = useStableLoading(modelQuery.isLoading);
  const model = modelQuery.data;
  const missing = modelQuery.error instanceof HttpError && modelQuery.error.status === 404;

  if (!user || error) {
    return <NotFoundError />;
  }
  if (showLoader) return <AppPageLoader label="Loading model…" />;
  const canEditModels = workspace?.permissions.canEditModels ?? false;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        {!model ? (
          <AppEmptyState
            title={missing ? "Model not found" : "Model unavailable"}
            description={
              missing
                ? "It may have been archived, deleted, or belong to another organization."
                : "The model could not be loaded. Try again in a moment."
            }
            action={
              <AppButton type="button" variant="secondary" onClick={() => navigate("/models")}>
                Back to models
              </AppButton>
            }
          />
        ) : (
          <>
            <AppPageHeader
              breadcrumbs={[{ label: "Models", to: "/models" }, { label: model.name }]}
              eyebrow="Model detail"
              title={model.name}
              description={`${getModelAlgorithmLabel(model)} · Created ${formatTimestamp(model.createdAt)}`}
              actions={
                canEditModels ? (
                  <AppButton
                    type="button"
                    onClick={() => navigate(`/schemas/create?modelId=${model.id}`)}
                  >
                    <Plus size={16} /> New schema
                  </AppButton>
                ) : null
              }
            />

            <ModelSummaryTab
              model={model}
              onCreateSchema={() => navigate(`/schemas/create?modelId=${model.id}`)}
            />
          </>
        )}
      </AppSurface>
    </AppPage>
  );
}
