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
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { ModelDetailTabs } from "@/features/models/components/ModelDetailTabs";
import { useModel, useModelDetails } from "@/features/models/api/model.queries";
import { readModelManifest } from "@/features/models/lib/model-manifest";
import { formatTimestamp } from "@/shared/lib/date-time";

export function ModelDetailPage() {
  const navigate = useNavigate();
  const { modelId } = useParams<{ modelId: string }>();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const modelQuery = useModel(modelId);
  const detailsQuery = useModelDetails(modelId);
  const showLoader = useStableLoading(modelQuery.isLoading || detailsQuery.isLoading);
  const model = modelQuery.data;
  const missing = modelQuery.error instanceof HttpError && modelQuery.error.status === 404;

  if (!user || error) {
    return <NotFoundError />;
  }
  if (showLoader) return <AppPageLoader label="Loading model…" />;
  const canEditModels = workspace?.permissions.canEditModels ?? false;
  // A pipeline is named by the estimator that predicts, which only its bundle states.
  const algorithm = readModelManifest(detailsQuery.data?.manifest).steps.at(-1)?.algorithm;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        {!model ? (
          <AppEmptyState
            title={missing ? "Model not found" : "Model unavailable"}
            description={
              missing
                ? "It may have been deleted or belong to another organization."
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
              title={
                <>
                  {model.name}
                  {model.archivedAt ? (
                    <AppBadge tone="warning" className="ml-3 align-middle">
                      Archived
                    </AppBadge>
                  ) : null}
                </>
              }
              description={`${algorithm ?? model.specificType} · Created ${formatTimestamp(model.createdAt)}${
                model.archivedAt ? ` · Archived ${formatTimestamp(model.archivedAt)}` : ""
              }`}
              actions={
                // An archived model is no longer offered for new schemas.
                canEditModels && !model.archivedAt ? (
                  <AppButton
                    type="button"
                    onClick={() => navigate(`/schemas/create?modelId=${model.id}`)}
                  >
                    <Plus size={16} /> New schema
                  </AppButton>
                ) : null
              }
            />

            <ModelDetailTabs model={model} details={detailsQuery.data} />
          </>
        )}
      </AppSurface>
    </AppPage>
  );
}
