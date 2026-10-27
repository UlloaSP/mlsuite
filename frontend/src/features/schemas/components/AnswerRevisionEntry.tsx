/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { formatDate, formatTimestamp } from "@/shared/lib/date-time";
import {
  formatFeedbackValue,
  getEffectiveFeedbackValues,
  getQuestionnaireFieldDescriptors,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import type { PredictionResultFeedbackRevisionDto } from "@/shared/api/openapi.gen";

const CHANGES = {
  CREATED: { label: "Answered", tone: "success" },
  UPDATED: { label: "Changed", tone: "info" },
  DELETED: { label: "Removed", tone: "danger" },
} as const;

type Props = {
  revision: PredictionResultFeedbackRevisionDto;
  schema: QuestionnaireSchema;
  /** The model whose result was answered, when the question covers several. */
  modelName?: string;
};

const person = (name: string | null, id: number | null) =>
  name ?? (id === null ? "Unknown" : "Former member");

const author = (revision: PredictionResultFeedbackRevisionDto) =>
  revision.visitorId ? "A public page visitor" : person(revision.userName, revision.userId);

const where = ({ review, reviewId }: PredictionResultFeedbackRevisionDto) => {
  if (review) {
    const opener = review.createdByName ? ` by ${review.createdByName}` : "";
    return `In the review opened ${formatDate(review.createdAt)}${opener}`;
  }
  return reviewId === null ? "On the public page" : "In a review that was deleted";
};

/** One change of an answer: what it said afterwards, whose answer it is, and who changed it, when. */
export function AnswerRevisionEntry({ revision, schema, modelName }: Props) {
  const change = CHANGES[revision.change];
  const values = getEffectiveFeedbackValues({ value: revision.value }, schema);
  const fields = getQuestionnaireFieldDescriptors(schema).filter(
    (field) => values[field.id] !== undefined,
  );

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <AppBadge tone={change.tone}>{change.label}</AppBadge>
        <span className="font-medium text-fg">
          {person(revision.changedByName, revision.changedByUserId)}
        </span>
        <time className="text-fg-muted" dateTime={revision.changedAt}>
          {formatTimestamp(revision.changedAt)}
        </time>
      </div>
      <p className="text-xs text-fg-secondary">
        {author(revision)}&rsquo;s answer · {where(revision)}
        {modelName ? ` · ${modelName}` : null}
      </p>
      {revision.change === "DELETED" ? null : fields.length > 0 ? (
        <dl className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
          {fields.map((field) => (
            <div key={field.id} className="contents">
              <dt className="text-fg-secondary">{field.label}</dt>
              <dd className="font-mono text-fg">{formatFeedbackValue(values[field.id], field)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-fg-muted">No values in this answer.</p>
      )}
    </li>
  );
}
