// @vitest-environment jsdom
import { act } from "react";
import { DropdownMenu } from "radix-ui";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { OrganizationMenuContent } from "@/app/components/OrganizationMenuContent";
import type { OrganizationDto, WorkspaceCurrentContextDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

const organization = (id: number, name: string): OrganizationDto =>
  ({ id, name, slug: name.toLowerCase(), logoUrl: null }) as OrganizationDto;

const catalog = vi.hoisted(() => ({
  items: [] as unknown[],
  hasNextPage: false,
  isFetching: false,
  error: null as Error | null,
  searches: [] as string[],
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  select: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceOrganizationCatalog: (search: string) => {
    catalog.searches.push(search);
    return {
      data: { items: catalog.items, totalItems: catalog.items.length },
      hasNextPage: catalog.hasNextPage,
      isFetching: catalog.isFetching,
      isFetchNextPageError: false,
      error: catalog.error,
      fetchNextPage: catalog.fetchNextPage,
      refetch: catalog.refetch,
    };
  },
}));
vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useSelectOrganization: () => ({ mutateAsync: catalog.select }),
}));

const context = {
  currentOrganization: organization(7, "Acme"),
  permissions: {},
} as unknown as WorkspaceCurrentContextDto;

const openMenu = () =>
  mount(
    <DropdownMenu.Root open>
      <DropdownMenu.Trigger>Organization</DropdownMenu.Trigger>
      <OrganizationMenuContent align="start" side="bottom" className="menu" context={context} />
    </DropdownMenu.Root>,
    { route: "/models" },
  );
const entries = () =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].map((node) => node.textContent);

beforeEach(() => {
  Object.assign(catalog, {
    items: [organization(7, "Acme"), organization(9, "Globex")],
    hasNextPage: false,
    isFetching: false,
    error: null,
    searches: [],
  });
  catalog.fetchNextPage.mockClear();
  catalog.select.mockClear();
});

test("lists the member's organizations as menu entries and switches on choosing one", async () => {
  await openMenu();

  expect(entries()).toEqual(["Acmeacme", "Globexglobex"]);
  // Everything fits one page, so there is nothing to search for.
  expect(document.querySelector('input[aria-label="Search organization"]')).toBeNull();

  await act(async () => {
    document.querySelectorAll<HTMLElement>('[role="menuitem"]')[1]!.click();
  });
  expect(catalog.select).toHaveBeenCalledWith(9);
});

test("offers search and fetches the next page near the end when memberships exceed a page", async () => {
  catalog.hasNextPage = true;
  await openMenu();

  expect(document.querySelector('input[aria-label="Search organization"]')).not.toBeNull();
  const list = document.querySelector<HTMLElement>('[role="group"]')!;
  await act(async () => {
    list.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  expect(catalog.fetchNextPage).toHaveBeenCalledTimes(1);
});

test("a failed list offers a retry instead of an empty switcher", async () => {
  catalog.items = [];
  catalog.error = new Error("offline");
  await openMenu();

  expect(entries()).toEqual(["Could not load organizations. Retry"]);
  await act(async () => {
    document.querySelector<HTMLElement>('[role="menuitem"]')!.click();
  });
  expect(catalog.refetch).toHaveBeenCalledTimes(1);
});

test("keeps loaded memberships bounded in the DOM and keyboard reaches the last loaded entry", async () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return (
      Number.parseFloat((this.firstElementChild as HTMLElement | null)?.style.height ?? "0") || 300
    );
  });
  catalog.items = Array.from({ length: 120 }, (_, index) =>
    organization(index + 1, `Company ${index}`),
  );
  await openMenu();
  expect(entries().length).toBeLessThan(24);
  const list = document.querySelector<HTMLElement>('[role="group"]')!;
  list.scrollTo = vi.fn((options?: ScrollToOptions | number) => {
    list.scrollTop = typeof options === "number" ? options : (options?.top ?? 0);
    list.dispatchEvent(new Event("scroll"));
  });
  const first = list.querySelector<HTMLElement>('[role="menuitem"]')!;
  await act(async () => {
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
  expect(document.activeElement?.textContent).toContain("Company 119");
  expect(entries().length).toBeLessThan(24);
});
