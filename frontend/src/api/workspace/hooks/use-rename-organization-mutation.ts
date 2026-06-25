/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { updateOrganization } from "../services";
import { useInvalidateOrganizationQueries } from "./use-invalidate-organization-queries";

type RenameOrganizationRequest = {
  description?: string | null;
  id: number;
  name: string;
  slug?: string;
};

export const useRenameOrganizationMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: ({ id, name, slug, description }: RenameOrganizationRequest) =>
      updateOrganization(id, { name, slug, description: description ?? undefined }),
    onSuccess: () => void invalidate(),
  });
};
