import type { RoleDefinitionDto } from "../../../workspace/types";

/**
 * invitationRoleOptions: performs the exported transformation for this algorithm.
 *
 * Purpose: derives invite role options from organization/team/custom roles.
 * @param roles - Input consumed by invitationRoleOptions; uses the derives invite role options from organization/team/custom roles contract.
 * @param canTransferOwnership - Input consumed by invitationRoleOptions; uses the derives invite role options from organization/team/custom roles contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
