import type { ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { schemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import {
  predictionRunQueryOptions,
  predictionRunsFeedbackQueryOptions,
  schemaVersionQueryOptions,
} from "@/features/schemas/api/schema-queries";

type Item = { id: number | string; schemaVersionId: number | string };

export function InferenceFeedbackStatuses({
  items,
  children,
}: {
  items: readonly Item[];
  children: (statuses: Map<string, FeedbackStatusDisplay>) => ReactNode;
}) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const runQueries = useQueries({
    queries: items.map((item) => predictionRunQueryOptions(organizationId, String(item.id))),
  });
  const versionIds = [...new Set(items.map((item) => String(item.schemaVersionId)))];
  const versions = useQueries({
    queries: versionIds.map((id) => schemaVersionQueryOptions(organizationId, id)),
  });
  const feedback = useQuery(
    predictionRunsFeedbackQueryOptions(
      organizationId,
      items.map((item) => item.id),
    ),
  );
  const statuses = new Map<string, FeedbackStatusDisplay>();
  items.forEach((item, index) => {
    const run = runQueries[index]!;
    const version = versions[versionIds.indexOf(String(item.schemaVersionId))]!;
    let status: FeedbackStatusDisplay = "LOADING";
    if (run.isError || version.isError || feedback.isError) status = "ERROR";
    else if (run.isSuccess && version.isSuccess && feedback.isSuccess) {
      try {
        const executable = prepareSchemaVersionDtoForUse(version.data);
        status = questionnaireConfigError(executable.formSchema)
          ? "ERROR"
          : schemaFeedbackStatus(
              buildSchemaFeedbackSteps(executable, run.data.results, feedback.data),
            );
      } catch {
        status = "ERROR";
      }
    }
    statuses.set(String(item.id), status);
  });
  return children(statuses);
}
