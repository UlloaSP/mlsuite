import { useEffect, useState } from "react";
import type { SchemaFeedbackStep } from "../../schemas/schema-feedback-steps";
import type { ReviewFeedbackStep } from "./reviewCombinedQuestionnaire";
import { REVIEW_STEP_CONTEXT_EVENT } from "./ReviewCombinedFeedbackForm";

const lines = (value: string) => {
  const seen = new Map<string, number>();
  return value.split("\n").flatMap((line) => {
    const text = line.trim();
    if (!text) return [];
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    return [{ key: `${text}-${count}`, text }];
  });
};

export function ReviewStepContextPanel() {
  const [activeStep, setActiveStep] = useState<
    ReviewFeedbackStep | SchemaFeedbackStep | undefined
  >();

  useEffect(() => {
    const onStepContext = (event: Event) => {
      setActiveStep(
        (event as CustomEvent<ReviewFeedbackStep | SchemaFeedbackStep | undefined>).detail,
      );
    };
    window.addEventListener(REVIEW_STEP_CONTEXT_EVENT, onStepContext);
    return () => window.removeEventListener(REVIEW_STEP_CONTEXT_EVENT, onStepContext);
  }, []);

  if (!activeStep) {
    return <aside className="lg:sticky lg:top-28" />;
  }
  const title = "Current output";
  const isGroupedSchemaStep = "usages" in activeStep;
  const content = lines(activeStep.description.replace(/^Prediction (result|report):\s*/i, ""));
  return (
    <aside className="lg:sticky lg:top-28">
      <div className="border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          {title}
        </p>
        <h3 className="mt-2 text-base font-semibold leading-5 text-[var(--text-primary)]">
          {activeStep.title}
        </h3>
        {isGroupedSchemaStep ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Models using this report
            </p>
            {activeStep.usages.map((usage, index) => (
              <div
                key={`${usage.resultId}-${usage.order}-${index}`}
                className="border-t border-[var(--border-soft)] pt-3"
              >
                <p className="break-words text-sm font-semibold text-[var(--text-primary)]">
                  {usage.modelId} / {usage.signatureId}
                </p>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {usage.content.length > 0 ? (
                    usage.content.map((line, lineIndex) => (
                      <p
                        key={`${usage.resultId}-${usage.order}-${lineIndex}`}
                        className="break-words"
                      >
                        {line}
                      </p>
                    ))
                  ) : (
                    <p>No result content available.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
            {content.length > 0 ? (
              content.map((item) => (
                <p key={`${activeStep.id}-${item.key}`} className="break-words">
                  {item.text}
                </p>
              ))
            ) : (
              <p>No result content available.</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
