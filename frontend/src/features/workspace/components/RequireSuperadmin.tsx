import type { PropsWithChildren } from "react";
import { useCurrentUserIsSuperadmin } from "@/capabilities/workspace-context/session";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";

export function RequireSuperadmin({ children }: PropsWithChildren) {
  const canAccess = useCurrentUserIsSuperadmin();
  return canAccess ? <>{children}</> : <NotFoundError />;
}
