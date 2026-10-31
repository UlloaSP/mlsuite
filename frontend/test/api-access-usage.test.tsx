// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { protectedPages } from "@/app/router/protected-routes";
import { AdminApiTrafficPage } from "@/features/api-access/pages/admin-api-traffic-page";
import { ApiOverviewPage } from "@/features/api-access/pages/api-overview-page";
import { ApiRequestsPage } from "@/features/api-access/pages/api-requests-page";
import type {
  AdminApiClientDto,
  AdminApiOrganizationDto,
  ApiRequestDto,
  ApiUsageDto,
} from "@/shared/api/openapi.gen";
import { changeValue, click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));

const member = vi.hoisted(() => ({ permissions: [] as string[], role: "USER" }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
  useCan: (permission: string) => member.permissions.includes(permission),
  useWorkspaceContext: () => ({
    data: {
      currentOrganization: { id: 3 },
      permissions: Object.fromEntries(member.permissions.map((permission) => [permission, true])),
    },
  }),
}));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 1, systemRole: member.role }, error: null, isLoading: false }),
  useCurrentUserIsSuperadmin: () => member.role === "SUPERADMIN",
}));

const AT = "2026-10-15T10:00:00Z";

const call = (overrides: Partial<ApiRequestDto> = {}): ApiRequestDto => ({
  requestId: "3f0c6a8e-2b1d-4c5e-9a7f-0d1e2f3a4b5c",
  createdAt: AT,
  clientId: 9,
  clientName: "Lab2Pressure",
  keyPrefix: "mls_aaaaaaaa",
  bookmarkId: 70,
  bookmarkName: "production",
  predictionRunId: 501,
  status: 200,
  errorCode: null,
  durationMs: 120,
  ...overrides,
});
const refused = call({
  requestId: "r-422",
  status: 422,
  errorCode: "features_rejected",
  predictionRunId: null,
});
const usage = (overrides: Partial<ApiUsageDto> = {}): ApiUsageDto => ({
  period: "day",
  since: AT,
  calls: 40,
  rejected: 3,
  failed: 1,
  runtimeBusy: 1,
  p95DurationMs: 340,
  activeClients: 2,
  activeOrganizations: 1,
  series: [{ start: AT, succeeded: 36, rejected: 3, failed: 1 }],
  topClients: [
    {
      clientId: 9,
      clientName: "Lab2Pressure",
      organizationId: 3,
      organizationName: null,
      calls: 40,
      errors: 4,
    },
  ],
  recentFailures: [refused],
  month: { calls: 812, limit: 10000, resetsAt: "2026-11-01T00:00:00Z" },
  retentionDays: 90,
  ...overrides,
});
const trafficClient: AdminApiClientDto = {
  id: 9,
  name: "Lab2Pressure",
  status: "ACTIVE",
  suspensionReason: null,
  suspendedAt: null,
  organizationId: 3,
  organizationName: "Acme",
  organizationLogoUrl: null,
  organizationKind: "TEAM",
  keyCount: 1,
  lastUsedAt: AT,
  weekCalls: 120,
  weekErrors: 6,
};
const organization: AdminApiOrganizationDto = {
  organizationId: 3,
  name: "Acme",
  logoUrl: null,
  kind: "TEAM",
  clientCount: 1,
  monthCalls: 812,
  monthlyLimit: 10000,
  customLimit: false,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const page = (items: unknown[]) =>
  json({ items, page: 0, size: 24, totalItems: items.length, hasNext: false });
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const settle = async () => {
  for (let turn = 0; turn < 6; turn += 1) await flush();
};
const loaded = async () => {
  for (let turn = 0; turn < 200 && document.body.querySelector('[role="status"]'); turn += 1) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
};

let clientCount: number;
let fetchMock: ReturnType<typeof vi.fn>;
const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => {
    const parsed = new URL(String(url));
    const body = (init as RequestInit | undefined)?.body;
    return {
      method: (init as RequestInit | undefined)?.method ?? "GET",
      path: parsed.pathname,
      params: Object.fromEntries(parsed.searchParams),
      body: typeof body === "string" ? (JSON.parse(body) as unknown) : undefined,
    };
  });
const writes = () => requests().filter((request) => request.method !== "GET");

beforeEach(() => {
  member.permissions = ["canViewApiAccess"];
  member.role = "USER";
  clientCount = 1;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(String(url));
    if (pathname === "/api/api-clients") return page(clientCount ? [{ id: 9 }] : []);
    if (pathname === "/api/api-access/usage") return json(usage());
    if (pathname === "/api/api-access/requests") return page([call(), refused]);
    if (pathname === "/api/admin/api-traffic/usage") return json(usage({ month: null }));
    if (pathname === "/api/admin/api-traffic/clients") return page([trafficClient]);
    if (pathname.endsWith("/suspend")) return json({ ...trafficClient, status: "SUSPENDED" });
    if (pathname === "/api/admin/api-traffic/organizations") return page([organization]);
    if (pathname.endsWith("/call-limit") && init?.method === "PUT") return json(organization);
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function open(path: string, element: React.ReactNode, route = path) {
  const view = await mount(
    <Routes>
      <Route path={path} element={element} />
    </Routes>,
    { route, queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  );
  await settle();
  await loaded();
  return view.host;
}
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');
async function chooseAction(name: string, label: string) {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    `[aria-label="Open actions for ${name}"]`,
  )!;
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (node) => node.textContent === label,
  )!;
  await click(item);
}

describe("API usage", () => {
  test("the overview reads the request log: headline numbers, outcomes, busiest clients, failures", async () => {
    const host = await open("/api-access", <ApiOverviewPage />);

    for (const text of [
      "40",
      "10.0 %",
      "340 ms",
      "812 / 10,000",
      "Succeeded",
      "Refused (4xx)",
      "Failed (5xx)",
    ]) {
      expect(host.textContent).toContain(text);
    }
    expect(host.querySelector('[aria-label="Busiest clients"] a')?.getAttribute("href")).toBe(
      "/api-access/clients/9",
    );
    expect(host.querySelector('[aria-label="Recent failures"]')?.textContent).toContain(
      "422 features_rejected",
    );
    expect(requests().find((request) => request.path === "/api/api-access/usage")?.params).toEqual({
      period: "day",
    });
  });

  test("an organization without clients is told what a client is, not shown empty charts", async () => {
    clientCount = 0;
    const host = await open("/api-access", <ApiOverviewPage />);

    expect(host.textContent).toContain("No clients yet");
    expect(requests().some((request) => request.path === "/api/api-access/usage")).toBe(false);
  });

  test("the request log shows each call's outcome and links a run to its inference", async () => {
    const host = await open(
      "/api-access/requests",
      <ApiRequestsPage />,
      "/api-access/requests?filter=errors",
    );

    const [ran, failed] = [...host.querySelectorAll("article")];
    expect(ran.textContent).toContain("200");
    expect(ran.querySelector("a")?.getAttribute("href")).toBe("/inferences/501");
    expect(failed.textContent).toContain("422 features_rejected");
    expect(failed.querySelector("a")).toBeNull();
    expect(
      requests().find((request) => request.path === "/api/api-access/requests")?.params,
    ).toMatchObject({
      filter: "errors",
      search: "",
    });
  });
});

describe("API traffic for the platform", () => {
  beforeEach(() => {
    member.role = "SUPERADMIN";
  });

  test("a client is suspended only with a reason its organization will read", async () => {
    await open("/admin/api-traffic", <AdminApiTrafficPage />, "/admin/api-traffic?tab=clients");
    expect(document.body.textContent).toContain("120 calls (7 days)");

    await chooseAction("Lab2Pressure", "Suspend…");
    await changeValue(
      dialog()!.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!,
      " Scraping ",
    );
    await click("Suspend client", dialog()!);
    await settle();

    expect(writes()).toEqual([
      {
        method: "POST",
        path: "/api/admin/api-traffic/clients/9/suspend",
        params: {},
        body: { reason: "Scraping" },
      },
    ]);
  });

  test("an organization's monthly limit is set or returned to the default", async () => {
    await open(
      "/admin/api-traffic",
      <AdminApiTrafficPage />,
      "/admin/api-traffic?tab=organizations",
    );
    expect(document.body.textContent).toContain("812 / 10,000 calls this month");

    await chooseAction("Acme", "Set monthly limit…");
    await click(dialog()!.querySelector('input[type="checkbox"]')!);
    await changeValue(
      dialog()!.querySelector<HTMLInputElement>('input[name="monthlyCalls"]')!,
      "500",
    );
    await click("Save limit", dialog()!);
    await settle();

    expect(writes()[0]).toMatchObject({
      method: "PUT",
      path: "/api/admin/api-traffic/organizations/3/call-limit",
      body: { monthlyCalls: 500 },
    });
  });

  test("the overview has no month, which belongs to each organization", async () => {
    const host = await open("/admin/api-traffic", <AdminApiTrafficPage />);

    expect(host.textContent).toContain("Accounts");
    expect(host.textContent).not.toContain("This month");
  });
});

describe("API navigation", () => {
  function NavigationProbe() {
    const { navigation, administration } = useNavigationItems();
    return (
      <output>
        {[...navigation, ...administration].map((item) => `${item.label}→${item.to}`).join(" ")}
      </output>
    );
  }
  const entries = async () =>
    (await mount(<NavigationProbe />, { route: "/home" })).host.textContent;
  const guardOf = (path: string) =>
    protectedPages.find((route) => route.children?.some((child) => child.path === path));

  test("members who may view API access find it, and superadmins find the platform's traffic", async () => {
    expect(await entries()).toContain("API→/api-access");
    member.permissions = [];
    expect(await entries()).not.toContain("API→");
    member.role = "SUPERADMIN";
    expect(await entries()).toContain("API traffic→/admin/api-traffic");
  });

  test("every API page sits behind the view permission, the traffic page with the superadmin pages", () => {
    for (const path of [
      "api-access",
      "api-access/clients",
      "api-access/clients/:clientId",
      "api-access/requests",
      "api-access/docs",
    ]) {
      expect(guardOf(path)).toBe(guardOf("api-access"));
    }
    expect(guardOf("api-access")).not.toBe(guardOf("models"));
    expect(guardOf("admin/api-traffic")).toBe(guardOf("admin/users"));
  });
});
