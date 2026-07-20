/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { uploadPlugin } from "@/api/plugins/services";
import { useInvalidatePluginQueries } from "./use-invalidate-plugin-queries";

export const useUploadPluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: uploadPlugin,
    onSuccess: invalidatePluginQueries,
  });
};
