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
