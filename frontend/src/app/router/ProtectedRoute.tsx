/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet, useLocation } from "react-router";
import { signInHref, useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function ProtectedRoute() {
  const location = useLocation();
  const { data: user, error, isLoading } = useUser();
  const workspace = useWorkspaceContext(Boolean(user) && !error);
  const showLoader = useStableLoading(isLoading || workspace.isLoading);

  if (showLoader) {
    return <AppPageLoader viewport label="Loading workspace…" />;
  }

  if (!user || error || workspace.error) {
    return <Navigate to={signInHref(`${location.pathname}${location.search}`)} replace />;
  }

  return <Outlet />;
}
