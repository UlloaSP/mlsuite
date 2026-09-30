/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSchemaReviewInbox } from "@/features/reviews/api/review-queries";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppBadge } from "@/shared/ui/AppBadge";
import { FactList } from "@/app/components/welcome/FactList";

type Props = { reviewId?: string; reviewRunId?: string };

const STATE_TONE = { PENDING: "neutral", IN_PROGRESS: "accent", COMPLETED: "success" } as const;

/**
 * The member's review inbox: what is left to answer overall, or in the review
 * and inference they had open.
 */
export function ReviewFacts({ reviewId, reviewRunId }: Props) {
  const inbox = useSchemaReviewInbox().data;
  if (!inbox) return null;
  const review = inbox.find((item) => item.publicId === reviewId);
  const runs = review ? review.runs : inbox.flatMap((item) => item.runs);
  const run = review?.runs.find((item) => item.publicId === reviewRunId);
  const by = (state: string) => runs.filter((item) => item.reviewState === state).length;

  return (
    <FactList
      facts={[
        ...(run
          ? [
              {
                label: "Inference",
                value: (
                  <>
                    {run.run.name}{" "}
                    <AppBadge tone={STATE_TONE[run.reviewState]}>{run.reviewState}</AppBadge>
                  </>
                ),
              },
            ]
          : []),
        ...(review
          ? [
              {
                label: "Schema",
                value: `${review.schema.name} · ${snapshotLabel(review.schemaVersion.name, review.schemaVersion.version)}`,
              },
            ]
          : [{ label: "Open reviews", value: inbox.length }]),
        { label: "To start", value: by("PENDING") },
        { label: "In progress", value: by("IN_PROGRESS") },
        { label: "Submitted", value: by("COMPLETED") },
      ]}
    />
  );
}
