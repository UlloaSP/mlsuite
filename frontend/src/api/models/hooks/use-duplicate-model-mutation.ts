/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { duplicateModel } from "../services";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export const useDuplicateModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({ mutationFn: duplicateModel, onSuccess: () => void invalidate() });
};
