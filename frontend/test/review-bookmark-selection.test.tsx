// @vitest-environment jsdom
import { act } from "react";
import { expect, test } from "vite-plus/test";
import { useReviewRunSelection } from "@/capabilities/review-creation/useReviewRunSelection";
import type { ReviewCandidate } from "@/capabilities/review-creation/review-creation-api";
import { mount } from "./support/dom";
const candidates: ReviewCandidate[] = [
  {
    runId: "1",
    name: "A",
    createdAt: "2026-01-01",
    schemaId: "5",
    versionId: "7",
    groupLabel: "First",
    bookmarkId: "10",
    bookmarkName: "Baseline",
  },
  {
    runId: "2",
    name: "B",
    createdAt: "2026-01-01",
    schemaId: "5",
    versionId: "7",
    groupLabel: "First",
    bookmarkId: "11",
    bookmarkName: "Candidate",
  },
  {
    runId: "3",
    name: "C",
    createdAt: "2026-01-01",
    schemaId: "5",
    versionId: "7",
    groupLabel: "First",
    bookmarkId: null,
  },
  {
    runId: "4",
    name: "D",
    createdAt: "2026-01-01",
    schemaId: "5",
    versionId: "8",
    groupLabel: "Second",
    bookmarkId: "10",
    bookmarkName: "Baseline",
  },
];
let selection: ReturnType<typeof useReviewRunSelection>;
function Harness({ items }: { items: ReviewCandidate[] }) {
  selection = useReviewRunSelection(items);
  return null;
}
async function render(items = candidates) {
  await mount(<Harness items={items} />);
}
test("keeps initial selection within one snapshot and offers its bookmarks", async () => {
  await render();
  expect([...selection.selectedRunIds]).toEqual(["1", "2", "3"]);
  expect(selection.bookmarkOptions.map((x) => x.label)).toEqual([
    "Baseline",
    "Candidate",
    "No bookmark",
  ]);
});
test("bookmark changes replace inference selection, including no-bookmark runs", async () => {
  await render();
  await act(async () => selection.selectBookmark("11"));
  expect(selection.runCandidates.map((x) => x.runId)).toEqual(["2"]);
  expect([...selection.selectedRunIds]).toEqual(["2"]);
  await act(async () => selection.selectBookmark("none"));
  expect([...selection.selectedRunIds]).toEqual(["3"]);
  await act(async () => selection.selectBookmark("all"));
  expect([...selection.selectedRunIds]).toEqual(["1", "2", "3"]);
});
test("changing snapshot resets bookmark and never carries run IDs across versions", async () => {
  await render();
  await act(async () => selection.selectBookmark("11"));
  await act(async () => selection.selectGroup("5:8"));
  expect(selection.bookmark).toBe("all");
  expect(selection.group?.versionId).toBe("8");
  expect([...selection.selectedRunIds]).toEqual(["4"]);
});
test("history callers without bookmark metadata retain all available runs", async () => {
  await render(candidates.map(({ bookmarkId: _id, bookmarkName: _name, ...item }) => item));
  expect(selection.bookmarkOptions).toEqual([]);
  expect(selection.runCandidates).toHaveLength(3);
});
test("empty candidates yield no selectable runs", async () => {
  await render([]);
  expect(selection.group).toBeUndefined();
  expect(selection.selectedRunIds.size).toBe(0);
});
