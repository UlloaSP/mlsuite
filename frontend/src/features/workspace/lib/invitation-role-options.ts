import type { RoleDefinitionDto } from "@/shared/api/openapi.gen";

export function invitationRoleOptions(
  roles: RoleDefinitionDto[],
  canTransferOwnership: boolean,
): RoleDefinitionDto[] {
  return roles.filter(
    (role) =>
      role.scope === "ORGANIZATION" &&
      role.id != null &&
      (canTransferOwnership || role.systemKey !== "OWNER"),
  );
}
