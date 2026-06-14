/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { lazy } from "react";
import { Navigate, Outlet } from "react-router";
import { useUser } from "../user/hooks";
import { useWorkspaceContextSync } from "../workspace/hooks";
import { EditorAssemblyLoader } from "./EditorAssemblyLoader";

export const CreatePredictionPage = lazy(async () => {
  const module = await import("../models/pages/create-prediction-page");
  return { default: module.CreatePredictionPage };
});

export const CreateSignaturePage = lazy(async () => {
  const module = await import("../models/pages/create-signature-page");
  return { default: module.CreateSignaturePage };
});

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
