import { useUser } from "@/capabilities/workspace-context/session";
import { RouteStatusPage as SharedRouteStatusPage } from "@/shared/ui/RouteStatusPage";
import type { RouteStatus } from "@/shared/ui/RouteStatusPage";

export function RouteStatusPage({ status = 404 }: { status?: RouteStatus }) {
  const { data: user } = useUser();

  return (
    <SharedRouteStatusPage
      status={status}
      homePath={user ? "/workspace" : "/"}
      homeLabel={user ? "Go to Workspace" : "Go to Sign in"}
    />
  );
}
