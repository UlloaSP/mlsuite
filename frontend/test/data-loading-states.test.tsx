// @vitest-environment jsdom
import { expect, test, vi } from "vite-plus/test";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import { SchemaRunExportReviewModal } from "@/features/schemas/components/SchemaRunExportReviewModal";
import { SchemaReviewRunDetailPanel } from "@/features/reviews/components/SchemaReviewRunDetailPanel";
import { mount } from "./support/dom";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type ListQuery = { data?: unknown[]; isError: boolean };
const state = vi.hoisted(() => ({
  drafts: { isError: false } as ListQuery,
  bookmarks: { isError: false } as ListQuery,
  versions: { isError: false } as ListQuery,
  reviewRun: {} as Record<string, unknown>,
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchemaDrafts: () => state.drafts,
  useSchemaBookmarks: () => state.bookmarks,
  useSchemaVersions: () => state.versions,
}));
vi.mock("@/features/reviews/api/review-queries", () => ({
  useSchemaReviewRun: () => state.reviewRun,
}));
vi.mock("@/features/reviews/components/SchemaReviewCombinedFeedbackForm", () => ({
  SchemaReviewCombinedFeedbackForm: () => <form aria-label="review form" />,
}));

const render = (node: React.ReactNode) => mount(node, { route: "/" });

test("repository tabs show a skeleton count while loading and no count when it failed", async () => {
  state.drafts = { data: [{}, {}], isError: false };
  state.bookmarks = { data: undefined, isError: false };
  state.versions = { data: undefined, isError: true };
  const { host: nav } = await render(<SchemaRepoNav active="overview" schemaId="4" />);
  const tab = (label: string) =>
    [...nav.querySelectorAll("a")].find((link) => link.textContent?.startsWith(label))!;

  expect(tab("Changes").textContent).toBe("Changes2");
  expect(tab("Bookmarks").querySelector('[aria-hidden="true"].animate-pulse')).not.toBeNull();
  expect(tab("Snapshots").textContent).toBe("Snapshots");
  expect(tab("Snapshots").querySelector(".animate-pulse")).toBeNull();
});

test.each([
  ["loading", { feedbackLoading: true }, true],
  ["failed", { feedbackLoading: false, feedbackError: "Reviews could not be loaded." }, true],
  ["ready", { feedbackLoading: false }, false],
] as const)("export waits for reviewer answers when they are %s", async (_, feedback, blocked) => {
  await render(
    <SchemaRunExportReviewModal
      open
      runs={[]}
      feedbackByRun={[]}
      onClose={() => undefined}
      onExport={() => undefined}
      {...feedback}
    />,
  );
  const exportButton = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === "Export CSV",
  )!;

  expect(exportButton.disabled).toBe(blocked);
  expect(Boolean(document.querySelector("[data-skeleton]"))).toBe(feedback.feedbackLoading);
  if ("feedbackError" in feedback) {
    expect(document.body.textContent).toContain(feedback.feedbackError);
  }
});

test("switching review runs keeps the previous shell as a skeleton without its form", async () => {
  const version = { formSchema: { fields: [], reports: [] } } as unknown as SchemaVersionDto;
  const detail = {
    run: { id: "1", name: "Previous run", inputData: {}, results: [] },
    feedback: [],
  };
  const panel = () => (
    <SchemaReviewRunDetailPanel
      reviewId="r"
      reviewRunId="next"
      version={version}
      onReviewChanged={() => undefined}
    />
  );

  state.reviewRun = { data: detail, isLoading: false, isPlaceholderData: true };
  const { host: container, rerender } = await render(panel());
  expect(container.querySelector("[data-skeleton]")?.textContent).toContain("Previous run");
  expect(container.querySelector('form[aria-label="review form"]')).toBeNull();
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Loading inference…");

  state.reviewRun = { data: detail, isLoading: false, isPlaceholderData: false };
  await rerender(panel());
  expect(container.querySelector("[data-skeleton]")).toBeNull();
  expect(container.querySelector('form[aria-label="review form"]')).not.toBeNull();
});
