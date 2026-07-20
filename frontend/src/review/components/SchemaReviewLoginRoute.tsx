import { Navigate, useParams } from "react-router";
import { AuthLandingPage } from "@/app/pages/AuthLandingPage";
import { useLogin, useUser } from "@/features/user/api/user-session";

export function SchemaReviewLoginRoute() {
  const { token = "" } = useParams<{ token: string }>();
  const { data: user, isLoading } = useUser();
  const login = useLogin(`/review/${token}`);

  if (!isLoading && user) return <Navigate to={`/review/${token}`} replace />;
  return (
    <AuthLandingPage
      defaultMode="login"
      availableModes={["login"]}
      onLogin={(request) => login.mutate(request)}
      loginBusy={login.isPending}
      loginError={login.error}
    />
  );
}
