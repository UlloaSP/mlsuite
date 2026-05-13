import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "./api/adminUserService";

const ADMIN_USERS_QUERY_KEY = ["adminUsers"];

export const useAdminUsers = () =>
	useQuery({
		queryKey: ADMIN_USERS_QUERY_KEY,
		queryFn: adminApi.listUsers,
	});

export const useCreateAdminUser = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: adminApi.createUser,
		onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
	});
};

export const useUpdateAdminUser = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: adminApi.AdminUpdateUserPayload }) =>
			adminApi.updateUser(id, payload),
		onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
	});
};

export const useResetAdminUserPassword = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, password }: { id: number; password: string }) =>
			adminApi.resetPassword(id, password),
		onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
	});
};
