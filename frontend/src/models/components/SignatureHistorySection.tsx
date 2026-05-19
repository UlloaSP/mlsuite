import { AppButton, AppEmptyState } from "../../app/components";
import type { PredictionDto, SignatureDto } from "../api/modelService";
import { PredictionHistoryTable } from "./PredictionHistoryTable";
import {
  PredictionHistoryToolbar,
  type PredictionDateRangeFilter,
  type PredictionFeedbackStatusFilter,
} from "./PredictionHistoryToolbar";

type SignatureHistorySectionProps = {
  signature: SignatureDto;
  predictions: PredictionDto[];
  statusByPredictionId: Map<string, "COMPLETED" | "PENDING">;
  canRunPredictions: boolean;
  query: string;
  status: PredictionFeedbackStatusFilter;
  dateRange: PredictionDateRangeFilter;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: PredictionFeedbackStatusFilter) => void;
  onDateRangeChange: (value: PredictionDateRangeFilter) => void;
  onOpenPrediction: (predictionId: string) => void;
  onCreatePrediction: () => void;
};

export function SignatureHistorySection({
  signature,
  predictions,
  statusByPredictionId,
  canRunPredictions,
  query,
  status,
  dateRange,
  onQueryChange,
  onStatusChange,
  onDateRangeChange,
  onOpenPrediction,
  onCreatePrediction,
}: SignatureHistorySectionProps) {
  return (
    <div className="space-y-4">
      <PredictionHistoryToolbar
        query={query}
        status={status}
        dateRange={dateRange}
        onQueryChange={onQueryChange}
        onStatusChange={onStatusChange}
        onDateRangeChange={onDateRangeChange}
        predictions={predictions}
        signatureSchema={signature.inputSignature}
      />
      {predictions.length === 0 ? (
        <AppEmptyState
          title="No predictions found"
          description={
            query || status !== "all" || dateRange !== "all"
              ? "No prediction matches the current search terms."
              : "Create the first prediction for this schema to populate history."
          }
          action={
            canRunPredictions ? (
              <AppButton type="button" onClick={onCreatePrediction}>
                + New Prediction
              </AppButton>
            ) : undefined
          }
        />
      ) : (
        <PredictionHistoryTable
          predictions={predictions}
          statusByPredictionId={statusByPredictionId}
          onOpenPrediction={onOpenPrediction}
        />
      )}
    </div>
  );
}
