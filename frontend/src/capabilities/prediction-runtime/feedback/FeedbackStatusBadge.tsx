import { AppBadge } from "@/shared/ui/AppBadge";
import { AppSkeleton } from "@/shared/ui/AppSkeleton";
import type { SchemaFeedbackStatus } from "./feedback-completion";

export type FeedbackStatusDisplay = SchemaFeedbackStatus | "LOADING" | "ERROR";

export function FeedbackStatusBadge({ status = "LOADING" }: { status?: FeedbackStatusDisplay }) {
  return (
    <span className="grid w-60 max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
      <span className="text-fg-secondary">Feedback</span>
      {status === "LOADING" ? (
        <>
          <AppSkeleton className="h-5 w-20 justify-self-start" />
          <span className="sr-only">Loading feedback status…</span>
        </>
      ) : (
        <AppBadge
          className="min-w-0 justify-self-start"
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
            : status === "ERROR"
              ? "Unavailable"
              : status}
        </AppBadge>
      )}
    </span>
  );
}
