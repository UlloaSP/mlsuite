/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { updateOrganization } from "../services";
import { useInvalidateOrganizationQueries } from "./use-invalidate-organization-queries";

type RenameOrganizationRequest = {
  id: number;
  name: string;
  description?: string | null;
};

export const useRenameOrganizationMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: ({ id, name, description }: RenameOrganizationRequest) =>
      updateOrganization(id, { name, description: description ?? undefined }),
    onSuccess: () => void invalidate(),
  });
};
