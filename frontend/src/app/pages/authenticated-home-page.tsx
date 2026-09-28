import { Navigate } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";

/** ProtectedRoute renders this only after the workspace context has loaded. */
export function AuthenticatedHomePage() {
  const permissions = useWorkspaceContext().data?.permissions;
  if (permissions?.canViewWorkspace) return <Navigate to="/workspace" replace />;
  if (permissions?.canReview || permissions?.canManageReviews) {
    return <Navigate to="/review" replace />;
  }
  return <Navigate to="/profile" replace />;
}
