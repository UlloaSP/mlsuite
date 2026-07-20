/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  BOOKMARK_PREDICTION_RUNS_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_QUERY_KEY,
  SCHEMA_VERSION_QUERY_KEY,
} from "@/api/schemas/hooks/query-keys";
import { createAppQueryClient } from "@/app/providers/query-client";
import { HttpError } from "@/shared/api/http";
import {
  organizationMembersQueryKey,
  organizationQueryKey,
} from "@/api/workspace/hooks/query-keys";
import { removeOrganizationCache } from "@/api/workspace/hooks/organization-cache";
import { invalidatePluginRuntimeCache, memoizePluginRuntime } from "@/api/plugins/runtime-cache";
import { classifyRouteError } from "@/app/router/route-error";

type TenantDetailKey = (organizationId: number, resourceId: string) => readonly unknown[];

const detailKeys = [
  SCHEMA_QUERY_KEY,
  SCHEMA_VERSION_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
  BOOKMARK_PREDICTION_RUNS_QUERY_KEY,
] as unknown as TenantDetailKey[];

describe("frontend critical reliability", () => {
  test("isolates every tenant detail key by organization", () => {
    for (const key of detailKeys) {
      const first = key(11, "same-id");
      const second = key(22, "same-id");

      expect(first.slice(0, 2)).toEqual(["org", 11]);
      expect(second.slice(0, 2)).toEqual(["org", 22]);
      expect(first).not.toEqual(second);
    }
  });

  test("reports only mutation errors without local ownership", async () => {
    const errors: unknown[] = [];
    const client = createAppQueryClient((error) => errors.push(error));
    const unhandled = client.getMutationCache().build(client, {
      mutationFn: async () => Promise.reject(new Error("global")),
    });
    const handled = client.getMutationCache().build(client, {
      mutationFn: async () => Promise.reject(new Error("local")),
      meta: { errorHandledLocally: true },
    });

    await expect(unhandled.execute(undefined)).rejects.toThrow("global");
    await expect(handled.execute(undefined)).rejects.toThrow("local");
    expect(errors).toHaveLength(1);
  });

  test("removes only the previous organization cache", async () => {
    const client = createAppQueryClient(() => undefined);
    client.setQueryData([...organizationQueryKey(11), "schema"], "old");
    client.setQueryData([...organizationQueryKey(22), "schema"], "new");
    client.setQueryData(["user"], "session");

    await removeOrganizationCache(client, 11);

    expect(client.getQueryData([...organizationQueryKey(11), "schema"])).toBeUndefined();
    expect(client.getQueryData([...organizationQueryKey(22), "schema"])).toBe("new");
    expect(client.getQueryData(["user"])).toBe("session");
  });

  test("scopes and invalidates plugin runtime atomically", async () => {
    let loads = 0;
    const load = async () => ++loads;

    expect(await memoizePluginRuntime(11, "catalog", load)).toBe(1);
    expect(await memoizePluginRuntime(11, "catalog", load)).toBe(1);
    expect(await memoizePluginRuntime(22, "catalog", load)).toBe(2);
    invalidatePluginRuntimeCache(11);
    expect(await memoizePluginRuntime(11, "catalog", load)).toBe(3);
  });

  test("uses one canonical, tenant-scoped members key", () => {
    expect(organizationMembersQueryKey(11)).toEqual(["org", 11, "members"]);
  });

  test.each([
    [new HttpError({ status: 0, message: "offline", path: "/", timestamp: "now" }), 0],
    [new HttpError({ status: 403, message: "denied", path: "/", timestamp: "now" }), 403],
    [new HttpError({ status: 404, message: "missing", path: "/", timestamp: "now" }), 404],
    [new Error("render failed"), 500],
  ])("classifies route errors without turning all failures into 404", (error, status) => {
    expect(classifyRouteError(error)).toBe(status);
  });
});
