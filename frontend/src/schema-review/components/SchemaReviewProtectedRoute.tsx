import { Navigate, Outlet, useParams } from "react-router";
import { useUser } from "../../user/hooks";
import { ReviewShell } from "../../review/components/ReviewShell";

export function SchemaReviewProtectedRoute() {
  const { token = "" } = useParams<{ token: string }>();
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <ReviewShell>
        <p className="text-sm text-[var(--text-secondary)]">Loading review</p>
      </ReviewShell>
    );
  }
  if (!user) return <Navigate to={`/schema-review/${token}/login`} replace />;
  return <Outlet />;
}
