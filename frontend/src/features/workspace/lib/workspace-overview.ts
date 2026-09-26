/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { WorkspacePermissionsDto } from "@/capabilities/workspace-context/workspace-context.types";
import type { OrganizationAdminStatsDto } from "@/features/workspace/api/workspace.types";

export type LifecycleStage = {
  key: "models" | "schemas" | "inferences" | "reviews";
  label: string;
  icon: LucideIcon;
  /** Absent when the stage belongs to another organization than the active one. */
  to?: string;
  /** Undefined while the dashboard is loading. */
  count: number | undefined;
  /** What the stage holds once it has data. */
  description: string;
  /** The next step to suggest while the stage is empty. */
  emptyHint: string;
  emptyAction?: { label: string; to: string };
};

/** The ML loop, in order, limited to the stages the member may open. */
export function lifecycleStages(
  permissions: WorkspacePermissionsDto,
  stats: OrganizationAdminStatsDto | undefined,
  { linked = true }: { linked?: boolean } = {},
): LifecycleStage[] {
  const stages: LifecycleStage[] = [];

  if (permissions.canViewModels) {
    stages.push(
      {
        key: "models",
        label: "Models",
        icon: SECTION_ICONS.models,
        to: "/models",
        count: stats?.totalModels,
        description: "Trained artifacts ready to serve predictions.",
        emptyHint: "Upload a trained artifact to get started.",
        emptyAction: permissions.canCreateModels
          ? { label: "Upload a model", to: "/models/create" }
          : undefined,
      },
      {
        key: "schemas",
        label: "Schemas",
        icon: SECTION_ICONS.schemas,
        to: "/schemas",
        count: stats?.totalSchemas,
        description: "Input, output, and report contracts for your models.",
        emptyHint: "Describe a model's inputs and outputs so it can run.",
        emptyAction: permissions.canEditModels
          ? { label: "Create a schema", to: "/schemas/create" }
          : undefined,
      },
      {
        key: "inferences",
        label: "Inferences",
        icon: SECTION_ICONS.inferences,
        to: "/inferences",
        count: stats?.totalInferences,
        description: "Prediction runs traced to their model and schema.",
        emptyHint: "Run a schema to record the first prediction.",
      },
    );
  }

  if (permissions.canReview || permissions.canManageReviews) {
    stages.push({
      key: "reviews",
      label: "Reviews",
      icon: SECTION_ICONS.reviews,
      to: "/review",
      count: stats?.totalReviews,
      description: "Human feedback that turns predictions into training data.",
      emptyHint: "Ask reviewers to validate prediction results.",
    });
  }

  // Section pages show the active organization; for any other one, report counts only.
  return linked ? stages : stages.map(({ to: _to, emptyAction: _action, ...stage }) => stage);
}
