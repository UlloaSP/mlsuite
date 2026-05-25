/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { lazy } from "react";
import { Navigate, Outlet } from "react-router";
import { useUser } from "../user/hooks";
import { useWorkspaceContextSync } from "../workspace/hooks";

export const CreatePredictionPage = lazy(async () => {
  const module = await import("../models/pages/create-prediction-page");
  return { default: module.CreatePredictionPage };
});

export const CreateSignaturePage = lazy(async () => {
  const module = await import("../models/pages/create-signature-page");
  return { default: module.CreateSignaturePage };
});

export function EditorRouteFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        Loading editor…
      </div>
    </div>
  );
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
