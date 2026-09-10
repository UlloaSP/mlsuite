import { AppBadge } from "@/shared/ui/AppBadge";
import { FeedbackStatusBadge, type FeedbackStatusDisplay } from "./FeedbackStatusBadge";

type Props = {
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  feedback?: FeedbackStatusDisplay;
};

export function PredictionStatusSummary({ status, feedback }: Props) {
  return (
    <div className="grid min-w-0 max-w-full items-center gap-3 sm:grid-cols-[12rem_15rem]">
      <AppBadge
        className="w-full max-w-48 justify-center text-center"
        tone={
          status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger"
        }
      >
        {status.replaceAll("_", " ")}
      </AppBadge>
      <FeedbackStatusBadge status={feedback} />
    </div>
  );
}
