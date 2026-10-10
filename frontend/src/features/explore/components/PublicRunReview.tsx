import {
  publicRunCatalogKey,
  publicRunDetailOptions,
} from "@/features/explore/api/public-catalog-api";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
} from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import {
  formatFeedbackValue,
  getQuestionnaireFieldDescriptors,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import { ReportQuestionnaireMount } from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import { savePublicRunFeedback } from "@/features/explore/api/public-bookmark-api";
import {
  buildPublicFeedbackSteps,
  isPublicRunReviewed,
  publicFeedbackItems,
} from "@/features/explore/lib/public-feedback-steps";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

type Props = {
  publicId: string;
  formSchema: PublicBookmarkDto["formSchema"];
  run: PublicRunDto;
};

const LABELS = { submit: "Save review", submitting: "Saving review…" };

/**
 * The visitor's review of one of their runs: what the publisher asks about each result, asked
 * as one form and kept on the server with the run. Once given it is shown as answered, and can
 * be changed. No account is needed: the run is the browser's, and so is the review.
 */
export function PublicRunReview({ publicId, formSchema, run }: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const steps = useMemo(() => buildPublicFeedbackSteps(formSchema, run), [formSchema, run]);
  const combined = useMemo(
    () => buildCombinedFeedbackQuestionnaire(steps, { required: true }),
    [steps],
  );
  const save = useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (values: Record<string, unknown>) =>
      savePublicRunFeedback(publicId, run.id, { items: publicFeedbackItems(steps, values) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(publicRunDetailOptions(publicId, saved.id).queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: publicRunCatalogKey(publicId) });
      setEditing(false);
    },
  });
  const transport = useMemo(
    () =>
      createCombinedQuestionnaireTransport(async (values) => {
        await save.mutateAsync(values);
      }),
    [save],
  );

  if (steps.length === 0) {
    return <AppCopy>This form asks for no review of its results.</AppCopy>;
  }
  if (isPublicRunReviewed(steps) && !editing) {
    return (
      <section aria-label="Your review" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg">Your review</h3>
          <AppButton size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </AppButton>
        </div>
        <dl className="divide-y divide-line rounded-card border border-line bg-surface">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col gap-1 p-4">
              <dt className="text-sm font-semibold text-fg">{step.title}</dt>
              {getQuestionnaireFieldDescriptors(step.schema).map((field) => (
                <dd key={field.id} className="text-sm text-fg-secondary">
                  <span className="font-medium text-fg">{field.label}:</span>{" "}
                  {formatFeedbackValue(step.saved?.[field.id], field) || "Not answered"}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </section>
    );
  }
  return (
    <section aria-label="Review this run" className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-fg">Review this run</h3>
      {save.isError ? (
        <AppInlineAlert>
          <strong className="font-semibold">The review could not be saved.</strong>{" "}
          {save.error instanceof Error ? save.error.message : "Try again."}
        </AppInlineAlert>
      ) : null}
      <ReportQuestionnaireMount
        title="Review"
        schema={combined.schema}
        initialValues={combined.initialValues}
        editable
        theme={theme}
        mode="standalone"
        transport={transport}
        labels={LABELS}
      />
    </section>
  );
}
