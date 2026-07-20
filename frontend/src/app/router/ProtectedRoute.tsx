/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet } from "react-router";
import { useUser } from "@/api/user/hooks";
import { useWorkspaceContext } from "@/api/workspace/hooks";
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
