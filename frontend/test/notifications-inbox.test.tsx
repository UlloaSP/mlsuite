// @vitest-environment jsdom

import { act } from "react";
import { useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createAppQueryClient } from "@/app/providers/query-client";
import { NotificationsPage } from "@/features/notifications/pages/notifications-page";
import { PendingInvitationEntry } from "@/features/notifications/components/PendingInvitationEntry";
import { useNotificationToasts } from "@/features/notifications/lib/use-notification-toasts";
import {
  notificationLink,
  presentNotification,
} from "@/features/notifications/lib/notification-presentation";
import { useUnreadNotificationCount } from "@/features/notifications/api/notification.queries";
import { HttpError } from "@/shared/api/http";
import type { InvitationDto, NotificationDto } from "@/shared/api/openapi.gen";
import { buttonByText, click, mount } from "./support/dom";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: 4 } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  WORKSPACE_CONTEXT_QUERY_KEY: ["workspaceContext"],
  useCurrentOrganizationId: () => 9,
}));

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

const notification = (overrides: Partial<NotificationDto>): NotificationDto => ({
  id: 1,
  organizationId: 9,
  kind: "MODEL_READY",
  targetType: "MODEL",
  targetId: "12",
  payload: { modelName: "risk-forest", organizationName: "Cardio Lab" },
  readAt: null,
  createdAt: "2026-10-27T10:00:00Z",
  ...overrides,
});

const page = (items: unknown[], hasNext = false) => ({
  items,
  page: 0,
  size: 24,
  totalItems: items.length,
  hasNext,
});

type Inbox = { notifications?: NotificationDto[]; pending?: InvitationDto[]; unread?: number };
const requests: { method: string; path: string }[] = [];
let failing: Set<string>;
let inbox: Required<Inbox>;

const answer = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  requests.push({ method, path: `${url.pathname}${url.search}` });
  if (failing.has(url.pathname)) return answer(500, { status: 500, message: "The server failed" });
  if (url.pathname === "/api/notifications/catalog") return answer(200, page(inbox.notifications));
  if (url.pathname === "/api/notifications/unread-count") {
    return answer(200, { count: inbox.unread });
  }
  if (url.pathname === "/api/invitations/pending/catalog") return answer(200, page(inbox.pending));
  return answer(204);
});

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const mutations = () => requests.filter(({ method }) => method !== "GET");

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
}

async function showInbox(state: Inbox = {}, selectOrganization = vi.fn().mockResolvedValue({})) {
  inbox = { notifications: [], pending: [], unread: 0, ...state };
  const view = await mount(
    <>
      <NotificationsPage selectOrganization={selectOrganization} />
      <Location />
    </>,
    { route: "/notifications" },
  );
  await flush();
  return { ...view, selectOrganization };
}

beforeEach(() => {
  failing = new Set();
  inbox = { notifications: [], pending: [], unread: 0 };
  requests.length = 0;
  toast.mockClear();
  toast.error.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the inbox", () => {
  test("says it is loading instead of showing an empty list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const { host } = await showInbox();

    expect(host.textContent).not.toContain("No notifications");
  });

  test("an empty inbox says what will appear", async () => {
    const { host } = await showInbox();

    expect(host.textContent).toContain("No notifications");
    expect(host.textContent).toContain("Finished bulk uploads");
    expect(buttonByText("Mark all read")?.disabled).toBe(true);
  });

  test("a failed read shows the error and retries", async () => {
    failing.add("/api/notifications/catalog");
    const { host } = await showInbox();
    expect(host.textContent).toContain("The server failed");

    failing.clear();
    inbox.notifications = [notification({})];
    await click("Retry");
    await flush();

    expect(host.textContent).toContain("Model ready");
    expect(host.textContent).not.toContain("The server failed");
  });

  test("the unread filter is asked of the server, and has its own empty state", async () => {
    const { host } = await showInbox();

    await click("Unread");
    await flush();

    expect(requests.some(({ path }) => path.includes("filter=unread"))).toBe(true);
    expect(host.textContent).toContain("Nothing unread");
  });

  test("a waiting invitation is one row with its answers, ahead of the history", async () => {
    const received = notification({
      id: 2,
      kind: "INVITATION_RECEIVED",
      targetType: "INVITATION",
      targetId: "3",
      payload: { organizationName: "Cardio Lab", inviterName: "Ada", roleName: "Member" },
    });
    const { host } = await showInbox({
      notifications: [received, notification({ id: 1 })],
      pending: [invitation],
    });

    const titles = [...host.querySelectorAll("h2")].map((title) => title.textContent);
    expect(titles).toEqual(["Cardio Lab", "Model ready"]);
    expect(buttonByText("Accept")).toBeDefined();
  });

  test("an invitation no longer waiting stays as history, without answers or a link", async () => {
    const { host } = await showInbox({
      notifications: [
        notification({
          kind: "INVITATION_RECEIVED",
          targetType: "INVITATION",
          targetId: "3",
          readAt: "2026-10-28T10:00:00Z",
          payload: { organizationName: "Cardio Lab", inviterName: "Ada", roleName: "Member" },
        }),
      ],
    });

    expect(host.textContent).toContain("Invitation to Cardio Lab");
    expect(host.textContent).toContain("Ada invited you as Member.");
    expect(host.textContent).toContain("No longer open");
    expect(buttonByText("Accept")).toBeUndefined();
  });

  test("an invitation is not called closed while the waiting ones cannot be read", async () => {
    failing.add("/api/invitations/pending/catalog");
    const { host } = await showInbox({
      notifications: [
        notification({
          kind: "INVITATION_RECEIVED",
          targetType: "INVITATION",
          targetId: "3",
          payload: { organizationName: "Cardio Lab", inviterName: "Ada", roleName: "Member" },
        }),
      ],
    });

    expect(host.textContent).toContain("The server failed");
    expect(host.textContent).not.toContain("No longer open");
  });

  test("marking all read and an unread row show what the API says", async () => {
    const { host } = await showInbox({ notifications: [notification({})], unread: 1 });

    expect(host.textContent).toContain("New");
    await click("Mark all read");

    expect(mutations()).toEqual([{ method: "POST", path: "/api/notifications/read-all" }]);
  });

  test("deleting what was read asks first", async () => {
    await showInbox({ notifications: [notification({ readAt: "2026-10-28T10:00:00Z" })] });

    await click("Delete read");
    expect(mutations()).toEqual([]);
    await click("Delete");
    await flush();

    expect(mutations()).toEqual([{ method: "DELETE", path: "/api/notifications/read" }]);
  });
});

describe("opening a notification", () => {
  test("reads it and goes to its target in the organization already current", async () => {
    const { host, selectOrganization } = await showInbox({ notifications: [notification({})] });

    await click(host.querySelector("h2")!.closest("button")!);
    await flush();

    expect(selectOrganization).not.toHaveBeenCalled();
    expect(mutations()).toEqual([{ method: "POST", path: "/api/notifications/1/read" }]);
    expect(host.querySelector("[data-testid=location]")?.textContent).toBe("/models/12");
  });

  test("switches to the target's organization first", async () => {
    const { host, selectOrganization } = await showInbox({
      notifications: [notification({ organizationId: 11 })],
    });

    await click(host.querySelector("h2")!.closest("button")!);
    await flush();

    expect(selectOrganization).toHaveBeenCalledWith(11);
    expect(host.querySelector("[data-testid=location]")?.textContent).toBe("/models/12");
  });

  test.each([403, 404])("an organization that answers %i is marked unavailable", async (status) => {
    const refused = new HttpError({ status, message: "Gone", path: "/", timestamp: "" });
    const { host } = await showInbox(
      { notifications: [notification({ organizationId: 11 })] },
      vi.fn().mockRejectedValue(refused),
    );

    await click(host.querySelector("h2")!.closest("button")!);
    await flush();

    expect(host.textContent).toContain("No longer available");
    expect(host.querySelector("[data-testid=location]")?.textContent).toBe("/notifications");
    expect(host.querySelector("h2")!.closest("button")).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("another failure to switch is reported and leaves the row usable", async () => {
    const { host } = await showInbox(
      { notifications: [notification({ organizationId: 11 })] },
      vi.fn().mockRejectedValue(new Error("Offline")),
    );

    await click(host.querySelector("h2")!.closest("button")!);
    await flush();

    expect(toast.error).toHaveBeenCalledWith("Offline");
    expect(host.textContent).not.toContain("No longer available");
  });

  test.each<[Partial<NotificationDto>, string | null]>([
    [
      {
        kind: "PREDICTION_JOB_COMPLETED",
        targetType: "PREDICTION_JOB",
        targetId: "5",
        payload: { bookmarkId: 8 },
      },
      "/predict/8?bulk=open",
    ],
    [{ kind: "MODEL_FAILED", targetType: "MODEL", targetId: "12" }, "/models/12"],
    [{ kind: "REVIEW_ASSIGNED", targetType: "REVIEW", targetId: "abc" }, "/review/abc"],
    [
      { kind: "INVITATION_ACCEPTED", targetType: "INVITATION", targetId: "3" },
      "/workspace/organizations/9/invitations",
    ],
    [{ kind: "ORGANIZATION_JOINED", targetType: "ORGANIZATION", targetId: "9" }, "/home"],
    [{ kind: "INVITATION_RECEIVED", targetType: "INVITATION", targetId: "3" }, null],
  ])("%o leads to %s", (overrides, to) => {
    expect(notificationLink(notification(overrides))).toBe(to);
  });
});

describe("what a notification says", () => {
  test.each<[NotificationDto["kind"], NotificationDto["payload"], string]>([
    [
      "PREDICTION_JOB_COMPLETED_WITH_FAILURES",
      { bookmarkName: "Cardio", doneRows: 8, totalRows: 10, failedRows: 2 },
      "Cardio: 8 of 10 rows ran, 2 failed.",
    ],
    [
      "PREDICTION_JOB_STOPPED",
      { bookmarkName: "Cardio", reason: "No right", doneRows: 8, totalRows: 10 },
      "Cardio: No right. 8 of 10 rows ran.",
    ],
    [
      "PREDICTION_JOB_CANCELLED",
      { bookmarkName: "Cardio", actorName: "Ada", doneRows: 0, totalRows: 10 },
      "Ada cancelled it on Cardio. 0 of 10 rows ran.",
    ],
    ["MODEL_FAILED", { modelName: "risk", reason: "refused" }, "risk: refused"],
    [
      "INVITATION_DECLINED",
      { inviteeName: "Ada", organizationName: "Lab" },
      "Ada declined to join Lab.",
    ],
    [
      "REVIEW_ASSIGNED",
      { assignerName: "Ada", schemaName: "Risk" },
      "Ada asked you to review runs of Risk.",
    ],
    [
      "ORGANIZATION_PURGED",
      { organizationName: "Lab" },
      "A platform administrator deleted this organization and everything in it.",
    ],
    [
      "PURGE_COMPLETED",
      { targetLabel: "Lab", scope: "ORGANIZATION" },
      "Lab and everything that depended on it are gone.",
    ],
    ["PURGE_FAILED", { targetLabel: "Lab", reason: "No storage" }, "Lab: No storage"],
  ])("%s", (kind, payload, description) => {
    expect(presentNotification(notification({ kind, payload })).description).toBe(description);
  });
});

describe("the shell", () => {
  function Shell() {
    useNotificationToasts();
    return <output data-testid="count">{useUnreadNotificationCount().data ?? "none"}</output>;
  }

  test("the first count shows no toast; what arrives later does, with a way to the inbox", async () => {
    inbox.unread = 2;
    const client = createAppQueryClient(() => undefined);
    const { host } = await mount(<Shell />, { route: "/models", queryClient: client });
    await flush();
    expect(host.textContent).toBe("2");
    expect(toast).not.toHaveBeenCalled();

    inbox.unread = 3;
    inbox.notifications = [notification({})];
    await act(() => client.invalidateQueries({ queryKey: ["notifications"] }));
    await flush();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]?.[0]).toBe("Model ready");
    expect(
      requests.some(
        ({ path }) =>
          path.includes("filter=unread&size=1") || path.includes("size=1&filter=unread"),
      ),
    ).toBe(true);
  });

  test("a count that falls shows no toast", async () => {
    inbox.unread = 2;
    const client = createAppQueryClient(() => undefined);
    await mount(<Shell />, { route: "/models", queryClient: client });
    await flush();

    inbox.unread = 1;
    await act(() => client.invalidateQueries({ queryKey: ["notifications"] }));
    await flush();

    expect(toast).not.toHaveBeenCalled();
  });

  test("a failed poll stays quiet", async () => {
    failing.add("/api/notifications/unread-count");
    const reported: unknown[] = [];
    const client = createAppQueryClient((error) => reported.push(error));
    const { host } = await mount(<Shell />, { route: "/models", queryClient: client });
    await flush();
    await flush();

    expect(host.textContent).toBe("none");
    expect(reported).toEqual([]);
  });
});

describe("a waiting invitation", () => {
  const calledPath = () => mutations()[0]?.path;

  const show = (client?: ReturnType<typeof createAppQueryClient>) =>
    mount(<PendingInvitationEntry invitation={invitation} />, { queryClient: client });

  test("shows the organization and role with Accept and Decline", async () => {
    const { host } = await show();

    expect(host.textContent).toContain("Cardio Lab");
    expect(host.textContent).toContain("Invited as member");
    expect(buttonByText("Accept")).toBeDefined();
    expect(buttonByText("Decline")).toBeDefined();
  });

  test("accepting answers this invitation by its id", async () => {
    await show();

    await click("Accept");

    expect(calledPath()).toBe("/api/invitations/3/accept");
  });

  test("declining answers this invitation by its id", async () => {
    await show();

    await click("Decline");

    expect(calledPath()).toBe("/api/invitations/3/decline");
  });

  test.each([
    [404, "Invitation '3' does not exist."],
    [400, "Invitation expired."],
    [400, "Invitation is not pending."],
  ])("a refused answer (%i) is reported and the buttons work again", async (status, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => answer(status, { status, message })),
    );
    const reported: unknown[] = [];
    const client = createAppQueryClient((error) => reported.push(error));
    await show(client);

    await click("Accept");

    expect(reported).toHaveLength(1);
    expect((reported[0] as Error).message).toBe(message);
    expect(buttonByText("Accept")?.disabled).toBe(false);
  });
});
