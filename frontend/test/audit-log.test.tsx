// @vitest-environment jsdom
import { act } from "react";
import { Routes, Route } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { AuditLogPage } from "@/features/workspace/pages/audit-log-page";
import { click, mount } from "./support/dom";

const access = vi.hoisted(() => ({ canViewAuditLog: true }));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: () => ({ data: { permissions: { ...access } } }),
}));

const entry = (id: number, action: string, metadata: string | null, actor = "Ada Admin") => ({
  id,
  createdAt: "2026-10-01T10:00:00Z",
  actor: { id: 3, name: actor },
  action,
  targetType: action.startsWith("ROLE") ? "ROLE" : "API_CLIENT",
  targetId: String(100 + id),
  metadata,
});
const rows = [
  entry(1, "API_CLIENT_SUSPEND", "North: unpaid", "Platform Root"),
  entry(2, "ROLE_DELETE", "Analyst"),
  entry(3, "SOMETHING_NEW", null),
  ...Array.from({ length: 27 }, (_, index) => entry(index + 4, "ROLE_UPDATE", `Role ${index}`)),
];
let fail = false;
let requests: URL[];
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
beforeEach(() => {
  access.canViewAuditLog = true;
  fail = false;
  requests = [];
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    if (fail) return new Response('{"message":"Unavailable"}', { status: 500 });
    const page = Number(url.searchParams.get("page"));
    const filter = url.searchParams.get("filter");
    const matched =
      url.searchParams.get("search") === "missing"
        ? []
        : filter && filter !== "all"
          ? rows.filter((row) => row.action === filter)
          : rows;
    return new Response(
      JSON.stringify({
        items: matched.slice(page * 24, (page + 1) * 24),
        page,
        size: 24,
        totalItems: matched.length,
        hasNext: (page + 1) * 24 < matched.length,
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
});
afterEach(() => vi.unstubAllGlobals());

async function render(search = "") {
  const view = await mount(
    <Routes>
      <Route path="/organizations/:organizationId/audit-log" element={<AuditLogPage />} />
    </Routes>,
    { route: `/organizations/3/audit-log${search}` },
  );
  // A slow first load keeps its skeleton on screen a moment longer, so wait it out.
  for (let i = 0; i < 40; i++) {
    await settle();
    if (!view.host.textContent?.includes("Loading the audit log…")) break;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));
  }
  return view.host;
}
const catalogRequests = () =>
  requests.filter((url) => url.pathname.endsWith("/audit-events/catalog"));

test("lists recorded entries with readable actions, their actor, target and details", async () => {
  const host = await render();
  expect(catalogRequests()[0]!.pathname).toBe("/api/organizations/3/audit-events/catalog");
  expect(catalogRequests()[0]!.searchParams.get("page")).toBe("0");
  expect(host.textContent).toContain("30 entries");
  expect(host.textContent).toContain("API client suspended");
  expect(host.textContent).toContain("Platform");
  expect(host.textContent).toContain("Platform Root");
  expect(host.textContent).toContain("North: unpaid");
  expect(host.textContent).toContain("API client#101");
  // An action this build has no label for still reads as words.
  expect(host.textContent).toContain("Something new");
  expect(host.textContent).not.toContain("SOMETHING_NEW");
  await click("Load more", host);
  await settle();
  expect(catalogRequests().some((url) => url.searchParams.get("page") === "1")).toBe(true);
});

test("sends the action filter and search from the URL to the server", async () => {
  const host = await render("?action=ROLE_DELETE&q=analyst");
  const request = catalogRequests().at(-1)!;
  expect(request.searchParams.get("filter")).toBe("ROLE_DELETE");
  expect(request.searchParams.get("search")).toBe("analyst");
  expect(host.textContent).toContain("1 entry");
  expect(host.textContent).toContain("Role deleted");
  expect(host.textContent).not.toContain("API client suspended");
});

test("tells an empty search apart from an empty log", async () => {
  expect((await render("?q=missing")).textContent).toContain("No matching entries");
});

test("distinguishes a failed request from an empty log and retries", async () => {
  fail = true;
  const host = await render();
  expect(host.textContent).toContain("Could not load the audit log.");
  expect(host.textContent).not.toContain("Nothing recorded yet");
  fail = false;
  await click("Retry", host);
  await settle();
  expect(host.textContent).toContain("30 entries");
});

test("is denied, without asking for the log, to a role without the permission", async () => {
  access.canViewAuditLog = false;
  const host = await render();
  expect(host.textContent).toContain("Access");
  expect(host.textContent).toContain("denied.");
  expect(catalogRequests()).toEqual([]);
});
