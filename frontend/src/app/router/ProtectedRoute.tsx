/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet } from "react-router";
import { useUser } from "@/features/user/api/user-session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";

export function ProtectedRoute() {
  const { data: user, error, isLoading } = useUser();
  const workspace = useWorkspaceContext(Boolean(user) && !error);

  if (isLoading || workspace.isLoading) {
    return <EditorAssemblyLoader />;
  }

  if (!user || error || workspace.error) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
