/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { uploadPlugin } from "../services";
import { useInvalidatePluginQueries } from "./use-invalidate-plugin-queries";

export const useUploadPluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    mutationFn: uploadPlugin,
    onSuccess: invalidatePluginQueries,
  });
};
