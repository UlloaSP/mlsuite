// @vitest-environment jsdom

import { expect, test } from "vite-plus/test";
import { NotificationInvitationItem } from "@/features/workspace/components/NotificationInvitationItem";
import type { InvitationDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

const invitation: InvitationDto = {
  id: 3,
  organizationId: 9,
  organizationName: "Cardio Lab",
  email: "alice@corp.example",
  roleDefinition: { id: 1, name: "Member" } as InvitationDto["roleDefinition"],
  status: "PENDING",
  token: null,
  expiresAt: "2026-11-03T10:00:00Z",
  createdAt: "2026-10-27T10:00:00Z",
};

test("an invitation to this account's address points to its link and offers no way to join without it", async () => {
  const { host } = await mount(<NotificationInvitationItem invitation={invitation} />);

  expect(host.textContent).toContain("Cardio Lab");
  expect(host.textContent).toContain("Open the invitation link");
  expect(host.querySelectorAll("button")).toHaveLength(0);
});
