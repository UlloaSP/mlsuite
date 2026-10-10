import { QueryClient } from "@tanstack/react-query";
import { expect, test, vi } from "vite-plus/test";
import { infiniteCatalogOptions } from "@/shared/api/infinite-catalog";

test("drops a row the server shifted into the next page and keeps the latest total", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const shifted = infiniteCatalogOptions({
    queryKey: ["test", "shifted", "infinite"],
    // A row created between the two fetches pushes the last row of page 0 into page 1.
    queryFn: async (page: number) => ({
      items: page === 0 ? [{ id: 3 }, { id: 2 }] : [{ id: 2 }, { id: 1 }],
      page,
      size: 2,
      totalItems: page === 0 ? 3 : 4,
      hasNext: page === 0,
    }),
  });
  const data = await client.fetchInfiniteQuery({ ...shifted, pages: 2 });

  expect(shifted.select!(data)).toMatchObject({
    items: [{ id: 3 }, { id: 2 }, { id: 1 }],
    totalItems: 4,
    hasNext: false,
  });
  client.clear();
});

test("new filters keep the same catalog's rows on screen, never another catalog's", () => {
  const previous = { pages: [], pageParams: [] };
  const placeholder = (from: unknown[], to: unknown[]) =>
    (
      infiniteCatalogOptions({ queryKey: to, queryFn: vi.fn() }).placeholderData as (
        data: unknown,
        query: unknown,
      ) => unknown
    )(previous, { queryKey: from });

  expect(
    placeholder(["org", 7, "models", "infinite", "a"], ["org", 7, "models", "infinite", "ab"]),
  ).toBe(previous);
  expect(
    placeholder(["org", 7, "models", "infinite", "a"], ["org", 8, "models", "infinite", "a"]),
  ).toBeUndefined();
  expect(
    placeholder(["org", 7, "models", "infinite", "a"], ["org", 7, "roles", "infinite", "a"]),
  ).toBeUndefined();
});
