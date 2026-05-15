import { Outlet } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthLandingPage } from "../../app/pages/AuthLandingPage";
import * as userApi from "../../user/api/userService";
import { useUser } from "../../user/hooks";
import { ReviewShell } from "./ReviewShell";

export function ReviewProtectedRoute() {
	const { data: user, isLoading } = useUser();
	const qc = useQueryClient();
	const login = useMutation({
		mutationFn: userApi.login,
		onSuccess: (nextUser) => {
			qc.setQueryData(["user"], nextUser);
			void qc.invalidateQueries({ queryKey: ["user"] });
		},
	});

	if (isLoading) {
		return (
			<ReviewShell>
				<p className="text-sm text-[var(--text-secondary)]">Loading review</p>
			</ReviewShell>
		);
	}
	if (!user) {
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
	return <Outlet />;
}
