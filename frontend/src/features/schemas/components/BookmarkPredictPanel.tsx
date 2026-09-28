/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { usePredictionRun } from "@/features/schemas/api/schema-queries";
import type { PredictionResultDto } from "@/features/schemas/api/prediction-types";
import type { JsonRecord, SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { InferenceSessionPanel } from "@/features/schemas/components/InferenceSessionPanel";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { SchemaRunReportsPanel } from "@/features/schemas/components/SchemaRunReportsPanel";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import type {
  SessionEntry,
  useInferenceSession,
} from "@/features/schemas/lib/use-inference-session";

type Props = {
  /** The pinned, executable snapshot the form runs. */
  version: SchemaVersionDto;
  session: ReturnType<typeof useInferenceSession>;
  /** A saved run whose inputs prefill the form ("Predict again"). */
  fromRunId?: string;
};

/** Unsaved results in the shape the saved-run report renderer reads. */
const entryResults = (entry: SessionEntry): PredictionResultDto[] =>
  entry.results.map((result, index) => ({
    ...result,
    id: `${entry.key}-${index}`,
    runId: entry.key,
    createdAt: entry.createdAt,
  }));

/**
 * MLForm (its Inputs and Results tabs) beside the session of runs. The newest
 * run lives in the form; choosing an earlier one shows its captured results in
 * the form's place until the user goes back.
 */
export function BookmarkPredictPanel({ version, session, fromRunId }: Props) {
  const { data: sourceRun } = usePredictionRun(fromRunId);
  const catalog = useSchemaPluginCatalog(version.formSchema, useCurrentOrganizationId() ?? "none");
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const { onResult } = session;
  const viewing = session.entries.find(
    (entry) => entry.key === viewingKey && entry.key !== session.liveKey,
  );

  const handleSubmit = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      onResult(inputData, raw, reportsPending);
      setViewingKey(null);
    },
    [onResult],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <section aria-label="Run form" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {viewing ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="truncate text-base font-semibold text-fg">{viewing.name}</h2>
              <AppButton size="sm" variant="secondary" onClick={() => setViewingKey(null)}>
                <ArrowLeft size={14} />
                Back to form
              </AppButton>
            </div>
            <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
              <SchemaRunReportsPanel
                version={version}
                results={entryResults(viewing)}
                customReportDefinitions={catalog.data.reportDefinitions}
              />
            </div>
          </div>
        ) : null}
        {/* Hidden, not unmounted, while an earlier run is shown: the form keeps its values. */}
        <div className={viewing ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
          <SchemaRunForm
            // A new source run restarts the form with its inputs.
            key={fromRunId ?? "blank"}
            version={version}
            initialInputs={sourceRun?.inputData}
            onSubmit={handleSubmit}
            onResultUpdate={session.onResult}
            onRunningChange={session.onRunningChange}
          />
        </div>
      </section>
      <InferenceSessionPanel
        session={session}
        selectedKey={viewing?.key ?? session.liveKey}
        onSelect={(key) => setViewingKey(key)}
      />
    </div>
  );
}
