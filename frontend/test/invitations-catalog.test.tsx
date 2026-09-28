// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { InvitationCatalog } from "@/features/workspace/components/InvitationCatalog";
import { click, mount } from "./support/dom";
const hooks = vi.hoisted(() => ({
  query: vi.fn(),
  retry: vi.fn(),
  mutate: vi.fn(),
  bulk: vi.fn(),
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationInvitationsQuery: hooks.query,
}));
vi.mock("@/features/workspace/api/invitation.mutations", () => ({
  useBulkRevokeInvitationsMutation: () => ({ mutateAsync: hooks.bulk }),
  useResendInvitationMutation: () => ({ mutate: hooks.mutate }),
  useRevokeInvitationMutation: () => ({ mutate: hooks.mutate }),
}));
let host: HTMLDivElement;
const rows = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  email: `person${i + 1}@example.com`,
  organizationId: 3,
  organizationName: "QA",
  roleDefinition: { name: "Custom reviewer" },
  status: i === 20 ? "ACCEPTED" : "PENDING",
  expiresAt: "2026-10-01T00:00:00Z",
  token: "test-token",
}));
beforeEach(() => {
  hooks.query.mockReturnValue({ data: rows, isSuccess: true, refetch: hooks.retry });
  hooks.bulk.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
});
async function render(search = "", manage = false) {
  ({ host } = await mount(<InvitationCatalog organizationId={3} canManage={manage} />, {
    route: `/invitations${search}`,
  }));
}
test("shows total and ten cards, with bidirectional pagination", async () => {
  await render();
  expect(host.textContent).toContain("21 invitations");
  expect(host.textContent?.match(/Custom reviewer/g)).toHaveLength(10);
  expect(host.textContent).not.toContain("person11@example.com");
  await click("Next", host);
  expect(host.textContent).toContain("person11@example.com");
  await click("Next", host);
  expect(host.textContent).toContain("person21@example.com");
  await click("Previous", host);
  expect(host.textContent).toContain("person11@example.com");
  expect(host.querySelector('input[type="checkbox"]')).toBeNull();
  expect(host.textContent).not.toContain("Revoke");
});
test("filters by status and clamps page", async () => {
  await render("?status=ACCEPTED&page=3");
  expect(host.textContent).toContain("1 of 21 invitations");
  expect(host.textContent).toContain("person21@example.com");
});
test("searches email", async () => {
  await render("?q=person21@");
  expect(host.textContent).toContain("1 of 21 invitations");
});
test("shows clear empty state for unmatched query", async () => {
  await render("?q=missing");
  expect(host.textContent).toContain("No matching invitations");
});
test("reports request errors and retries", async () => {
  hooks.query.mockReturnValue({ isError: true, refetch: hooks.retry });
  await render();
  expect(host.textContent).toContain("Could not load invitations.");
  expect(host.textContent).not.toContain("No invitations yet");
  await click("Retry", host);
  expect(hooks.retry).toHaveBeenCalledOnce();
});
test("preserves page while loading instead of showing zero", async () => {
  hooks.query.mockReturnValue({ isPending: true });
  await render("?page=2");
  expect(host.textContent).toContain("Loading invitations…");
  expect(host.textContent).not.toContain("0 invitations");
});
test("offers authorized actions, clears selection on page change, and disables accepted resend", async () => {
  await render("", true);
  const checkbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await click(checkbox);
  expect(host.textContent).toContain("Bulk revoke (1)");
  await click("Bulk revoke (1)", host);
  expect(hooks.bulk).toHaveBeenCalledWith([1]);
  await click(checkbox);
  await click("Next", host);
  expect(host.textContent).not.toContain("Bulk revoke");
  await click("Next", host);
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Open actions for person21@example.com"]',
  )!;
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  const resend = [...document.body.querySelectorAll('[role="menuitem"]')].find(
    (node) => node.textContent === "Resend",
  );
  expect(resend?.getAttribute("aria-disabled")).toBe("true");
  expect(document.body.querySelector('[role="menu"]')?.textContent).toContain("Revoke");
});
