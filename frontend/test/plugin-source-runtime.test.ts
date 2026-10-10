import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { detectPluginType } from "@/capabilities/prediction-runtime/plugins/plugin-catalog-loader";
import { validateCustomFieldSource } from "@/capabilities/prediction-runtime/plugins/custom-field-source-runtime";
import { validateCustomReportSource } from "@/capabilities/prediction-runtime/plugins/custom-report-source-runtime";
import { invalidatePluginRuntimeCache } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-cache";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";

let moduleSource = "";
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
  revokeObjectURL.mockReset();
  // Node cannot import blob URLs; data URLs execute the same transpiled module in this test.
  vi.stubGlobal(
    "Blob",
    class {
      constructor(parts: string[]) {
        moduleSource = parts.join("");
      }
    },
  );
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
});

afterEach(() => {
  invalidatePluginRuntimeCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fieldSource = `export default defineFieldKind({
  kind: "custom-score",
  schema: z.object({ kind: z.literal("custom-score"), label: z.string(), mappedTo: z.string().optional() }),
  value: { default: () => 0, normalize: (value: unknown) => Number(value ?? 0) },
  render: { widget: "number" },
});`;

const reportSource = `export default defineReportKind({
  kind: "custom-summary",
  schema: z.object({ kind: z.literal("custom-summary"), label: z.string().optional(), mappedTo: z.string().optional() }),
  render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
});`;

describe("MLForm plugin source runtime", () => {
  test("compiles field and report sources and registers both runtime definitions and presenters", async () => {
    const field = await validateCustomFieldSource(7, fieldSource);
    const report = await validateCustomReportSource(7, reportSource);
    expect(await detectPluginType(7, fieldSource)).toEqual({
      pluginType: "field",
      kind: field.kind,
    });
    expect(await detectPluginType(7, reportSource)).toEqual({
      pluginType: "report",
      kind: report.kind,
    });
    const metadata = {
      id: "plugin",
      fileName: "plugin.ts",
      source: "",
      updatedAt: "",
      createdAt: "",
      contentType: "text/typescript",
      sizeBytes: 1,
    };
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ kind: field.kind, label: "Score", mappedTo: "score" }],
        reports: [{ kind: report.kind, mappedTo: "summary" }],
      },
      bindings: [],
      customFieldDefinitions: [{ ...metadata, kind: field.kind, definition: field }],
      customReportDefinitions: [{ ...metadata, kind: report.kind, definition: report }],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    expect(form.fields[0].state.value).toBe(0);
    expect(runtime.descriptorRegistry.getField(field.kind)).toBeDefined();
    expect(runtime.descriptorRegistry.getReport(report.kind)).toBeDefined();
    expect(await validateCustomFieldSource(7, fieldSource)).toBe(field);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    form.dispose();
  });

  test.each([
    ["export default null", "default field definition"],
    ["export const plugin = {}", "exactly one default"],
    ["export default {}", 'non-empty string "kind"'],
    ['export default { kind: "broken" }', "defineFieldKind"],
    [
      'export default { kind: "broken", category: "field", register() {}, definition: {}, presenter: {} }',
      "Zod config schema",
    ],
    [
      'export default { kind: "broken", category: "field", register() {}, definition: { schema: z.object({}) }, presenter: {} }',
      "describe",
    ],
    [reportSource, "defineReportKind is not defined"],
    ["export default defineFieldKind({", "TypeScript"],
  ])("rejects invalid field plugin source %s", async (source, message) => {
    await expect(validateCustomFieldSource(7, source)).rejects.toThrow(
      message === "TypeScript" ? /L\d+:C\d+ / : message,
    );
    expect(revokeObjectURL).toHaveBeenCalledTimes(message === "TypeScript" ? 0 : 1);
  });
});
