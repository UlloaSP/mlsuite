import { SIGN_IN_PATH, useUser } from "@/capabilities/workspace-context/session";
import { RouteStatusPage as SharedRouteStatusPage } from "@/shared/ui/RouteStatusPage";
import type { RouteStatus } from "@/shared/ui/RouteStatusPage";

export function RouteStatusPage({ status = 404 }: { status?: RouteStatus }) {
  const { data: user } = useUser();

  return (
    <SharedRouteStatusPage
      status={status}
      homePath={user ? "/workspace" : SIGN_IN_PATH}
      homeLabel={user ? "Go to workspace" : "Go to sign in"}
    />
  );
}
