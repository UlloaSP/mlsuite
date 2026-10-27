// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { expect, test, vi } from "vite-plus/test";
import { createAppQueryClient } from "@/app/providers/query-client";
import { NotificationInvitationItem } from "@/features/workspace/components/NotificationInvitationItem";
import type { InvitationDto } from "@/shared/api/openapi.gen";
import { click, mount } from "./support/dom";

const invitation: InvitationDto = {
  id: 3,
  organizationId: 9,
  organizationName: "Cardio Lab",
  email: "alice@corp.example",
  roleDefinition: { id: 1, name: "Member" } as InvitationDto["roleDefinition"],
  status: "PENDING",
  expiresAt: "2026-11-03T10:00:00Z",
  createdAt: "2026-10-27T10:00:00Z",
};

const respond = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const calledPath = (fetchMock: ReturnType<typeof vi.fn>) =>
  new URL(String(fetchMock.mock.calls[0]?.[0])).pathname;

async function show(fetchMock: ReturnType<typeof vi.fn>, client?: QueryClient) {
  vi.stubGlobal("fetch", fetchMock);
  return mount(<NotificationInvitationItem invitation={invitation} />, { queryClient: client });
}

test("the invitee sees the organization and role with Accept and Decline", async () => {
  const { host } = await show(respond(200));

  expect(host.textContent).toContain("Cardio Lab");
  expect(host.textContent).toContain("Invited as member");
  expect([...host.querySelectorAll("button")].map((button) => button.textContent)).toEqual([
    "Accept",
    "Decline",
  ]);
});

test("accepting answers this invitation by its id", async () => {
  const fetchMock = respond(200, { ...invitation, status: "ACCEPTED" });
  await show(fetchMock);

  await click("Accept");

  expect(calledPath(fetchMock)).toBe("/api/invitations/3/accept");
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
});

test("declining answers this invitation by its id", async () => {
  const fetchMock = respond(204);
  await show(fetchMock);

  await click("Decline");

  expect(calledPath(fetchMock)).toBe("/api/invitations/3/decline");
});

test.each([
  [404, "Invitation '3' does not exist."],
  [400, "Invitation expired."],
  [400, "Invitation is not pending."],
])("a refused answer (%i) is reported and the buttons work again", async (status, message) => {
  const reported: unknown[] = [];
  const client = createAppQueryClient((error) => reported.push(error));
  const { host } = await show(respond(status, { status, message }), client);

  await click("Accept");

  expect(reported).toHaveLength(1);
  expect((reported[0] as Error).message).toBe(message);
  expect([...host.querySelectorAll("button")].every((button) => !button.disabled)).toBe(true);
});
