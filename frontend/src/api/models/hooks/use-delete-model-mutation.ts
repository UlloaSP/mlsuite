/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deleteModel } from "../services";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export const useDeleteModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({ mutationFn: deleteModel, onSuccess: () => void invalidate() });
};
