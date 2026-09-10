// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { ReviewSelectionCatalog } from "@/capabilities/review-creation/ReviewSelectionCatalog";

let host: HTMLDivElement;
let root: Root;
let count = 13;
let loading = false;
let error = false;
let title = "Reviewers";
const retry = vi.fn();

function Harness() {
  const [selectedIds, setSelectedIds] = useState(new Set<number>());
  return (
    <ReviewSelectionCatalog
      title={title}
      emptyDescription="No available entries."
      items={Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        title: `Person ${index + 1}`,
        detail: index % 2 === 0 ? "Matching" : "Other",
      }))}
      loading={loading}
      error={error}
      selectedIds={selectedIds}
      onClear={() => setSelectedIds(new Set())}
      onSelectAll={(ids) => setSelectedIds(new Set(ids))}
      onToggle={(id) =>
        setSelectedIds((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
      onRetry={retry}
    />
  );
}

async function render() {
  await act(async () => root.render(<Harness />));
}
function button(label: string) {
  const result = [...host.querySelectorAll("button")].find((item) => item.textContent === label);
  expect(result).toBeDefined();
  return result!;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
async function search(value: string) {
  const input = host.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  count = 13;
  loading = false;
  error = false;
  title = "Reviewers";
  retry.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

test.each(["Reviewers", "Inferences"])(
  "%s selects all pages, clears, and shows pagination",
  async (catalogTitle) => {
    title = catalogTitle;
    await render();
    expect(button("Clear").disabled).toBe(true);
    expect(button("Previous").disabled).toBe(true);
    expect(host.textContent).not.toContain("Person 7");
    await click("Next");
    expect(host.textContent).toContain("Person 7");
    await click("Select all");
    expect(host.textContent).toContain("13 of 13 selected");
    expect(button("Select all").disabled).toBe(true);
    await click("Next");
    expect(host.textContent).toContain("Person 13");
    expect(button("Next").disabled).toBe(true);
    await click("Clear");
    expect(host.textContent).toContain("0 of 13 selected");
    expect(button("Clear").disabled).toBe(true);
  },
);

test("filtered bulk selection spans pages and preserves selections outside search", async () => {
  await render();
  const person = [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Person 2"),
  )!;
  await act(async () => person.click());
  await click("Next");
  await search("Matching");
  expect(button("Previous").disabled).toBe(true);
  expect(host.textContent).toContain("Person 1");
  await click("Select results");
  expect(host.textContent).toContain("8 of 13 selected");
  expect(button("Select results").disabled).toBe(true);
  await click("Next");
  expect(host.textContent).toContain("Person 13");
  await click("Clear");
  expect(host.textContent).toContain("0 of 13 selected");
});

test("single-page and empty catalogs retain footer and disabled empty actions", async () => {
  count = 2;
  await render();
  expect(button("Previous").disabled).toBe(true);
  expect(button("Next").disabled).toBe(true);
  expect(button("1").getAttribute("aria-current")).toBe("page");
  await search("missing");
  expect(host.textContent).toContain("No reviewers match your search.");
  expect(button("Select results").disabled).toBe(true);
  await search("");
  count = 0;
  await render();
  expect(host.textContent).toContain("No available entries.");
  expect(button("Select all").disabled).toBe(true);
});

test("loading and failure disable selection and pagination, with retry on failure", async () => {
  loading = true;
  await render();
  expect(host.textContent).toContain("Loading reviewers");
  expect(button("Select all").disabled).toBe(true);
  expect(button("Next").disabled).toBe(true);
  loading = false;
  error = true;
  await render();
  expect(host.textContent).toContain("Could not load reviewers.");
  expect(button("Select all").disabled).toBe(true);
  expect(button("Next").disabled).toBe(true);
  await click("Try again");
  expect(retry).toHaveBeenCalledOnce();
});
