/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { archiveModel } from "@/api/models/services";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export const useArchiveModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: archiveModel,
    onSuccess: () => void invalidate(),
  });
};
