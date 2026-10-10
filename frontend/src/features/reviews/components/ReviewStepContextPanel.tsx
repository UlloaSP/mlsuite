import { useEffect, useState } from "react";

export const REVIEW_STEP_CONTEXT_EVENT = "mlsuite-review-step-context";

type ReviewFeedbackStep = {
  id: string;
  title: string;
  description: string;
};

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
  const [activeStep, setActiveStep] = useState<ReviewFeedbackStep | undefined>();

  useEffect(() => {
    const onStepContext = (event: Event) => {
      setActiveStep((event as CustomEvent<ReviewFeedbackStep | undefined>).detail);
    };
    window.addEventListener(REVIEW_STEP_CONTEXT_EVENT, onStepContext);
    return () => window.removeEventListener(REVIEW_STEP_CONTEXT_EVENT, onStepContext);
  }, []);

  if (!activeStep) return null;
  const content = lines(activeStep.description.replace(/^Prediction (result|report):\s*/i, ""));
  return (
    <aside className="2xl:sticky 2xl:top-0 2xl:w-80 2xl:shrink-0">
      <div className="rounded-card border border-line bg-surface p-4">
        {/* The step under it carries the title; this is what the models answered. */}
        <div
          aria-label={activeStep.title}
          className="space-y-2 text-sm leading-6 text-fg-secondary"
        >
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
      </div>
    </aside>
  );
}
