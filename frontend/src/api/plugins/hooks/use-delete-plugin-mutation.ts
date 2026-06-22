/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deletePlugin } from "../services";
import { useInvalidatePluginQueries } from "./use-invalidate-plugin-queries";

export const useDeletePluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    mutationFn: deletePlugin,
    onSuccess: invalidatePluginQueries,
  });
};
