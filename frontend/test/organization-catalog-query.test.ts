import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { organizationCatalogQueryOptions } from "@/features/workspace/api/workspace.queries";

const { getOrganizationPage } = vi.hoisted(() => ({
  getOrganizationPage: vi.fn(),
}));

vi.mock("@/features/workspace/api/organizations.api", () => ({ getOrganizationPage }));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  getOrganizationPage.mockReset();
});

describe("organization catalog query", () => {
  test("fetches without a fictional visibility dimension", async () => {
    getOrganizationPage.mockResolvedValue({ hasNext: false, items: [], totalItems: 0 });
    const options = organizationCatalogQueryOptions("north", "name");

    await expect(client().fetchInfiniteQuery(options)).resolves.toEqual({
      pages: [{ hasNext: false, items: [], totalItems: 0 }],
      pageParams: [0],
    });

    expect(options.queryKey).toEqual(["organizationCatalogPages", "infinite", "north", "name"]);
    expect(getOrganizationPage).toHaveBeenCalledWith(
      { page: 0, search: "north", size: 24, sort: "name" },
      expect.any(AbortSignal),
    );
  });

  test("preserves catalog failures", async () => {
    const failure = new Error("catalog unavailable");
    getOrganizationPage.mockRejectedValue(failure);

    await expect(
      client().fetchInfiniteQuery(organizationCatalogQueryOptions("", "updated")),
    ).rejects.toBe(failure);
  });
});
