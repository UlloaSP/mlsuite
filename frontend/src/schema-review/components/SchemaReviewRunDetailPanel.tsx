import { useMemo, useState } from "react";
import { AppEmptyState } from "../../app/components/ui";
import { SchemaRunInputsPanel } from "../../schemas/components/SchemaRunInputsPanel";
import { SchemaRunReportsPanel } from "../../schemas/components/SchemaRunReportsPanel";
import { mergeSchemaRunInputs } from "../../schemas/schema-run-display";
import type { SchemaVersionDto } from "../../schemas/types";
import { useSchemaPluginCatalog } from "../../schemas/useSchemaPluginCatalog";
import { useSchemaReviewRun } from "../hooks";
import { SchemaReviewCombinedFeedbackForm } from "./SchemaReviewCombinedFeedbackForm";

type Props = {
  token: string;
  runToken: string;
  version: SchemaVersionDto;
  onReviewChanged: () => Promise<unknown> | unknown;
};

export function SchemaReviewRunDetailPanel({ token, runToken, version, onReviewChanged }: Props) {
  const detail = useSchemaReviewRun(token, runToken);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [inputsOpen, setInputsOpen] = useState(true);
  const catalog = useSchemaPluginCatalog(version.formSchema);
  const visibleInputs = useMemo(
    () =>
      detail.data
        ? mergeSchemaRunInputs(detail.data.run.inputData, detail.data.run.results)
        : {},
    [detail.data],
  );

  if (detail.isLoading) return <p className="text-sm text-[var(--text-secondary)]">Loading inference</p>;
  if (detail.error || !detail.data) {
    return <AppEmptyState title="Inference unavailable" description="This run cannot be opened from this review link." />;
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          Selected inference
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {detail.data.run.name}
        </h2>
      </div>
      <SchemaReviewCombinedFeedbackForm
        token={token}
        run={detail.data.run}
        version={version}
        feedback={detail.data.feedback}
        onSaved={async () => {
          await detail.refetch();
          await onReviewChanged();
        }}
      />
      <SchemaRunReportsPanel
        version={version}
        results={detail.data.run.results}
        open={reportsOpen}
        onToggle={() => setReportsOpen((current) => !current)}
        customReportDefinitions={catalog.data.reportDefinitions}
      />
      <SchemaRunInputsPanel
        schema={version.formSchema}
        inputData={visibleInputs}
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
      />
    </div>
  );
}
