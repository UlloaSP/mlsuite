/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { renameModel } from "../services";
import { useInvalidateModelQueries } from "./use-invalidate-model-queries";

export const useRenameModelMutation = () => {
  const invalidate = useInvalidateModelQueries();
  return useMutation({ mutationFn: renameModel, onSuccess: () => void invalidate() });
};
