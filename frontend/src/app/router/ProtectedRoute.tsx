/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet, useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function ProtectedRoute() {
  const location = useLocation();
  const { data: user, error, isLoading } = useUser();
  const workspace = useWorkspaceContext(Boolean(user) && !error);
  const showLoader = useStableLoading(isLoading || workspace.isLoading);

  if (showLoader) {
    return <EditorAssemblyLoader scope="viewport" />;
  }

  if (!user || error || workspace.error) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}
