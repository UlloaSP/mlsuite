/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { useWorkspaceContext } from "./use-workspace-context";
import { syncCurrentOrganizationAtom } from "../../../workspace/atoms";

export const useWorkspaceContextSync = (enabled = true) => {
  const syncCurrentOrganization = useSetAtom(syncCurrentOrganizationAtom);
  const query = useWorkspaceContext(enabled);

  useEffect(() => {
    syncCurrentOrganization(query.data?.currentOrganization.id ?? null);
  }, [query.data?.currentOrganization.id, syncCurrentOrganization]);

  return query;
};
