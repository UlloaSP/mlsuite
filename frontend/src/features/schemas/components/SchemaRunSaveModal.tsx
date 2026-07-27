/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save, X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useAtom } from "jotai";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { themeWithHtmlAtom } from "@/shared/ui/ui-state";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppButton } from "@/shared/ui/AppButton";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppTextField } from "@/shared/ui/AppTextField";
import { buildCombinedFeedbackQuestionnaire } from "@/capabilities/mlform/combined-feedback-questionnaire";
import {
  ReportQuestionnaireMount,
  type ReportQuestionnaireMountHandle,
} from "@/capabilities/mlform/ReportQuestionnaireMount";
import type { CreatePredictionRunRequest } from "@/features/schemas/api/prediction-types";
import type { JsonRecord, SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { buildSchemaFeedbackSteps } from "@/capabilities/mlform/feedback-steps";
import {
  buildPendingSchemaRunFeedback,
  type PendingFeedback,
} from "@/features/schemas/lib/pending-feedback";
import { mergeSchemaRunInputs } from "@/capabilities/mlform/input-display";
import { schemaRunDebug } from "@/capabilities/mlform/run-debug";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";
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
  const [outputsOpen, setOutputsOpen] = useState(true);
  const [inputsOpen, setInputsOpen] = useState(true);
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
        id: `${result.modelId}-${index}`,
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
  schemaRunDebug("save-modal.render", {
    open,
    pendingRun,
    results,
    displayInputData,
    displayResults,
    feedbackSteps,
    pluginReports: catalog.data.reportDefinitions.map((definition) => definition.kind),
  });

  const handleSave = async () => {
    if (!pendingRun) return;
    const values = feedbackSteps.length > 0 ? (questionnaireRef.current?.getValues() ?? {}) : {};
    const feedback = buildPendingSchemaRunFeedback(feedbackSteps, values);
    const request = {
      name: name.trim(),
      inputData: displayInputData,
      results,
    };
    schemaRunDebug("save-modal.save", { request, feedback, values });
    onSave(request, feedback);
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && pendingRun ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-[10001] m-6 flex max-h-[calc(100dvh-3rem)] flex-1 flex-col overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-hover)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-8">
              <div className="space-y-2">
                <AppCopy className="text-xs uppercase tracking-[0.22em]">Inference</AppCopy>
                <AppSectionTitle className="text-4xl">Create inference</AppSectionTitle>
              </div>
              <AppIconButton type="button" aria-label="Close modal" onClick={onCancel}>
                <X size={24} />
              </AppIconButton>
            </div>

            <div className="flex-1 overflow-auto p-8">
              <div className="mx-auto w-full max-w-5xl space-y-6">
                <section data-inference-create-section="name">
                  <AppPanel className="space-y-4 p-6">
                    <AppSectionTitle>Name</AppSectionTitle>
                    <AppTextField
                      id="schema-run-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full"
                    />
                  </AppPanel>
                </section>

                {feedbackSteps.length > 0 ? (
                  <section data-inference-create-section="feedback">
                    <AppPanel>
                      <ReportQuestionnaireMount
                        ref={questionnaireRef}
                        title="Feedback questionnaire"
                        schema={feedbackQuestionnaire.schema}
                        initialValues={feedbackQuestionnaire.initialValues}
                        editable
                        theme={theme}
                        mode="navigation"
                      />
                    </AppPanel>
                  </section>
                ) : null}

                <section data-inference-create-section="outputs">
                  <SchemaRunReportsPanel
                    version={version}
                    results={displayResults}
                    open={outputsOpen}
                    onToggle={() => setOutputsOpen((current) => !current)}
                    customReportDefinitions={catalog.data.reportDefinitions}
                  />
                </section>

                <section data-inference-create-section="inputs">
                  <SchemaRunInputsPanel
                    schema={version.formSchema}
                    inputData={displayInputData}
                    open={inputsOpen}
                    onToggle={() => setInputsOpen((current) => !current)}
                  />
                </section>
              </div>
            </div>

            <div className="border-t border-[var(--border-soft)] p-6">
              <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-4">
                {pendingRun.reportsPending ? (
                  <AppCopy className="mr-auto">
                    Plugin reports still running. Save unlocks when reports finish.
                  </AppCopy>
                ) : null}
                <AppButton onClick={onCancel} variant="secondary">
                  Cancel
                </AppButton>
                <AppButton
                  onClick={() => void handleSave()}
                  disabled={!name.trim() || isSaving || pendingRun.reportsPending}
                >
                  <Save size={18} />
                  <span>{pendingRun.reportsPending ? "Waiting reports" : "Save inference"}</span>
                </AppButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
