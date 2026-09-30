import { AppBadge } from "@/shared/ui/AppBadge";
import type { SchemaFeedbackStatus } from "./feedback-completion";

/** A run's feedback completion, or ERROR when its schema or questionnaire cannot be read. */
export type FeedbackStatusDisplay = SchemaFeedbackStatus | "ERROR";

export function FeedbackStatusBadge({ status }: { status: FeedbackStatusDisplay }) {
  return (
    <AppBadge
      tone={
        status === "COMPLETED"
          ? "success"
          : status === "PENDING"
            ? "warning"
            : status === "ERROR"
              ? "danger"
              : "neutral"
      }
    >
      {status === "NOT_REQUIRED" ? "Not configured" : status === "ERROR" ? "Unavailable" : status}
    </AppBadge>
  );
}
