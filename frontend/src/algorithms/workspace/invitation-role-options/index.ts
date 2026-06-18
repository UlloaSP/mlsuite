import type { RoleDefinitionDto } from "../../../workspace/types";

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
