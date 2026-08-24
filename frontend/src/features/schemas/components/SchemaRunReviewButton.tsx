import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import {
  useCan,
  useCurrentOrganizationId,
} from "@/capabilities/workspace-context/workspace-context";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

type Props = {
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
};

export function SchemaRunReviewButton({ runs, version }: Props) {
  const canManageReviews = useCan("canManageReviews");
  const organizationId = useCurrentOrganizationId();

  if (!canManageReviews || organizationId == null) return null;
  return (
    <ReviewCreationButton
      organizationId={organizationId}
      variant="primary"
      candidates={runs.map((run) => ({
        runId: run.id,
        name: run.name,
        createdAt: run.createdAt,
        schemaId: version.schemaId,
        versionId: version.id,
        groupLabel: `${version.name} · v${version.version}`,
      }))}
    />
  );
}
