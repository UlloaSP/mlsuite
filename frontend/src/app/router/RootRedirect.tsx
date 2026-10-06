/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Navigate } from "react-router";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import { useUser } from "@/capabilities/workspace-context/session";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";

/**
 * `/` has no page of its own. A visitor without a session lands on the public feed; a
 * signed-in member goes to their home.
 */
export function RootRedirect() {
  const { data: user, error, isLoading } = useUser();
  const showLoader = useStableLoading(isLoading);

  if (showLoader) return <AppPageLoader viewport label="Loading…" />;

  return <Navigate to={user && !error ? "/home" : EXPLORE_PATH} replace />;
}
