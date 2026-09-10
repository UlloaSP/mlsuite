import { AppBadge } from "@/shared/ui/AppBadge";
import type { SchemaFeedbackStatus } from "./feedback-completion";

export type FeedbackStatusDisplay = SchemaFeedbackStatus | "LOADING" | "ERROR";

export function FeedbackStatusBadge({ status = "LOADING" }: { status?: FeedbackStatusDisplay }) {
  return (
    <span className="grid w-60 max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
      <span>Feedback:</span>
      <AppBadge
        className="min-w-0 justify-center text-center"
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
        {status === "NOT_REQUIRED"
          ? "Not configured"
          : status === "LOADING"
            ? "Loading…"
            : status === "ERROR"
              ? "Unavailable"
              : status}
      </AppBadge>
    </span>
  );
}
