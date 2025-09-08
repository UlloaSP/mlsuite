import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as userApi from "./api/userService";

export const USER_QUERY_KEY = ["user"];

export const useUser = () =>
	useQuery({
		queryKey: USER_QUERY_KEY,
		queryFn: userApi.getProfile,
		gcTime: 30 * 60_000, // 30 min en caché
	});

export const useLogout = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: userApi.logout,
		onSuccess: () => {
			qc.cancelQueries({ queryKey: USER_QUERY_KEY });
			qc.resetQueries({ queryKey: USER_QUERY_KEY, exact: true });
		},
	});
};
