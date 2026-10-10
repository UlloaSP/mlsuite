// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InferenceFacetSelect } from "@/features/inferences/components/InferenceFacetSelect";
import { mount, changeValue, searchDelay } from "./support/dom";

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
}));
afterEach(() => vi.unstubAllGlobals());
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

test.each(["schemas", "bookmarks", "columns"] as const)(
  "%s options use backend search over the full scope and allow server-only matches",
  async (kind) => {
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const body = JSON.parse(typeof init.body === "string" ? init.body : "{}");
      requests.push(body);
      return new Response(
        JSON.stringify({
          items: body.search
            ? [{ value: "outside", label: "Remote match" }]
            : Array.from({ length: 24 }, (_, id) => ({ value: String(id), label: `First ${id}` })),
          page: body.page,
          size: 24,
          totalItems: body.search ? 1 : 80,
          hasNext: !body.search,
        }),
        { headers: { "content-type": "application/json" } },
      );
    });
    const onChange = vi.fn();
    const { host } = await mount(
      <InferenceFacetSelect
        kind={kind}
        schemaId="8"
        bookmarkId="9"
        value="all"
        label="Facet"
        onChange={onChange}
      />,
    );
    await settle();
    const input = host.querySelector<HTMLInputElement>('[role="combobox"]')!;
    await act(async () => input.focus());
    await changeValue(input, "server-only");
    await searchDelay();
    await settle();
    expect(requests.at(-1)).toMatchObject({
      kind,
      page: 0,
      search: "server-only",
      scope: { schemaId: "8", bookmarkId: "9" },
    });
    const option = document.querySelector<HTMLElement>('[role="option"]')!;
    expect(option.textContent).toContain("Remote match");
    await act(async () => option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("outside");
  },
);
