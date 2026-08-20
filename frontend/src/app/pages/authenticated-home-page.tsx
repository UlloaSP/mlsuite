import { Navigate } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";

export function AuthenticatedHomePage() {
  const workspace = useWorkspaceContext();

  if (workspace.isLoading) return <EditorAssemblyLoader />;
  const permissions = workspace.data?.permissions;
  if (permissions?.canViewWorkspace) return <Navigate to="/workspace" replace />;
  if (permissions?.canReview || permissions?.canManageReviews) {
    return <Navigate to="/review" replace />;
  }
  return <Navigate to="/profile" replace />;
}
