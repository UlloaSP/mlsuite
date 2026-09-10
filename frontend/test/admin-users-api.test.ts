import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { HttpError } from "@/shared/api/http";
import {
  createUser,
  deleteUser,
  listUsers,
  resetPassword,
  updateUser,
} from "@/features/admin/api/admin-user.api";
import { adminUsersQueryOptions } from "@/features/admin/api/admin-user.queries";
import type { AdminUser, AdminUserPage } from "@/features/admin/api/admin-user.types";

const user: AdminUser = {
  id: 7,
  username: "ada",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  avatarUrl: null,
  systemRole: "USER",
  enabled: true,
  createdAt: "2026-07-20T00:00:00Z",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("admin users API", () => {
  test("fetches the default page through tenant-independent query options", async () => {
    const page: AdminUserPage = { items: [user], totalItems: 1, hasNext: false };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(page));
    vi.stubGlobal("fetch", fetchMock);

    const options = adminUsersQueryOptions();
    await expect(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }).fetchQuery(options),
    ).resolves.toEqual(page);

    expect(options.queryKey).toEqual(["adminUsers", 0, "", "name", "all"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/admin/users?page=0&role=all&search=&size=100&sort=name",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("uses the existing write endpoints, methods, and JSON payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(user))
      .mockResolvedValueOnce(jsonResponse({ ...user, enabled: false }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createUser({ email: user.email, fullName: user.fullName, password: "secret" });
    await updateUser(user.id, { enabled: false });
    await resetPassword(user.id, "replacement");
    await deleteUser(user.id);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost/api/admin/users",
      expect.objectContaining({ method: "POST", body: expect.stringContaining(user.email) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost/api/admin/users/7",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ enabled: false }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost/api/admin/users/7/password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "replacement" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost/api/admin/users/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  test("preserves typed HTTP and network failures plus cancellation", async () => {
    const request = { page: 0, role: "all", search: "", size: 100, sort: "name" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Denied", status: 403 }, 403)),
    );
    const httpFailure = listUsers(request);
    await expect(httpFailure).rejects.toMatchObject({ status: 403 });
    await expect(httpFailure).rejects.toBeInstanceOf(HttpError);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(listUsers(request)).rejects.toMatchObject({ status: 0 });

    const cancellation = new DOMException("cancelled", "AbortError");
    const controller = new AbortController();
    controller.abort(cancellation);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cancellation));
    await expect(listUsers(request, controller.signal)).rejects.toBe(cancellation);
  });
});
