/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { archiveModel } from "../services";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export const useArchiveModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({ mutationFn: archiveModel, onSuccess: () => void invalidate() });
};
