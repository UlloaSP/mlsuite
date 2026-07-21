import { Navigate, useParams } from "react-router";
import { useLogin, useUser } from "@/capabilities/workspace-context/session";
import type { LoginPayload } from "@/capabilities/workspace-context/session-api";

type LoginViewProps = {
  loginBusy: boolean;
  loginError: unknown;
  onLogin: (request: LoginPayload) => void;
};

type Props = {
  renderLogin: (props: LoginViewProps) => React.ReactNode;
};

export function SchemaReviewLoginPage({ renderLogin }: Props) {
  const { token = "" } = useParams<{ token: string }>();
  const { data: user, isLoading } = useUser();
  const login = useLogin(`/review/${token}`);

  if (!isLoading && user) return <Navigate to={`/review/${token}`} replace />;
  return renderLogin({
    onLogin: (request) => login.mutate(request),
    loginBusy: login.isPending,
    loginError: login.error,
  });
}
