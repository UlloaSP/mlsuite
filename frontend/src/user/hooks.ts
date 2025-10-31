import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as userApi from "./api/userService";

export const USER_QUERY_KEY = ["user"];

export const useUser = () =>
	useQuery({
		queryKey: USER_QUERY_KEY,
		queryFn: userApi.getProfile,
		staleTime: 5 * 60_000, // 5 min "fresh"
		gcTime: 30 * 60_000,   // 30 min in cache
		// Optional: stop retries on 401/403
		retry: (count, err: any) => {
			const status = err?.status ?? err?.response?.status;
			if (status === 401 || status === 403) return false;
			return count < 2;
		},
	});

export const useLogout = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: userApi.logout,
		onSuccess: () => {
			// Clear any user state in cache
			qc.cancelQueries({ queryKey: USER_QUERY_KEY });
			qc.resetQueries({ queryKey: USER_QUERY_KEY, exact: true });
			// If your app holds additional auth-scoped caches, consider:
			// qc.clear(); // (nuclear option)
		},
	});
};

