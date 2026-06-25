/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deleteOrganization } from "../services";
import { useInvalidateOrganizationQueries } from "./use-invalidate-organization-queries";

export const useDeleteOrganizationMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({ mutationFn: deleteOrganization, onSuccess: () => void invalidate() });
};
