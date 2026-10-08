/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Outlet } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppShellFrame } from "./AppShellLayout";
import { PublicFrame } from "./PublicFrame";

/**
 * The one place that frames public pages: the app shell for a signed-in member, the
 * public frame for everyone else. Pages under it render the same content either way
 * and never ask which frame they are in.
 */
export function SessionFrameLayout() {
  const user = useUser();
  const workspace = useWorkspaceContext(Boolean(user.data) && !user.error);
  const showLoader = useStableLoading(user.isLoading || workspace.isLoading);

  if (showLoader) return <AppPageLoader viewport label="Loading…" />;

  // The shell needs the member's workspace; without one the visitor gets the public frame.
  const Frame = user.data && !user.error && workspace.data ? AppShellFrame : PublicFrame;
  return (
    <Frame>
      <Outlet />
    </Frame>
  );
}
