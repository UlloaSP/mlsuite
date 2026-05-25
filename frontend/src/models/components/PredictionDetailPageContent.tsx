/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import type { PredictionDto, SignatureDto } from "../api/modelService";
import { extractPredictionExplanationEntries } from "../explanation-feedback-utils";
import { useGetExplanationFeedback, useGetTargets } from "../hooks";
import { useGetOutputFeedback } from "../output-feedback-hooks";
import { useUser } from "../../user/hooks";
import { formatTimestamp, getPredictionExecutionTime, getPredictionTimestamp } from "../utils";
import { getOutputReports } from "../report-contract";
import { PredictionDetailMetrics } from "./PredictionDetailMetrics";
import { PredictionExplanationCard } from "./PredictionExplanationCard";
import { PredictionInputsPanel } from "./PredictionInputsPanel";
import { PredictionTargetFeedbackCard } from "./PredictionTargetFeedbackCard";
import { PredictionTargetsPanel } from "./PredictionTargetsPanel";

type PredictionDetailPageContentProps = {
  prediction: PredictionDto;
  signature?: SignatureDto;
};

export function PredictionDetailPageContent({
  prediction,
  signature,
}: PredictionDetailPageContentProps) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const { data: user } = useUser();
  const [inputsOpen, setInputsOpen] = useState(true);
  const [targetsOpen, setTargetsOpen] = useState(true);
  const { data: targets = [] } = useGetTargets({ predictionId: prediction.id || "" });
  const { data: outputFeedback = [] } = useGetOutputFeedback({ predictionId: prediction.id || "" });
  const { data: explanationFeedback = [] } = useGetExplanationFeedback({
    predictionId: prediction.id || "",
  });

  const explanationEntries = useMemo(
    () =>
      extractPredictionExplanationEntries(
        prediction.prediction,
        signature?.inputSignature,
      ),
    [prediction.prediction, signature?.inputSignature],
  );
  const currentUserId = user?.id ? Number(user.id) : null;
  const otherExplanationFeedbackByOrder = useMemo(() => {
    const map = new Map<number, typeof explanationFeedback>();
    for (const item of explanationFeedback) {
      if (item.userId === currentUserId) {
        continue;
      }
      const list = map.get(item.order) ?? [];
      list.push(item);
      map.set(item.order, list);
    }
    return map;
  }, [explanationFeedback, currentUserId]);
  const myExplanationFeedbackByOrder = useMemo(() => {
    const map = new Map<number, (typeof explanationFeedback)[number]>();
    for (const item of explanationFeedback) {
      if (item.userId === currentUserId) {
        map.set(item.order, item);
      }
    }
    return map;
  }, [explanationFeedback, currentUserId]);
  const myOutputFeedbackByOrder = useMemo(() => {
    const map = new Map<number, (typeof outputFeedback)[number]>();
    for (const item of outputFeedback) {
      if (item.userId === currentUserId) {
        map.set(item.order, item);
      }
    }
    return map;
  }, [outputFeedback, currentUserId]);
  const otherOutputFeedbackByOrder = useMemo(() => {
    const map = new Map<number, typeof outputFeedback>();
    for (const item of outputFeedback) {
      if (item.userId === currentUserId) {
        continue;
      }
      const list = map.get(item.order) ?? [];
      list.push(item);
      map.set(item.order, list);
    }
    return map;
  }, [outputFeedback, currentUserId]);
  const reports = useMemo(
    () => getOutputReports(signature?.inputSignature),
    [signature?.inputSignature],
  );

  const myFeedbackStatus = useMemo(() => {
    const requiredOutputs = reports.length;
    let requiredExplanations = 0;
    for (const entry of explanationEntries) {
      if (entry.feedbackQuestionnaire) {
        requiredExplanations += 1;
      }
    }
    const myOutputCount = myOutputFeedbackByOrder.size;
    const myExplanationCount = myExplanationFeedbackByOrder.size;
    return myOutputCount >= requiredOutputs && myExplanationCount >= requiredExplanations
      ? ("COMPLETED" as const)
      : ("PENDING" as const);
  }, [
    reports.length,
    explanationEntries,
    myOutputFeedbackByOrder.size,
    myExplanationFeedbackByOrder.size,
  ]);

  return (
    <div className="space-y-6">
      <PredictionDetailMetrics
        targetCount={targets.length}
        executionTime={getPredictionExecutionTime(prediction.prediction)}
        timestamp={formatTimestamp(getPredictionTimestamp(prediction))}
        status={myFeedbackStatus}
      />

      <PredictionTargetsPanel
        open={targetsOpen}
        onToggle={() => setTargetsOpen((current) => !current)}
        targets={targets}
        signatureSchema={signature?.inputSignature}
        predictionValue={prediction.prediction}
      />

      {targets.map((target) => (
        <PredictionTargetFeedbackCard
          key={target.id}
          predictionId={prediction.id}
          target={target}
          outputFeedback={myOutputFeedbackByOrder.get(target.order)}
          otherFeedback={otherOutputFeedbackByOrder.get(target.order)}
          reportConfig={reports[target.order]}
          signatureSchema={signature?.inputSignature}
          predictionValue={prediction.prediction}
          theme={theme}
        />
      ))}

      <PredictionInputsPanel
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
        inputs={prediction.inputs}
      />

      {explanationEntries.map((explanation) => (
        <PredictionExplanationCard
          key={explanation.explanationId}
          predictionId={prediction.id}
          explanation={explanation}
          feedback={myExplanationFeedbackByOrder.get(explanation.order)}
          otherFeedback={otherExplanationFeedbackByOrder.get(explanation.order)}
          theme={theme}
        />
      ))}
    </div>
  );
}
