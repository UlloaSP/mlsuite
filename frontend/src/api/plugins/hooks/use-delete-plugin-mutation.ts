/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deletePlugin } from "@/api/plugins/services";
import { useInvalidatePluginQueries } from "./use-invalidate-plugin-queries";

export const useDeletePluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deletePlugin,
    onSuccess: invalidatePluginQueries,
  });
};
