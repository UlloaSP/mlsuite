import type { TargetDto } from "../../models/api/modelService";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../../models/target-utils";

type ReviewOutputsSectionProps = {
  targets: TargetDto[];
  signatureSchema: unknown;
  predictionValue: unknown;
};

export function ReviewOutputsSection({
  targets,
  signatureSchema,
  predictionValue,
}: ReviewOutputsSectionProps) {
  return (
    <div className="divide-y divide-[var(--border-soft)]">
      {targets.map((target) => {
        const probability = getTargetProbability(target.value);
        return (
          <div key={target.id} className="grid gap-1 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {getTargetLabel(signatureSchema, target.order)}
            </p>
            <div className="font-mono text-sm text-[var(--text-primary)]">
              {String(
                getSchemaAwareTargetValue(
                  target.value,
                  signatureSchema,
                  target.order,
                  predictionValue,
                ) ?? "",
              )}
              {probability === null ? null : (
                <span className="ml-3 text-[var(--text-secondary)]">
                  {formatProbability(probability)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
