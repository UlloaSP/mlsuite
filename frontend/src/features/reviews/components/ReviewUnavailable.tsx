import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";

type ReviewUnavailableProps = {
  title?: string;
  description?: string;
};

export function ReviewUnavailable({
  title = "Review unavailable",
  description = "This review may have expired, closed, or been revoked.",
}: ReviewUnavailableProps) {
  return (
    <AppPage>
      <AppSurface className="flex flex-1 items-center justify-center overflow-auto">
        <AppEmptyState title={title} description={description} />
      </AppSurface>
    </AppPage>
  );
}
