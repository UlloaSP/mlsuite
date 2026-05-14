import { describe, expect, it } from "vite-plus/test";
import { invitationRoleOptions } from "../src/workspace/permissions/invitationRoleOptions";
import type { RoleDefinitionDto } from "../src/workspace/types";

const role = (id: number, name: string, systemKey: string | null, canAssign = true): RoleDefinitionDto => ({
	id,
	name,
	slug: name.toLowerCase().replaceAll(" ", "-"),
	description: name,
	scope: "ORGANIZATION",
	locked: Boolean(systemKey),
	systemKey,
	userCount: 0,
	permissions: [],
	actions: {
		canView: true,
		canEdit: false,
		canDelete: false,
		canDuplicate: false,
		canAssign,
	},
});

const roles = [
	role(1, "Owner", "OWNER"),
	role(2, "Admin", "ADMIN"),
	role(3, "Analyst", null),
	role(4, "Hidden", null, false),
];

describe("RBAC permission helpers", () => {
	it("uses organization catalog roles for standard invitations", () => {
		expect(invitationRoleOptions(roles, false).map((item) => item.name)).toEqual(["Admin", "Analyst", "Hidden"]);
	});

	it("includes owner only for ownership transfer capable users", () => {
		expect(invitationRoleOptions(roles, true).map((item) => item.name)).toEqual(["Owner", "Admin", "Analyst", "Hidden"]);
	});
});
