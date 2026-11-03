// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { SchemaRunBulkUploadButton } from "@/features/schemas/components/SchemaRunBulkUploadButton";
import type { PredictionJobDto } from "@/shared/api/openapi.gen";
import { binding, schemaVersion } from "./support/api-fixtures";
import { click, mount } from "./support/dom";

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts }));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 1,
}));
vi.mock("@/capabilities/prediction-runtime/plugins/schema-plugin-catalog", () => ({
  predictionCatalogQueryOptions: () => ({ queryKey: ["catalog"], queryFn: async () => ({}) }),
}));
vi.mock("@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services", () => ({
  prepareSchemaRun: async () => ({
    fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
    reports: [],
  }),
}));

const version = schemaVersion({
  id: 23,
  formSchema: { fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }] },
  bindings: [binding(1), binding(2)],
});
const AT = "2026-10-27T10:00:00Z";
const job = (overrides: Partial<PredictionJobDto>): PredictionJobDto => ({
  id: 5,
  bookmarkId: 9,
  schemaVersionId: 23,
  status: "RUNNING",
  totalRows: 3000,
  doneRows: 1200,
  failedRows: 0,
  pendingRows: 1800,
  createdByName: "Load 1",
  createdAt: AT,
  updatedAt: AT,
  finishedAt: null,
  ...overrides,
});

type Answer = { status: number; body: unknown };
const routes = new Map<string, () => Answer>();
const requests: { method: string; path: string; body: unknown }[] = [];
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  routes.clear();
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      const method = init?.method ?? "GET";
      requests.push({ method, path, body: init?.body ? JSON.parse(init.body as string) : null });
      const answer = routes.get(`${method} ${path}`)?.() ?? {
        status: 404,
        body: { message: "none" },
      };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});
afterEach(() => vi.useRealTimers());

const JOBS = "GET /api/schema-bookmarks/9/prediction-jobs";

const show = (route: string) =>
  mount(<SchemaRunBulkUploadButton bookmarkId="9" version={version} />, { route });

async function openDialog() {
  const view = await show("/predict/9");
  await flush();
  await click(document.body.querySelector("button")!);
  await flush();
  return view;
}

describe("bulk uploads run on the server as jobs", () => {
  test("a finished job's notification opens the list by its link", async () => {
    routes.set(JOBS, () => ({ status: 200, body: [job({ status: "COMPLETED" })] }));

    await show("/predict/9?bulk=open");
    await flush();

    expect(document.body.textContent).toContain("Load 1");
  });

  test("the button counts running jobs and the dialog shows each job's progress", async () => {
    routes.set(JOBS, () => ({
      status: 200,
      body: [
        job({}),
        job({
          id: 4,
          status: "COMPLETED",
          doneRows: 10,
          totalRows: 10,
          pendingRows: 0,
          finishedAt: AT,
        }),
      ],
    }));
    await openDialog();

    expect(document.body.textContent).toContain("1 running");
    expect(document.body.textContent).toContain("1200 of 3000 saved");
    expect(document.body.textContent).toContain("1800 to run");
    const bar = document.body.querySelector('[aria-label="Bulk upload 5 progress"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("1200");
    expect(document.body.textContent).toContain("10 of 10 saved");
  });

  test("an open job can be cancelled and a finished one's failed rows retried", async () => {
    routes.set(JOBS, () => ({
      status: 200,
      body: [
        job({}),
        job({
          id: 4,
          status: "COMPLETED",
          doneRows: 8,
          failedRows: 2,
          pendingRows: 0,
          totalRows: 10,
          finishedAt: AT,
        }),
      ],
    }));
    routes.set("POST /api/prediction-jobs/5/cancel", () => ({
      status: 200,
      body: job({ status: "CANCELLED" }),
    }));
    routes.set("POST /api/prediction-jobs/4/retry", () => ({
      status: 200,
      body: job({ id: 4, status: "QUEUED" }),
    }));
    routes.set("GET /api/prediction-jobs/4/failures", () => ({
      status: 200,
      body: [{ rowIndex: 3, name: "bulk-4", error: "clf-1: Missing features: age." }],
    }));
    await openDialog();

    await click("Cancel");
    await click("Show failures");
    await flush();
    await click("Retry failed rows");
    await flush();

    expect(requests.map((request) => `${request.method} ${request.path}`)).toEqual(
      expect.arrayContaining([
        "POST /api/prediction-jobs/5/cancel",
        "POST /api/prediction-jobs/4/retry",
      ]),
    );
    expect(document.body.textContent).toContain("bulk-4 · clf-1: Missing features: age.");
  });

  test("a file's rows are sent once, each with every bound model's record", async () => {
    routes.set(JOBS, () => ({ status: 200, body: [] }));
    routes.set("POST /api/schema-bookmarks/9/prediction-jobs", () => ({
      status: 201,
      body: job({ status: "QUEUED" }),
    }));
    await openDialog();
    expect(document.body.textContent).toContain("No bulk uploads yet");

    await upload("age\n42\n55\n");

    const started = requests.find((request) => request.method === "POST")!;
    expect(started.path).toBe("/api/schema-bookmarks/9/prediction-jobs");
    const body = started.body as {
      schemaVersionId: number;
      rows: { inputData: unknown; models: unknown }[];
    };
    expect(body.schemaVersionId).toBe(23);
    expect(body.rows.map((row) => row.inputData)).toEqual([{ age: 42 }, { age: 55 }]);
    expect(body.rows[0]!.models).toEqual([
      { modelId: 1, modelInput: { age: 42 } },
      { modelId: 2, modelInput: { age: 42 } },
    ]);
    expect(toasts.success).toHaveBeenCalledWith("Bulk upload started: 2 rows run on the server");
  });

  test("a job the server refuses is reported and nothing runs", async () => {
    routes.set(JOBS, () => ({ status: 200, body: [] }));
    routes.set("POST /api/schema-bookmarks/9/prediction-jobs", () => ({
      status: 429,
      body: {
        status: 429,
        message: "You already have 2 bulk uploads running; wait for one to finish",
      },
    }));
    await openDialog();

    await upload("age\n42\n");

    expect(toasts.error).toHaveBeenCalledWith("Bulk upload could not start", {
      description: "You already have 2 bulk uploads running; wait for one to finish",
    });
  });

  test("says when the jobs cannot be read", async () => {
    routes.set(JOBS, () => ({ status: 500, body: { status: 500, message: "boom" } }));
    await openDialog();

    expect(document.body.textContent).toContain("Bulk uploads unavailable");
  });
});

async function upload(text: string) {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([text], "bulk.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => text });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  for (let i = 0; i < 5; i++) await flush();
}
