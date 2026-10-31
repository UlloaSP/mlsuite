// @vitest-environment jsdom
import { act } from "react";
import { Routes, Route } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { AdminAuditLogPage } from "@/features/workspace/pages/admin-audit-log-page";
import { AuditLogPage } from "@/features/workspace/pages/audit-log-page";
import { click, mount } from "./support/dom";

const access = vi.hoisted(() => ({ canViewAuditLog: true }));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: () => ({ data: { permissions: { ...access } } }),
  useOrganizationCatalogPageQuery: () => ({ data: { items: [] }, hasNextPage: false }),
}));

const entry = (
  id: number,
  action: string,
  metadata: Record<string, unknown> | null,
  actor: { kind: string; id: number | null; name: string } = {
    kind: "USER",
    id: 3,
    name: "Ada Admin",
  },
) => ({
  id,
  createdAt: "2026-10-01T10:00:00Z",
  actor,
  action,
  targetType: action.startsWith("ROLE") ? "ROLE" : "API_CLIENT",
  targetId: String(100 + id),
  metadata,
  organizationId: id === 5 ? null : 3,
  organizationName: id === 5 ? null : "Acme Health",
  ip: id === 1 ? "198.51.100.7" : null,
  requestId: id === 1 ? "a2f0a1c4-7a5e-4f3e-9d2a-3d0d6a1f2b11" : null,
});
const rows = [
  entry(
    1,
    "API_CLIENT_SUSPEND",
    { client: "North", reason: "unpaid" },
    { kind: "USER", id: 9, name: "Platform Root" },
  ),
  entry(2, "ROLE_DELETE", { name: "Analyst" }),
  entry(3, "SOMETHING_NEW", { detail: "Written before details had names" }),
  entry(4, "ROLE_UPDATE", { role: "Reader", name: { from: "Viewer", to: "Reader" } }),
  entry(5, "AUDIT_RETENTION_PRUNE", { removed: 12 }, { kind: "SYSTEM", id: null, name: "System" }),
  entry(6, "PREDICTION_RUN", { status: "SUCCESS" }, { kind: "VISITOR", id: null, name: "Public visitor" }),
  entry(7, "PREDICTION_RUN", { runId: 8 }, { kind: "API_CLIENT", id: null, name: "Lab2Pressure" }),
  entry(8, "AUTH_LOGIN_FAILED", null, { kind: "VISITOR", id: null, name: "who@example.test" }),
  entry(9, "ROLE_CREATE", null),
  ...Array.from({ length: 21 }, (_, index) => entry(index + 10, "ROLE_UPDATE", { role: `R${index}` })),
];
let fail = false;
let empty = false;
let requests: URL[];
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
beforeEach(() => {
  access.canViewAuditLog = true;
  fail = false;
  empty = false;
  requests = [];
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    if (fail) return new Response('{"message":"Unavailable"}', { status: 500 });
    const page = Number(url.searchParams.get("page"));
    const filter = url.searchParams.get("filter");
    const actorKind = url.searchParams.get("actorKind");
    const matched =
      url.searchParams.get("search") === "missing" || empty
        ? []
        : filter && filter !== "all"
          ? rows.filter((row) => row.action === filter)
          : actorKind
            ? rows.filter((row) => row.actor.kind === actorKind)
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
      <Route path="/admin/audit" element={<AdminAuditLogPage />} />
    </Routes>,
    { route: search.startsWith("/") ? search : `/organizations/3/audit-log${search}` },
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
  expect(host.textContent).toContain("Client: North · Reason: unpaid");
  expect(host.textContent).toContain("API client#101");
  expect(host.textContent).toContain("198.51.100.7");
  expect(host.textContent).toContain("a2f0a1c4");
  // An action this build has no label for still reads as words.
  expect(host.textContent).toContain("Something new");
  expect(host.textContent).not.toContain("SOMETHING_NEW");
  await click("Load more", host);
  await settle();
  expect(catalogRequests().some((url) => url.searchParams.get("page") === "1")).toBe(true);
});

test("shows what changed and never a blank actor, whoever acted", async () => {
  const host = await render();
  expect(host.textContent).toContain("Name: Viewer → Reader");
  expect(host.textContent).toContain("Written before details had names");
  expect(host.textContent).toContain("Audit entries pruned");
  expect(host.textContent).toContain("System");
  expect(host.textContent).toContain("API client · Lab2Pressure");
});

test("a visitor reads as one, with the email a failed sign-in tried", async () => {
  const host = await render("?actorKind=VISITOR");
  expect(host.textContent).toContain("2 entries");
  expect(host.textContent).toContain("Public visitor · who@example.test");
  expect(host.textContent).toMatch(/Public visitorAPI client#106/);
});

test("sends the period, actor and target filters from the URL to the server", async () => {
  await render("?from=2026-10-01&to=2026-10-02&actorKind=SYSTEM&actor=root&target=MODEL");
  const request = catalogRequests().at(-1)!;
  expect(request.searchParams.get("from")).toBe(new Date("2026-10-01T00:00:00").toISOString());
  // The whole of the last day is in: the API's end is exclusive.
  expect(request.searchParams.get("to")).toBe(new Date("2026-10-03T00:00:00").toISOString());
  expect(request.searchParams.get("actorKind")).toBe("SYSTEM");
  expect(request.searchParams.get("actor")).toBe("root");
  expect(request.searchParams.get("targetType")).toBe("MODEL");
});

test("asks for no filter it was not given", async () => {
  await render();
  const request = catalogRequests().at(-1)!;
  for (const name of ["from", "to", "actorKind", "actor", "targetType", "organization"]) {
    expect(request.searchParams.has(name)).toBe(false);
  }
});

test("states what an empty log will hold and how long it keeps it", async () => {
  empty = true;
  const host = await render();
  expect(host.textContent).toContain("Nothing recorded yet");
  expect(host.textContent).toContain("people, API clients, public visitors and the system");
  expect(host.textContent).toContain("kept for 7 days by default");
});

test("the platform log reads every organization and names whose each entry is", async () => {
  const host = await render("/admin/audit?organization=platform");
  const request = catalogRequests().at(-1)!;
  expect(request.pathname).toBe("/api/admin/audit-events/catalog");
  expect(request.searchParams.get("organization")).toBe("platform");
  expect(host.textContent).toContain("Acme Health");
  const scope = host.querySelector<HTMLInputElement>('input[aria-label="Filter by organization"]');
  expect(scope?.value).toBe("Platform events");
  expect(host.textContent).toContain("Audit entries pruned");
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
