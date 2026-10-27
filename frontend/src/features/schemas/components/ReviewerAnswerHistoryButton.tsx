/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { AnswerHistory } from "@/features/schemas/components/AnswerHistory";
import type { PredictionRunDto, SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  run: PredictionRunDto;
  version: SchemaVersionDto;
  reviewerId: number | string;
  reviewerName?: string;
};

/** Opens the history of one reviewer's answers on an inference, removed answers included. */
export function ReviewerAnswerHistoryButton({ run, version, reviewerId, reviewerName }: Props) {
  const canRead = useCan("canViewModels");
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => buildSchemaFeedbackSteps(version, run.results, []), [run, version]);
  if (!canRead || steps.length === 0) return null;

  return (
    <>
      <AppButton size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <History size={14} />
        History
      </AppButton>
      <AppDialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Answer history"
        description={reviewerName ? `${reviewerName}'s answers on ${run.name}` : run.name}
      >
        {open ? (
          <AnswerHistory version={version} steps={steps} authorId={Number(reviewerId)} />
        ) : null}
      </AppDialog>
    </>
  );
}
