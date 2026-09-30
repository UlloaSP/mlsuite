/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  useInference,
  useInferenceReviewAssignments,
} from "@/features/inferences/api/inference-api";
import { formatTimestamp } from "@/shared/lib/date-time";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppBadge } from "@/shared/ui/AppBadge";
import { FactList } from "./FactList";

const STATUS_TONE = { SUCCESS: "success", PARTIAL_SUCCESS: "warning", FAILED: "danger" } as const;

/** A saved inference: its outcome and what produced it. */
export function InferenceVisitFacts({ inferenceId }: { inferenceId: string }) {
  const inference = useInference(inferenceId).data;
  const canManageReviews = useWorkspaceContext().data?.permissions.canManageReviews ?? false;
  const reviews = useInferenceReviewAssignments(Number(inferenceId), canManageReviews).data;
  if (!inference) return null;
  return (
    <FactList
      facts={[
        {
          label: "Status",
          value: <AppBadge tone={STATUS_TONE[inference.status]}>{inference.status}</AppBadge>,
        },
        {
          label: "Schema",
          value: `${inference.schemaName} · ${snapshotLabel(inference.schemaVersionName, inference.schemaVersion)}`,
        },
        { label: "Bookmark", value: inference.bookmarkName ?? "None" },
        { label: "Created", value: formatTimestamp(inference.createdAt) },
        ...(reviews && reviews.length > 0
          ? [
              {
                label: "Reviews",
                value: `${reviews.filter((item) => item.reviewState === "COMPLETED").length}/${reviews.length} completed`,
              },
            ]
          : []),
      ]}
    />
  );
}
