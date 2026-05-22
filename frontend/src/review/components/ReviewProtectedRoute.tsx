import { Navigate, Outlet, useParams } from "react-router";
import { useUser } from "../../user/hooks";
import { ReviewShell } from "./ReviewShell";

export function ReviewProtectedRoute() {
  const { token = "" } = useParams<{ token: string }>();
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <ReviewShell>
        <p className="text-sm text-[var(--text-secondary)]">Loading review</p>
      </ReviewShell>
    );
  }
  if (!user) {
    return <Navigate to={`/review/${token}/login`} replace />;
  }
  return <Outlet />;
}
