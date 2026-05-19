import type { PredictionExplanationDescriptor } from "../../models/questionnaire-feedback";

type ReviewExplanationsSectionProps = {
  explanations: PredictionExplanationDescriptor[];
};

export function ReviewExplanationsSection({ explanations }: ReviewExplanationsSectionProps) {
  if (explanations.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No explanations.</p>;
  }

  return (
    <div className="space-y-5">
      {explanations.map((explanation) => (
        <div key={explanation.explanationId} className="space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{explanation.label}</p>
          {explanation.error ? (
            <p className="text-sm text-[var(--danger-text)]">{explanation.error}</p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-[var(--text-primary)]">
              {explanation.content.join("\n\n")}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
