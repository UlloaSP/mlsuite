/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { transferOrganizationOwnership } from "../services";
import { useInvalidateOrganizationQueries } from "./use-invalidate-organization-queries";

type TransferOrganizationOwnershipRequest = {
  organizationId: number;
  nextOwnerMembershipId: number;
};

export const useTransferOrganizationOwnershipMutation = () => {
  const invalidate = useInvalidateOrganizationQueries();
  return useMutation({
    mutationFn: ({ organizationId, nextOwnerMembershipId }: TransferOrganizationOwnershipRequest) =>
      transferOrganizationOwnership(organizationId, nextOwnerMembershipId),
    onSuccess: () => void invalidate(),
  });
};
