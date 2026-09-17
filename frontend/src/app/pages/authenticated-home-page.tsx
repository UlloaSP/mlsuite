import { Navigate } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";

export function AuthenticatedHomePage() {
  const workspace = useWorkspaceContext();
  const showLoader = useStableLoading(workspace.isLoading);

  if (showLoader) return <AppPageLoader label="Loading workspace" />;
  const permissions = workspace.data?.permissions;
  if (permissions?.canViewWorkspace) return <Navigate to="/workspace" replace />;
  if (permissions?.canReview || permissions?.canManageReviews) {
    return <Navigate to="/review" replace />;
  }
  return <Navigate to="/profile" replace />;
}
