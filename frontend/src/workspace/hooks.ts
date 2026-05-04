import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import * as workspaceApi from "./api/workspaceService";
import { syncCurrentOrganizationAtom } from "./atoms";

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;

export const useWorkspaceContext = (enabled = true) =>
	useQuery({
		queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
		queryFn: workspaceApi.getWorkspaceContext,
		staleTime: 60_000,
		enabled,
	});

export const useWorkspaceContextSync = (enabled = true) => {
	const syncCurrentOrganization = useSetAtom(syncCurrentOrganizationAtom);
	const query = useWorkspaceContext(enabled);

	useEffect(() => {
		syncCurrentOrganization(query.data?.currentOrganization.id ?? null);
	}, [query.data?.currentOrganization.id, syncCurrentOrganization]);

	return query;
};

export const PENDING_INVITATIONS_QUERY_KEY = ["pendingInvitations"] as const;

export const usePendingInvitations = () =>
	useQuery({
		queryKey: PENDING_INVITATIONS_QUERY_KEY,
		queryFn: workspaceApi.getPendingInvitations,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

export const useAcceptInvitation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: workspaceApi.acceptInvitation,
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
			void qc.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY });
		},
	});
};

export const useDeclineInvitation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: workspaceApi.declineInvitation,
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
		},
	});
};

export const useSelectOrganization = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: workspaceApi.selectOrganization,
		onSuccess: (context) => {
			qc.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
			void qc.invalidateQueries({ queryKey: ["getModels"] });
		},
	});
};
