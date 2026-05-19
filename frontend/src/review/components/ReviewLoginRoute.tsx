import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router";
import { AuthLandingPage } from "../../app/pages/AuthLandingPage";
import * as userApi from "../../user/api/userService";
import { useUser } from "../../user/hooks";

export function ReviewLoginRoute() {
	const { token = "" } = useParams<{ token: string }>();
	const { data: user, isLoading } = useUser();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const login = useMutation({
		mutationFn: userApi.login,
		onSuccess: (nextUser) => {
			qc.setQueryData(["user"], nextUser);
			void qc.invalidateQueries({ queryKey: ["user"] });
			navigate(`/review/${token}`, { replace: true });
		},
	});

	if (!isLoading && user) {
		return <Navigate to={`/review/${token}`} replace />;
	}

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
