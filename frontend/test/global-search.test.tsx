// @vitest-environment jsdom
import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { AppGlobalSearch } from "@/app/components/AppGlobalSearch";
import type { SearchResponseDto } from "@/shared/api/openapi.gen";
import { globalSearchOpenAtom } from "@/shared/ui/ui-state";
import { changeValue, mount, searchDelay } from "./support/dom";

const search = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/features/search/api/search.api", () => ({ searchWorkspace: search.run }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 3,
}));

async function searchFor(query: string) {
  globalSearchOpenAtom.set(true);
  await mount(<AppGlobalSearch />, { route: "/" });
  await changeValue(document.querySelector<HTMLInputElement>("#global-search")!, query);
  await searchDelay();
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
}

test("shows the groups the API returned for a member without every permission", async () => {
  const response: SearchResponseDto = {
    query: "ac",
    groups: [
      {
        label: "Models",
        results: [
          {
            type: "model",
            id: "11",
            title: "Acme Model",
            subtitle: "clf / rf",
            href: "/models/11",
            organizationId: 3,
            modelId: 11,
          },
        ],
      },
    ],
  };
  search.run.mockResolvedValue(response);

  await searchFor("ac");

  expect(document.body.textContent).toContain("Acme Model");
  expect(document.body.textContent).not.toContain("Search failed");
});

test("says so only when the search request fails", async () => {
  search.run.mockRejectedValue(new Error("boom"));

  await searchFor("ac");

  expect(document.body.textContent).toContain("Search failed. Try again in a moment.");
});

test("keeps the previous results on screen while the next query loads", async () => {
  search.run.mockResolvedValue({
    query: "ac",
    groups: [
      {
        label: "Models",
        results: [{ type: "model", id: "11", title: "Acme Model", href: "/models/11" }],
      },
    ],
  });
  await searchFor("ac");
  search.run.mockReturnValue(new Promise(() => undefined));

  await changeValue(document.querySelector<HTMLInputElement>("#global-search")!, "acm");
  await searchDelay();

  expect(search.run).toHaveBeenLastCalledWith("acm", expect.anything());
  expect(document.body.textContent).toContain("Acme Model");
  expect(document.body.textContent).not.toContain("Searching workspace");
});
