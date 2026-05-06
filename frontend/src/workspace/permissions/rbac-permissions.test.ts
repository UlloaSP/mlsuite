import { describe, expect, it } from "vite-plus/test";
import { invitationRoleOptions } from "./invitationRoleOptions";

describe("RBAC permission helpers", () => {
	it("excludes owner from standard invitations", () => {
		expect(invitationRoleOptions(false)).toEqual(["ADMIN", "MEMBER", "VIEWER"]);
	});

	it("includes owner only for ownership transfer capable users", () => {
		expect(invitationRoleOptions(true)).toEqual(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
	});
});
