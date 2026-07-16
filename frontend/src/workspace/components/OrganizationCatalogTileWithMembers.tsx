/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";

import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import { getOrganizationMembers } from "../../api/workspace/services";
import { OrganizationCatalogTile } from "./OrganizationCatalogTile";
import type { OrganizationPatch } from "./OrganizationCatalogEditable";

type OrganizationCatalogTileWithMembersProps = {
  disabled: boolean;
  item: OrganizationCatalogItemDto;
  onDelete: () => void | Promise<void>;
  onPatch: (patch: OrganizationPatch) => void | Promise<void>;
  onTransferOwner: (membershipId: number) => void | Promise<void>;
};

export function OrganizationCatalogTileWithMembers({
  disabled,
  item,
  onDelete,
  onPatch,
  onTransferOwner,
}: OrganizationCatalogTileWithMembersProps) {
  const { data: members = [] } = useQuery({
    queryKey: ["organization-members", item.id],
    queryFn: () => getOrganizationMembers(item.id),
  });

  return (
    <OrganizationCatalogTile
      disabled={disabled}
      item={item}
      members={members}
      onDelete={onDelete}
      onPatch={onPatch}
      onTransferOwner={onTransferOwner}
    />
  );
}
