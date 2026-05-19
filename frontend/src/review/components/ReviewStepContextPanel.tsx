import type { ReviewFeedbackStep } from "./reviewCombinedQuestionnaire";

type ReviewStepContextPanelProps = {
  step?: ReviewFeedbackStep;
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

export function ReviewStepContextPanel({ step }: ReviewStepContextPanelProps) {
  if (!step) {
    return null;
  }
  const title = step.kind === "output" ? "Current output" : "Current explanation";
  const content = lines(step.description.replace(/^Prediction (result|explanation):\s*/i, ""));
  return (
    <aside className="lg:sticky lg:top-28">
      <div className="border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          {title}
        </p>
        <h3 className="mt-2 text-base font-semibold leading-5 text-[var(--text-primary)]">
          {step.title}
        </h3>
        <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          {content.length > 0 ? (
            content.map((item) => (
              <p key={`${step.id}-${item.key}`} className="break-words">
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
