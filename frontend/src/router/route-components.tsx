/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate, Outlet } from "react-router";
import { useUser } from "../api/user/hooks";
import { useWorkspaceContextSync } from "../api/workspace/hooks";
import { EditorAssemblyLoader } from "./EditorAssemblyLoader";

export function EditorRouteFallback() {
  return <EditorAssemblyLoader />;
}

export function ProtectedRoute() {
  const { data: user, error, isLoading } = useUser();
  const workspace = useWorkspaceContextSync(Boolean(user) && !error);

  if (isLoading || workspace.isLoading) {
    return <EditorRouteFallback />;
  }

  if (!user || error || workspace.error) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
