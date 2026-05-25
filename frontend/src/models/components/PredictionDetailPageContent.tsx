/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import type {
  ExplanationFeedbackDto,
  OutputFeedbackDto,
  PredictionDto,
  SignatureDto,
  TargetDto,
} from "../api/modelService";
import { extractPredictionReportEntries } from "../report-feedback-utils";
import { useGetExplanationFeedback, useGetTargets } from "../hooks";
import { useGetOutputFeedback } from "../output-feedback-hooks";
import { useUser } from "../../user/hooks";
import { formatTimestamp, getPredictionExecutionTime, getPredictionTimestamp } from "../utils";
import { getOutputReports } from "../report-contract";
import { PredictionDetailMetrics } from "./PredictionDetailMetrics";
import { PredictionFeedbackQuestionnaire } from "./PredictionFeedbackQuestionnaire";
import { PredictionInputsPanel } from "./PredictionInputsPanel";
import { PredictionReportsPanel } from "./PredictionReportsPanel";

type PredictionDetailPageContentProps = {
  prediction: PredictionDto;
  signature?: SignatureDto;
};

const EMPTY_TARGETS: TargetDto[] = [];
const EMPTY_OUTPUT_FEEDBACK: OutputFeedbackDto[] = [];
const EMPTY_REPORT_FEEDBACK: ExplanationFeedbackDto[] = [];

export function PredictionDetailPageContent({
  prediction,
  signature,
}: PredictionDetailPageContentProps) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const { data: user } = useUser();
  const [inputsOpen, setInputsOpen] = useState(true);
  const [targetsOpen, setTargetsOpen] = useState(true);
  const targetsQuery = useGetTargets({ predictionId: prediction.id || "" });
  const outputFeedbackQuery = useGetOutputFeedback({ predictionId: prediction.id || "" });
  const reportFeedbackQuery = useGetExplanationFeedback({
    predictionId: prediction.id || "",
  });
  const targets = targetsQuery.data ?? EMPTY_TARGETS;
  const outputFeedback = outputFeedbackQuery.data ?? EMPTY_OUTPUT_FEEDBACK;
  const reportFeedback = reportFeedbackQuery.data ?? EMPTY_REPORT_FEEDBACK;

  const reportEntries = useMemo(
    () =>
      extractPredictionReportEntries(
        prediction.prediction,
        signature?.inputSignature,
      ),
    [prediction.prediction, signature?.inputSignature],
  );
  const currentUserId = user?.id ? Number(user.id) : null;
  const myReportFeedbackByOrder = useMemo(() => {
    const map = new Map<number, (typeof reportFeedback)[number]>();
    for (const item of reportFeedback) {
      if (item.userId === currentUserId) {
        map.set(item.order, item);
      }
    }
    return map;
  }, [reportFeedback, currentUserId]);
  const myOutputFeedbackByOrder = useMemo(() => {
    const map = new Map<number, (typeof outputFeedback)[number]>();
    for (const item of outputFeedback) {
      if (item.userId === currentUserId) {
        map.set(item.order, item);
      }
    }
    return map;
  }, [outputFeedback, currentUserId]);
  const reports = useMemo(
    () => getOutputReports(signature?.inputSignature),
    [signature?.inputSignature],
  );

  const myFeedbackStatus = useMemo(() => {
    const requiredOutputs = reports.length;
    let requiredFeedbackReports = 0;
    for (const entry of reportEntries) {
      if (entry.feedbackQuestionnaire) {
        requiredFeedbackReports += 1;
      }
    }
    const myOutputCount = myOutputFeedbackByOrder.size;
    const myReportCount = myReportFeedbackByOrder.size;
    return myOutputCount >= requiredOutputs && myReportCount >= requiredFeedbackReports
      ? ("COMPLETED" as const)
      : ("PENDING" as const);
  }, [
    reports.length,
    reportEntries,
    myOutputFeedbackByOrder.size,
    myReportFeedbackByOrder.size,
  ]);

  return (
    <div className="space-y-6">
      <PredictionDetailMetrics
        targetCount={targets.length}
        executionTime={getPredictionExecutionTime(prediction.prediction)}
        timestamp={formatTimestamp(getPredictionTimestamp(prediction))}
        status={myFeedbackStatus}
      />

      <PredictionFeedbackQuestionnaire
        predictionId={prediction.id}
        targets={targets}
        outputFeedbackByOrder={myOutputFeedbackByOrder}
        reportFeedbackByOrder={myReportFeedbackByOrder}
        reports={reports}
        feedbackReports={reportEntries}
        signatureSchema={signature?.inputSignature}
        predictionValue={prediction.prediction}
        theme={theme}
        onSaved={async () => {
          await Promise.all([
            targetsQuery.refetch(),
            outputFeedbackQuery.refetch(),
            reportFeedbackQuery.refetch(),
          ]);
        }}
      />

      <PredictionReportsPanel
        open={targetsOpen}
        onToggle={() => setTargetsOpen((current) => !current)}
        targets={targets}
        reports={reportEntries}
        reportFeedbackByOrder={myReportFeedbackByOrder}
        signatureSchema={signature?.inputSignature}
        predictionValue={prediction.prediction}
      />

      <PredictionInputsPanel
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
        inputs={prediction.inputs}
      />
    </div>
  );
}
