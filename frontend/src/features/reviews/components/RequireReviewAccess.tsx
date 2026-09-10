import type { ReactNode } from "react";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";

export function RequireReviewAccess({ children }: { children: ReactNode }) {
  const canReview = useCan("canReview");
  const canManage = useCan("canManageReviews");
  if (!canReview && !canManage) return <NotFoundError />;
  return children;
}
