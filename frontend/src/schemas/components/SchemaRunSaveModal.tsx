/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";
import { AppButton, AppIconButton, AppTextField } from "../../app/components/ui-controls";
import { buildCombinedFeedbackQuestionnaire } from "../../models/combined-feedback-questionnaire";
import {
  ReportQuestionnaireMount,
  type ReportQuestionnaireMountHandle,
} from "../../models/components/ReportQuestionnaireMount";
import type { CreatePredictionRunRequest, JsonRecord, SchemaVersionDto } from "../types";
import { buildSchemaFeedbackSteps } from "../schema-feedback-steps";
import { buildPendingSchemaRunFeedback, type PendingFeedback } from "../schema-run-save-feedback";
import { mergeSchemaRunInputs } from "../schema-run-display";
import { useSchemaPluginCatalog } from "../useSchemaPluginCatalog";
import { SchemaRunInputsPanel } from "./SchemaRunInputsPanel";
import { SchemaRunReportsPanel } from "./SchemaRunReportsPanel";

type PendingRun = {
  inputData: JsonRecord;
  raw: JsonRecord;
  reportsPending: boolean;
};

type Props = {
  open: boolean;
  pendingRun: PendingRun | null;
  version: SchemaVersionDto;
  defaultName: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (request: CreatePredictionRunRequest, feedback: PendingFeedback[]) => void;
};

const toResults = (raw: JsonRecord): CreatePredictionRunRequest["results"] =>
  Array.isArray(raw.results) ? (raw.results as CreatePredictionRunRequest["results"]) : [];

export function SchemaRunSaveModal({
  open,
  pendingRun,
  version,
  defaultName,
  isSaving,
  onCancel,
  onSave,
}: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [name, setName] = useState(defaultName);
  const results = useMemo(() => (pendingRun ? toResults(pendingRun.raw) : []), [pendingRun]);
  const displayInputData = useMemo(
    () => (pendingRun ? mergeSchemaRunInputs(pendingRun.inputData, results) : {}),
    [pendingRun, results],
  );
  const catalog = useSchemaPluginCatalog(version.formSchema);
  const questionnaireRef = useRef<ReportQuestionnaireMountHandle | null>(null);
  const displayResults = useMemo(
    () =>
      results.map((result, index) => ({
        id: `${result.modelId}-${result.signatureId}-${index}`,
        runId: "pending",
        createdAt: "",
        ...result,
      })),
    [results],
  );
  const feedbackSteps = useMemo(
    () => buildSchemaFeedbackSteps(version, displayResults, []),
    [displayResults, version],
  );
  const feedbackQuestionnaire = useMemo(
    () => buildCombinedFeedbackQuestionnaire(feedbackSteps),
    [feedbackSteps],
  );

  const handleSave = async () => {
    if (!pendingRun) return;
    const values = feedbackSteps.length > 0 ? (questionnaireRef.current?.getValues() ?? {}) : {};
    const feedback = buildPendingSchemaRunFeedback(feedbackSteps, values, displayResults);
    onSave({ name: name.trim(), inputData: pendingRun.inputData, results }, feedback);
  };

  return (
    <AnimatePresence>
      {open && pendingRun ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-x-0 bottom-0 top-[88px] z-40 flex bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-50 m-6 flex max-h-[calc(100dvh-136px)] flex-1 flex-col overflow-hidden rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-hover)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-8">
              <div className="space-y-2">
                <AppCopy className="text-xs uppercase tracking-[0.22em]">Prediction Review</AppCopy>
                <AppSectionTitle className="text-4xl">Save Schema Run</AppSectionTitle>
              </div>
              <AppIconButton type="button" aria-label="Close modal" onClick={onCancel}>
                <X size={24} />
              </AppIconButton>
            </div>

            <div className="grid flex-1 gap-8 overflow-auto p-8 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(28rem,1.2fr)]">
              <div className="space-y-6">
                <AppPanel className="space-y-4 p-6">
                  <AppSectionTitle>Prediction Name</AppSectionTitle>
                  <AppTextField
                    id="schema-run-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-4 pt-2">
                    <AppButton onClick={onCancel} variant="secondary" className="flex-1">
                      Cancel
                    </AppButton>
                    <AppButton
                      onClick={() => void handleSave()}
                      disabled={!name.trim() || isSaving || pendingRun.reportsPending}
                      className="flex-1"
                    >
                      <Save size={18} />
                      <span>
                        {pendingRun.reportsPending ? "Waiting reports" : "Save Prediction"}
                      </span>
                    </AppButton>
                  </div>
                  {pendingRun.reportsPending ? (
                    <AppCopy>
                      Plugin reports still running. Save unlocks when reports finish.
                    </AppCopy>
                  ) : null}
                </AppPanel>

                <SchemaRunInputsPanel schema={version.formSchema} inputData={displayInputData} />
              </div>

              <div className="space-y-6">
                {feedbackSteps.length > 0 ? (
                  <AppPanel className="space-y-4">
                    <AppSectionTitle>Plugin feedback</AppSectionTitle>
                    <ReportQuestionnaireMount
                      ref={questionnaireRef}
                      title="Feedback"
                      schema={feedbackQuestionnaire.schema}
                      initialValues={feedbackQuestionnaire.initialValues}
                      editable
                      theme={theme}
                      mode="navigation"
                    />
                  </AppPanel>
                ) : null}
                <SchemaRunReportsPanel
                  version={version}
                  results={displayResults}
                  customReportDefinitions={catalog.data.reportDefinitions}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
