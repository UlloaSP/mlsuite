import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { predictionRunQueryOptions, useSchemaVersion } from "@/features/schemas/api/schema-queries";
import {
  InferenceExportSelectionDialog,
  type ExportRunSelection,
} from "./InferenceExportSelectionDialog";
import type { InferenceExportCandidate } from "./OrganizationInferenceExportButton";
import { SchemaRunExportDialog } from "./SchemaRunExportDialog";

export function OrganizationInferenceExportDialog({
  items,
  onClose,
}: {
  items: InferenceExportCandidate[];
  onClose: () => void;
}) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [selection, setSelection] = useState<ExportRunSelection>();
  const version = useSchemaVersion(selection?.versionId);
  const runQueries = useQueries({
    queries: (selection?.runIds ?? []).map((id) => predictionRunQueryOptions(organizationId, id)),
  });
  const failed =
    Boolean(selection) && (version.isError || runQueries.some((query) => query.isError));
  const ready =
    Boolean(selection && version.data && version.isSuccess && !version.isPlaceholderData) &&
    runQueries.length > 0 &&
    runQueries.every((query) => query.isSuccess);
  const preparedVersion = useMemo(
    () => (version.data ? prepareSchemaVersionDtoForUse(version.data) : undefined),
    [version.data],
  );
  const retry = () => {
    void version.refetch();
    runQueries.forEach((query) => void query.refetch());
  };
  if (ready && preparedVersion)
    return (
      <SchemaRunExportDialog
        open
        runs={runQueries.flatMap((query) => (query.data ? [query.data] : []))}
        version={preparedVersion}
        onClose={onClose}
      />
    );
  return (
    <InferenceExportSelectionDialog
      items={items}
      onClose={onClose}
      onContinue={setSelection}
      busy={Boolean(selection) && !failed && !ready}
      error={failed}
      onRetry={retry}
    />
  );
}
