import { AppEmptyState } from "../../app/components/ui";
import { ReviewShell } from "./ReviewShell";

type ReviewUnavailableProps = {
  title?: string;
  description?: string;
};

export function ReviewUnavailable({
  title = "Review link unavailable",
  description = "This link may have expired or been revoked.",
}: ReviewUnavailableProps) {
  return (
    <ReviewShell>
      <AppEmptyState title={title} description={description} />
    </ReviewShell>
  );
}
