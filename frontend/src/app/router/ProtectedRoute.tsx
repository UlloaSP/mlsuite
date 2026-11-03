/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet, useMatches, useRouter } from "@tanstack/react-router";
import { signInLink, useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { isHttpError } from "@/shared/api/http";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useStableLoading } from "@/shared/ui/useStableLoading";

/** Only an ended session sends a member to sign in; any other failure is shown where it happened. */
export function ProtectedRoute() {
  // The page shown, not useLocation(): once the redirect starts, the location is already the
  // sign-in page, and returning there would nest returnTo on every render. Its address is built
  // as a link to it would be, so the search leaves out the fallbacks its route validated in.
  const router = useRouter();
  const returnTo = useMatches({
    select: (matches) => {
      const shown = matches.at(-1)!;
      return router.buildLocation({ to: shown.pathname, search: shown.search }).href;
    },
  });
  const { data: user, error, isLoading, refetch } = useUser();
  const workspace = useWorkspaceContext(Boolean(user) && !error);
  const showLoader = useStableLoading(isLoading || workspace.isLoading);

  if (showLoader) {
    return <AppPageLoader viewport label="Loading workspace…" />;
  }

  const failure = error ?? workspace.error;
  const signedOut = isHttpError(failure) && failure.status === 401;
  if (signedOut || (!user && !failure)) {
    return <Navigate {...signInLink(returnTo)} replace />;
  }
  if (!user || !workspace.data) {
    return (
      <RouteStatusPage
        status={isHttpError(failure) && failure.status === 0 ? 0 : 500}
        onRetry={() => void (error ? refetch() : workspace.refetch())}
      />
    );
  }

  return <Outlet />;
}
